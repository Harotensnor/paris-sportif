#!/usr/bin/env python3
"""Keep stale sprint/version comments from growing back in app.js."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app.js"

STALE_LINE_COMMENT = re.compile(
    r"^\s*//.*(PLAN 1000|Sprint 109|v31\.|v32\.|v33\.|v34\.|v35\.199|legacy supprim|legacy retir)",
    re.IGNORECASE,
)


def main() -> int:
    offenders: list[tuple[int, str]] = []
    for idx, line in enumerate(APP.read_text(encoding="utf-8").splitlines(), start=1):
        if STALE_LINE_COMMENT.search(line):
            offenders.append((idx, line.strip()))
    if offenders:
        print("[legacy-comments] FAIL")
        for line_no, line in offenders[:40]:
            print(f"- app.js:{line_no}: {line}")
        if len(offenders) > 40:
            print(f"- ... {len(offenders) - 40} more")
        return 1
    print("[legacy-comments] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
