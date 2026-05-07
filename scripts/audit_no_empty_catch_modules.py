#!/usr/bin/env python3
"""Block silent empty catch blocks in extracted shipped modules."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGETS = [ROOT / "app-enhancements.js", *sorted((ROOT / "src").glob("*.js"))]
EMPTY_CATCH = re.compile(
    r"catch\s*\((?P<name>[^)]*)\)\s*\{\s*(?:(?:/\*.*?\*/|//[^\n]*(?:\n|$))\s*)*\}",
    re.DOTALL,
)


def main() -> int:
    findings: list[str] = []
    for path in TARGETS:
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for match in EMPTY_CATCH.finditer(text):
            line = text.count("\n", 0, match.start()) + 1
            findings.append(f"{path.relative_to(ROOT)}:{line}")

    if findings:
        print("[empty-catch-modules] FAIL")
        for item in findings:
            print(f"- {item}")
        return 1
    print("[empty-catch-modules] OK (no silent module catch blocks)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
