"""Tests for scripts/build_tier_calibration.py.

Locks the math (breakeven WR, calibration delta) and the
overconfident/profitable status mapping so the dashboard's transparent
disclosure of "tier badge ROI" stays correct.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_tier_calibration as btc  # noqa: E402


def _make_pick(tier="safe", odd=1.40, edge=0.05, result="won"):
    return {
        "tier": tier,
        "odd_book": odd,
        "edge": edge,
        "result": result,
        "match_id": "m",
        "settled_at": "2026-01-01T00:00:00Z",
    }


def test_aggregate_counts_won_lost_void():
    picks = [
        _make_pick(result="won"),
        _make_pick(result="won"),
        _make_pick(result="lost"),
        _make_pick(result="void"),
    ]
    by = btc.aggregate(picks)
    assert by["safe"]["wins"] == 2
    assert by["safe"]["losses"] == 1
    assert by["safe"]["voids"] == 1
    assert by["safe"]["n"] == 4


def test_aggregate_skips_unknown_tiers_and_bad_odds():
    picks = [
        _make_pick(tier="random", result="won"),
        _make_pick(odd=1.0, result="won"),
        _make_pick(odd=0.5, result="won"),
        _make_pick(result="pending"),
    ]
    by = btc.aggregate(picks)
    for t in by.values():
        assert t["n"] == 0


def test_finalize_overconfident_label():
    # avg odd 1.39, hit_rate 60% → breakeven = 71.9%, delta = -11.9pt → ROI < -2%
    # Explicitly construct n=40 to exceed MIN_SAMPLE.
    picks = []
    for _ in range(24):
        picks.append(_make_pick(odd=1.39, result="won"))
    for _ in range(16):
        picks.append(_make_pick(odd=1.39, result="lost"))
    by = btc.aggregate(picks)
    rows = btc.finalize(by)
    safe = next(r for r in rows if r["tier"] == "safe")
    assert safe["n"] == 40
    assert safe["wins"] == 24
    assert abs(safe["hit_rate"] - 0.60) < 1e-9
    # 60% WR at avg odd 1.39 → ROI = (24*0.39 + 16*-1)/40 = -0.166 → -16.6%
    assert -0.20 < safe["roi"] < -0.10
    assert safe["status"] == "overconfident"
    assert safe["calibration_delta_pt"] < -5  # really overconfident


def test_finalize_profitable_label_for_outsiders():
    # avg odd 13.5, hit_rate 16% → breakeven = 7.4%, delta = +8.6pt → big ROI
    picks = []
    for _ in range(8):
        picks.append(_make_pick(tier="out", odd=13.5, result="won"))
    for _ in range(42):
        picks.append(_make_pick(tier="out", odd=13.5, result="lost"))
    by = btc.aggregate(picks)
    rows = btc.finalize(by)
    out = next(r for r in rows if r["tier"] == "out")
    assert out["n"] == 50
    # ROI = (8 * 12.5 + 42 * -1) / 50 = (100 - 42) / 50 = +1.16 → +116%
    assert out["roi"] > 0.5
    assert out["status"] == "profitable"


def test_finalize_undersample_when_n_below_threshold():
    picks = [_make_pick(odd=1.40, result="won") for _ in range(5)]
    by = btc.aggregate(picks)
    rows = btc.finalize(by)
    safe = next((r for r in rows if r["tier"] == "safe"), None)
    assert safe is not None
    assert safe["n"] == 5
    assert safe["status"] == "undersample"


def test_finalize_breakeven_label_when_close_to_zero():
    # avg odd 4.0, 25% WR → breakeven 25%, delta 0 → ROI = (10*3 + 30*-1)/40 = 0
    picks = []
    for _ in range(10):
        picks.append(_make_pick(tier="big", odd=4.0, result="won"))
    for _ in range(30):
        picks.append(_make_pick(tier="big", odd=4.0, result="lost"))
    by = btc.aggregate(picks)
    rows = btc.finalize(by)
    big = next(r for r in rows if r["tier"] == "big")
    assert big["status"] == "breakeven"
    assert abs(big["roi"]) < 0.05


def test_voids_dont_distort_hit_rate_or_roi():
    # 1 win + 1 loss + 38 voids → WR 50%, ROI = 0 on stake 2
    picks = (
        [_make_pick(odd=2.0, result="won")]
        + [_make_pick(odd=2.0, result="lost")]
        + [_make_pick(odd=2.0, result="void") for _ in range(38)]
    )
    by = btc.aggregate(picks)
    rows = btc.finalize(by)
    safe = next(r for r in rows if r["tier"] == "safe")
    assert safe["n"] == 40
    assert safe["voids"] == 38
    assert safe["wins"] == 1
    assert safe["losses"] == 1
    assert abs(safe["hit_rate"] - 0.5) < 1e-9
    assert abs(safe["roi"]) < 1e-9  # 1 win at +1u, 1 loss at -1u → 0 net
