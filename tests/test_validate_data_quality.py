"""Tests for scripts/validate_data_quality.py — odd classification.

Locks in the long_shot vs bad_odd boundary so a future tweak does not
regress the BACKLOG fix that removed false positives on exact_score_rows.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import validate_data_quality as vdq  # noqa: E402


def test_standard_market_high_odd_is_bad_odd():
    # 1n2 home odd of 80 is not a real bookmaker line — flag it.
    assert vdq.classify_odd("1n2", "home", 80.0) == ("bad_odd", "1n2:home")


def test_standard_market_normal_odd_passes():
    assert vdq.classify_odd("1n2", "home", 1.85) is None


def test_below_minimum_is_bad_odd_everywhere():
    # 0.5 cannot be a payout multiplier in any market.
    assert vdq.classify_odd("exact_score_rows", "5-0", 0.5) == ("bad_odd", "exact_score_rows:5-0")


def test_exact_score_high_odd_is_long_shot_not_bad():
    # A 250.0 odd on a 5-3 row is informational, not corruption.
    verdict = vdq.classify_odd("exact_score_rows", "5-3", 250.0)
    assert verdict == ("long_shot_odd", "exact_score_rows:5-3")


def test_exact_score_within_default_window_passes():
    assert vdq.classify_odd("exact_score_rows", "1-0", 8.5) is None


def test_exact_score_absurd_odd_still_flagged_bad():
    # Above LONG_SHOT_MAX (1000) we treat as scrape corruption.
    assert vdq.classify_odd("exact_score_rows", "5-5", 5000.0) == (
        "bad_odd", "exact_score_rows:5-5"
    )


def test_team_total_elevated_window():
    # Team total over a high line (e.g. over 4.5 buts) — odd 75 is plausible.
    assert vdq.classify_odd("team_total", "over", 75.0) == (
        "long_shot_odd", "team_total:over"
    )
    # 200 on a team_total is suspicious — back to bad_odd.
    assert vdq.classify_odd("team_total", "over", 200.0) == (
        "bad_odd", "team_total:over"
    )


def test_htft_uses_long_shot_window():
    # Half-time/full-time combinations frequently have 30-200 odds.
    assert vdq.classify_odd("htft", "1-2", 120.0) == ("long_shot_odd", "htft:1-2")


def test_none_odd_is_bad_odd():
    assert vdq.classify_odd("1n2", "home", None) == ("bad_odd", "1n2:home")
