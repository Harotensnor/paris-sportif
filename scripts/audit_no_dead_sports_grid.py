#!/usr/bin/env python3
"""Block the removed legacy single-sport grid and filter shell."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = (ROOT / "legacy-app.js", ROOT / "pronostics.html")

BLOCKED = (
    "renderSummary",
    "renderFilters",
    "renderCard",
    "buildSimplesQuickTake",
    "summary-bar",
    "ia-simples-wrap",
    "data-panel",
    "panel-football",
    "content-football",
    "currentPage === 'simples'",
    "currentSport",
    "activeFilter",
)


def main() -> int:
    findings: list[str] = []
    for path in FILES:
        text = path.read_text(encoding="utf-8")
        for token in BLOCKED:
            pos = text.find(token)
            if pos != -1:
                line = text.count("\n", 0, pos) + 1
                findings.append(f"{token} at {path.name}:{line}")

    if findings:
        print("[dead-sports-grid] FAIL")
        for item in findings:
            print(f"- {item}")
        return 1
    print("[dead-sports-grid] OK (legacy single-sport grid removed)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
