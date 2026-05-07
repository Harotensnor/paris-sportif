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

    require(legacy, "window.__v38TopParisAudit", "public audit surface")
    require(legacy, "data-v38-top-audit", "visible audit panel")
    require(legacy, "duplicate_match", "duplicate-match exclusion")
    require(legacy, "market_cap", "market cap exclusion")
    require(legacy, "Pourquoi pas plus de top picks", "empty/top audit copy")
    require(legacy, "['verified', 'changed'].includes", "verified-only top gate")

    require(probe, "Top Paris audit rendered", "probe audit assertion")
    require(probe, "Top Paris audit selected count matches cards", "probe count assertion")
    require(probe, "Top Paris cards use only verified/changed odds", "probe odds assertion")
    require(smoke, "probe_prono_sheet_odds.js", "smoke workflow wiring")

    print("[top-paris-contract] OK")


if __name__ == "__main__":
    main()
