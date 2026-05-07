"""Idempotence checks for data patch helpers.

The cron may retry a patch after a partial failure. Applying the same patch
twice must leave the event in the same state, not flip markets back and forth.
"""
from __future__ import annotations

import sys
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import patch_winamax_markets as pwm  # noqa: E402


def test_winamax_market_alignment_is_idempotent():
    event = {
        "competitors": [
            {"name": "Cristian"},
            {"name": "Aryna Sabalenka"},
        ]
    }
    markets = {
        "1n2": {
            "home": 1.02,
            "away": 14.5,
            "home_name": "A. Sabalenka",
            "away_name": "Cristian",
        }
    }

    pwm._align_markets_to_espn(markets, event)
    once = deepcopy(markets)
    pwm._align_markets_to_espn(markets, event)

    assert markets == once
    assert markets["1n2"]["home"] == 14.5
    assert markets["1n2"]["away"] == 1.02
    assert markets["1n2"]["home_name"] == "Cristian"
    assert markets["1n2"]["away_name"] == "A. Sabalenka"


def test_winamax_market_alignment_leaves_ambiguous_names_unchanged():
    event = {
        "competitors": [
            {"name": "Smith"},
            {"name": "Smith"},
        ]
    }
    markets = {
        "1n2": {
            "home": 2.10,
            "away": 1.70,
            "home_name": "Smith",
            "away_name": "Smith",
        }
    }
    before = deepcopy(markets)

    pwm._align_markets_to_espn(markets, event)
    pwm._align_markets_to_espn(markets, event)

    assert markets == before
