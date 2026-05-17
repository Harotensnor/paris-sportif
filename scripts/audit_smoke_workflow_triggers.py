#!/usr/bin/env python3
"""Ensure every smoke probe is present in push and PR path triggers."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "smoke.yml"
SMOKE = ROOT / "scripts" / "legacy_site" / "qa" / "smoke_e2e.js"
RUN_RE = re.compile(r"run:\s*node\s+(scripts/[A-Za-z0-9_./-]+\.js)")


def section(text: str, start: str, end: str) -> str:
    a = text.find(start)
    if a < 0:
        return ""
    b = text.find(end, a + len(start))
    return text[a:] if b < 0 else text[a:b]


def main() -> int:
    text = WORKFLOW.read_text(encoding="utf-8")
    push = section(text, "  push:", "  pull_request:")
    pull = section(text, "  pull_request:", "  workflow_dispatch:")
    runs = RUN_RE.findall(text)
    findings: list[str] = []
    for script in sorted(set(runs)):
        needle = f"'{script}'"
        if needle not in push:
            findings.append(f"{script}: missing from push paths")
        if needle not in pull:
            findings.append(f"{script}: missing from pull_request paths")

    smoke_text = SMOKE.read_text(encoding="utf-8")
    if "nav button not found" in smoke_text or "[skip]" in smoke_text and "data-dependent" not in smoke_text:
        findings.append("scripts/legacy_site/qa/smoke_e2e.js: contains a generic skip path")

    if findings:
        print("[smoke-workflow-triggers] FAIL")
        for item in findings:
            print(f"- {item}")
        return 1
    print(f"[smoke-workflow-triggers] OK ({len(set(runs))} node probes covered)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
