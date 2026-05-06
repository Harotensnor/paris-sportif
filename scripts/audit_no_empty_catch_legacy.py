#!/usr/bin/env python3
"""Block silent empty catch blocks in the shipped legacy runtime."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "legacy-app.js"
EMPTY_CATCH = re.compile(r"catch\s*\([^)]*\)\s*\{\s*\}")


def main() -> int:
    text = TARGET.read_text(encoding="utf-8", errors="replace")
    findings: list[str] = []
    for match in EMPTY_CATCH.finditer(text):
        line = text.count("\n", 0, match.start()) + 1
        findings.append(f"legacy-app.js:{line}")
    if findings:
        print("[empty-catch-legacy] FAIL")
        for item in findings[:80]:
            print(f"- {item}")
        if len(findings) > 80:
            print(f"- ... {len(findings) - 80} more")
        return 1
    print("[empty-catch-legacy] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
