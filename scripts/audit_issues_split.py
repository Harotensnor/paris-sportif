#!/usr/bin/env python3
"""Validate active/resolved issue split."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ACTIVE = ROOT / "ISSUES_ACTIVE.md"
RESOLVED = ROOT / "ISSUES_RESOLVED.md"
INDEX = ROOT / "ISSUES.md"


def main() -> int:
    errors: list[str] = []
    active = ACTIVE.read_text(encoding="utf-8") if ACTIVE.exists() else ""
    resolved = RESOLVED.read_text(encoding="utf-8") if RESOLVED.exists() else ""
    index = INDEX.read_text(encoding="utf-8") if INDEX.exists() else ""
    if not active or not resolved:
        errors.append("ISSUES_ACTIVE.md and ISSUES_RESOLVED.md must both exist")
    if re.search(r"(?mi)^- Statut\s*:\s*FIXED\b", active):
        errors.append("ISSUES_ACTIVE.md contains FIXED issue entries")
    if "OPEN" not in active and "PARTIAL" not in active:
        errors.append("ISSUES_ACTIVE.md has no OPEN/PARTIAL marker")
    if re.search(r"(?mi)^- Statut\s*:\s*(OPEN|PARTIAL)\b", resolved):
        errors.append("ISSUES_RESOLVED.md contains OPEN/PARTIAL issue entries")
    if "ISSUES_ACTIVE.md" not in index or "ISSUES_RESOLVED.md" not in index:
        errors.append("ISSUES.md index does not point to split files")
    if errors:
        print("[issues-split] FAIL")
        for err in errors:
            print(f"- {err}")
        return 1
    active_count = len(re.findall(r"(?mi)^- Statut\s*:\s*(OPEN|PARTIAL)\b", active))
    print(f"[issues-split] OK active={active_count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
