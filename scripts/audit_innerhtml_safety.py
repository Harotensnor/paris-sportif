#!/usr/bin/env python3
"""Audit the remaining innerHTML surface.

The app still renders large static templates with innerHTML, so the important
guardrail is that the global sink sanitizes every assignment and logs stripped
payloads. This script fails if that protection disappears.
"""

from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    # v37.017 split: the runtime that owns innerHTML lives in legacy-app.js,
    # while app.js is now a 30-line shell loader. Prefer legacy-app.js when
    # present and fall back to app.js so the audit keeps working in either
    # layout.
    target = ROOT / "legacy-app.js"
    if not target.exists():
        target = ROOT / "app.js"
    app = target.read_text(encoding="utf-8")
    assignments = len(re.findall(r"\.innerHTML\s*=", app))
    required = [
        "function sanitizeTrustedHTML",
        "function installSafeHTMLSink",
        "Object.defineProperty(Element.prototype, 'innerHTML'",
        "sanitizeTrustedHTML(value)",
        "sanitizeTrustedHTML.stripped",
        "Removed ${stripped} unsafe HTML item(s)",
    ]
    missing = [needle for needle in required if needle not in app]
    if missing:
        raise SystemExit("missing innerHTML safety guard: " + ", ".join(missing))
    print(f"innerHTML safety audit ok: {assignments} assignments behind sanitized sink")


if __name__ == "__main__":
    main()
