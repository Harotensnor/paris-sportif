#!/usr/bin/env python3
"""Ensure path-filtered workflows re-run when their own YAML changes."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"
EVENTS = ("push", "pull_request")


def _event_block(text: str, event: str) -> str:
    match = re.search(rf"^  {re.escape(event)}:\s*$", text, re.MULTILINE)
    if not match:
        return ""
    start = match.start()
    next_top = re.search(r"^(?:  [A-Za-z_][A-Za-z0-9_-]*:|[A-Za-z_][A-Za-z0-9_-]*:)", text[match.end() :], re.MULTILINE)
    if not next_top:
        return text[start:]
    return text[start : match.end() + next_top.start()]


def main() -> int:
    findings: list[str] = []
    checked = 0
    for workflow in sorted(WORKFLOWS.glob("*.yml")):
        own = f".github/workflows/{workflow.name}"
        text = workflow.read_text(encoding="utf-8")
        for event in EVENTS:
            block = _event_block(text, event)
            if not block or "paths:" not in block:
                continue
            checked += 1
            if own not in block.replace("\\", "/"):
                findings.append(f"{own}: {event}.paths does not include itself")

    if findings:
        print("[workflow-self-triggers] FAIL")
        for item in findings:
            print(f"- {item}")
        return 1
    print(f"[workflow-self-triggers] OK ({checked} path-filtered events checked)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
