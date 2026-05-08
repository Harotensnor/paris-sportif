#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEGACY = ROOT / "legacy-app.js"
PROBE = ROOT / "scripts" / "probe_prono_sheet_odds.js"
SMOKE = ROOT / ".github" / "workflows" / "smoke.yml"
LOCAL_ANALYTICS = ROOT / "src" / "local-analytics.js"


def require(text, needle, label):
    if needle not in text:
        raise SystemExit(f"[top-paris-contract] FAIL missing {label}: {needle}")


def main():
    legacy = LEGACY.read_text(encoding="utf-8")
    probe = PROBE.read_text(encoding="utf-8")
    smoke = SMOKE.read_text(encoding="utf-8")
    local_analytics = LOCAL_ANALYTICS.read_text(encoding="utf-8")

    for status in ("verified", "changed", "stale", "mismatch", "missing", "suspicious"):
        require(legacy, f"{status}:", f"odd status {status}")

    require(legacy, "v38FindWinamaxOdd", "strict Winamax odd lookup")
    require(legacy, "v38OddTopEligible", "top-pick odd eligibility helper")
    require(legacy, "odd_changed_not_recent", "changed odds freshness rejection")
    require(legacy, "currentParisDateISO", "Paris-local today helper")
    require(legacy, "marché, sélection et ligne retrouvés dans Winamax", "strict verified copy")
    require(legacy, "v37CanAutoHorizonLowPool = false", "no automatic 7-day expansion")
    require(legacy, "v37ShowResultColumn", "today result column")
    require(legacy, "v37BeginnerPickText", "beginner row explanation")
    require(legacy, "data-home-table-only", "homepage table-only shell")

    require(probe, "Accueil is table-only", "probe table-only assertion")
    require(probe, "Today table exposes result column", "probe result column assertion")
    require(probe, "Rows include beginner-friendly explanation text", "probe beginner copy assertion")
    require(probe, "Modal shows odd validation status", "probe odd validation assertion")
    require(probe, "No Top Paris card has an invalid odd status", "probe top odd assertion")
    require(probe, "Accueil defaults to Aujourd’hui", "probe dashboard today default assertion")
    require(smoke, "probe_prono_sheet_odds.js", "smoke workflow wiring")
    require(local_analytics, "$('[data-la-dashboard-panel]')?.remove();", "no local analytics panel on dashboard")

    if "const g = window.PRONOSTICS_DATA?.today" in legacy:
        raise SystemExit("[top-paris-contract] FAIL todayISO must use the real Europe/Paris date, not stale data.today")
    if "${v37DecisionGuideHtml}" in legacy or "${v37TierLegendHtml}" in legacy:
        raise SystemExit("[top-paris-contract] FAIL dashboard table must not render guide/legend before the table")

    print("[top-paris-contract] OK")


if __name__ == "__main__":
    main()
