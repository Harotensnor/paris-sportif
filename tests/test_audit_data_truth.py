from datetime import datetime, timezone
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import audit_data_truth as adt  # noqa: E402


def test_data_today_allows_fresh_pre_midnight_snapshot():
    data = {
        "today": "2026-05-06",
        "generated_at": "2026-05-06T23:59:43Z",
    }
    now = datetime(2026, 5, 7, 0, 4, tzinfo=timezone.utc)

    assert adt.data_today_error(data, now) is None


def test_data_today_rejects_unrelated_date():
    data = {
        "today": "2026-05-05",
        "generated_at": "2026-05-06T23:59:43Z",
    }
    now = datetime(2026, 5, 7, 0, 4, tzinfo=timezone.utc)

    assert "differs from UTC today=2026-05-07" in adt.data_today_error(data, now)
