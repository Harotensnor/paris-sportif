#!/usr/bin/env python3
"""Stamp the current site version into the few user-visible labels.

Source of truth: latest commit message starting with "v37.NNN ..." or
"v36.NNN ...". The script reads it via `git log -1 --format=%s`,
extracts the version tag, and rewrites:

  - pronostics.html footer-version (text + title attribute)
  - app.js shell `version: 'v37.NNN'`

We do NOT touch sw.js CACHE_VERSION (already auto-stamped on deploy)
or hash-busting query strings (those use file content hashes, not
the semver tag).

Idempotent: running twice produces zero diff.

Wired into refresh.yml + auto_refresh.py so a fresh deploy never
shows a stale footer label again. Caught the v37.021 → v37.031
drift the first deep probe found.
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "pronostics.html"
APP_JS = ROOT / "app.js"

VERSION_RE = re.compile(r"\bv(\d+)\.(\d+)\b")


def latest_version_from_git() -> str | None:
    try:
        out = subprocess.run(
            ["git", "log", "-200", "--format=%s"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
    except FileNotFoundError:
        return None
    if out.returncode != 0:
        return None
    for subject in out.stdout.splitlines():
        m = VERSION_RE.search(subject.strip())
        if m:
            return f"v{m.group(1)}.{m.group(2)}"
    return None


def stamp_html(target: str) -> bool:
    if not HTML.exists():
        return False
    text = HTML.read_text(encoding="utf-8")
    new = re.sub(
        r'(<span\b(?=[^>]*\bid="footer-version")[^>]*\btitle="Voir les nouveautés )v\d+\.\d+("[^>]*>)v\d+\.\d+(</span>)',
        rf'\g<1>{target}\g<2>{target}\g<3>',
        text,
        count=1,
    )
    if new == text:
        def repl(match: re.Match[str]) -> str:
            open_tag = re.sub(
                r'title="Voir les nouveautés v\d+\.\d+"',
                f'title="Voir les nouveautés {target}"',
                match.group(1),
                count=1,
            )
            return f"{open_tag}{target}{match.group(2)}"

        new = re.sub(
            r'(<span\b(?=[^>]*\bid="footer-version")[^>]*>)v\d+\.\d+(</span>)',
            repl,
            text,
            count=1,
        )
    if new != text:
        HTML.write_text(new, encoding="utf-8")
        return True
    return False


def stamp_app_js(target: str) -> bool:
    if not APP_JS.exists():
        return False
    text = APP_JS.read_text(encoding="utf-8")
    new = re.sub(r"const\s+VERSION\s*=\s*'v\d+\.\d+'", f"const VERSION = '{target}'", text, count=1)
    new = re.sub(r"version:\s*'v\d+\.\d+'", f"version: '{target}'", new, count=1)
    if new != text:
        APP_JS.write_text(new, encoding="utf-8")
        return True
    return False


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", help="Version à écrire, par exemple v37.187")
    args = parser.parse_args(argv)
    target = args.target or latest_version_from_git()
    if not target:
        print("[stamp_version] could not derive version from git history", file=sys.stderr)
        return 0  # do not break the cron — version is cosmetic
    html_changed = stamp_html(target)
    js_changed = stamp_app_js(target)
    print(
        f"[stamp_version] target={target} pronostics.html={'updated' if html_changed else 'idempotent'} "
        f"app.js={'updated' if js_changed else 'idempotent'}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
