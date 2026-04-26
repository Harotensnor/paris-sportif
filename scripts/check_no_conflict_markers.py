#!/usr/bin/env python3
"""check_no_conflict_markers.py — Refuse all files containing git
conflict markers (`<<<<<<<`, `=======`, `>>>>>>>` at line start).

Cette session a vu 4-5 cas où un rebase a laissé des marqueurs non
résolus dans health.json / pronostics.html commitiés. Ce script tourne
en CI pour bloquer la merge dans ces cas-là.

Sortie :
- Code retour 0 : aucun marqueur trouvé
- Code retour 1 : conflict markers détectés (avec détails)

Usage :
    python scripts/check_no_conflict_markers.py             # check all
    python scripts/check_no_conflict_markers.py file1 file2 # check spécifiques
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Lines that are conflict markers : start with <<<<<<<, >>>>>>>, or
# are exactly ======= (line of 7+ equals only). Don't match comment
# decorators like `===== Section ===` which contain content.
CONFLICT_RE = re.compile(r'^(<{7}\s|>{7}\s|={7}\s*$)', re.MULTILINE)

# Files we never want to scan (binary, large generated, vendored).
EXCLUDE_DIRS = {'.git', '.cache', 'node_modules', '__pycache__', 'playwright-report'}
EXCLUDE_EXT = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg',
               '.pyc', '.tar', '.zip', '.gz', '.woff', '.woff2', '.ttf'}


def collect_files(paths):
    """Either explicit paths or walk root."""
    if paths:
        for p in paths:
            pp = Path(p)
            if pp.is_file():
                yield pp
        return
    for p in ROOT.rglob('*'):
        if not p.is_file():
            continue
        if any(part in EXCLUDE_DIRS for part in p.parts):
            continue
        if p.suffix.lower() in EXCLUDE_EXT:
            continue
        # Skip data.js (large, sometimes contains <<<<<<< as string in some
        # legacy debug output, false positive risk)
        # Actually NO : data.js is a JSON-like blob, conflict markers IN
        # data.js would be a real bug. Don't skip.
        yield p


def scan(file_path: Path) -> list[tuple[int, str]]:
    try:
        text = file_path.read_text(encoding='utf-8', errors='replace')
    except (OSError, UnicodeError):
        return []
    bad = []
    for i, line in enumerate(text.split('\n'), start=1):
        if line.startswith('<<<<<<<') or line.startswith('>>>>>>>'):
            bad.append((i, line.rstrip()[:80]))
        elif line.rstrip() == '=======':
            # Only flag bare `=======` line (7 equals exactly), not
            # decorative section headers like `===== TITLE =====`.
            bad.append((i, line.rstrip()[:80]))
    return bad


def main(argv):
    explicit = argv[1:] if len(argv) > 1 else []
    found = 0
    file_count = 0
    for f in collect_files(explicit):
        file_count += 1
        bad = scan(f)
        if bad:
            try:
                rel = f.relative_to(ROOT)
            except ValueError:
                rel = f
            print(f'[CONFLICT] {rel}')
            for line_n, line in bad[:5]:
                print(f'    L{line_n}: {line}')
            if len(bad) > 5:
                print(f'    ... and {len(bad) - 5} more')
            found += len(bad)
    if found:
        print(f'\n[FAIL] {found} conflict marker(s) detected. Resolve them before commit.')
        return 1
    print(f'[OK] {file_count} files scanned, no conflict markers.')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
