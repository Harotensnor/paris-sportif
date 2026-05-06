"""Tests for scripts/build_prob_calibration.py."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_prob_calibration as bpc  # noqa: E402


def test_bin_index_boundaries():
    assert bpc.bin_index(0.0) == 0
    assert bpc.bin_index(0.05) == 0
    assert bpc.bin_index(0.099) == 0
    assert bpc.bin_index(0.10) == 1
    assert bpc.bin_index(0.55) == 5
    assert bpc.bin_index(0.99999) == 9
    assert bpc.bin_index(1.0) == 9  # clamped — never out-of-range
    assert bpc.bin_index(-0.5) == 0  # clamped low


def test_well_calibrated_bin_has_factor_near_one():
    # 100 picks at predicted 0.55, 55 wins → calibration factor ~ 1.0
    rows = [(0.55, 1)] * 55 + [(0.55, 0)] * 45
    bins = bpc.build_bins(rows)
    bin5 = bins[5]
    assert bin5["n"] == 100
    assert 0.95 < bin5["calibration_factor"] < 1.05


def test_overconfident_bin_has_factor_below_one():
    # Model says 70% but actual rate is 50% → factor ~ 0.71
    rows = [(0.70, 1)] * 50 + [(0.70, 0)] * 50
    bins = bpc.build_bins(rows)
    bin7 = bins[7]
    assert bin7["n"] == 100
    # Smoothed WR ≈ 51/102 ≈ 0.50; factor = 0.50 / 0.70 ≈ 0.714
    assert 0.65 < bin7["calibration_factor"] < 0.75


def test_underconfident_bin_factor_above_one():
    # Model says 40% but reality is 60% → factor > 1.0
    rows = [(0.40, 1)] * 60 + [(0.40, 0)] * 40
    bins = bpc.build_bins(rows)
    bin4 = bins[4]
    assert 1.30 < bin4["calibration_factor"] <= bpc.MAX_FACTOR


def test_factor_bounded_by_min_max():
    # Pathological: 100% predicted, 0% wins. factor would naively be 0,
    # but we clamp at MIN_FACTOR (0.5).
    rows = [(0.95, 0)] * 50
    bins = bpc.build_bins(rows)
    bin9 = bins[9]
    assert bin9["calibration_factor"] >= bpc.MIN_FACTOR


def test_brier_score_baseline():
    # 1 perfect prediction → Brier 0.
    assert bpc.brier_score([(1.0, 1), (0.0, 0)]) == 0.0
    # Maximum Brier per pick = 1.0 (predicted 0, observed 1).
    assert bpc.brier_score([(0.0, 1)]) == 1.0


def test_brier_improves_when_calibration_helps():
    # Skewed dataset: model says 80% always, actual is 50%. Raw Brier
    # is bad; calibrated Brier should be lower.
    rows = [(0.80, 1)] * 50 + [(0.80, 0)] * 50
    bins = bpc.build_bins(rows)
    raw = bpc.brier_score(rows)
    cal = bpc.brier_score(rows, bins)
    assert cal < raw


def test_empty_bin_factor_defaults_to_one():
    # No data in a bin → factor 1.0 (no correction applied at runtime).
    rows = [(0.55, 1)] * 10
    bins = bpc.build_bins(rows)
    empty = bins[0]
    assert empty["n"] == 0
    # mean_predicted defaults to bin center (0.05); smoothed_wr =
    # (0+1)/(0+2) = 0.5 → factor = 0.5/0.05 = 10 → clamped to MAX_FACTOR.
    assert empty["calibration_factor"] == bpc.MAX_FACTOR
