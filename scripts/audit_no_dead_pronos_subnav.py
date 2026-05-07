#!/usr/bin/env python3
"""Block the removed legacy pronostics sub-navigation path."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEGACY = ROOT / "legacy-app.js"

BLOCKED = (
    "pronosPages",
    "isPronos",
    "pronos-subnav",
    "data-pronos-page",
)


def main() -> int:
    text = LEGACY.read_text(encoding="utf-8")
    findings = []
    for token in BLOCKED:
        pos = text.find(token)
        if pos != -1:
            line = text.count("\n", 0, pos) + 1
            findings.append(f"{token} at legacy-app.js:{line}")

    if findings:
        print("[dead-pronos-subnav] FAIL")
        for item in findings:
            print(f"- {item}")
        return 1
    print("[dead-pronos-subnav] OK (legacy pronostics subnav removed)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
