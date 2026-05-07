#!/usr/bin/env python3
"""Keep already-removed dead legacy helpers from being reintroduced."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEGACY = ROOT / "legacy-app.js"
REMOVED_HELPERS = [
    "getMyBet",
    "upsertMyBet",
    "removeMyBet",
    "saveMyBets",
    "myBetKey",
    "markAllLocksSeen",
    "snapshotReliability",
    "saveReliabilityHist",
    "gcReliabilityHist",
    "escWithHighlight",
    "parseDetailsForFavorite",
    "lineMovement",
    "groupBy",
    "teamLogoUrl",
    "teamAvatarHtml",
    "todayIsoName",
    "computeBankrollGuards",
    "getMatchBetCount",
    "updateTrackedBet",
    "removeTrackedBet",
]


def main() -> int:
    text = LEGACY.read_text(encoding="utf-8")
    findings = [
        name
        for name in REMOVED_HELPERS
        if re.search(rf"\bfunction\s+{re.escape(name)}\s*\(", text)
    ]
    if findings:
        print("[legacy-dead-helpers] FAIL")
        for name in findings:
            print(f"- removed helper reintroduced: {name}")
        return 1
    print(f"[legacy-dead-helpers] OK ({len(REMOVED_HELPERS)} removed helpers absent)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
