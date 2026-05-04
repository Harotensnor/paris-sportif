#!/usr/bin/env python3
"""Build a compact report of missing predictive signals.

The goal is operational: after every refresh we want to know which events are
still blind spots for lineups/starters, injuries, referees, H2H, xG, weather
and market intelligence.  The frontend and health checks can read the JSON
without parsing workflow logs.
"""

from __future__ import annotations

import json
import re
import unicodedata
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DATA_JS = ROOT / "data.js"
OUT = ROOT / "signal_gap_report.json"
UNMATCHED = ROOT / "signal_unmatched.log"


TOP_FOOTBALL_LEAGUES = {
    "eng.1",
    "esp.1",
    "ita.1",
    "ger.1",
    "fra.1",
    "por.1",
    "ned.1",
    "bel.1",
    "uefa.champions",
    "uefa.europa",
    "uefa.europa_conf",
}

LATAM_FOOTBALL_LEAGUES = {
    "usa.1",
    "mex.1",
    "arg.1",
    "bra.1",
    "col.1",
    "uru.1",
    "chi.1",
}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _load_data() -> dict[str, Any]:
    text = DATA_JS.read_text(encoding="utf-8")
    match = re.search(r"=\s*(\{.*\})\s*;?\s*$", text, re.DOTALL)
    if not match:
        raise SystemExit("Cannot parse data.js")
    return json.loads(match.group(1))


def _events(data: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for day_events in (data.get("days") or {}).values():
        if isinstance(day_events, list):
            out.extend(e for e in day_events if isinstance(e, dict))
    return out


def _norm(value: str | None) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def _team_names(ev: dict[str, Any]) -> tuple[str, str]:
    home = ""
    away = ""
    for comp in ev.get("competitors") or []:
        if not isinstance(comp, dict):
            continue
        name = comp.get("displayName") or comp.get("name") or comp.get("short") or ""
        if comp.get("home_away") == "home":
            home = name
        elif comp.get("home_away") == "away":
            away = name
    return home, away


def _league(ev: dict[str, Any]) -> str:
    return str(ev.get("league_code") or ev.get("league") or "")


def _league_label(ev: dict[str, Any]) -> str:
    return str(ev.get("league_name") or ev.get("league") or _league(ev) or "?")


def _date_ts(ev: dict[str, Any]) -> float:
    raw = ev.get("date") or ev.get("kickoff") or ""
    if not raw:
        return 0.0
    try:
        return datetime.fromisoformat(str(raw).replace("Z", "+00:00")).timestamp()
    except Exception:
        return 0.0


def _is_upcoming(ev: dict[str, Any], now_ts: float) -> bool:
    if ev.get("completed"):
        return False
    return _date_ts(ev) > now_ts


def _has_h2h(ev: dict[str, Any]) -> bool:
    h2h = ev.get("h2h")
    if isinstance(h2h, list):
        return bool(h2h)
    if isinstance(h2h, dict):
        meetings = h2h.get("meetings") or h2h.get("games") or h2h.get("items") or []
        return bool(meetings)
    return False


def _has_xg(ev: dict[str, Any]) -> bool:
    return any(
        isinstance(comp, dict)
        and (
            comp.get("xg_stats")
            or comp.get("fbref_xg")
            or comp.get("xg_for_avg") is not None
            or comp.get("xg_against_avg") is not None
        )
        for comp in ev.get("competitors") or []
    )


def _has_injuries(ev: dict[str, Any]) -> bool:
    payload = ev.get("injuries")
    if isinstance(payload, dict):
        if payload.get("home_known") or payload.get("away_known"):
            return True
        if payload.get("home") or payload.get("away"):
            return True
    elif payload:
        return True
    return any(
        isinstance(comp, dict)
        and (comp.get("injuries_known") or comp.get("injuries") or comp.get("injuries_count"))
        for comp in ev.get("competitors") or []
    )


def _has_referee(ev: dict[str, Any]) -> bool:
    ref = ev.get("referee")
    return isinstance(ref, dict) and bool(ref.get("name"))


def _has_starter_signal(ev: dict[str, Any]) -> bool:
    if ev.get("lineups"):
        return True
    if ev.get("mlb_pitchers"):
        return True
    nhl = ev.get("nhl_stats") or {}
    if isinstance(nhl, dict):
        home_goalie = ((nhl.get("home") or {}).get("goalie") or {}).get("name")
        away_goalie = ((nhl.get("away") or {}).get("goalie") or {}).get("name")
        if home_goalie or away_goalie:
            return True
    return False


def _source_file(name: str) -> dict[str, Any]:
    path = ROOT / name
    if not path.exists():
        return {"exists": False, "size": 0, "mtime": None}
    return {
        "exists": True,
        "size": path.stat().st_size,
        "mtime": datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(),
    }


def _coverage_bucket() -> dict[str, int]:
    return {
        "events": 0,
        "upcoming": 0,
        "starter_signals": 0,
        "injuries": 0,
        "referee": 0,
        "h2h": 0,
        "xg": 0,
        "weather": 0,
        "clubelo": 0,
        "smart_money": 0,
    }


def _event_signal_map(ev: dict[str, Any]) -> dict[str, bool]:
    return {
        "starter_signals": _has_starter_signal(ev),
        "injuries": _has_injuries(ev),
        "referee": _has_referee(ev),
        "h2h": _has_h2h(ev),
        "xg": _has_xg(ev),
        "weather": bool(ev.get("weather")),
        "clubelo": bool(ev.get("clubelo")),
        "smart_money": bool(ev.get("smart_money")),
    }


def _expected_signals(ev: dict[str, Any]) -> list[str]:
    sport = str(ev.get("sport") or "")
    league_code = _league(ev)
    if sport == "football":
        base = ["h2h", "injuries", "starter_signals", "referee"]
        if league_code in TOP_FOOTBALL_LEAGUES:
            base.extend(["xg", "clubelo", "weather"])
        elif league_code in LATAM_FOOTBALL_LEAGUES:
            base.extend(["weather"])
        return base
    if sport == "baseball":
        return ["starter_signals", "injuries", "h2h", "weather"]
    if sport == "hockey":
        return ["starter_signals", "injuries", "h2h"]
    if sport == "basketball":
        return ["injuries", "h2h"]
    if sport == "tennis":
        return ["h2h"]
    return ["h2h"]


def _priority_score(ev: dict[str, Any], missing: list[str], now_ts: float) -> float:
    score = len(missing) * 10
    league_code = _league(ev)
    sport = str(ev.get("sport") or "")
    if sport == "football":
        score += 15
    if league_code in TOP_FOOTBALL_LEAGUES:
        score += 18
    if league_code in LATAM_FOOTBALL_LEAGUES:
        score += 10
    if ev.get("winamax", {}).get("available"):
        score += 8
    hours = (_date_ts(ev) - now_ts) / 3600 if _date_ts(ev) else 999
    if 0 <= hours <= 48:
        score += 12
    elif 0 <= hours <= 120:
        score += 6
    return score


def main() -> int:
    data = _load_data()
    events = _events(data)
    now = _utc_now()
    now_ts = now.timestamp()
    upcoming = [ev for ev in events if _is_upcoming(ev, now_ts)]

    by_signal = _coverage_bucket()
    by_sport: dict[str, dict[str, int]] = defaultdict(_coverage_bucket)
    by_league: dict[str, dict[str, Any]] = {}
    priority_gaps: list[dict[str, Any]] = []

    for ev in events:
        sport = str(ev.get("sport") or "?")
        league_code = _league(ev) or "?"
        league_key = f"{sport}:{league_code}"
        league_rec = by_league.setdefault(
            league_key,
            {
                "sport": sport,
                "league_code": league_code,
                "league_name": _league_label(ev),
                "coverage": _coverage_bucket(),
            },
        )
        maps = _event_signal_map(ev)
        expected = _expected_signals(ev)
        missing = [name for name in expected if not maps.get(name)]
        is_upcoming = _is_upcoming(ev, now_ts)

        for bucket in (by_signal, by_sport[sport], league_rec["coverage"]):
            bucket["events"] += 1
            if is_upcoming:
                bucket["upcoming"] += 1
            for name, present in maps.items():
                if present:
                    bucket[name] += 1

        if is_upcoming and missing:
            home, away = _team_names(ev)
            priority_gaps.append(
                {
                    "event_id": str(ev.get("id") or ""),
                    "sport": sport,
                    "league_code": league_code,
                    "league_name": _league_label(ev),
                    "kickoff": ev.get("date") or "",
                    "match": f"{home} - {away}".strip(" -"),
                    "home_key": _norm(home),
                    "away_key": _norm(away),
                    "missing": missing,
                    "present": sorted([name for name, present in maps.items() if present]),
                    "priority": round(_priority_score(ev, missing, now_ts), 2),
                }
            )

    priority_gaps.sort(key=lambda item: item["priority"], reverse=True)

    def with_ratios(row: dict[str, Any]) -> dict[str, Any]:
        total = max(1, int(row.get("events") or 0))
        out = dict(row)
        out["ratios"] = {
            key: round((int(row.get(key) or 0) / total), 4)
            for key in [
                "starter_signals",
                "injuries",
                "referee",
                "h2h",
                "xg",
                "weather",
                "clubelo",
                "smart_money",
            ]
        }
        return out

    unmatched_sample = []
    if UNMATCHED.exists():
        unmatched_sample = [
            line.strip()
            for line in UNMATCHED.read_text(encoding="utf-8", errors="ignore").splitlines()
            if line.strip()
        ][:80]

    report = {
        "generated_at": now.isoformat(),
        "data_generated_at": data.get("generated_at"),
        "events": len(events),
        "upcoming": len(upcoming),
        "coverage": with_ratios(by_signal),
        "by_sport": {sport: with_ratios(row) for sport, row in sorted(by_sport.items())},
        "by_league": sorted(
            [
                {
                    **{k: v for k, v in rec.items() if k != "coverage"},
                    "coverage": with_ratios(rec["coverage"]),
                }
                for rec in by_league.values()
            ],
            key=lambda rec: (
                -rec["coverage"]["upcoming"],
                str(rec["sport"]),
                str(rec["league_name"]),
            ),
        ),
        "priority_gaps": priority_gaps[:80],
        "unmatched_sample": unmatched_sample,
        "source_files": {
            "lineups_soccer": _source_file("lineups_soccer.json"),
            "injuries_soccer": _source_file("injuries_soccer.json"),
            "injuries_multisport": _source_file("injuries_multisport.json"),
            "referees_soccer": _source_file("referees_soccer.json"),
            "fbref_xg": _source_file("fbref_xg.json"),
            "clubelo": _source_file("clubelo.json"),
            "weather": _source_file("weather.json"),
            "mlb_pitchers": _source_file("mlb_pitchers.json"),
            "nhl_stats": _source_file("nhl_stats.json"),
        },
    }

    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        "signal_gap_report.json: "
        f"{len(events)} events, {len(upcoming)} upcoming, "
        f"{len(priority_gaps)} priority gaps"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
