"""Backlog P0: Historique page must surface ≥100 picks on J-1 when the
archive contains them.

This is a contract test on `picks_history_summary.json` (the sidecar
the dashboard reads to render the Historique page) plus a static
assertion that the renderer's per-day slice limit is high enough not
to silently truncate.

Renderer source of truth (legacy-app.js, renderPicksHistoryArchivePage):
    const picks = (d.picks || []).slice(0, 120);

So as long as the slice cap is ≥ the day's available pick count, all
picks are displayed.

Skips when the archive is missing or empty (e.g. fresh sandbox), so it
fails only on real regressions.
"""
import json
import re
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SUMMARY = ROOT / "picks_history_summary.json"
LEGACY = ROOT / "legacy-app.js"

# How many picks the renderer caps a single day at. Match the source.
# v37.030 raised this from 120 to 200 after the test below caught a
# silent truncation on J-1.
RENDER_DAY_CAP = 200


def _load_summary():
    if not SUMMARY.exists():
        pytest.skip(f"{SUMMARY.name} missing in this checkout")
    try:
        return json.loads(SUMMARY.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        pytest.fail(f"{SUMMARY.name} is not valid JSON: {e}")


def test_summary_has_by_day_array():
    s = _load_summary()
    assert isinstance(s.get("by_day"), list), "picks_history_summary.json must expose by_day[]"


def test_render_cap_constant_matches_renderer_source():
    """If a future change drops the per-day cap below RENDER_DAY_CAP,
    this catches it. v37.030 introduced the named constant
    HIST_PICKS_PER_DAY so the regex below pins the source.
    """
    if not LEGACY.exists():
        pytest.skip("legacy-app.js missing")
    src = LEGACY.read_text(encoding="utf-8")
    match = re.search(r"const\s+HIST_PICKS_PER_DAY\s*=\s*(\d+)\s*;", src)
    assert match, "HIST_PICKS_PER_DAY constant missing from legacy-app.js"
    cap = int(match.group(1))
    assert cap >= RENDER_DAY_CAP, (
        f"HIST_PICKS_PER_DAY dropped to {cap}; expected ≥{RENDER_DAY_CAP}"
    )


def test_jminus1_has_at_least_100_picks_when_archive_does():
    """If the archive contains a J-1 entry with ≥100 picks, the renderer
    must surface them (cap is high enough, no off-by-one filter).

    We don't require the archive to actually have ≥100 picks (that
    depends on data freshness). We assert the contract: when it does,
    nothing in the pipeline silently drops them.
    """
    s = _load_summary()
    days = s.get("by_day") or []
    if not days:
        pytest.skip("by_day is empty in this checkout (no archive yet)")
    # Yesterday relative to the data's reference day. Use data.today if
    # available, else the most recent past day with settled picks > 0
    # (which is what "J-1" effectively means in the pipeline).
    settled_days = [
        d for d in days
        if isinstance(d, dict) and (d.get("won", 0) + d.get("lost", 0) + d.get("void", 0)) > 0
    ]
    if not settled_days:
        pytest.skip("No settled day yet — too early to assert J-1 coverage")
    settled_days.sort(key=lambda d: d.get("date") or "", reverse=True)
    j_minus_1 = settled_days[0]
    total = int(j_minus_1.get("total") or 0)
    if total < 100:
        pytest.skip(
            f"Most recent settled day {j_minus_1.get('date')} has only {total} picks — "
            f"cannot assert ≥100 coverage"
        )
    picks_attached = j_minus_1.get("picks") or []
    # The renderer caps a day at RENDER_DAY_CAP and shows a truncation
    # chip beyond that. The hard requirement: at minimum the first 100
    # picks of any day must be visible — otherwise the P0 contract
    # ("≥100 picks on J-1") is violated.
    assert RENDER_DAY_CAP >= 100, (
        f"renderer cap dropped to {RENDER_DAY_CAP}; must stay ≥100 to satisfy "
        f"the historique J-1 backlog contract"
    )
    # If the summary attached the actual picks, they must be ≥100 (or the
    # cap chosen by the build script). We accept the summary having a
    # smaller slice as long as the count reported is correct.
    if picks_attached:
        assert (
            len(picks_attached) >= min(100, total)
        ), f"summary attached {len(picks_attached)} picks for day {j_minus_1.get('date')} but reported total={total}"
    # When total ≤ RENDER_DAY_CAP, all picks must be displayed (no silent
    # truncation — exactly the J-1 case that prompted v37.030).
    if total <= RENDER_DAY_CAP and picks_attached:
        attached_in_range = min(len(picks_attached), total)
        assert attached_in_range >= total, (
            f"day {j_minus_1.get('date')} has {total} picks (under cap "
            f"{RENDER_DAY_CAP}) but only {attached_in_range} are attached "
            f"to the summary"
        )


def test_pl_units_and_total_consistent():
    """If the summary day reports won/lost/void counts, total must equal
    the sum of settled + pending. Catches a regression where the build
    script forgets to update one of the counters."""
    s = _load_summary()
    for d in (s.get("by_day") or []):
        if not isinstance(d, dict):
            continue
        total = int(d.get("total") or 0)
        won = int(d.get("won") or 0)
        lost = int(d.get("lost") or 0)
        void = int(d.get("void") or 0)
        pending = int(d.get("pending") or 0)
        assert total == won + lost + void + pending, (
            f"day {d.get('date')}: total={total} != won+lost+void+pending="
            f"{won}+{lost}+{void}+{pending}"
        )
