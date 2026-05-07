#!/usr/bin/env python3
"""Tier calibration: how well does the model's tier badge match actual ROI?

The v37.025 multi-strategy backtest surfaced a real model issue: the "safe"
and "solid" tiers — which the dashboard advertises as "high-confidence,
low-odd, easy money" — actually lose money historically (ROI -14% / -19%),
while the "out" outsider tier crushes it (+183%). The user-facing badges
are misleading because the model overestimates probabilities at low odds.

This script aggregates `picks_history.jsonl` by tier and writes a JSON
sidecar consumed by the Performance > Stratégies tab so the UI can show
the historical reality next to each tier label. No model retraining
yet — just transparent disclosure.

Output: `tier_calibration.json` with per-tier:
  - n (sample size)
  - wins / losses / voids
  - hit_rate (WR on settled non-void picks)
  - avg_odd, avg_edge_pt
  - roi (flat 1u staking, voids return stake)
  - breakeven_wr (= 1 / avg_odd)
  - calibration_delta_pt (hit_rate - breakeven_wr, in percentage points;
    negative = the tier is overconfident vs the implied probability)
  - profit_per_unit
  - status (one of: profitable / breakeven / overconfident / undersample)
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HISTORY = ROOT / "picks_history.jsonl"
OUT = ROOT / "tier_calibration.json"

MIN_SAMPLE = 30  # below this, the WR estimate is too noisy to label.
TIERS = ("safe", "solid", "value", "big", "out", "watch", "signal")


def _now_iso() -> str:
    return (
        datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    )


def _num(v):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    if x != x or x in (float("inf"), float("-inf")):
        return None
    return x


def load_picks() -> list[dict]:
    if not HISTORY.exists():
        return []
    rows = []
    for line in HISTORY.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return rows


def aggregate(picks: list[dict]) -> dict:
    by_tier: dict[str, dict] = {}
    for tier in TIERS:
        by_tier[tier] = {
            "tier": tier,
            "n": 0,
            "wins": 0,
            "losses": 0,
            "voids": 0,
            "_odds": [],
            "_edges": [],
            "_profit": 0.0,
            "_stake": 0,  # number of unit stakes that resolved (won + lost)
        }
    for p in picks:
        tier = (p.get("tier") or "").lower()
        if tier not in by_tier:
            continue
        result = p.get("result")
        if result not in {"won", "lost", "void"}:
            continue
        odd = _num(p.get("odd_book"))
        edge = _num(p.get("edge"))
        if odd is None or odd <= 1.01:
            continue
        bucket = by_tier[tier]
        bucket["n"] += 1
        bucket["_odds"].append(odd)
        if edge is not None:
            bucket["_edges"].append(edge)
        if result == "won":
            bucket["wins"] += 1
            bucket["_profit"] += odd - 1.0
            bucket["_stake"] += 1
        elif result == "lost":
            bucket["losses"] += 1
            bucket["_profit"] -= 1.0
            bucket["_stake"] += 1
        else:
            bucket["voids"] += 1
    return by_tier


def finalize(by_tier: dict) -> list[dict]:
    out = []
    for tier, b in by_tier.items():
        n = b["n"]
        if n == 0:
            continue
        odds = b["_odds"]
        edges = b["_edges"]
        avg_odd = sum(odds) / len(odds) if odds else 0.0
        avg_edge = sum(edges) / len(edges) if edges else 0.0
        stake = b["_stake"]
        hit_rate = b["wins"] / stake if stake else 0.0
        roi = (b["_profit"] / stake) if stake else 0.0
        breakeven_wr = 1.0 / avg_odd if avg_odd > 0 else 0.0
        calibration_delta_pt = (hit_rate - breakeven_wr) * 100.0
        if n < MIN_SAMPLE:
            status = "undersample"
        elif roi >= 0.05:
            status = "profitable"
        elif roi >= -0.02:
            status = "breakeven"
        else:
            status = "overconfident"
        out.append({
            "tier": tier,
            "n": n,
            "wins": b["wins"],
            "losses": b["losses"],
            "voids": b["voids"],
            "stake": stake,
            "hit_rate": round(hit_rate, 6),
            "avg_odd": round(avg_odd, 4),
            "avg_edge_pt": round(avg_edge * 100, 4),
            "roi": round(roi, 6),
            "profit_units": round(b["_profit"], 4),
            "breakeven_wr": round(breakeven_wr, 6),
            "calibration_delta_pt": round(calibration_delta_pt, 3),
            "status": status,
        })
    # Sort by tier display order (safe → out is the user-visible order).
    order = {t: i for i, t in enumerate(TIERS)}
    out.sort(key=lambda r: order.get(r["tier"], 99))
    return out


def main() -> int:
    picks = load_picks()
    if not picks:
        print("[tier_calibration] picks_history.jsonl missing or empty", file=sys.stderr)
        return 1
    by_tier = aggregate(picks)
    rows = finalize(by_tier)
    overconfident = [r["tier"] for r in rows if r["status"] == "overconfident"]
    payload = {
        "generated_at": _now_iso(),
        "schema": "paris-sportif.tier_calibration.v1",
        "min_sample": MIN_SAMPLE,
        "tiers": rows,
        "overconfident_tiers": overconfident,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"[tier_calibration] wrote {OUT.name} ({len(rows)} tiers)")
    for r in rows:
        cal = r["calibration_delta_pt"]
        print(
            f"  {r['tier']:<8} n={r['n']:>4}  WR={r['hit_rate']*100:5.1f}%  "
            f"avg_odd={r['avg_odd']:5.2f}  breakeven={r['breakeven_wr']*100:5.1f}%  "
            f"delta={cal:+5.1f}pt  ROI={r['roi']*100:+6.2f}%  [{r['status']}]"
        )
    if overconfident:
        print(f"  ⚠ overconfident tiers: {', '.join(overconfident)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
