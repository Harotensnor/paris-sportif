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

Output: `prob_calibration.json` with bins + Brier score before/after.

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


def load_settled() -> list[tuple[float, int]]:
    """Return [(prob_model, outcome_int)] for won/lost picks. Voids skipped."""
    rows: list[tuple[float, int]] = []
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
        rows.append((prob, 1 if result == "won" else 0))
    return rows


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


def main() -> int:
    rows = load_settled()
    if not rows:
        print("[prob_calibration] no settled picks", file=sys.stderr)
        return 1
    bins = build_bins(rows)
    brier_raw = brier_score(rows)
    brier_calibrated = brier_score(rows, bins)
    payload = {
        "generated_at": _now_iso(),
        "schema": "paris-sportif.prob_calibration.v1",
        "n_settled": len(rows),
        "n_bins": N_BINS,
        "bins": bins,
        "brier_raw": round(brier_raw, 6),
        "brier_calibrated": round(brier_calibrated, 6),
        "brier_delta": round(brier_raw - brier_calibrated, 6),
        # Negative delta means calibration HURT; positive means it helped.
        "applies_at_runtime": False,  # Helper exposed but not yet plumbed into predictMatch.
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"[prob_calibration] wrote {OUT.name} (n={len(rows)}, bins={N_BINS})")
    print(f"  Brier raw         : {brier_raw:.4f}")
    print(f"  Brier calibrated  : {brier_calibrated:.4f}")
    print(f"  Δ (improvement)   : {brier_raw - brier_calibrated:+.4f}")
    print(f"  Bin map (predicted → empirical):")
    for b in bins:
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
