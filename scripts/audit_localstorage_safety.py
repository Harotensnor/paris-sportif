#!/usr/bin/env python3
"""Lock the invariant: every JSON.parse(localStorage...) is inside try/catch.

Corrupt localStorage data (user edited DevTools, schema migration, manual
import) makes JSON.parse throw. If the call site has no try/catch, the
error propagates as `Uncaught SyntaxError` at boot, blanking the page.

This audit walks every JSON.parse(localStorage...) call in legacy-app.js
and asserts a `try {` opening within the surrounding ~50 lines. Static
analysis is conservative — false positives are possible if a `try` is
opened farther away — but in practice the codebase keeps try blocks
tight, so this is a useful guardrail.

Cheap (~50ms), wires into the drift CI job.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEGACY = ROOT / "legacy-app.js"

CALL_RE = re.compile(r"JSON\.parse\s*\(\s*localStorage", re.M)
TRY_RE = re.compile(r"\btry\s*\{")
CATCH_RE = re.compile(r"\}\s*catch\b")
FUNC_RE = re.compile(r"\bfunction\b|=>\s*\{")


def is_inside_try(lines: list[str], i: int) -> bool:
    """Look back up to 50 lines for an opening try block whose
    matching catch hasn't yet closed.
    """
    depth = 0
    for j in range(i, max(-1, i - 60), -1):
        line = lines[j]
        if CATCH_RE.search(line):
            depth -= 1
        if TRY_RE.search(line):
            depth += 1
            if depth >= 1:
                return True
    return False


def main() -> int:
    text = LEGACY.read_text(encoding="utf-8")
    lines = text.split("\n")
    bad: list[tuple[int, str]] = []
    total = 0
    for i, line in enumerate(lines):
        if not CALL_RE.search(line):
            continue
        total += 1
        # Accept inline try/catch on the same line first.
        if "try" in line and ("catch" in line or "catch" in (lines[i + 1] if i + 1 < len(lines) else "")):
            continue
        if not is_inside_try(lines, i):
            bad.append((i + 1, line.strip()[:120]))
    if bad:
        print("[localstorage-safety] FAIL")
        for ln, l in bad:
            print(f"  line {ln}: {l}")
        return 1
    print(f"[localstorage-safety] OK ({total} JSON.parse(localStorage…) calls, all inside try/catch)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
