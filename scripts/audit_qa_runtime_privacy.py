#!/usr/bin/env python3
"""Keep the browser QA runtime local-only and callable from DevTools."""
from __future__ import annotations

import sys
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "src" / "qa-runtime.js"
HTML = ROOT / "pronostics.html"
BANNED = (
    "fetch(",
    "navigator.sendBeacon",
    "XMLHttpRequest",
    "WebSocket",
    "EventSource",
    "import(",
)
REQUIRED_GLOBALS = (
    "__errors",
    "__bugReport",
    "__exportBugReport",
    "__qaCanaryVariant",
)


def main() -> int:
    findings: list[str] = []
    text = RUNTIME.read_text(encoding="utf-8", errors="replace") if RUNTIME.exists() else ""
    html = HTML.read_text(encoding="utf-8", errors="replace")
    if not text:
        findings.append("src/qa-runtime.js is missing or empty")
    for token in BANNED:
        if token in text:
            findings.append(f"src/qa-runtime.js uses forbidden network API: {token}")
    for name in REQUIRED_GLOBALS:
        if name not in text:
            findings.append(f"src/qa-runtime.js does not expose window.{name}")
    if "src/qa-runtime.js" not in html:
        findings.append("pronostics.html does not load src/qa-runtime.js")
    runtime_script = re.search(r"<script\b[^>]*src=[\"']src/qa-runtime\.js\b", html)
    legacy_script = re.search(r"<script\b[^>]*src=[\"']legacy-app\.js\b", html)
    if runtime_script and legacy_script and runtime_script.start() > legacy_script.start():
        findings.append("src/qa-runtime.js must load before legacy-app.js to catch early runtime errors")

    if findings:
        print("[qa-runtime-privacy] FAIL")
        for item in findings:
            print(f"- {item}")
        return 1
    print("[qa-runtime-privacy] OK (local-only runtime QA surface)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
