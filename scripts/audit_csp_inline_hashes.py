#!/usr/bin/env python3
"""Guardrail: every inline <script> in pronostics.html must have its
SHA-256 hash listed in the meta CSP, and no CSP hash should be unused.

Why: the inline scripts at the top of pronostics.html (theme loader,
JSON-LD injector, Web Vitals tracker, FAB helpers) are pinned by
SHA-256 in the CSP `script-src` directive. If their content drifts
(comment edited, helper renamed) the hash changes and the script
silently fails to execute under a strict CSP — which only the smoke
e2e catches today, after deployment. This audit catches the drift
locally and in CI before the smoke job even runs.

Exits non-zero on:
  - any inline script whose hash is not in the CSP allowlist
  - any CSP hash that no inline script matches (stale entry)

JSON-LD scripts (`type="application/ld+json"`) are skipped — they
are not executable JS and don't go through script-src.
"""
from __future__ import annotations

import base64
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "pronostics.html"

INLINE_SCRIPT_RE = re.compile(
    r"<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)</script>", re.M
)
CSP_META_RE = re.compile(
    r'<meta\s+http-equiv="Content-Security-Policy"[^>]+content="([^"]+)"'
)


def is_executable_js(attrs: str, body: str) -> bool:
    if 'application/ld+json' in attrs:
        return False
    if 'application/ld+json' in body[:80]:
        return False
    if '"@graph"' in body[:200] or '"@context"' in body[:200]:
        return False
    if 'type=' in attrs and 'javascript' not in attrs.lower():
        # Some non-JS type (importmap, module-shim, etc.). CSP doesn't
        # check those against script-src 'sha256-' hashes today.
        return False
    return True


def sha256_b64(text: str) -> str:
    return base64.b64encode(hashlib.sha256(text.encode("utf-8")).digest()).decode()


def main() -> int:
    if not HTML.exists():
        print(f"[csp-inline] FAIL {HTML} missing", file=sys.stderr)
        return 1
    html = HTML.read_text(encoding="utf-8")
    csp_match = CSP_META_RE.search(html)
    if not csp_match:
        print("[csp-inline] FAIL no meta CSP found", file=sys.stderr)
        return 1
    csp = csp_match.group(1)
    csp_hashes = set(re.findall(r"'sha256-([^']+)'", csp))

    inline_hashes: set[str] = set()
    for m in INLINE_SCRIPT_RE.finditer(html):
        attrs, body = m.group(1), m.group(2)
        if not is_executable_js(attrs, body):
            continue
        inline_hashes.add(sha256_b64(body))

    missing = inline_hashes - csp_hashes
    extras = csp_hashes - inline_hashes

    if missing or extras:
        print("[csp-inline] FAIL")
        if missing:
            print("  inline scripts not allow-listed in CSP:")
            for h in sorted(missing):
                print(f"    sha256-{h}")
        if extras:
            print("  CSP entries that match no inline script (stale):")
            for h in sorted(extras):
                print(f"    sha256-{h}")
        return 1

    print(
        f"[csp-inline] OK ({len(inline_hashes)} inline scripts, "
        f"{len(csp_hashes)} CSP hashes — exact match)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
