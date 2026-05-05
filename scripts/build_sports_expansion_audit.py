#!/usr/bin/env python3
"""Summarize Section J sports expansion coverage from local data sidecars.

No network call here: the audit reads ``data.js``, ``sofascore_events.json``,
``mlb_pitchers.json`` and ``rugby_markets.json`` to show which new sports /
league families are present and actionable.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
SOFA = ROOT / "sofascore_events.json"
MLB_PITCHERS = ROOT / "mlb_pitchers.json"
MLB_PLAYER_PROPS = ROOT / "mlb_player_props.json"
NHL_PLAYOFF_MARKETS = ROOT / "nhl_playoff_markets.json"
TENNIS_CHALLENGER_WATCHLIST = ROOT / "tennis_challenger_watchlist.json"
RUGBY = ROOT / "rugby_markets.json"
OUT = ROOT / "sports_expansion_audit.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def parse_data() -> dict[str, Any]:
    text = DATA_JS.read_text(encoding="utf-8")
    match = re.search(r"=\s*(\{.*\})\s*;?\s*$", text, re.DOTALL)
    if not match:
        return {}
    return json.loads(match.group(1))


def code_of(event: dict[str, Any]) -> str:
    return str(event.get("league_code") or event.get("league") or event.get("league_name") or "").lower()


def name_of(event: dict[str, Any]) -> str:
    return str(event.get("league_name") or event.get("league") or event.get("name") or "")


def sample_name(event: dict[str, Any]) -> str:
    return str(event.get("name") or event.get("shortName") or name_of(event))[:80]


def add_sample(bucket: dict[str, Any], event: dict[str, Any]) -> None:
    samples = bucket.setdefault("samples", [])
    if len(samples) < 5:
        samples.append({
            "event": sample_name(event),
            "league": name_of(event),
            "code": event.get("league_code"),
        })


def categories_for(event: dict[str, Any]) -> list[str]:
    sport = str(event.get("sport") or "").lower()
    code = code_of(event)
    name = name_of(event).lower()
    categories: list[str] = []
    if sport == "football" and (".w." in code or ".women" in code or "women" in name or "fémin" in name or "frauen" in name):
        categories.append("J1_foot_feminin")
    if sport == "tennis" and (code in {"atp.challenger", "itf"} or "challenger" in name or name.startswith("itf ")):
        categories.append("J2_tennis_challenger_itf")
    if sport == "hockey" and ("nhl.playoffs" in code or ("nhl" in name and "playoff" in name)):
        categories.append("J3_nhl_playoffs")
    if sport == "baseball" and code in {"mlb", "kbo", "npb", "npb.pacific", "npb.central"}:
        categories.append("J4_baseball_major_props_pool")
    if sport == "football" and (code.endswith(".2") or code in {"ger.2", "esp.2", "ita.2", "fra.2", "ned.2", "jpn.2"}):
        categories.append("J5_football_tier2")
    if sport == "football" and ("cup" in code or "copa" in code or "pokal" in code or "cup" in name or "copa" in name):
        categories.append("J6_coupes_nationales")
    if sport == "football" and code.split(".")[0] in {"bra", "arg", "mex", "col", "jpn", "kor", "chn", "ksa", "conmebol"}:
        categories.append("J7_asie_latam")
    if sport.startswith("rugby") or "rugby" in code or "rugby" in name:
        categories.append("J8_rugby")
    return categories


def main() -> int:
    data = parse_data()
    sofa = load_json(SOFA, {})
    mlb = load_json(MLB_PITCHERS, {})
    mlb_props = load_json(MLB_PLAYER_PROPS, {})
    nhl_markets = load_json(NHL_PLAYOFF_MARKETS, {})
    tennis_watch = load_json(TENNIS_CHALLENGER_WATCHLIST, {})
    rugby = load_json(RUGBY, {})

    buckets: dict[str, dict[str, Any]] = {
        key: {"data_events": 0, "sofascore_events": 0, "samples": []}
        for key in [
            "J1_foot_feminin",
            "J2_tennis_challenger_itf",
            "J3_nhl_playoffs",
            "J4_baseball_major_props_pool",
            "J5_football_tier2",
            "J6_coupes_nationales",
            "J7_asie_latam",
            "J8_rugby",
        ]
    }

    for events in (data.get("days") or {}).values():
        for event in events or []:
            for category in categories_for(event):
                bucket = buckets[category]
                bucket["data_events"] += 1
                add_sample(bucket, event)

    for events in (sofa.get("events") or {}).values():
        for event in events or []:
            for category in categories_for(event):
                buckets[category]["sofascore_events"] += 1

    pitcher_rows = mlb.get("matches") or mlb.get("pitchers") or mlb.get("events") or []
    if isinstance(pitcher_rows, dict):
        pitcher_count = 0
        for row in pitcher_rows.values():
            if isinstance(row, dict):
                pitcher_count += 1 if row.get("home") else 0
                pitcher_count += 1 if row.get("away") else 0
            elif row:
                pitcher_count += 1
    elif isinstance(pitcher_rows, list):
        pitcher_count = len(pitcher_rows)
    else:
        pitcher_count = 0
    buckets["J4_baseball_major_props_pool"]["pitcher_records"] = pitcher_count
    buckets["J4_baseball_major_props_pool"]["player_prop_events"] = len(mlb_props.get("events") or []) if isinstance(mlb_props, dict) else 0
    buckets["J4_baseball_major_props_pool"]["player_props"] = mlb_props.get("props", 0) if isinstance(mlb_props, dict) else 0
    buckets["J3_nhl_playoffs"]["derived_events"] = len(nhl_markets.get("events") or []) if isinstance(nhl_markets, dict) else 0
    buckets["J3_nhl_playoffs"]["derived_markets"] = nhl_markets.get("markets", 0) if isinstance(nhl_markets, dict) else 0
    buckets["J2_tennis_challenger_itf"]["watchlist_events"] = len(tennis_watch.get("watchlist") or []) if isinstance(tennis_watch, dict) else 0
    buckets["J2_tennis_challenger_itf"]["bookable_tennis_events"] = tennis_watch.get("bookable_tennis_events", 0) if isinstance(tennis_watch, dict) else 0
    buckets["J8_rugby"]["derived_markets"] = rugby.get("markets", 0)
    buckets["J8_rugby"]["watchlist_events"] = len(rugby.get("source_watchlist") or []) if isinstance(rugby, dict) else 0
    buckets["J8_rugby"]["status"] = rugby.get("status", "missing")

    out = {
        "generated_at": now_iso(),
        "source": "local data.js + sports sidecars",
        "status": "ok",
        "sections": buckets,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    printable = " ".join(f"{k}:{v['data_events']}/{v['sofascore_events']}" for k, v in buckets.items())
    print(f"sports_expansion_audit: {printable}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
