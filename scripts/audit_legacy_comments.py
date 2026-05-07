#!/usr/bin/env python3
"""Keep stale sprint/version comments from growing back into shipped JS."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGETS = [ROOT / "app.js", ROOT / "legacy-app.js"]

STALE_LINE_COMMENT = re.compile(
    r"^\s*//.*(PLAN 1000|Sprint 109|v31\.|v32\.|v33\.|v34\.|v35\.199|legacy supprim|legacy retir)",
    re.IGNORECASE,
)
VERSIONED_LINE_COMMENT = re.compile(r"^\s*//\s*v\d+\.\d+")


def main() -> int:
    offenders: list[tuple[str, int, str]] = []
    for target in TARGETS:
        for idx, line in enumerate(target.read_text(encoding="utf-8").splitlines(), start=1):
            if STALE_LINE_COMMENT.search(line) or VERSIONED_LINE_COMMENT.search(line):
                offenders.append((target.name, idx, line.strip()))
    if offenders:
        print("[legacy-comments] FAIL")
        for filename, line_no, line in offenders[:40]:
            print(f"- {filename}:{line_no}: {line}")
        if len(offenders) > 40:
            print(f"- ... {len(offenders) - 40} more")
        return 1
    print("[legacy-comments] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
