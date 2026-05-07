#!/usr/bin/env python3
"""Ensure the removed legacy Top page stays folded into Dashboard."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEGACY = ROOT / "legacy-app.js"
HTML = ROOT / "pronostics.html"

BLOCKED = (
    "renderTopPicks",
    "top-picks-wrap",
    "top-page-h1",
    "data-top-mode",
    "topMode",
    "const isTop = false",
)


def main() -> int:
    legacy = LEGACY.read_text(encoding="utf-8")
    html = HTML.read_text(encoding="utf-8")
    findings: list[str] = []

    if "'top': 'dashboard'" not in legacy and '"top": "dashboard"' not in legacy:
        findings.append("PAGE_ALIASES must keep #top mapped to #dashboard")

    for path, text in ((LEGACY, legacy), (HTML, html)):
        for token in BLOCKED:
            pos = text.find(token)
            if pos != -1:
                line = text.count("\n", 0, pos) + 1
                findings.append(f"{token} at {path.name}:{line}")

    if findings:
        print("[dead-top-page] FAIL")
        for item in findings:
            print(f"- {item}")
        return 1
    print("[dead-top-page] OK (#top aliases dashboard, legacy Top renderer removed)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
