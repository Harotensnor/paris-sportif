#!/usr/bin/env python3
"""Audit the detail modal accessibility contract.

The match detail modal is the highest-frequency dialog in the app. This guard
keeps its static shell and focus management from regressing during UI rewrites.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "pronostics.html"
LEGACY = ROOT / "legacy-app.js"


def require(text: str, pattern: str, label: str, errors: list[str], flags: int = 0) -> None:
    if not re.search(pattern, text, flags):
        errors.append(label)


def main() -> int:
    html = HTML.read_text(encoding="utf-8")
    legacy = LEGACY.read_text(encoding="utf-8")
    errors: list[str] = []

    modal = re.search(r"<div\s+class=\"modal-backdrop\"\s+id=\"detail-modal\"[^>]*>", html)
    if not modal:
        errors.append("missing #detail-modal shell in pronostics.html")
    else:
        tag = modal.group(0)
        require(tag, r"\brole=\"dialog\"", "#detail-modal must keep role=dialog", errors)
        require(tag, r"\baria-modal=\"true\"", "#detail-modal must keep aria-modal=true", errors)
        require(tag, r"\baria-labelledby=\"detail-title\"", "#detail-modal must be labelled by #detail-title", errors)
        require(tag, r"\baria-hidden=\"true\"", "#detail-modal must be hidden before open", errors)

    require(html, r"<h3\s+id=\"detail-title\">", "detail modal needs #detail-title heading", errors)
    require(
        html,
        r"<button[^>]+id=\"close-detail\"[^>]+aria-label=\"[^\"]+\"",
        "close-detail button needs an aria-label",
        errors,
        re.DOTALL,
    )

    require(legacy, r"function\s+_trapFocus\s*\(", "missing _trapFocus helper", errors)
    require(legacy, r"_modalTrapRelease\s*=\s*_trapFocus\s*\(\s*modal", "open detail must install focus trap", errors)
    require(legacy, r"window\._modalTrapRelease\s*\(\s*\)", "close detail must release focus trap", errors)
    require(legacy, r"modal\.setAttribute\('aria-hidden',\s*'false'\)", "open detail must expose dialog", errors)
    require(legacy, r"m\.setAttribute\('aria-hidden',\s*'true'\)", "close detail must hide dialog", errors)
    require(legacy, r"e\.key\s*!==\s*'Tab'", "focus trap must handle Tab", errors)
    require(legacy, r"last\.focus\s*\(\s*\)", "focus trap must wrap Shift+Tab to last control", errors)
    require(legacy, r"first\.focus\s*\(\s*\)", "focus trap must wrap Tab to first control", errors)

    if errors:
        print("[modal-aria] FAIL")
        for err in errors:
            print(f"- {err}")
        return 1
    print("[modal-aria] OK (dialog shell, title, close button, focus trap)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
