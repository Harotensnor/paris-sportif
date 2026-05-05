#!/usr/bin/env python3
"""Measure the core "night mission" metrics in one deterministic snapshot.

Output: night_metrics.json

This is intentionally read-only for the betting model. It gives the sprint log
and final report a stable source of truth across data refresh races.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
BACKTEST = ROOT / "backtest_report_v2.json"
WINAMAX_MARKETS = ROOT / "winamax_markets.json"
HEALTH = ROOT / "health.json"
OUT = ROOT / "night_metrics.json"


def _load_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _load_data() -> dict:
    txt = DATA_JS.read_text(encoding="utf-8")
    m = re.search(r"=\s*(\{.*\})\s*;?\s*$", txt, re.DOTALL)
    if not m:
        raise SystemExit("Cannot parse data.js")
    return json.loads(m.group(1))


def _events(data: dict) -> list[dict]:
    return [ev for arr in (data.get("days") or {}).values() for ev in (arr or [])]


def _has_h2h(ev: dict) -> bool:
    h = ev.get("h2h")
    if isinstance(h, list):
        return len(h) > 0
    if isinstance(h, dict):
        meetings = h.get("meetings") or h.get("games") or h.get("items") or []
        return len(meetings) > 0
    return False


def _has_form_l10(ev: dict) -> bool:
    return any(c.get("team_form_l10") for c in (ev.get("competitors") or []) if isinstance(c, dict))


def _markets_more_than_1n2(ev: dict) -> bool:
    markets = (ev.get("winamax") or {}).get("markets")
    if isinstance(markets, dict):
        return len(markets) > 1
    if isinstance(markets, list):
        fams = {m.get("market") or m.get("family") for m in markets if isinstance(m, dict)}
        return len([f for f in fams if f]) > 1
    return False


def _has_xg(ev: dict) -> bool:
    return any(
        c.get("xg_stats") or c.get("fbref_xg") or c.get("xg_for_avg") is not None
        for c in (ev.get("competitors") or [])
        if isinstance(c, dict)
    )


def _has_starter_signal(ev: dict) -> bool:
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


def _detail_market_keys(markets: dict | list | None) -> list[str]:
    if isinstance(markets, dict):
        return sorted(str(k) for k in markets.keys() if k and k != "1n2")
    if isinstance(markets, list):
        return sorted({
            str(m.get("market") or m.get("family"))
            for m in markets
            if isinstance(m, dict) and (m.get("market") or m.get("family"))
        })
    return []


def _is_winamax_exact(ev: dict) -> bool:
    wnx = ev.get("winamax") or {}
    markets = wnx.get("markets") or {}
    one = markets.get("1n2") if isinstance(markets, dict) else {}
    return bool(
        wnx.get("available") is True
        and wnx.get("match_id")
        and isinstance(one, dict)
        and isinstance(one.get("home"), (int, float))
        and isinstance(one.get("away"), (int, float))
    )


def main() -> int:
    data = _load_data()
    events = _events(data)
    bt = _load_json(BACKTEST, {})
    wm = _load_json(WINAMAX_MARKETS, {})
    health = _load_json(HEALTH, {})
    wm_matches = wm.get("matches") if isinstance(wm, dict) else {}
    if not isinstance(wm_matches, dict):
        wm_matches = {}

    exact = sum(1 for ev in events if _is_winamax_exact(ev))
    available = sum(1 for ev in events if (ev.get("winamax") or {}).get("available") is True)
    detailed_market_matches = sum(
        1 for v in wm_matches.values()
        if isinstance(v, dict) and len(v.get("odds") or {}) > 1
    )
    detailed_by_sport: dict[str, dict] = {}
    market_family_counts: dict[str, int] = {}
    for ev in events:
        if ev.get("completed"):
            continue
        sport = ev.get("sport") or "unknown"
        wnx = ev.get("winamax") or {}
        detail_keys = _detail_market_keys(wnx.get("markets"))
        row = detailed_by_sport.setdefault(sport, {"exact": 0, "detailed": 0, "families": {}})
        if wnx.get("match_id"):
            row["exact"] += 1
        if detail_keys:
            row["detailed"] += 1
            for key in detail_keys:
                row["families"][key] = row["families"].get(key, 0) + 1
                market_family_counts[key] = market_family_counts.get(key, 0) + 1
    for row in detailed_by_sport.values():
        row["detailed_ratio"] = round(row["detailed"] / row["exact"], 4) if row["exact"] else 0
        row["families"] = dict(sorted(row["families"].items(), key=lambda kv: kv[1], reverse=True)[:12])
    detailed_ratio_vs_exact = round(detailed_market_matches / exact, 4) if exact else 0
    referee_named = sum(1 for ev in events if ev.get("referee"))
    referee_context = sum(1 for ev in events if ev.get("referee_context"))
    referee_signal = sum(1 for ev in events if ev.get("referee") or ev.get("referee_context"))
    smart_money_count = sum(1 for ev in events if ev.get("smart_money"))
    smart_money_floor = max(5, round(len(events) * 0.02))
    smart_money_status = "rare_event" if smart_money_count < smart_money_floor else "active"

    calculated_at = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    metrics = {
        "generated_at": calculated_at,
        "calculated_at": calculated_at,
        "source_of_truth": "data.js",
        "data_generated_at": data.get("generated_at"),
        "data_today_field": data.get("today"),
        "events": {
            "total": len(events),
            "upcoming": sum(1 for ev in events if not ev.get("completed")),
            "winamax_available": available,
            "winamax_exact": exact,
            "winamax_exact_ratio": round(exact / available, 4) if available else 0,
            "markets_more_than_1n2": sum(1 for ev in events if _markets_more_than_1n2(ev)),
            "form_l10": sum(1 for ev in events if _has_form_l10(ev)),
            "h2h": sum(1 for ev in events if _has_h2h(ev)),
            "lineups": sum(1 for ev in events if _has_starter_signal(ev)),
            "football_lineups": sum(1 for ev in events if ev.get("sport") == "football" and ev.get("lineups")),
            "starter_signals": sum(1 for ev in events if _has_starter_signal(ev)),
            "clubelo": sum(1 for ev in events if ev.get("clubelo")),
            "weather": sum(1 for ev in events if ev.get("weather")),
            "injuries": sum(1 for ev in events if ev.get("injuries")),
            "referee": referee_signal,
            "referee_named": referee_named,
            "referee_context": referee_context,
            "referee_signal": referee_signal,
            "fd_calibration": sum(1 for ev in events if ev.get("fd_calibration")),
            "fd_closing_odds": sum(1 for ev in events if ev.get("fd_closing_odds")),
            "xg": sum(1 for ev in events if _has_xg(ev)),
            "smart_money": smart_money_count,
        },
        "signal_health": {
            "referee": {
                "effective_events": referee_signal,
                "named_events": referee_named,
                "context_events": referee_context,
                "note": "referee is effective coverage: named referee or referee_context usable by the model.",
            },
            "smart_money": {
                "events": smart_money_count,
                "status": smart_money_status,
                "note": "Smart money is intentionally rare; low count is OK when odds movement does not confirm a strong signal.",
            },
        },
        "winamax_markets": {
            "matches": len(wm_matches),
            "detailed_market_matches": detailed_market_matches,
            "detailed_ratio_vs_exact": detailed_ratio_vs_exact,
            "gap_to_50pct_exact": round(max(0, 0.50 - detailed_ratio_vs_exact), 4),
            "recommended_detail_fetch_cap": 220 if detailed_ratio_vs_exact < 0.25 else 150 if detailed_ratio_vs_exact < 0.50 else 90,
            "detail_by_sport": dict(sorted(detailed_by_sport.items())),
            "market_family_counts": dict(sorted(market_family_counts.items(), key=lambda kv: kv[1], reverse=True)[:20]),
        },
        "backtest": {
            "overall_roi_pct": (bt.get("overall") or {}).get("flat_roi_pct"),
            "overall_brier": (bt.get("overall") or {}).get("brier"),
            "by_sport_roi_pct": {
                sport: stats.get("flat_roi_pct")
                for sport, stats in (bt.get("by_sport") or {}).items()
                if isinstance(stats, dict)
            },
            "cold_sports": [
                sport for sport, stats in (bt.get("by_sport") or {}).items()
                if isinstance(stats, dict)
                and stats.get("n", 0) >= 10
                and stats.get("flat_roi_pct", 0) < -10
            ],
        },
        "health": {
            "status": health.get("overall") or health.get("status"),
            "warnings": len(health.get("warnings") or []),
            "pipeline_drift": (health.get("pipeline_drift") or {}).get("status"),
        },
    }
    OUT.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(metrics, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
