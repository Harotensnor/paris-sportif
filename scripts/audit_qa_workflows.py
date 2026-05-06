#!/usr/bin/env python3
"""Ensure the dedicated QA and monitoring workflows stay installed."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"


def _text(name: str) -> str:
    path = WORKFLOWS / name
    return path.read_text(encoding="utf-8", errors="replace") if path.exists() else ""


def main() -> int:
    findings: list[str] = []
    qa = _text("qa-gates.yml")
    synthetic = _text("synthetic-monitor.yml")
    post = _text("post-deploy-health.yml")

    if not qa:
        findings.append(".github/workflows/qa-gates.yml missing")
    else:
        for needle in (
            "strategy:",
            "matrix:",
            "os:",
            "python-version:",
            "node-version:",
            "scripts/qa_gate_report.py",
            "actions/upload-artifact@v4",
            "'sw.js'",
            ".github/workflows/qa-gates.yml",
            ".github/workflows/synthetic-monitor.yml",
            ".github/workflows/post-deploy-health.yml",
        ):
            if needle not in qa:
                findings.append(f"qa-gates.yml missing {needle}")

    if not synthetic:
        findings.append(".github/workflows/synthetic-monitor.yml missing")
    else:
        for needle in (
            "*/15 * * * *",
            "scripts/synthetic_monitor.py",
            "actions/upload-artifact@v4",
            ".github/workflows/synthetic-monitor.yml",
        ):
            if needle not in synthetic:
                findings.append(f"synthetic-monitor.yml missing {needle}")

    if not post:
        findings.append(".github/workflows/post-deploy-health.yml missing")
    else:
        for needle in (
            "scripts/synthetic_monitor.py",
            "ENABLE_AUTO_ROLLBACK",
            "contents: write",
            ".github/workflows/post-deploy-health.yml",
        ):
            if needle not in post:
                findings.append(f"post-deploy-health.yml missing {needle}")

    if findings:
        print("[qa-workflows] FAIL")
        for item in findings:
            print(f"- {item}")
        return 1
    print("[qa-workflows] OK (QA, synthetic monitor and post-deploy health workflows present)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
