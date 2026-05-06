#!/usr/bin/env python3
"""Ensure the fast QA workflow keeps its runtime matrix broad enough."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QA_WORKFLOW = ROOT / ".github" / "workflows" / "qa-gates.yml"

REQUIRED_OS = {"ubuntu-latest", "windows-latest", "macos-latest"}
REQUIRED_PYTHON = {"3.11", "3.12", "3.13"}
REQUIRED_NODE = {"18", "20", "22"}


def _extract_inline_list(text: str, key: str) -> set[str]:
    match = re.search(rf"{re.escape(key)}:\s*\[([^\]]+)\]", text)
    if not match:
        return set()
    return {
        item.strip().strip("'\"")
        for item in match.group(1).split(",")
        if item.strip()
    }


def main() -> int:
    text = QA_WORKFLOW.read_text(encoding="utf-8", errors="replace")
    found_os = _extract_inline_list(text, "os")
    found_python = _extract_inline_list(text, "python-version")
    found_node = _extract_inline_list(text, "node-version")

    findings: list[str] = []
    for label, required, found in (
        ("os", REQUIRED_OS, found_os),
        ("python-version", REQUIRED_PYTHON, found_python),
        ("node-version", REQUIRED_NODE, found_node),
    ):
        missing = sorted(required - found)
        if missing:
            findings.append(f"{label} missing {', '.join(missing)}")

    if findings:
        print("[qa-matrix] FAIL")
        for finding in findings:
            print(f"- {finding}")
        return 1
    print("[qa-matrix] OK (3 OS x 3 Python x 3 Node covered)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
