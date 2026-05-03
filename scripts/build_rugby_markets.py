#!/usr/bin/env python3
"""Build simple rugby winner/total markets when rugby events exist.

The current product stays Winamax-only: this script only derives probabilities
from events already present in ``data.js``. If there is no rugby in the feed it
emits a small empty sidecar so health/cron can prove the feature is ready.

Output: ``rugby_markets.json`` at repo root.
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
OUT = ROOT / "rugby_markets.json"

TOTAL_LINES = [38.5, 42.5, 46.5, 50.5, 54.5]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_data() -> dict[str, Any]:
    txt = DATA_JS.read_text(encoding="utf-8")
    m = re.search(r"=\s*(\{.*\})\s*;?\s*$", txt, re.DOTALL)
    if not m:
        raise RuntimeError("could not parse data.js")
    return json.loads(m.group(1))


def normal_cdf(x: float, mu: float, sigma: float) -> float:
    if sigma <= 0:
        return 1.0 if x >= mu else 0.0
    return 0.5 * (1.0 + math.erf((x - mu) / (sigma * math.sqrt(2.0))))


def num(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def sides(ev: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    comps = ev.get("competitors") or []
    if len(comps) >= 2:
        home = next((c for c in comps if c.get("home_away") == "home"), comps[0])
        away = next((c for c in comps if c is not home), comps[1])
        return home, away
    return {}, {}


def recent_points(team: dict[str, Any], fallback_for: float, fallback_against: float) -> tuple[float, float]:
    last = team.get("last10") or team.get("last5") or []
    pts_for: list[float] = []
    pts_against: list[float] = []
    for row in last:
        if not isinstance(row, dict):
            continue
        gf = row.get("score_for", row.get("gf"))
        ga = row.get("score_against", row.get("ga"))
        if gf is not None and ga is not None:
            pts_for.append(num(gf))
            pts_against.append(num(ga))
    if pts_for and pts_against:
        return sum(pts_for) / len(pts_for), sum(pts_against) / len(pts_against)
    return fallback_for, fallback_against


def project_event(ev: dict[str, Any]) -> dict[str, Any] | None:
    home, away = sides(ev)
    if not home or not away:
        return None
    h_for, h_against = recent_points(home, 24.0, 21.0)
    a_for, a_against = recent_points(away, 21.0, 24.0)
    # Blend scoring attack and opposing defensive concession. Rugby is high
    # variance, so keep the projection conservative around neutral priors.
    exp_home = max(3.0, 0.55 * h_for + 0.45 * a_against)
    exp_away = max(3.0, 0.55 * a_for + 0.45 * h_against)
    total_mu = exp_home + exp_away
    total_sigma = max(8.0, math.sqrt(total_mu) * 1.85)
    diff_mu = exp_home - exp_away
    diff_sigma = max(7.0, math.sqrt(exp_home + exp_away) * 1.55)
    p_home = 1.0 - normal_cdf(0.0, diff_mu, diff_sigma)
    p_away = normal_cdf(0.0, diff_mu, diff_sigma)
    markets = {
        "winner": {
            "home": round(p_home, 4),
            "away": round(p_away, 4),
            "pick": "home" if p_home >= p_away else "away",
        },
        "totals": [],
    }
    for line in TOTAL_LINES:
        p_over = 1.0 - normal_cdf(line, total_mu, total_sigma)
        markets["totals"].append({
            "line": line,
            "over": round(p_over, 4),
            "under": round(1.0 - p_over, 4),
            "pick": "over" if p_over >= 0.5 else "under",
        })
    return {
        "event_id": ev.get("id") or ev.get("uid") or ev.get("event_id"),
        "league": ev.get("league_name") or ev.get("league") or ev.get("league_code"),
        "kickoff": ev.get("date") or ev.get("kickoff") or ev.get("start_time"),
        "home": home.get("name") or home.get("displayName") or home.get("abbr"),
        "away": away.get("name") or away.get("displayName") or away.get("abbr"),
        "projection": {
            "home_points": round(exp_home, 2),
            "away_points": round(exp_away, 2),
            "total_points": round(total_mu, 2),
        },
        "markets": markets,
    }


def is_rugby(ev: dict[str, Any]) -> bool:
    sport = str(ev.get("sport") or ev.get("sport_key") or "").lower()
    league = str(ev.get("league") or ev.get("league_name") or ev.get("league_code") or "").lower()
    return "rugby" in sport or "rugby" in league


def main() -> int:
    data = parse_data()
    events: list[dict[str, Any]] = []
    for day_events in (data.get("days") or {}).values():
        for ev in day_events or []:
            if not is_rugby(ev):
                continue
            projection = project_event(ev)
            if projection:
                events.append(projection)
    out = {
        "generated_at": now_iso(),
        "source": "derived from rugby events already present in data.js",
        "status": "ok" if events else "empty",
        "events": events,
        "markets": sum(1 + len((e.get("markets") or {}).get("totals") or []) for e in events),
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"rugby_markets: events={len(events)} markets={out['markets']} status={out['status']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
