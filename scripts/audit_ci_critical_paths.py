#!/usr/bin/env python3
"""Ensure CI path filters cover shipped app assets that can break runtime."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = {
    "e2e": ROOT / ".github" / "workflows" / "e2e.yml",
    "smoke": ROOT / ".github" / "workflows" / "smoke.yml",
}
REQUIRED = {
    "e2e": (
        "pronostics.html",
        "legacy-app.js",
        "app.js",
        "app.css",
        "app-enhancements.js",
        "app-i18n.js",
        "src/**",
        "vendor/**",
        "scripts/**",
        ".github/workflows/e2e.yml",
    ),
    "smoke": (
        "pronostics.html",
        "sw.js",
        "legacy-app.js",
        "app-enhancements.js",
        "app-i18n.js",
        "src/**",
        "vendor/**",
        ".github/workflows/smoke.yml",
    ),
}


def _event_block(text: str, event: str) -> str:
    match = re.search(rf"^  {re.escape(event)}:\s*$", text, re.MULTILINE)
    if not match:
        return ""
    next_top = re.search(r"^(?:  [A-Za-z_][A-Za-z0-9_-]*:|[A-Za-z_][A-Za-z0-9_-]*:)", text[match.end() :], re.MULTILINE)
    return text[match.start() :] if not next_top else text[match.start() : match.end() + next_top.start()]


def main() -> int:
    findings: list[str] = []
    for name, path in WORKFLOWS.items():
        text = path.read_text(encoding="utf-8")
        for event in ("push", "pull_request"):
            block = _event_block(text, event).replace("\\", "/")
            if not block:
                findings.append(f"{path.relative_to(ROOT)}: missing {event} trigger")
                continue
            for asset in REQUIRED[name]:
                if asset not in block:
                    findings.append(f"{path.relative_to(ROOT)}: {event}.paths missing {asset}")

    if findings:
        print("[ci-critical-paths] FAIL")
        for item in findings:
            print(f"- {item}")
        return 1
    print("[ci-critical-paths] OK (critical app assets covered by smoke/e2e)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
