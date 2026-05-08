#!/usr/bin/env python3
"""Stamp or verify local ?v=<hash8> asset references in pronostics.html."""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "pronostics.html"
ASSET_RE = re.compile(
    r"(?P<prefix>\b(?:src|href|data-ps-lazy-script)=['\"])(?P<asset>[^'\"?#]+)\?v=(?P<stamp>[a-f0-9]{8})(?P<suffix>['\"])",
    re.IGNORECASE,
)


def _local_path(asset: str) -> Path | None:
    parsed = urlparse(asset)
    if parsed.scheme or parsed.netloc:
        return None
    clean = unquote(parsed.path).lstrip("/")
    if not clean:
        return None
    path = (ROOT / clean).resolve()
    try:
        path.relative_to(ROOT)
    except ValueError:
        return None
    return path


def _hash8(path: Path) -> str:
    try:
        out = subprocess.run(
            ["git", "hash-object", str(path.relative_to(ROOT))],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
        return out.stdout.strip()[:8]
    except Exception:
        import hashlib

        return hashlib.sha1(path.read_bytes()).hexdigest()[:8]


def collect_mismatches(text: str) -> list[tuple[str, str, str]]:
    mismatches: list[tuple[str, str, str]] = []
    for match in ASSET_RE.finditer(text):
        asset = match.group("asset")
        path = _local_path(asset)
        if path is None:
            continue
        if not path.exists() or not path.is_file():
            mismatches.append((asset, match.group("stamp"), "missing"))
            continue
        actual = _hash8(path)
        if actual != match.group("stamp"):
            mismatches.append((asset, match.group("stamp"), actual))
    return mismatches


def stamp_text(text: str) -> tuple[str, int]:
    changed = 0

    def repl(match: re.Match[str]) -> str:
        nonlocal changed
        asset = match.group("asset")
        path = _local_path(asset)
        if path is None or not path.exists() or not path.is_file():
            return match.group(0)
        actual = _hash8(path)
        if actual != match.group("stamp"):
            changed += 1
        return f"{match.group('prefix')}{asset}?v={actual}{match.group('suffix')}"

    return ASSET_RE.sub(repl, text), changed


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="fail if any stamped asset is stale")
    args = parser.parse_args(argv)

    text = HTML.read_text(encoding="utf-8")
    mismatches = collect_mismatches(text)
    if args.check:
        if mismatches:
            print("[asset-hashes] FAIL")
            for asset, expected, actual in mismatches:
                print(f"- {asset}: html={expected} actual={actual}")
            return 1
        print("[asset-hashes] OK (all ?v= hashes match file content)")
        return 0

    new_text, changed = stamp_text(text)
    if changed:
        HTML.write_text(new_text, encoding="utf-8")
    print(f"[asset-hashes] stamped {changed} references")
    return 0


if __name__ == "__main__":
    sys.exit(main())
