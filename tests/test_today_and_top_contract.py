import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LEGACY = ROOT / "legacy-app.js"
LOCAL_ANALYTICS = ROOT / "src" / "local-analytics.js"


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


def test_dashboard_is_table_first_without_extra_panels():
    legacy = LEGACY.read_text(encoding="utf-8")
    analytics = LOCAL_ANALYTICS.read_text(encoding="utf-8")
    assert "let v37DateFilter =" in legacy
    assert "v37HashDate === 'all'" in legacy
    assert ": todayIso" in legacy
    assert "${v37DecisionGuideHtml}" not in legacy
    assert "${v37TierLegendHtml}" not in legacy
    assert "Comment choisir un pari" not in legacy
    assert 'class="v37-tier-legend"' not in legacy
    assert "$('[data-la-dashboard-panel]')?.remove();" in analytics
    assert "if (pageSlug() === 'dashboard')" in analytics
    assert "removeDiscoveryCard();" in analytics
    assert "wrap.prepend(panel)" not in analytics


def test_stale_odds_are_capped_and_not_prioritized():
    legacy = LEGACY.read_text(encoding="utf-8")
    assert "function v38PronoAction(score, edge, oddMeta)" in legacy
    assert "v37ApplyOddPriorityCap" in legacy
    assert "if (status === 'stale') return Math.min(n, 38)" in legacy
    assert "return oddRank || (v36TierRank[a.tier]" in legacy
    assert "Cote ancienne" in legacy


def test_footer_version_is_driven_by_app_shell():
    app = (ROOT / "app.js").read_text(encoding="utf-8")
    html = (ROOT / "pronostics.html").read_text(encoding="utf-8")
    app_version = re.search(r"const VERSION = '(v\d+\.\d+)'", app).group(1)
    footer_version = re.search(r'id="footer-version"[^>]*>(v\d+\.\d+)(?:-\d{8}-\d{6})?</span>', html).group(1)
    assert "version: VERSION" in app
    assert "syncFooterVersion" in app
    assert footer_version == app_version
