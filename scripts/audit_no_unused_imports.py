#!/usr/bin/env python3
"""Audit script references declared by pronostics.html.

The app stays deliberately static: if a <script src="..."> points to a
missing, empty, remote, or path-escaping file, the browser only reports it at
runtime. This audit fails in CI before that broken asset can ship.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "pronostics.html"


def iter_script_srcs(html: str) -> list[str]:
    pattern = re.compile(r"<script\b[^>]*\bsrc=[\"']([^\"']+)[\"'][^>]*>", re.IGNORECASE)
    return [m.group(1).strip() for m in pattern.finditer(html)]


def resolve_local_src(src: str) -> Path | None:
    parsed = urlparse(src)
    if parsed.scheme or parsed.netloc:
        return None
    clean = unquote(parsed.path).lstrip("/")
    return (ROOT / clean).resolve()


def main() -> int:
    html = HTML.read_text(encoding="utf-8")
    srcs = iter_script_srcs(html)
    errors: list[str] = []

    for src in srcs:
        local_path = resolve_local_src(src)
        if local_path is None:
            errors.append(f"{src}: remote script src is not allowed in static QA")
            continue
        try:
            local_path.relative_to(ROOT)
        except ValueError:
            errors.append(f"{src}: script path escapes repository root")
            continue
        if not local_path.exists():
            errors.append(f"{src}: referenced script file does not exist")
            continue
        if not local_path.is_file():
            errors.append(f"{src}: referenced script is not a file")
            continue
        size = local_path.stat().st_size
        if size <= 0:
            errors.append(f"{src}: referenced script file is empty")

    if errors:
        print("[script-src-audit] FAIL")
        for err in errors:
            print(f"- {err}")
        return 1
    print(f"[script-src-audit] OK ({len(srcs)} local script src references)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
