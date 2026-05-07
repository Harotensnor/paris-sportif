#!/usr/bin/env python3
"""Audit accessible names for interactive controls in the static app shell.

The frontend is mostly serverless HTML plus JS template strings. This guard is
therefore intentionally conservative: visible text is accepted, while empty or
icon-only controls must provide an explicit accessible name.
"""
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
TAG_RE = re.compile(r"<(button|input|select|textarea)\b(?P<attrs>[^>]*)>", re.IGNORECASE)
BUTTON_RE = re.compile(r"<button\b(?P<attrs>[^>]*)>(?P<body>.*?)</button>", re.IGNORECASE | re.DOTALL)
LABELABLE = {"input", "select", "textarea"}
ICON_ONLY_RE = re.compile(r"^[\s×✕✖✚+\-–—<>‹›«»·•…?!.:,;#@€$%&/\\|()[\]{}*=^~`'\"0-9🔥📤📋🎯🌙☰◀▶↻●]+$")


def _line_for(text: str, index: int) -> int:
    return text.count("\n", 0, index) + 1


def _attr(attrs: str, name: str) -> str | None:
    match = re.search(rf"\b{re.escape(name)}\s*=\s*(['\"])(.*?)\1", attrs, re.IGNORECASE | re.DOTALL)
    return html_lib.unescape(match.group(2).strip()) if match else None


def _has_name_attr(attrs: str) -> bool:
    for attr in ("aria-label", "aria-labelledby", "title", "data-tooltip", "data-help"):
        value = _attr(attrs, attr)
        if value:
            return True
    return False


def _visible_text(body: str) -> str:
    body = re.sub(r"<[^>]+>", " ", body)
    body = re.sub(r"\$\{[^}]+\}", " dynamic ", body)
    body = html_lib.unescape(body)
    return re.sub(r"\s+", " ", body).strip()


def _wrapped_by_label(text: str, index: int) -> bool:
    before = text[max(0, index - 1000) : index].lower()
    return before.rfind("<label") > before.rfind("</label>")


def _has_label_for(text: str, attrs: str) -> bool:
    control_id = _attr(attrs, "id")
    if not control_id:
        return False
    return re.search(
        rf"<label\b[^>]*\bfor\s*=\s*(['\"]){re.escape(control_id)}\1",
        text,
        re.IGNORECASE,
    ) is not None


def _audit_file(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    findings: list[str] = []
    button_spans = set()

    for match in BUTTON_RE.finditer(text):
        button_spans.add((match.start(), match.end()))
        attrs = match.group("attrs")
        body = _visible_text(match.group("body"))
        if _has_name_attr(attrs):
            continue
        if body and not ICON_ONLY_RE.match(body):
            continue
        rel = path.relative_to(ROOT)
        findings.append(f"{rel}:{_line_for(text, match.start())}: icon/empty button lacks aria-label/title")

    for match in TAG_RE.finditer(text):
        tag = match.group(1).lower()
        if tag == "button" and any(start <= match.start() < end for start, end in button_spans):
            continue
        attrs = match.group("attrs")
        if tag == "input":
            input_type = (_attr(attrs, "type") or "text").lower()
            if input_type in {"hidden", "checkbox", "radio"}:
                continue
        if tag in LABELABLE:
            if _has_name_attr(attrs) or _wrapped_by_label(text, match.start()) or _has_label_for(text, attrs):
                continue
            rel = path.relative_to(ROOT)
            findings.append(f"{rel}:{_line_for(text, match.start())}: {tag} lacks accessible label")

    return findings


def main() -> int:
    findings: list[str] = []
    for path in FILES:
        if path.exists():
            findings.extend(_audit_file(path))

    if findings:
        print("[a11y-labels] FAIL")
        for item in findings[:80]:
            print(f"- {item}")
        if len(findings) > 80:
            print(f"- ... {len(findings) - 80} more")
        return 1
    print(f"[a11y-labels] OK ({len(FILES)} files scanned)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
