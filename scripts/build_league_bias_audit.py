#!/usr/bin/env python3
"""Build a league-bias audit from the historical backtest.

The frontend already applies a small reliability penalty when a league has
enough history and Brier > 0.25. This sidecar makes that behaviour explicit:
which leagues are trusted, watched, or auto-deprioritized, and how much of the
current slate sits in those buckets.
"""
from __future__ import annotations

import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
BACKTEST = ROOT / "backtest_report_v2.json"
DATA_JS = ROOT / "data.js"
OUT = ROOT / "league_bias_audit.json"

MIN_DEPRIORITIZE_N = 20
MIN_WATCH_N = 10
DEPRIORITIZE_BRIER = 0.25
WATCH_BRIER = 0.245


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _load_data_js() -> dict[str, Any]:
    if not DATA_JS.exists():
        return {}
    txt = DATA_JS.read_text(encoding="utf-8")
    m = re.search(r"=\s*(\{.*\})\s*;?\s*$", txt, re.DOTALL)
    if not m:
        return {}
    return json.loads(m.group(1))


def _iter_events(data: dict[str, Any]):
    for _day, events in (data.get("days") or {}).items():
        for ev in events or []:
            yield ev


def _classify(stats: dict[str, Any]) -> tuple[str, str, float]:
    n = int(stats.get("n") or 0)
    brier = float(stats.get("brier") or 0)
    roi = float(stats.get("flat_roi_pct") or 0)
    kelly = float(stats.get("kelly_pnl") or 0)
    if n >= MIN_DEPRIORITIZE_N and brier > DEPRIORITIZE_BRIER:
        penalty = min(0.08, max(0.02, (brier - DEPRIORITIZE_BRIER) * 0.6))
        return "deprioritize", f"Brier {brier:.3f} > {DEPRIORITIZE_BRIER:.2f} sur {n} picks", round(penalty, 3)
    if n >= MIN_WATCH_N and (brier > WATCH_BRIER or roi < -15 or kelly < -10):
        return "watch", f"Signal fragile: Brier {brier:.3f}, ROI {roi:+.1f}%, Kelly {kelly:+.1f}u", 0.0
    if n >= MIN_DEPRIORITIZE_N and brier < 0.225 and roi >= 0:
        return "trusted", f"Calibration solide: Brier {brier:.3f}, ROI {roi:+.1f}%", 0.0
    return "neutral", "Sample encore neutre ou insuffisant", 0.0


def build() -> dict[str, Any]:
    bt = _load_json(BACKTEST)
    data = _load_data_js()
    by_league = bt.get("by_league") or {}

    upcoming_by_league = Counter()
    total_by_league = Counter()
    for ev in _iter_events(data):
        code = str(ev.get("league_code") or "unknown")
        total_by_league[code] += 1
        if not ev.get("completed"):
            upcoming_by_league[code] += 1

    rows = []
    status_counts = Counter()
    current_status_counts = Counter()
    for code, stats in sorted(by_league.items()):
        if not isinstance(stats, dict):
            continue
        status, reason, penalty = _classify(stats)
        n = int(stats.get("n") or 0)
        row = {
            "league_code": code,
            "status": status,
            "reason": reason,
            "penalty": penalty,
            "n": n,
            "wins": int(stats.get("wins") or 0),
            "losses": int(stats.get("losses") or 0),
            "win_rate": stats.get("win_rate"),
            "flat_roi_pct": stats.get("flat_roi_pct"),
            "kelly_pnl": stats.get("kelly_pnl"),
            "brier": stats.get("brier"),
            "logloss": stats.get("logloss"),
            "avg_cote": stats.get("avg_cote"),
            "current_events": total_by_league.get(code, 0),
            "current_upcoming": upcoming_by_league.get(code, 0),
        }
        status_counts[status] += 1
        if row["current_upcoming"]:
            current_status_counts[status] += row["current_upcoming"]
        rows.append(row)

    rows.sort(key=lambda r: (
        {"deprioritize": 0, "watch": 1, "neutral": 2, "trusted": 3}.get(r["status"], 9),
        -(r.get("current_upcoming") or 0),
        -(r.get("n") or 0),
        -(r.get("brier") or 0),
    ))
    risky_current = [
        r for r in rows
        if r["status"] in {"deprioritize", "watch"} and r.get("current_upcoming")
    ]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "schema": "league_bias_audit_v1",
        "source": "backtest_report_v2.by_league",
        "policy": {
            "deprioritize": f"n >= {MIN_DEPRIORITIZE_N} and brier > {DEPRIORITIZE_BRIER}",
            "watch": f"n >= {MIN_WATCH_N} and (brier > {WATCH_BRIER} or roi < -15% or kelly < -10u)",
            "frontend_penalty": "predictMatch subtracts 2-8pt reliability for deprioritize leagues",
        },
        "summary": {
            "leagues_total": len(rows),
            "status_counts": dict(status_counts),
            "current_upcoming_by_status": dict(current_status_counts),
            "risky_current_leagues": len(risky_current),
            "risky_current_events": sum(r.get("current_upcoming") or 0 for r in risky_current),
        },
        "leagues": rows,
        "risky_current": risky_current[:20],
        "trusted": [r for r in rows if r["status"] == "trusted"][:20],
    }


def main() -> int:
    report = build()
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    summary = report.get("summary") or {}
    print(
        "[league-bias] "
        f"{summary.get('leagues_total')} leagues · "
        f"{summary.get('status_counts')} · "
        f"risky_current_events={summary.get('risky_current_events')}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
