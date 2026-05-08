#!/usr/bin/env python3
"""Guard user-visible version and cache-busting contracts."""
from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "pronostics.html"
APP_JS = ROOT / "app.js"
LEGACY = ROOT / "legacy-app.js"
SW = ROOT / "sw.js"


def fail(message: str) -> None:
    raise SystemExit(f"[site-version] FAIL {message}")


def one(pattern: str, text: str, label: str) -> str:
    match = re.search(pattern, text, re.S)
    if not match:
        fail(f"missing {label}")
    return match.group(1)


def require(needle: str, text: str, label: str) -> None:
    if needle not in text:
        fail(f"missing {label}")


def main() -> None:
    html = HTML.read_text(encoding="utf-8")
    app = APP_JS.read_text(encoding="utf-8")
    legacy = LEGACY.read_text(encoding="utf-8")
    sw = SW.read_text(encoding="utf-8")

    app_version = one(r"const\s+VERSION\s*=\s*'(v\d+\.\d+)'", app, "app VERSION")
    footer_version = one(r'id="footer-version"[^>]*>(v\d+\.\d+)</span>', html, "footer version")
    footer_title = one(r'id="footer-version"[^>]*title="Voir les nouveautés (v\d+\.\d+)"', html, "footer title")
    sw_version = one(r"const\s+CACHE_VERSION\s*=\s*'([^']+)'", sw, "SW cache version")

    require("version: VERSION", app, "PS_APP_SHELL version constant")
    if footer_version != app_version or footer_title != app_version:
        fail(f"footer={footer_version}/{footer_title} app={app_version}")
    if not re.fullmatch(r"paris-sportif-\d{8}-\d{6}", sw_version):
        fail(f"CACHE_VERSION is not stamped: {sw_version}")
    if "updateViaCache: 'none'" not in legacy:
        fail("service worker registration must bypass HTTP cache")
    if "syncFooterVersion" not in app or "versionDrift" not in app:
        fail("runtime footer/app version drift guard missing")

    print(f"[site-version] OK {app_version} {sw_version}")


if __name__ == "__main__":
    main()
