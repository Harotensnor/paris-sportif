#!/usr/bin/env python3
"""Fetch lightweight team metadata from TheSportsDB public API.

TheSportsDB is used only as a supplementary public metadata source: badges,
venue names, capacity and founding year. It does not affect odds selection and
must never break the Winamax-only pipeline.

Output: ``thesportsdb_meta.json`` at repo root.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
OUT = ROOT / "thesportsdb_meta.json"

API_KEY = os.environ.get("THESPORTSDB_API_KEY", "3")
API = f"https://www.thesportsdb.com/api/v1/json/{API_KEY}/searchteams.php?t="
UA = "Paris-Sportif/1.0 (+https://harotensnor.github.io/paris-sportif/)"
TTL_SECONDS = 24 * 60 * 60


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")


def read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
      return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def parse_data() -> dict[str, Any]:
    txt = DATA_JS.read_text(encoding="utf-8")
    m = re.search(r"=\s*(\{.*\})\s*;?\s*$", txt, re.DOTALL)
    if not m:
        raise RuntimeError("could not parse data.js")
    return json.loads(m.group(1))


def collect_teams(limit: int) -> list[dict[str, str]]:
    data = parse_data()
    seen: dict[str, dict[str, str]] = {}
    for events in (data.get("days") or {}).values():
        for ev in events or []:
            sport = ev.get("sport") or ev.get("sport_key") or ""
            league = ev.get("league_name") or ev.get("league") or ev.get("league_code") or ""
            for c in ev.get("competitors") or []:
                name = c.get("name") or c.get("displayName") or c.get("short") or c.get("abbr") or ""
                if not name:
                    continue
                key = f"{slug(sport)}:{slug(name)}"
                if key not in seen:
                    seen[key] = {
                        "key": key,
                        "name": name,
                        "sport": sport,
                        "league": league,
                    }
                if len(seen) >= limit:
                    return list(seen.values())
    return list(seen.values())


def fetch_team(name: str, timeout: int = 12) -> dict[str, Any] | None:
    url = API + urllib.parse.quote(name)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        payload = json.loads(res.read().decode("utf-8"))
    teams = payload.get("teams") or []
    if not teams:
        return None
    wanted = slug(name)
    for team in teams:
        primary = slug(team.get("strTeam") or "")
        alternates = [slug(x) for x in re.split(r"[,;/|]", team.get("strTeamAlternate") or "") if x.strip()]
        if wanted == primary or wanted in alternates:
            return team
    # The public demo key can return a generic fallback team. Never accept the
    # first result blindly, otherwise team badges/stadiums become misleading.
    return None


def normalize(raw: dict[str, Any], source: dict[str, str]) -> dict[str, Any]:
    return {
        "source": "thesportsdb",
        "source_team": source["name"],
        "idTeam": raw.get("idTeam"),
        "team": raw.get("strTeam"),
        "alternate": raw.get("strTeamAlternate"),
        "sport": raw.get("strSport") or source.get("sport"),
        "league": raw.get("strLeague") or source.get("league"),
        "country": raw.get("strCountry"),
        "badge": raw.get("strBadge"),
        "logo": raw.get("strLogo"),
        "jersey": raw.get("strEquipment"),
        "stadium": raw.get("strStadium"),
        "stadium_capacity": raw.get("intStadiumCapacity"),
        "formed_year": raw.get("intFormedYear"),
        "website": raw.get("strWebsite"),
        "matched_at": now_iso(),
    }


def stored_matches(item: Any, name: str) -> bool:
    if not isinstance(item, dict):
        return False
    return slug(item.get("team") or "") == slug(name)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=40, help="max teams to query")
    ap.add_argument("--sleep", type=float, default=1.0, help="delay between API calls")
    ap.add_argument("--force", action="store_true", help="ignore 24h output TTL")
    args = ap.parse_args()

    existing = read_json(OUT)
    if not args.force and existing.get("generated_at"):
        try:
            prev = datetime.fromisoformat(existing["generated_at"].replace("Z", "+00:00"))
            if (datetime.now(timezone.utc) - prev).total_seconds() < TTL_SECONDS:
                print(f"thesportsdb_meta fresh: {OUT.name}")
                return 0
        except Exception:
            pass

    teams = collect_teams(max(1, args.limit))
    previous = existing.get("teams") if isinstance(existing.get("teams"), dict) else {}
    meta: dict[str, Any] = {}
    errors: list[dict[str, str]] = []
    matched = 0

    for idx, team in enumerate(teams, start=1):
        key = team["key"]
        try:
            raw = fetch_team(team["name"])
            if raw:
                meta[key] = normalize(raw, team)
                matched += 1
            elif key in previous and stored_matches(previous[key], team["name"]):
                meta[key] = previous[key]
            else:
                errors.append({"team": team["name"], "error": "no match"})
        except Exception as exc:
            if key in previous and stored_matches(previous[key], team["name"]):
                meta[key] = previous[key]
            errors.append({"team": team["name"], "error": str(exc)[:160]})
        if idx < len(teams):
            time.sleep(max(0.0, args.sleep))

    out = {
        "generated_at": now_iso(),
        "source": f"TheSportsDB public V1 API key {API_KEY}",
        "status": "ok" if matched else "degraded",
        "requested": len(teams),
        "matched": matched,
        "errors": errors[:25],
        "teams": meta,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"thesportsdb_meta: requested={len(teams)} matched={matched} errors={len(errors)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
