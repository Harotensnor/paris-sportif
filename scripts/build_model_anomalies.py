from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts._data_io import ROOT, load_data_js, iter_events

OUT_JSONL = ROOT / "anomalies.jsonl"
OUT_SUMMARY = ROOT / "model_anomalies_summary.json"


def _best_1n2_odds(event: dict[str, Any]) -> tuple[float, float, float] | None:
    markets = ((event.get("winamax") or {}).get("markets") or {})
    m = markets.get("1n2") or {}
    try:
        h = float(m.get("home") or 0)
        d = float(m.get("draw") or 0)
        a = float(m.get("away") or 0)
    except (TypeError, ValueError):
        return None
    if min(h, d, a) <= 1:
        return None
    return h, d, a


def build() -> dict[str, Any]:
    data = load_data_js()
    generated = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    rows: list[dict[str, Any]] = []
    scanned = 0
    for _, event in iter_events(data):
        odds = _best_1n2_odds(event)
        if not odds:
            continue
        scanned += 1
        inv = [1 / x for x in odds]
        overround = sum(inv)
        if overround < 0.98 or overround > 1.22:
            rows.append({
                "ts": generated,
                "type": "market_overround_outlier",
                "match_id": event.get("id"),
                "sport": event.get("sport"),
                "league": event.get("league_code") or event.get("league_name"),
                "home": ((event.get("competitors") or [{}])[0] or {}).get("name"),
                "away": ((event.get("competitors") or [{}, {}])[1] or {}).get("name") if len(event.get("competitors") or []) > 1 else None,
                "odds": {"home": odds[0], "draw": odds[1], "away": odds[2]},
                "overround": round(overround, 4),
                "note": "Runtime model-vs-market anomalies are capped in app.js and surfaced on Santé.",
            })
    OUT_JSONL.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8")
    summary = {
        "schema": "model_anomalies.v1",
        "generated_at": generated,
        "scanned_1n2_events": scanned,
        "market_overround_outliers": len(rows),
        "runtime_guard": {
            "gap_threshold": 0.15,
            "cap_vs_market": 0.12,
            "behavior": "cap probability and keep pick visible with anomaly badge",
        },
    }
    OUT_SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return summary


def main() -> int:
    summary = build()
    print(f"[model_anomalies] scanned={summary['scanned_1n2_events']} outliers={summary['market_overround_outliers']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
