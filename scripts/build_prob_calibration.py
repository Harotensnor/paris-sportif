#!/usr/bin/env python3
"""Build a probability calibration map from picks_history.jsonl.

The v37.028 tier-calibration audit confirmed the model overestimates
probabilities at low/medium odds (safe/solid/value tiers all lose
money despite positive edge). This script fits a histogram-binning
calibration that maps each predicted probability bucket to the actual
empirical win rate observed historically. A runtime helper in
legacy-app.js can then apply the correction wherever raw model probs
flow into the UI (tier classification, edge display, Kelly sizing,
combo legs).

Method: 10 equal-width bins on [0, 1] with smoothing (Beta(α=1, β=1)
prior, equivalent to Laplace add-one). Each bin reports:
  - n (sample size)
  - mean predicted prob
  - actual win rate
  - smoothed win rate (Bayesian estimate, more robust on low-n bins)
  - calibration_factor (smoothed_wr / mean_pred, capped to [0.5, 1.5])

Output: `prob_calibration.json` with global bins, sport-specific bins and
Brier score before/after.

The runtime helper interpolates linearly between bin centers. We do
NOT yet apply the correction inside predictMatch — that's a separate
chantier. For now we expose `_calibrateProb(p)` and surface the
calibration curve in the dashboard so the user understands the
gap.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HISTORY = ROOT / "picks_history.jsonl"
OUT = ROOT / "prob_calibration.json"

# 10 buckets of width 0.1 covering [0, 1]. We center each bin on the
# midpoint of its range so the runtime helper can lerp between centers.
N_BINS = 10
ALPHA = 1.0  # Beta prior shape (Laplace smoothing for stability).
BETA = 1.0
# Cap the multiplicative correction so a noisy bin can't trash a bet.
# 0.5 → 1.5 means we never push the corrected prob more than 50% off
# the model's raw output, even if the bin's empirical WR suggests a
# bigger swing.
MIN_FACTOR = 0.5
MAX_FACTOR = 1.5


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


def load_settled_records() -> list[dict]:
    """Return won/lost picks with prob, outcome and sport. Voids skipped.

    Filters obviously-corrupt rows from older versions of picks_history_lib.py
    that wrote prob_model=0.999 on long-shot outsiders (odd > 10). A real
    99% confidence at odd 10+ is mathematically impossible (it would mean
    a 9x+ edge), so we treat these as data corruption and exclude them
    from the calibration training. Without this, the 0.9-1.0 bin gets
    polluted with 44 outsider rows that drag the calibration map's
    factor down for legitimate 90%+ predictions.
    """
    rows: list[dict] = []
    skipped_corrupt = 0
    if not HISTORY.exists():
        return rows
    for line in HISTORY.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            p = json.loads(line)
        except json.JSONDecodeError:
            continue
        result = p.get("result")
        if result not in {"won", "lost"}:
            continue
        prob = _num(p.get("prob_model"))
        if prob is None or prob <= 0 or prob >= 1:
            continue
        odd = _num(p.get("odd_book"))
        # Sanity gate: prob >= 0.95 at odd > 10 cannot coexist on real
        # markets. Skip these — they are leftovers from a fixed bug.
        if prob >= 0.95 and odd is not None and odd > 10:
            skipped_corrupt += 1
            continue
        rows.append({
            "prob": prob,
            "outcome": 1 if result == "won" else 0,
            "sport": str(p.get("sport") or "unknown").lower(),
            "market": str(p.get("market_key") or p.get("market") or "unknown").lower(),
        })
    if skipped_corrupt:
        print(
            f"[prob_calibration] skipped {skipped_corrupt} corrupt rows "
            f"(prob>=0.95 at odd>10 — historical artifact)"
        )
    return rows


def load_settled() -> list[tuple[float, int]]:
    return [(r["prob"], r["outcome"]) for r in load_settled_records()]


def bin_index(prob: float) -> int:
    if prob >= 1.0:
        return N_BINS - 1
    if prob < 0:
        return 0
    return min(N_BINS - 1, int(prob * N_BINS))


def build_bins(rows: list[tuple[float, int]]) -> list[dict]:
    sums = [{"n": 0, "wins": 0, "pred_sum": 0.0} for _ in range(N_BINS)]
    for prob, outcome in rows:
        idx = bin_index(prob)
        sums[idx]["n"] += 1
        sums[idx]["wins"] += outcome
        sums[idx]["pred_sum"] += prob
    bins = []
    for idx, b in enumerate(sums):
        lower = idx / N_BINS
        upper = (idx + 1) / N_BINS
        center = (lower + upper) / 2.0
        n = b["n"]
        wins = b["wins"]
        mean_pred = b["pred_sum"] / n if n else center
        # Beta(α, β) posterior mean: (wins + α) / (n + α + β)
        smoothed_wr = (wins + ALPHA) / (n + ALPHA + BETA) if n + ALPHA + BETA > 0 else center
        actual_wr = wins / n if n else None
        # calibration_factor multiplies the predicted prob to land at
        # the empirical WR. Skip when no data — runtime defaults to 1.0.
        if mean_pred > 0:
            factor = smoothed_wr / mean_pred
            factor = max(MIN_FACTOR, min(MAX_FACTOR, factor))
        else:
            factor = 1.0
        bins.append({
            "lower": round(lower, 4),
            "upper": round(upper, 4),
            "center": round(center, 4),
            "n": n,
            "wins": wins,
            "actual_wr": round(actual_wr, 6) if actual_wr is not None else None,
            "smoothed_wr": round(smoothed_wr, 6),
            "mean_predicted": round(mean_pred, 6),
            "calibration_factor": round(factor, 4),
        })
    return bins


def brier_score(rows: list[tuple[float, int]], bins: list[dict] | None = None) -> float:
    """Return mean Brier (lower is better). If bins is given, apply
    the calibration map first to assess whether calibration would help."""
    if not rows:
        return 0.0
    if bins is None:
        return sum((p - o) ** 2 for p, o in rows) / len(rows)
    factors = {(b["lower"], b["upper"]): b["calibration_factor"] for b in bins}
    total = 0.0
    for prob, outcome in rows:
        idx = bin_index(prob)
        b = bins[idx]
        adjusted = max(0.001, min(0.999, prob * b["calibration_factor"]))
        total += (adjusted - outcome) ** 2
    return total / len(rows)


def build_group_report(rows: list[tuple[float, int]]) -> dict:
    bins = build_bins(rows)
    brier_raw = brier_score(rows)
    brier_calibrated = brier_score(rows, bins)
    return {
        "n_settled": len(rows),
        "bins": bins,
        "brier_raw": round(brier_raw, 6),
        "brier_calibrated": round(brier_calibrated, 6),
        "brier_delta": round(brier_raw - brier_calibrated, 6),
    }


def build_bins_by_sport(records: list[dict]) -> dict[str, dict]:
    grouped: dict[str, list[tuple[float, int]]] = {}
    for row in records:
        sport = str(row.get("sport") or "unknown").lower()
        grouped.setdefault(sport, []).append((row["prob"], row["outcome"]))
    return {
        sport: build_group_report(rows)
        for sport, rows in sorted(grouped.items())
    }


# Sprint 68 — calibration per-market (1n2, ou, btts, teamTotal, dnb, etc.)
# Pour chaque marche avec >= 30 picks settled, on construit un set de bins
# isole. Le runtime helper _calibrateProb peut alors choisir le bon set selon
# le marketKey du pick courant au lieu d'appliquer aveuglement les bins 1n2
# aux marches derives (qui produisait l'edge fantome Juventus +18pt).
def build_bins_by_market(records: list[dict], min_n: int = 30) -> dict[str, dict]:
    grouped: dict[str, list[tuple[float, int]]] = {}
    for row in records:
        market = str(row.get("market") or "unknown").lower()
        grouped.setdefault(market, []).append((row["prob"], row["outcome"]))
    return {
        market: build_group_report(rows)
        for market, rows in sorted(grouped.items())
        if len(rows) >= min_n
    }


def main() -> int:
    records = load_settled_records()
    rows = [(r["prob"], r["outcome"]) for r in records]
    if not rows:
        print("[prob_calibration] no settled picks", file=sys.stderr)
        return 1
    global_report = build_group_report(rows)
    by_sport = build_bins_by_sport(records)
    # Sprint 68 — bins per-market (1n2, ou, btts, teamTotal, dnb, ...)
    by_market = build_bins_by_market(records)
    payload = {
        "generated_at": _now_iso(),
        "schema": "paris-sportif.prob_calibration.v3",
        "n_settled": len(rows),
        "n_bins": N_BINS,
        "bins": global_report["bins"],
        "bins_by_sport": by_sport,
        "bins_by_market": by_market,
        "brier_raw": global_report["brier_raw"],
        "brier_calibrated": global_report["brier_calibrated"],
        "brier_delta": global_report["brier_delta"],
        # Negative delta means calibration HURT; positive means it helped.
        "applies_at_runtime": True,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"[prob_calibration] wrote {OUT.name} (n={len(rows)}, bins={N_BINS})")
    print(f"  Brier raw         : {global_report['brier_raw']:.4f}")
    print(f"  Brier calibrated  : {global_report['brier_calibrated']:.4f}")
    print(f"  Delta improvement : {global_report['brier_delta']:+.4f}")
    print(f"  Sports calibrated : {', '.join(sorted(by_sport))}")
    print(f"  Bin map (predicted -> empirical):")
    for b in global_report["bins"]:
        if b["n"] == 0:
            print(f"    [{b['lower']:.1f}, {b['upper']:.1f})  empty")
            continue
        print(
            f"    [{b['lower']:.1f}, {b['upper']:.1f})  n={b['n']:>4}  "
            f"pred={b['mean_predicted']*100:5.1f}%  emp={b['smoothed_wr']*100:5.1f}%  "
            f"factor={b['calibration_factor']:.3f}"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
