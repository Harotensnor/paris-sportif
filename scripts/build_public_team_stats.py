#!/usr/bin/env python3
"""Build a unified public team-stats sidecar from already fetched sources.

This sprint intentionally avoids aggressive scraping. It consolidates public
sources already present in the pipeline (Understat, ESPN schedules/forms,
TheSportsDB and OpenLigaDB) into a single small contract the UI/model can
consume later.

Output: ``public_team_stats.json`` at repo root.
"""
from __future__ import annotations

import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public_team_stats.json"
DATA_JS = ROOT / "data.js"

SOURCE_FILES = {
    "xg": ROOT / "xg_team_stats.json",
    "team_stats": ROOT / "team_stats.json",
    "form": ROOT / "form_stats_extended.json",
    "thesportsdb": ROOT / "thesportsdb_meta.json",
    "openligadb": ROOT / "openligadb_matches.json",
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
    if not DATA_JS.exists():
        return {}
    txt = DATA_JS.read_text(encoding="utf-8")
    m = re.search(r"=\s*(\{.*\})\s*;?\s*$", txt, re.DOTALL)
    if not m:
        return {}
    try:
        return json.loads(m.group(1))
    except Exception:
        return {}


def normalize_sport(sport: str | None) -> str:
    s = (sport or "unknown").lower()
    return "football" if s in {"soccer", "foot"} else s


def norm(s: str | None) -> str:
    if not s:
        return ""
    raw = unicodedata.normalize("NFKD", str(s))
    ascii_s = raw.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "", ascii_s.lower())


def team_key(sport: str, league: str, name: str) -> str:
    parts = [normalize_sport(sport), league or "unknown", norm(name)]
    return ":".join(parts)


def clean_num(value: Any) -> float | None:
    try:
        return round(float(value), 3)
    except (TypeError, ValueError):
        return None


def ensure_team(teams: dict[str, dict[str, Any]], sport: str, league: str, name: str) -> dict[str, Any]:
    key = team_key(sport, league, name)
    if key not in teams:
        teams[key] = {
            "team": name,
            "normalized_name": norm(name),
            "sport": normalize_sport(sport),
            "league_code": league or "unknown",
            "sources": [],
        }
    return teams[key]


def add_source(item: dict[str, Any], source: str) -> None:
    sources = item.setdefault("sources", [])
    if source not in sources:
        sources.append(source)


def ingest_xg(teams: dict[str, dict[str, Any]], payload: dict[str, Any]) -> int:
    count = 0
    for raw in (payload.get("by_team") or {}).values():
        if not isinstance(raw, dict):
            continue
        name = raw.get("team")
        league = raw.get("league_code") or raw.get("league") or "football"
        if not name:
            continue
        item = ensure_team(teams, "football", str(league), str(name))
        item.update({
            "xg_l10": clean_num(raw.get("xg_l10")),
            "xga_l10": clean_num(raw.get("xga_l10")),
            "xg_per90": clean_num(raw.get("xg_per90")),
            "xga_per90": clean_num(raw.get("xga_per90")),
            "goals_for_l10": clean_num(raw.get("gf_l10")),
            "goals_against_l10": clean_num(raw.get("ga_l10")),
            "xg_diff_l10": clean_num(raw.get("xg_diff_l10")),
            "ppda": clean_num(raw.get("ppda")),
            "ppda_allowed": clean_num(raw.get("ppda_allowed")),
            "matches_played": raw.get("matches_played"),
        })
        add_source(item, "understat")
        count += 1
    return count


def ingest_team_stats(teams: dict[str, dict[str, Any]], payload: dict[str, Any]) -> int:
    count = 0
    for raw in (payload.get("teams") or {}).values():
        if not isinstance(raw, dict):
            continue
        name = raw.get("name")
        if not name:
            continue
        sport = raw.get("sport") or "football"
        league = raw.get("league_code") or "unknown"
        item = ensure_team(teams, str(sport), str(league), str(name))
        item.update({
            "played5": raw.get("played5"),
            "wins5": raw.get("wins5"),
            "draws5": raw.get("draws5"),
            "losses5": raw.get("losses5"),
            "avg_for5": clean_num(raw.get("avg_gf5")),
            "avg_against5": clean_num(raw.get("avg_ga5")),
            "clean_sheets5": raw.get("cleans5"),
            "failed_to_score5": raw.get("failed_to_score5"),
        })
        add_source(item, "espn_schedule")
        count += 1
    return count


def collect_local_team_names() -> dict[str, str]:
    data = parse_data()
    out: dict[str, str] = {}
    for events in (data.get("days") or {}).values():
        for ev in events or []:
            sport = normalize_sport(ev.get("sport") or ev.get("sport_key"))
            league = ev.get("league_code") or ev.get("league") or "unknown"
            for c in ev.get("competitors") or []:
                tid = c.get("id")
                name = c.get("name") or c.get("displayName") or c.get("short") or c.get("abbr")
                if tid and name:
                    out[f"{sport}:{league}:{tid}"] = str(name)
    return out


def ingest_form(teams: dict[str, dict[str, Any]], payload: dict[str, Any], local_names: dict[str, str]) -> int:
    count = 0
    for raw in (payload.get("teams") or {}).values():
        if not isinstance(raw, dict):
            continue
        sport = normalize_sport(raw.get("sport"))
        league = raw.get("league_code") or "unknown"
        tid = raw.get("team_id")
        name = raw.get("team") or raw.get("team_name") or local_names.get(f"{sport}:{league}:{tid}") or tid
        if not name:
            continue
        item = ensure_team(teams, str(sport), str(league), str(name))
        item["team_id"] = tid
        item.update({
            "form10": raw.get("form"),
            "form5": raw.get("form5"),
            "games_l10": raw.get("games_l10"),
            "wins_l10": raw.get("wins_l10"),
            "losses_l10": raw.get("losses_l10"),
            "win_rate_l10": clean_num(raw.get("win_rate_l10")),
            "avg_for_l10": clean_num(raw.get("avg_for_l10")),
            "avg_against_l10": clean_num(raw.get("avg_against_l10")),
        })
        add_source(item, "espn_form")
        count += 1
    return count


def ingest_thesportsdb(teams: dict[str, dict[str, Any]], payload: dict[str, Any]) -> int:
    count = 0
    for raw in (payload.get("teams") or {}).values():
        if not isinstance(raw, dict):
            continue
        name = raw.get("source_team") or raw.get("team")
        if not name:
            continue
        sport = normalize_sport(raw.get("sport"))
        league = raw.get("league") or "unknown"
        item = ensure_team(teams, str(sport).lower(), str(league), str(name))
        item.update({
            "badge": raw.get("badge"),
            "logo": raw.get("logo"),
            "jersey": raw.get("jersey"),
            "stadium": raw.get("stadium"),
            "stadium_capacity": raw.get("stadium_capacity"),
            "formed_year": raw.get("formed_year"),
        })
        add_source(item, "thesportsdb")
        count += 1
    return count


def ingest_openligadb(teams: dict[str, dict[str, Any]], payload: dict[str, Any]) -> int:
    count = 0
    for match in payload.get("matches") or []:
        if not isinstance(match, dict):
            continue
        league = match.get("league_code") or "ger"
        for side in ("home", "away"):
            name = match.get(side)
            if not name:
                continue
            item = ensure_team(teams, "football", str(league), str(name))
            icon = match.get(f"{side}_icon")
            if icon and not item.get("openligadb_icon"):
                item["openligadb_icon"] = icon
            last = item.setdefault("openligadb_matches", [])
            if len(last) < 6:
                last.append({
                    "match_id": match.get("match_id"),
                    "kickoff_utc": match.get("kickoff_utc"),
                    "home": match.get("home"),
                    "away": match.get("away"),
                    "score": match.get("score"),
                    "finished": match.get("finished"),
                })
            add_source(item, "openligadb")
            count += 1
    return count


def quality_flags(item: dict[str, Any]) -> list[str]:
    flags: list[str] = []
    if item.get("xg_diff_l10") is not None:
        diff = float(item["xg_diff_l10"])
        if diff >= 0.45:
            flags.append("xG recent fort")
        elif diff <= -0.45:
            flags.append("xG recent faible")
    if item.get("win_rate_l10") is not None:
        wr = float(item["win_rate_l10"])
        if wr >= 0.7:
            flags.append("forme L10 chaude")
        elif wr <= 0.3:
            flags.append("forme L10 froide")
    if item.get("ppda") is not None and float(item["ppda"]) <= 9:
        flags.append("pressing intense")
    return flags[:4]


def main() -> int:
    payloads = {name: read_json(path) for name, path in SOURCE_FILES.items()}
    local_names = collect_local_team_names()
    teams: dict[str, dict[str, Any]] = {}
    counts = {
        "understat": ingest_xg(teams, payloads["xg"]),
        "espn_schedule": ingest_team_stats(teams, payloads["team_stats"]),
        "espn_form": ingest_form(teams, payloads["form"], local_names),
        "thesportsdb": ingest_thesportsdb(teams, payloads["thesportsdb"]),
        "openligadb": ingest_openligadb(teams, payloads["openligadb"]),
    }
    by_sport: dict[str, int] = {}
    teams_with_xg = 0
    teams_with_form = 0
    teams_with_metadata = 0
    for item in teams.values():
        by_sport[item["sport"]] = by_sport.get(item["sport"], 0) + 1
        if item.get("xg_l10") is not None:
            teams_with_xg += 1
        if item.get("form10") or item.get("played5"):
            teams_with_form += 1
        if item.get("badge") or item.get("openligadb_icon") or item.get("stadium"):
            teams_with_metadata += 1
        item["quality_flags"] = quality_flags(item)

    out = {
        "generated_at": now_iso(),
        "source": "merged public sidecars: Understat, ESPN, TheSportsDB, OpenLigaDB",
        "teams_total": len(teams),
        "teams_with_xg": teams_with_xg,
        "teams_with_form": teams_with_form,
        "teams_with_metadata": teams_with_metadata,
        "by_sport": dict(sorted(by_sport.items())),
        "source_counts": counts,
        "teams": dict(sorted(teams.items())),
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(
        "public_team_stats: "
        f"teams={len(teams)} xg={teams_with_xg} form={teams_with_form} meta={teams_with_metadata}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
