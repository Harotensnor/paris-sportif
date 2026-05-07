#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEGACY = ROOT / "legacy-app.js"
PROBE = ROOT / "scripts" / "probe_prono_sheet_odds.js"
SMOKE = ROOT / ".github" / "workflows" / "smoke.yml"


def require(text, needle, label):
    if needle not in text:
        raise SystemExit(f"[top-paris-contract] FAIL missing {label}: {needle}")


def main():
    legacy = LEGACY.read_text(encoding="utf-8")
    probe = PROBE.read_text(encoding="utf-8")
    smoke = SMOKE.read_text(encoding="utf-8")

    for status in ("verified", "changed", "stale", "mismatch", "missing", "suspicious"):
        require(legacy, f"{status}:", f"odd status {status}")

    require(legacy, "v38FindWinamaxOdd", "strict Winamax odd lookup")
    require(legacy, "marché, sélection et ligne retrouvés dans Winamax", "strict verified copy")
    require(legacy, "v37CanAutoHorizonLowPool = false", "no automatic 7-day expansion")
    require(legacy, "v37ShowResultColumn", "today result column")
    require(legacy, "v37BeginnerPickText", "beginner row explanation")
    require(legacy, "data-home-table-only", "homepage table-only shell")

    require(probe, "Accueil is table-only", "probe table-only assertion")
    require(probe, "Today table exposes result column", "probe result column assertion")
    require(probe, "Rows include beginner-friendly explanation text", "probe beginner copy assertion")
    require(probe, "Modal shows odd validation status", "probe odd validation assertion")
    require(smoke, "probe_prono_sheet_odds.js", "smoke workflow wiring")

    print("[top-paris-contract] OK")


if __name__ == "__main__":
    main()
