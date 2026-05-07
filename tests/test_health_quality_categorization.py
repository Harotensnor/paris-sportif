import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_health  # noqa: E402


def test_current_stale_data_stays_actionable_not_blocking():
    assert build_health.categorize_health_warning("data.js is stale (45min)", 45) == "actuel"


def test_four_hour_stale_data_is_blocking():
    assert build_health.categorize_health_warning("data.js is stale (281min)", 281) == "bloquant"


def test_optional_source_status_is_not_current_pipeline_failure():
    warning = "injuries_soccer: status=no_source_events"
    assert build_health.categorize_health_warning(warning, 5) == "optionnel"


def test_historical_window_warning_is_separate_from_live_health():
    warning = "backtest: 29 warnings sur 7 jours, pipeline actuel sain"
    assert build_health.categorize_health_warning(warning, 5) == "7j"


def test_grouped_warning_counts_keep_all_expected_categories():
    grouped = build_health.categorize_health_warnings(
        [
            "data.js is stale (45min)",
            "data.js is stale (281min)",
            "lineups_soccer: status=retained_existing_lineups",
            "roi drift -3pt sur 7j",
        ],
        45,
    )
    assert set(grouped) >= {"actuel", "7j", "optionnel", "bloquant"}
    assert len(grouped["actuel"]) == 1
    assert len(grouped["bloquant"]) == 1
    assert len(grouped["optionnel"]) == 1
    assert len(grouped["7j"]) == 1
