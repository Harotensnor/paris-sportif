import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import picks_history_lib as ph  # noqa: E402


def _extreme_football_event() -> dict:
    return {
        "id": "prob-cap-extreme",
        "sport": "football",
        "date": "2026-05-07T19:00:00Z",
        "league_code": "pytest",
        "completed": False,
        "clubelo": {"diff": 900},
        "competitors": [
            {
                "home_away": "home",
                "name": "Massive Home",
                "xg_for_avg": 9.0,
                "xg_against_avg": 0.01,
            },
            {
                "home_away": "away",
                "name": "Tiny Away",
                "xg_for_avg": 0.01,
                "xg_against_avg": 9.0,
            },
        ],
        "winamax": {
            "available": True,
            "markets": {
                "match_winner": [
                    {"side": "home", "odd": 1.35, "label": "Massive Home"},
                    {"side": "draw", "odd": 12.0, "label": "Match nul"},
                    {"side": "away", "odd": 30.0, "label": "Tiny Away"},
                ],
            },
        },
    }


def test_football_model_caps_extreme_probabilities():
    model = ph.football_model(_extreme_football_event())

    assert max(model.values()) <= ph.MAX_MODEL_PROB
    assert model["1"] == ph.MAX_MODEL_PROB


def test_generated_archive_picks_never_emit_999_prob_model():
    picks = ph.generate_event_picks(
        _extreme_football_event(),
        ts_generated="2026-05-06T00:00:00Z",
        max_per_match=10,
    )

    assert picks
    assert max(p["prob_model"] for p in picks) <= ph.MAX_MODEL_PROB
    assert any(
        p["selection"] == "1" and p["prob_model"] == ph.MAX_MODEL_PROB
        for p in picks
    )
