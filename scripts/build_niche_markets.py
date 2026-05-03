#!/usr/bin/env python3
"""Build simple darts/snooker markets when niche events exist in data.js.

Only derives markets for events already available in the Winamax-filtered feed.
Today the feed usually has no darts/snooker, so the normal output is an
``empty`` sidecar proving the feature is ready without inventing picks.

Output: ``niche_markets.json`` at repo root.
"""
from __future__ import annotations

import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
OUT = ROOT / "niche_markets.json"

SPORT_LINES = {
    "darts": [9.5, 11.5, 13.5],
    "snooker": [7.5, 9.5, 11.5],
}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_data() -> dict[str, Any]:
    txt = DATA_JS.read_text(encoding="utf-8")
    m = re.search(r"=\s*(\{.*\})\s*;?\s*$", txt, re.DOTALL)
    if not m:
        raise RuntimeError("could not parse data.js")
    return json.loads(m.group(1))


def num(value: Any, default: float | None = None) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-max(-8.0, min(8.0, x))))


def sides(ev: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    comps = ev.get("competitors") or []
    if len(comps) >= 2:
        return comps[0], comps[1]
    return {}, {}


def sport_of(ev: dict[str, Any]) -> str | None:
    hay = " ".join(str(ev.get(k) or "") for k in ("sport", "sport_key", "league", "league_name", "league_code", "name")).lower()
    if "darts" in hay:
        return "darts"
    if "snooker" in hay:
        return "snooker"
    return None


def player_strength(player: dict[str, Any]) -> float:
    elo = num(player.get("elo") if not isinstance(player.get("elo"), dict) else player.get("elo", {}).get("value"))
    if elo is not None:
        return elo / 100.0
    rank = num(player.get("rank"))
    if rank and rank > 0:
        return 12.0 - math.log(rank)
    seed = num(player.get("seed"))
    if seed and seed > 0:
        return 10.0 - math.log(seed)
    return 10.0


def form_bias(player: dict[str, Any]) -> float:
    form = str(player.get("form") or player.get("form5") or "")
    if not form:
        return 0.0
    wins = form.upper().count("W")
    losses = form.upper().count("L")
    total = wins + losses
    if total <= 0:
        return 0.0
    return (wins - losses) / total


def project(ev: dict[str, Any], sport: str) -> dict[str, Any] | None:
    home, away = sides(ev)
    if not home or not away:
        return None
    h_strength = player_strength(home) + form_bias(home)
    a_strength = player_strength(away) + form_bias(away)
    p_home = sigmoid((h_strength - a_strength) / 2.8)
    p_away = 1.0 - p_home
    closeness = 1.0 - abs(p_home - 0.5) * 2.0
    base_total = 11.0 if sport == "darts" else 9.0
    expected_total = base_total + closeness * (3.0 if sport == "darts" else 2.0)
    totals = []
    for line in SPORT_LINES[sport]:
        p_over = sigmoid((expected_total - line) / 1.8)
        totals.append({
            "line": line,
            "over": round(p_over, 4),
            "under": round(1.0 - p_over, 4),
            "pick": "over" if p_over >= 0.5 else "under",
        })
    return {
        "event_id": ev.get("id") or ev.get("uid") or ev.get("event_id"),
        "sport": sport,
        "league": ev.get("league_name") or ev.get("league") or ev.get("league_code"),
        "kickoff": ev.get("date") or ev.get("kickoff") or ev.get("start_time"),
        "home": home.get("name") or home.get("displayName") or home.get("abbr"),
        "away": away.get("name") or away.get("displayName") or away.get("abbr"),
        "markets": {
            "winner": {
                "home": round(p_home, 4),
                "away": round(p_away, 4),
                "pick": "home" if p_home >= p_away else "away",
            },
            "totals": totals,
        },
    }


def main() -> int:
    data = parse_data()
    events: list[dict[str, Any]] = []
    by_sport = {"darts": 0, "snooker": 0}
    for day_events in (data.get("days") or {}).values():
        for ev in day_events or []:
            sport = sport_of(ev)
            if not sport:
                continue
            projection = project(ev, sport)
            if projection:
                events.append(projection)
                by_sport[sport] += 1
    out = {
        "generated_at": now_iso(),
        "source": "derived from darts/snooker events already present in data.js",
        "status": "ok" if events else "empty",
        "sports": by_sport,
        "events": events,
        "markets": sum(1 + len((e.get("markets") or {}).get("totals") or []) for e in events),
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"niche_markets: events={len(events)} markets={out['markets']} status={out['status']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
