#!/usr/bin/env python3
"""Audit core design-token contrast for readable body text.

This is a lightweight static guard for the app's token system. It checks the
themes that define explicit hex tokens and verifies text, secondary text, and
standard dim text against the primary surfaces at WCAG AA body-text contrast.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS_FILES = [
    ROOT / "app.css",
    ROOT / "app-design-v3.css",
]
TOKEN_RE = re.compile(r"--([a-zA-Z0-9_-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\b")
BLOCK_RE = re.compile(r"(?P<selector>:root|html\[[^\]]+\])\s*\{(?P<body>.*?)\}", re.DOTALL)
TEXT_TOKENS = ("text", "text-2", "text-dim")
SURFACE_TOKENS = ("bg", "panel", "panel-2")
MIN_RATIO = 4.5


def _expand_hex(value: str) -> str:
    value = value.lstrip("#")
    if len(value) == 3:
        value = "".join(ch * 2 for ch in value)
    return value.lower()


def _linear(channel: int) -> float:
    raw = channel / 255
    if raw <= 0.03928:
        return raw / 12.92
    return ((raw + 0.055) / 1.055) ** 2.4


def _luminance(value: str) -> float:
    hex_value = _expand_hex(value)
    red, green, blue = (int(hex_value[i : i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * _linear(red) + 0.7152 * _linear(green) + 0.0722 * _linear(blue)


def _contrast(fg: str, bg: str) -> float:
    l1, l2 = sorted((_luminance(fg), _luminance(bg)), reverse=True)
    return (l1 + 0.05) / (l2 + 0.05)


def _parse_blocks(path: Path) -> list[tuple[str, dict[str, str]]]:
    text = path.read_text(encoding="utf-8")
    blocks: list[tuple[str, dict[str, str]]] = []
    for match in BLOCK_RE.finditer(text):
        tokens = {name: value for name, value in TOKEN_RE.findall(match.group("body"))}
        if tokens:
            blocks.append((f"{path.relative_to(ROOT)}::{match.group('selector')}", tokens))
    return blocks


def main() -> int:
    findings: list[str] = []
    checked = 0
    for path in CSS_FILES:
        if not path.exists():
            continue
        for label, tokens in _parse_blocks(path):
            for text_token in TEXT_TOKENS:
                fg = tokens.get(text_token)
                if not fg:
                    continue
                for surface_token in SURFACE_TOKENS:
                    bg = tokens.get(surface_token)
                    if not bg:
                        continue
                    checked += 1
                    ratio = _contrast(fg, bg)
                    if ratio + 1e-9 < MIN_RATIO:
                        findings.append(
                            f"{label}: --{text_token} on --{surface_token} contrast {ratio:.2f}:1 < {MIN_RATIO}:1"
                        )

    if findings:
        print("[color-contrast] FAIL")
        for item in findings:
            print(f"- {item}")
        return 1
    print(f"[color-contrast] OK ({checked} token pairs >= {MIN_RATIO}:1)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
