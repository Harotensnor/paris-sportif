#!/usr/bin/env python3
"""Block TODO/FIXME/XXX markers in shipped code and QA scripts."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGETS = [
    ROOT / "legacy-app.js",
    ROOT / "app-enhancements.js",
    ROOT / "sw.js",
    *sorted((ROOT / "src").glob("*.js")),
    *sorted((ROOT / "scripts").glob("*.py")),
    *sorted((ROOT / "scripts").glob("*.js")),
]
MARKERS = ("TODO", "FIXME", "XXX")


def main() -> int:
    findings: list[str] = []
    for path in TARGETS:
        if not path.exists() or path.name == "audit_no_todo_markers.py":
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for marker in MARKERS:
            start = 0
            while True:
                pos = text.find(marker, start)
                if pos == -1:
                    break
                line = text.count("\n", 0, pos) + 1
                findings.append(f"{path.relative_to(ROOT)}:{line}: {marker}")
                start = pos + len(marker)

    if findings:
        print("[todo-markers] FAIL")
        for item in findings[:80]:
            print(f"- {item}")
        if len(findings) > 80:
            print(f"- ... {len(findings) - 80} more")
        return 1
    print("[todo-markers] OK (no TODO/FIXME/XXX markers)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
