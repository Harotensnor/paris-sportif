"""Tests for scripts/backtest_strategies.py.

Locks the math (Kelly fraction, settle accounting, void = refund) and the
strategy abstain/select rules so the page Performance > Stratégies stays
trustworthy.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import backtest_strategies as bs  # noqa: E402
import json


def test_kelly_fraction_basic():
    # 60% chance on a 2.0 odd: f = (0.6*2 - 1)/1 = 0.2
    assert abs(bs.kelly_fraction(0.6, 2.0) - 0.20) < 1e-9


def test_kelly_fraction_no_edge_clamps_to_zero():
    # 50% chance on a 2.0 odd: edge = 0 → fraction = 0 (no bet).
    assert bs.kelly_fraction(0.5, 2.0) == 0.0
    # Negative edge clamps to 0, never goes negative.
    assert bs.kelly_fraction(0.4, 2.0) == 0.0


def test_kelly_fraction_handles_degenerate_inputs():
    assert bs.kelly_fraction(0.0, 2.0) == 0.0
    assert bs.kelly_fraction(1.0, 2.0) == 0.0
    assert bs.kelly_fraction(0.5, 1.0) == 0.0


def test_load_settled_sanitizes_corrupt_999_longshot(tmp_path, monkeypatch):
    history = tmp_path / "picks_history.jsonl"
    rows = [
        {
            "match_id": "bad-longshot",
            "result": "lost",
            "odd_book": 32.0,
            "prob_model": 0.999,
            "edge": 0.50,
            "tier": "out",
            "settled_at": "2026-01-01T00:00:00Z",
        },
        {
            "match_id": "high-fav",
            "result": "won",
            "odd_book": 1.10,
            "prob_model": 0.999,
            "edge": 0.02,
            "tier": "safe",
            "settled_at": "2026-01-02T00:00:00Z",
        },
    ]
    history.write_text("\n".join(json.dumps(r) for r in rows), encoding="utf-8")
    monkeypatch.setattr(bs, "HISTORY", history)

    picks = bs.load_settled_picks()
    by_id = {p["match_id"]: p for p in picks}

    assert by_id["bad-longshot"]["prob"] == 0.0
    assert by_id["bad-longshot"]["prob_corrupt"] is True
    assert bs.stake_for("kelly_half", by_id["bad-longshot"], 1000.0) == 0.0
    assert by_id["high-fav"]["prob"] == bs.MAX_MODEL_PROB
    assert by_id["high-fav"]["prob_corrupt"] is True


def test_settle_won_lost_void():
    assert bs.settle(10.0, 2.5, "won") == 15.0  # profit = stake * (odd - 1)
    assert bs.settle(10.0, 2.5, "lost") == -10.0
    assert bs.settle(10.0, 2.5, "void") == 0.0  # stake refunded
    assert bs.settle(0.0, 2.5, "won") == 0.0


def test_flat_strategy_stakes_one_unit():
    pick = {"edge": 0.0, "odd": 2.0, "prob": 0.5, "tier": "low"}
    assert bs.stake_for("flat", pick, 1000.0) == 1.0


def test_value_only_filters_low_edge():
    low_edge = {"edge": 0.03, "odd": 2.0, "prob": 0.55, "tier": "low"}
    high_edge = {"edge": 0.07, "odd": 2.0, "prob": 0.55, "tier": "low"}
    assert bs.stake_for("value_only", low_edge, 1000.0) == 0.0
    assert bs.stake_for("value_only", high_edge, 1000.0) == 1.0


def test_sharp_only_filters_by_tier():
    pick_safe = {"edge": 0.01, "odd": 1.5, "prob": 0.7, "tier": "safe"}
    pick_low = {"edge": 0.20, "odd": 4.0, "prob": 0.4, "tier": "low"}
    assert bs.stake_for("sharp_only", pick_safe, 1000.0) == 1.0
    assert bs.stake_for("sharp_only", pick_low, 1000.0) == 0.0


def test_outsider_only_requires_out_tier_and_edge_floor():
    good = {"edge": 0.06, "odd": 8.0, "prob": 0.18, "tier": "out"}
    low_edge = {"edge": 0.03, "odd": 8.0, "prob": 0.15, "tier": "out"}
    wrong_tier = {"edge": 0.20, "odd": 8.0, "prob": 0.20, "tier": "big"}

    assert bs.stake_for("outsider_only", good, 1000.0) == 1.0
    assert bs.stake_for("outsider_only", low_edge, 1000.0) == 0.0
    assert bs.stake_for("outsider_only", wrong_tier, 1000.0) == 0.0


def test_kelly_half_caps_at_5_percent():
    # Crazy-high prob+odd combo would push Kelly > 5%. Strategy must cap.
    pick = {"edge": 0.5, "odd": 3.0, "prob": 0.9, "tier": "big"}
    stake = bs.stake_for("kelly_half", pick, 1000.0)
    assert stake <= 1000.0 * bs.KELLY_CAP


def test_stake_cap_applies_to_kelly():
    # With MAX_STAKE_UNITS = 50, even on a huge bankroll the stake stays
    # bounded so the simulation does not produce 6-figure paper profits.
    pick = {"edge": 0.5, "odd": 3.0, "prob": 0.9, "tier": "big"}
    stake = bs.stake_for("kelly_half", pick, 1_000_000.0)
    if bs.MAX_STAKE_UNITS is not None:
        assert stake <= bs.MAX_STAKE_UNITS + 1e-9


def test_safe_blend_requires_tier_and_kelly():
    # Tier safe but null edge → Kelly = 0 → no bet.
    pick_no_edge = {"edge": 0.0, "odd": 2.0, "prob": 0.5, "tier": "safe"}
    assert bs.stake_for("safe_blend", pick_no_edge, 1000.0) == 0.0
    # Edge but wrong tier → no bet.
    pick_wrong_tier = {"edge": 0.10, "odd": 2.5, "prob": 0.5, "tier": "low"}
    assert bs.stake_for("safe_blend", pick_wrong_tier, 1000.0) == 0.0


def test_run_strategy_records_won_lost_void():
    picks = [
        {"edge": 0.05, "odd": 2.0, "prob": 0.55, "tier": "big",
         "result": "won", "settled_at": "2026-01-01T00:00:00Z",
         "match_id": "m1", "kickoff_utc": "", "sport": "football",
         "market_key": "1n2"},
        {"edge": 0.05, "odd": 2.0, "prob": 0.55, "tier": "big",
         "result": "lost", "settled_at": "2026-01-02T00:00:00Z",
         "match_id": "m2", "kickoff_utc": "", "sport": "football",
         "market_key": "1n2"},
        {"edge": 0.05, "odd": 2.0, "prob": 0.55, "tier": "big",
         "result": "void", "settled_at": "2026-01-03T00:00:00Z",
         "match_id": "m3", "kickoff_utc": "", "sport": "football",
         "market_key": "1n2"},
    ]
    result = bs.run_strategy("flat", picks)
    assert result["wins"] == 1
    assert result["losses"] == 1
    assert result["voids"] == 1
    # Net profit on flat (odd 2.0, 1u stake): +1 - 1 + 0 = 0.
    assert abs(result["profit"]) < 1e-9
    assert result["bets_placed"] == 3
    assert result["hit_rate"] == 0.5  # 1 win / (1 win + 1 loss); voids excluded


def test_run_strategy_tracks_max_drawdown():
    # 3 losses in a row then a win — drawdown peaks before recovery.
    picks = [
        {"edge": 0.05, "odd": 2.0, "prob": 0.55, "tier": "big",
         "result": r, "settled_at": f"2026-01-0{i}T00:00:00Z",
         "match_id": f"m{i}", "kickoff_utc": "", "sport": "football",
         "market_key": "1n2"}
        for i, r in enumerate(["lost", "lost", "lost", "won"], start=1)
    ]
    result = bs.run_strategy("flat", picks)
    # After 3 losses, bankroll = 1000 - 3 = 997 (peak was 1000). DD = 3.
    assert result["max_drawdown_abs"] == 3.0
    assert result["longest_losing_streak"] == 3
