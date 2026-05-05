#!/usr/bin/env python3
"""Derive NHL playoff-ready markets from patched NHL team/goalie stats.

The feed may label some games simply as ``NHL`` even when the calendar is in a
playoff window. This sidecar keeps the hockey model richer without adding any
network call: it reads ``event.nhl_stats`` already injected in ``data.js``.
"""
from __future__ import annotations

import json
import math
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
OUT = ROOT / "nhl_playoff_markets.json"
OUT_JS = ROOT / "nhl_playoff_markets.js"

TOTAL_LINES = [4.5, 5.5, 6.5, 7.5]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_data() -> dict[str, Any]:
    text = DATA_JS.read_text(encoding="utf-8")
    match = re.search(r"=\s*(\{.*\})\s*;?\s*$", text, re.DOTALL)
    if not match:
        raise RuntimeError("could not parse data.js")
    return json.loads(match.group(1))


def parse_kickoff(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def num(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def sigmoid(value: float) -> float:
    return 1.0 / (1.0 + math.exp(-max(-8.0, min(8.0, value))))


def normal_cdf(x: float, mu: float, sigma: float) -> float:
    if sigma <= 0:
        return 1.0 if x >= mu else 0.0
    return 0.5 * (1.0 + math.erf((x - mu) / (sigma * math.sqrt(2.0))))


def fair_odds(prob: float) -> float:
    return round(1.0 / max(0.01, min(0.99, prob)), 2)


def goalie_adjust(team: dict[str, Any]) -> float:
    goalie = team.get("goalie") or {}
    save_pct = num(goalie.get("save_pct"), 0.905)
    gaa = num(goalie.get("gaa"), 3.0)
    return (save_pct - 0.905) * 5.0 - (gaa - 3.0) * 0.08


def home_away_names(event: dict[str, Any]) -> tuple[str, str]:
    comps = event.get("competitors") or []
    home = next((c for c in comps if c.get("home_away") == "home"), comps[0] if comps else {})
    away = next((c for c in comps if c.get("home_away") == "away"), comps[1] if len(comps) > 1 else {})
    return str(home.get("name") or "Domicile"), str(away.get("name") or "Extérieur")


def project(event: dict[str, Any]) -> dict[str, Any] | None:
    stats = event.get("nhl_stats") or {}
    home = stats.get("home") or {}
    away = stats.get("away") or {}
    if not home or not away:
        return None
    home_name, away_name = home_away_names(event)
    h_attack = num(home.get("gf_per_game"), 3.0)
    h_def = num(home.get("ga_per_game"), 3.0)
    a_attack = num(away.get("gf_per_game"), 3.0)
    a_def = num(away.get("ga_per_game"), 3.0)
    h_goalie = goalie_adjust(home)
    a_goalie = goalie_adjust(away)
    exp_home = max(0.8, (h_attack + a_def) / 2.0 + 0.12 - a_goalie * 0.22)
    exp_away = max(0.8, (a_attack + h_def) / 2.0 - h_goalie * 0.22)
    total_mu = exp_home + exp_away
    point_diff = (num(home.get("points")) - num(away.get("points"))) / 30.0
    l10_diff = (num(home.get("l10_wins")) - num(away.get("l10_wins"))) / 8.0
    goalie_diff = h_goalie - a_goalie
    p_home = sigmoid(0.18 + point_diff + l10_diff + goalie_diff)
    totals = []
    sigma = max(1.35, math.sqrt(total_mu) * 0.68)
    for line in TOTAL_LINES:
        p_over = 1.0 - normal_cdf(line, total_mu, sigma)
        prob = p_over if p_over >= 0.5 else 1.0 - p_over
        totals.append({
            "line": line,
            "pick": "over" if p_over >= 0.5 else "under",
            "probability": round(prob, 4),
            "fair_odds": fair_odds(prob),
        })
    first_period_mu = total_mu * 0.32
    fp_over = 1.0 - normal_cdf(1.5, first_period_mu, max(0.85, math.sqrt(first_period_mu) * 0.7))
    fp_prob = fp_over if fp_over >= 0.5 else 1.0 - fp_over
    return {
        "event_id": event.get("id") or event.get("uid"),
        "kickoff": event.get("date"),
        "league": event.get("league_name") or event.get("league_code"),
        "match": event.get("name") or event.get("shortName"),
        "home": home_name,
        "away": away_name,
        "projection": {
            "home_goals": round(exp_home, 2),
            "away_goals": round(exp_away, 2),
            "total_goals": round(total_mu, 2),
            "home_goalie": (home.get("goalie") or {}).get("name"),
            "away_goalie": (away.get("goalie") or {}).get("name"),
        },
        "markets": {
            "winner": {
                "pick": "home" if p_home >= 0.5 else "away",
                "probability": round(max(p_home, 1.0 - p_home), 4),
                "fair_odds": fair_odds(max(p_home, 1.0 - p_home)),
            },
            "totals": totals,
            "first_period_total_1_5": {
                "pick": "over" if fp_over >= 0.5 else "under",
                "probability": round(fp_prob, 4),
                "fair_odds": fair_odds(fp_prob),
            },
        },
    }


def main() -> int:
    data = parse_data()
    now = datetime.now(timezone.utc)
    events: list[dict[str, Any]] = []
    for day_events in (data.get("days") or {}).values():
        for event in day_events or []:
            if str(event.get("sport") or "").lower() != "hockey":
                continue
            if "nhl" not in str(event.get("league_code") or event.get("league_name") or "").lower():
                continue
            if event.get("completed"):
                continue
            kickoff = parse_kickoff(event.get("date"))
            if kickoff and kickoff < now - timedelta(minutes=10):
                continue
            projection = project(event)
            if projection:
                events.append(projection)
    out = {
        "generated_at": now_iso(),
        "source": "derived from nhl_stats already patched into data.js",
        "status": "ok" if events else "empty",
        "events": events,
        "markets": sum(2 + len(((e.get("markets") or {}).get("totals") or [])) for e in events),
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    compact = {
        "generated_at": out["generated_at"],
        "status": out["status"],
        "event_count": len(events),
        "market_count": out["markets"],
        "events": {
            str(e.get("event_id")): [
                e.get("match"),
                e.get("projection") or {},
                e.get("markets") or {},
            ]
            for e in events if e.get("event_id")
        },
    }
    OUT_JS.write_text("window.NHL_PLAYOFF_MARKETS = " + json.dumps(compact, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    print(f"nhl_playoff_markets: events={len(events)} markets={out['markets']} status={out['status']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
