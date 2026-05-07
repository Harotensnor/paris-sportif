#!/usr/bin/env python3
"""Ensure legacy-app.js remains a plain browser script.

The production page loads legacy-app.js with a classic <script defer>. Static
ESM imports or dynamic import() calls would parse differently in browsers and
break the single-HTML convention. This audit keeps that invariant explicit.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEGACY = ROOT / "legacy-app.js"

STATIC_IMPORT = re.compile(r"^\s*import\s+(?:[\w*{]|['\"])", re.MULTILINE)
DYNAMIC_IMPORT = re.compile(r"(?<![\w$])import\s*\(")
EXPORT_STMT = re.compile(r"^\s*export\s+(?:default\s+)?(?:const|let|var|function|class|{|async\s+function)\b", re.MULTILINE)


def main() -> int:
    text = LEGACY.read_text(encoding="utf-8")
    findings: list[str] = []
    for label, pattern in (
        ("static import", STATIC_IMPORT),
        ("dynamic import()", DYNAMIC_IMPORT),
        ("export statement", EXPORT_STMT),
    ):
        for match in pattern.finditer(text):
            line = text.count("\n", 0, match.start()) + 1
            snippet = text[match.start(): text.find("\n", match.start())].strip()
            findings.append(f"{label} at legacy-app.js:{line}: {snippet[:140]}")

    if findings:
        print("[legacy-imports] FAIL")
        for item in findings:
            print(f"- {item}")
        return 1
    print("[legacy-imports] OK (classic script, no import/export syntax)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
