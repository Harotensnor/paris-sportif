#!/usr/bin/env python3
"""Fetch German football match metadata from the public OpenLigaDB API.

OpenLigaDB is a supplementary public source used to cross-check Bundesliga
fixtures/results when the primary ESPN/Sofascore feed lags. It is not used for
odds and must never break the Winamax-only pipeline.

Output: ``openligadb_matches.json`` at repo root.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import unicodedata
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
OUT = ROOT / "openligadb_matches.json"

API = "https://api.openligadb.de"
UA = "Paris-Sportif/1.0 (+https://harotensnor.github.io/paris-sportif/)"
TTL_SECONDS = 12 * 60 * 60
LEAGUES = {
    "bl1": "Bundesliga",
    "bl2": "2. Bundesliga",
    "bl3": "3. Liga",
}
STOPWORDS = {
    "1",
    "2",
    "ii",
    "fc",
    "sc",
    "sv",
    "vfb",
    "vfl",
    "fsv",
    "tsg",
    "sg",
    "spvgg",
    "borussia",
    "eintracht",
    "club",
    "team",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


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


def season_year(today: datetime) -> int:
    return today.year if today.month >= 7 else today.year - 1


def norm(s: str) -> str:
    raw = unicodedata.normalize("NFKD", s or "")
    ascii_s = raw.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", " ", ascii_s.lower()).strip()


def team_tokens(s: str) -> set[str]:
    toks = {t for t in norm(s).split() if t and t not in STOPWORDS}
    expanded: set[str] = set(toks)
    for t in toks:
        if t.endswith("er") and len(t) > 6:
            expanded.add(t[:-2])
        if t.endswith("en") and len(t) > 6:
            expanded.add(t[:-2])
    return expanded


def similar_team(a: str, b: str) -> bool:
    na, nb = norm(a), norm(b)
    if not na or not nb:
        return False
    if na == nb or na in nb or nb in na:
        return True
    ta, tb = team_tokens(a), team_tokens(b)
    if not ta or not tb:
        return False
    shared = ta & tb
    if shared:
        return True
    for x in ta:
        for y in tb:
            if min(len(x), len(y)) >= 5 and (x.startswith(y[:5]) or y.startswith(x[:5])):
                return True
    return False


def parse_dt(value: Any) -> str | None:
    if not value:
        return None
    txt = str(value).replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(txt)
    except Exception:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def fetch_json(url: str, timeout: int = 15) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read().decode("utf-8"))


def extract_score(raw: dict[str, Any]) -> dict[str, Any] | None:
    results = raw.get("matchResults") or []
    if not results:
        return None
    full_time = None
    for result in results:
        if result.get("resultTypeID") == 2 or result.get("resultOrderID") == 2:
            full_time = result
    full_time = full_time or results[-1]
    h = full_time.get("pointsTeam1")
    a = full_time.get("pointsTeam2")
    if h is None or a is None:
        return None
    return {"home": h, "away": a}


def normalize_match(raw: dict[str, Any], league_code: str, league_name: str, season: int) -> dict[str, Any]:
    team1 = raw.get("team1") or {}
    team2 = raw.get("team2") or {}
    return {
        "source": "openligadb",
        "league_code": league_code,
        "league": league_name,
        "season": season,
        "match_id": raw.get("matchID"),
        "matchday": raw.get("group", {}).get("groupOrderID") if isinstance(raw.get("group"), dict) else None,
        "kickoff_utc": parse_dt(raw.get("matchDateTimeUTC") or raw.get("matchDateTime")),
        "home": team1.get("teamName"),
        "away": team2.get("teamName"),
        "home_icon": team1.get("teamIconUrl"),
        "away_icon": team2.get("teamIconUrl"),
        "score": extract_score(raw),
        "finished": bool(raw.get("matchIsFinished")),
    }


def fetch_league(league_code: str, season: int) -> list[dict[str, Any]]:
    url = f"{API}/getmatchdata/{league_code}/{season}"
    payload = fetch_json(url)
    if not isinstance(payload, list):
        return []
    return [normalize_match(item, league_code, LEAGUES[league_code], season) for item in payload]


def local_sides(ev: dict[str, Any]) -> tuple[str, str]:
    competitors = ev.get("competitors") or []
    if len(competitors) >= 2:
        h = competitors[0].get("name") or competitors[0].get("displayName") or competitors[0].get("short") or ""
        a = competitors[1].get("name") or competitors[1].get("displayName") or competitors[1].get("short") or ""
        return h, a
    return ev.get("home") or ev.get("home_team") or "", ev.get("away") or ev.get("away_team") or ""


def local_kickoff(ev: dict[str, Any]) -> str | None:
    for key in ("kickoff", "start_time", "commence_time", "date", "timestamp"):
        out = parse_dt(ev.get(key))
        if out:
            return out
    return None


def collect_local_events() -> list[dict[str, Any]]:
    data = parse_data()
    out: list[dict[str, Any]] = []
    for day, events in (data.get("days") or {}).items():
        for ev in events or []:
            sport = (ev.get("sport") or ev.get("sport_key") or "").lower()
            if sport and "soccer" not in sport and "football" not in sport and "foot" not in sport:
                continue
            league = " ".join(str(ev.get(k) or "") for k in ("league", "league_name", "league_code", "competition"))
            h, a = local_sides(ev)
            hay = norm(" ".join([league, h, a]))
            if not any(x in hay for x in ("bundesliga", "germany", "allemagne", "liga")):
                continue
            out.append({
                "day": day,
                "id": ev.get("id") or ev.get("uid") or ev.get("event_id"),
                "league": league.strip(),
                "home": h,
                "away": a,
                "kickoff_utc": local_kickoff(ev),
            })
    return out


def within_window(kickoff: str | None, start: datetime, end: datetime) -> bool:
    if not kickoff:
        return True
    try:
        dt = datetime.fromisoformat(kickoff.replace("Z", "+00:00")).astimezone(timezone.utc)
    except Exception:
        return True
    return start <= dt <= end


def match_local(open_match: dict[str, Any], locals_: list[dict[str, Any]]) -> dict[str, Any] | None:
    oh, oa = open_match.get("home") or "", open_match.get("away") or ""
    okick = open_match.get("kickoff_utc")
    odt = None
    if okick:
        try:
            odt = datetime.fromisoformat(okick.replace("Z", "+00:00")).astimezone(timezone.utc)
        except Exception:
            odt = None
    for ev in locals_:
        teams_ok = (
            similar_team(oh, ev.get("home") or "") and similar_team(oa, ev.get("away") or "")
        ) or (
            similar_team(oh, ev.get("away") or "") and similar_team(oa, ev.get("home") or "")
        )
        if not teams_ok:
            continue
        if odt and ev.get("kickoff_utc"):
            try:
                ldt = datetime.fromisoformat(ev["kickoff_utc"].replace("Z", "+00:00")).astimezone(timezone.utc)
                if abs((ldt - odt).total_seconds()) > 60 * 60 * 36:
                    continue
            except Exception:
                pass
        return ev
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--season", type=int, default=None, help="season start year, e.g. 2025 for 2025/26")
    ap.add_argument("--days-back", type=int, default=14)
    ap.add_argument("--days-ahead", type=int, default=21)
    ap.add_argument("--sleep", type=float, default=0.4)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    existing = read_json(OUT)
    if not args.force and existing.get("generated_at"):
        try:
            prev = datetime.fromisoformat(existing["generated_at"].replace("Z", "+00:00"))
            if (datetime.now(timezone.utc) - prev).total_seconds() < TTL_SECONDS:
                print(f"openligadb_matches fresh: {OUT.name}")
                return 0
        except Exception:
            pass

    today = datetime.now(timezone.utc)
    season = args.season or season_year(today)
    start = today - timedelta(days=max(0, args.days_back))
    end = today + timedelta(days=max(0, args.days_ahead))
    local_events = collect_local_events()

    matches: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []
    for idx, (code, name) in enumerate(LEAGUES.items(), start=1):
        try:
            fetched = fetch_league(code, season)
            for item in fetched:
                if within_window(item.get("kickoff_utc"), start, end):
                    local = match_local(item, local_events)
                    if local:
                        item["local_event"] = local
                    matches.append(item)
        except Exception as exc:
            errors.append({"league": code, "error": str(exc)[:180]})
        if idx < len(LEAGUES):
            time.sleep(max(0.0, args.sleep))

    matched = sum(1 for m in matches if m.get("local_event"))
    by_league: dict[str, dict[str, Any]] = {}
    for item in matches:
        code = item.get("league_code") or "unknown"
        bucket = by_league.setdefault(code, {
            "league": item.get("league") or code,
            "matches": 0,
            "upcoming": 0,
            "finished": 0,
            "matched_local_events": 0,
        })
        bucket["matches"] += 1
        if item.get("finished"):
            bucket["finished"] += 1
        else:
            bucket["upcoming"] += 1
        if item.get("local_event"):
            bucket["matched_local_events"] += 1
    out = {
        "generated_at": now_iso(),
        "source": "OpenLigaDB public API",
        "status": "ok" if matches else "degraded",
        "season": season,
        "window": {"days_back": args.days_back, "days_ahead": args.days_ahead},
        "requested_leagues": list(LEAGUES.keys()),
        "matches": matches,
        "matched_local_events": matched,
        "matched_local_ratio": round(matched / len(matches), 4) if matches else 0,
        "by_league": by_league,
        "errors": errors,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"openligadb_matches: matches={len(matches)} local_matches={matched} errors={len(errors)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
