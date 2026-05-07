#!/usr/bin/env python3
"""Block direct console.log calls in browser runtime files."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    ROOT / "legacy-app.js",
    ROOT / "app-enhancements.js",
    *sorted((ROOT / "src").glob("*.js")),
]


def main() -> int:
    findings: list[str] = []
    for path in FILES:
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        pos = text.find("console.log")
        if pos != -1:
            line = text.count("\n", 0, pos) + 1
            findings.append(f"{path.relative_to(ROOT)}:{line}")

    if findings:
        print("[prod-console-log] FAIL")
        for item in findings:
            print(f"- direct console.log at {item}")
        return 1
    print("[prod-console-log] OK (use prodLog/prodWarn instead)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
