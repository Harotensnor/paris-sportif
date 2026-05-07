#!/usr/bin/env python3
"""Audit <img> alternatives in the static app and JS templates."""
from __future__ import annotations

import html as html_lib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    ROOT / "pronostics.html",
    ROOT / "legacy-app.js",
    ROOT / "app-enhancements.js",
]
IMG_RE = re.compile(r"<img\b(?P<attrs>[^>]*)>", re.IGNORECASE | re.DOTALL)


def _line_for(text: str, index: int) -> int:
    return text.count("\n", 0, index) + 1


def _attr(attrs: str, name: str) -> str | None:
    match = re.search(rf"\b{re.escape(name)}\s*=\s*(['\"])(.*?)\1", attrs, re.IGNORECASE | re.DOTALL)
    return html_lib.unescape(match.group(2).strip()) if match else None


def _has_bool_attr(attrs: str, name: str) -> bool:
    return re.search(rf"\b{re.escape(name)}\b", attrs, re.IGNORECASE) is not None


def _audit_file(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    findings: list[str] = []
    for match in IMG_RE.finditer(text):
        attrs = match.group("attrs")
        alt = _attr(attrs, "alt")
        aria_hidden = (_attr(attrs, "aria-hidden") or "").lower() == "true"
        if alt is None:
            rel = path.relative_to(ROOT)
            findings.append(f"{rel}:{_line_for(text, match.start())}: img missing alt")
            continue
        if alt == "" and not aria_hidden:
            if _has_bool_attr(attrs, "data-fallback-text"):
                continue
            rel = path.relative_to(ROOT)
            findings.append(f"{rel}:{_line_for(text, match.start())}: decorative img needs aria-hidden=\"true\"")
    return findings


def main() -> int:
    findings: list[str] = []
    for path in FILES:
        if path.exists():
            findings.extend(_audit_file(path))

    if findings:
        print("[image-alts] FAIL")
        for item in findings:
            print(f"- {item}")
        return 1
    print(f"[image-alts] OK ({len(FILES)} files scanned)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
