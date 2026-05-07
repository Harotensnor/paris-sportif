from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LEGACY = ROOT / "legacy-app.js"


def test_today_uses_real_paris_date_not_stale_data_field():
    text = LEGACY.read_text(encoding="utf-8")
    assert "function currentParisDateISO()" in text
    assert "return currentParisDateISO();" in text
    assert "const g = window.PRONOSTICS_DATA?.today" not in text


def test_top_paris_requires_fresh_verified_or_changed_odds():
    text = LEGACY.read_text(encoding="utf-8")
    assert "function v38OddTopEligible(meta)" in text
    assert "status === 'verified'" in text
    assert "status !== 'changed'" in text
    assert "age <= 30" in text
    assert "odd_changed_not_recent" in text
