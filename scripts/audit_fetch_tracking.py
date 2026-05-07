#!/usr/bin/env python3
"""Guardrail for SPA fetch cancellation.

Page-level sidecar fetches must be abortable so quick navigation does not let
stale JSON repaint the next page.
"""

from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    # v37.017 split: the SPA now lives in legacy-app.js. Keep app.js as
    # a fallback so the audit still catches missing guards in the older
    # monolithic layout.
    target = ROOT / "legacy-app.js"
    if not target.exists():
        target = ROOT / "app.js"
    app = target.read_text(encoding="utf-8")
    required = [
        "const TRACKED_FETCHES = new Set();",
        "function abortTrackedFetches",
        "function fetchTracked",
        "abortTrackedFetches('page');",
        "window.fetchTracked = fetchTracked;",
        "window.__PARIS_TRACKED_FETCHES = TRACKED_FETCHES;",
    ]
    missing = [needle for needle in required if needle not in app]
    if missing:
        raise SystemExit("missing fetch tracking guard: " + ", ".join(missing))
    page_fetches = len(re.findall(r"fetchTracked\([^\n]+,\s*\{[^\n]+},\s*'page'\)", app))
    if page_fetches < 3:
        raise SystemExit(f"expected at least 3 page fetchTracked calls, found {page_fetches}")
    print(f"fetch tracking audit ok: {page_fetches} page-scoped fetches")


if __name__ == "__main__":
    main()
