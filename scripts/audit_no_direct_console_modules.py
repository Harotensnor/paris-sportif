#!/usr/bin/env python3
"""Block direct runtime console noise in shipped extracted modules."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGETS = [ROOT / "app-enhancements.js", *sorted((ROOT / "src").glob("*.js"))]
DIRECT_CONSOLE = re.compile(r"\bconsole\.(?:log|warn|error|debug|info)\s*\(")


def main() -> int:
    findings: list[str] = []
    for path in TARGETS:
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for match in DIRECT_CONSOLE.finditer(text):
            line = text.count("\n", 0, match.start()) + 1
            findings.append(f"{path.relative_to(ROOT)}:{line}")

    if findings:
        print("[direct-console-modules] FAIL")
        for item in findings:
            print(f"- {item}")
        return 1
    print("[direct-console-modules] OK (modules use local error reporting)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
