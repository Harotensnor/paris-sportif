#!/usr/bin/env python3
"""Stamp or verify local ?v=<hash8>[&b=<build>] asset references in pronostics.html."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import os
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "pronostics.html"
ASSET_RE = re.compile(
    r"(?P<prefix>\b(?:src|href|data-ps-lazy-script)=['\"])(?P<asset>[^'\"?#]+)\?v=(?P<stamp>[a-f0-9]{8})(?:&b=(?P<build>[A-Za-z0-9._-]+))?(?P<suffix>['\"])",
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


def _default_build_id() -> str | None:
    raw = os.environ.get("ASSET_BUILD_ID") or os.environ.get("BUILD_ID") or ""
    raw = raw.strip()
    if not raw:
        return None
    if raw.lower() in {"auto", "timestamp", "now"}:
        return datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return re.sub(r"[^A-Za-z0-9._-]+", "-", raw)[:64] or None


def stamp_text(text: str, build_id: str | None = None) -> tuple[str, int]:
    changed = 0

    def repl(match: re.Match[str]) -> str:
        nonlocal changed
        asset = match.group("asset")
        path = _local_path(asset)
        if path is None or not path.exists() or not path.is_file():
            return match.group(0)
        actual = _hash8(path)
        build_part = f"&b={build_id}" if build_id else (f"&b={match.group('build')}" if match.group("build") else "")
        if actual != match.group("stamp") or (build_id and match.group("build") != build_id):
            changed += 1
        return f"{match.group('prefix')}{asset}?v={actual}{build_part}{match.group('suffix')}"

    return ASSET_RE.sub(repl, text), changed


def _stamp_footer_version(text: str, build_id: str) -> tuple[str, bool]:
    """AUDIT 2026-05-08 v40.6 — Stamp footer-version span with BUILD_ID.

    L'user voulait voir la version changer en bas à gauche à chaque push pour
    savoir où on en est. Avant le footer affichait le VERSION constant
    ('v40.0') stable entre déploys. Maintenant on injecte le BUILD_ID
    complet (ex: 'v40.0-20260508-211000') qui bump à chaque stamp donc
    visible immédiat.
    """
    # Pattern : <span class="footer-version" id="footer-version" ... title="Voir les nouveautés vXX.Y">vXX.Y</span>
    span_re = re.compile(
        r'(<span\s+class="footer-version"\s+id="footer-version"[^>]*?title="Voir les nouveautés )([^"]+)("[^>]*>)([^<]+)(</span>)',
        re.DOTALL,
    )
    new_text, count = span_re.subn(
        lambda m: f"{m.group(1)}{build_id}{m.group(3)}{build_id}{m.group(5)}",
        text,
    )
    return new_text, count > 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="fail if any stamped asset is stale")
    parser.add_argument("--build-id", default=_default_build_id(), help="optional cache-busting build id appended as &b=<id>; use 'auto' for UTC timestamp")
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

    build_id = None
    if args.build_id:
        build_id = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S") if str(args.build_id).lower() in {"auto", "timestamp", "now"} else re.sub(r"[^A-Za-z0-9._-]+", "-", str(args.build_id))[:64]
    new_text, changed = stamp_text(text, build_id=build_id)
    footer_changed = False
    if build_id:
        new_text, footer_changed = _stamp_footer_version(new_text, build_id)
    if changed or footer_changed:
        HTML.write_text(new_text, encoding="utf-8")
    suffix = f" with build {build_id}" if build_id else ""
    extras = " + footer" if footer_changed else ""
    print(f"[asset-hashes] stamped {changed} references{suffix}{extras}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
