#!/usr/bin/env python3
"""Ensure every Playwright probe script is executed by smoke.yml."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
WORKFLOW = ROOT / ".github" / "workflows" / "smoke.yml"
RUN_RE = re.compile(r"run:\s*node\s+(scripts/[A-Za-z0-9_.-]+\.js)")


def main() -> int:
    workflow = WORKFLOW.read_text(encoding="utf-8").replace("\\", "/")
    executed = set(RUN_RE.findall(workflow))
    probes = {
        f"scripts/{path.name}"
        for path in SCRIPTS.glob("probe_*.js")
        if path.is_file()
    }
    missing_run = sorted(probes - executed)
    missing_path = sorted(
        probe
        for probe in probes
        if f"'{probe}'" not in workflow and f'"{probe}"' not in workflow
    )
    findings = [f"{probe}: not executed in smoke.yml" for probe in missing_run]
    findings += [f"{probe}: not listed in smoke.yml path filters" for probe in missing_path]

    if findings:
        print("[probe-wiring] FAIL")
        for finding in findings:
            print(f"- {finding}")
        return 1
    print(f"[probe-wiring] OK ({len(probes)} probe scripts executed and path-filtered)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
