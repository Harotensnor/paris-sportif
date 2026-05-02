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


def main() -> int:
    data = _load_data()
    events = _events(data)
    bt = _load_json(BACKTEST, {})
    wm = _load_json(WINAMAX_MARKETS, {})
    health = _load_json(HEALTH, {})
    wm_matches = wm.get("matches") if isinstance(wm, dict) else {}
    if not isinstance(wm_matches, dict):
        wm_matches = {}

    exact = sum(1 for ev in events if (ev.get("winamax") or {}).get("match_id"))
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

    metrics = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "events": {
            "total": len(events),
            "upcoming": sum(1 for ev in events if not ev.get("completed")),
            "winamax_available": available,
            "winamax_exact": exact,
            "winamax_exact_ratio": round(exact / available, 4) if available else 0,
            "markets_more_than_1n2": sum(1 for ev in events if _markets_more_than_1n2(ev)),
            "form_l10": sum(1 for ev in events if _has_form_l10(ev)),
            "h2h": sum(1 for ev in events if _has_h2h(ev)),
            "lineups": sum(1 for ev in events if ev.get("lineups")),
            "clubelo": sum(1 for ev in events if ev.get("clubelo")),
            "weather": sum(1 for ev in events if ev.get("weather")),
            "injuries": sum(1 for ev in events if ev.get("injuries")),
            "referee": sum(1 for ev in events if ev.get("referee")),
        },
        "winamax_markets": {
            "matches": len(wm_matches),
            "detailed_market_matches": detailed_market_matches,
            "detailed_ratio_vs_exact": detailed_ratio_vs_exact,
            "gap_to_50pct_exact": round(max(0, 0.50 - detailed_ratio_vs_exact), 4),
            "recommended_detail_fetch_cap": 160 if detailed_ratio_vs_exact < 0.25 else 90 if detailed_ratio_vs_exact < 0.50 else 45,
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
            "status": health.get("status"),
            "warnings": len(health.get("warnings") or []),
            "pipeline_drift": (health.get("pipeline_drift") or {}).get("status"),
        },
    }
    OUT.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(metrics, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
