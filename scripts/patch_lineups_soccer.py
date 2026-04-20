#!/usr/bin/env python3
"""Attach Sofascore lineups from ``lineups_soccer.json`` to events in data.js.

For each upcoming top-5 league match, match the ESPN event's team names
against the keys in ``lineups_soccer.json`` (which are
``home_norm|away_norm``) and copy the starting XI + subs into the
competitor records.

Adds to each matched competitor::

    competitor.lineup = {
        'formation': '4-2-3-1',
        'confirmed': false,
        'coach': 'Oliver Glasner',
        'starters': [{'name', 'pos', 'shirt', 'rating', 'captain'}, ...],
        'subs':     [{'name', 'pos', 'shirt', 'rating', 'captain'}, ...],
    }

Matching strategy: exact normalized-name match on both sides. Lineups are
ordered pairs (home+away) so we need both teams to match — this avoids
mis-attaching when two leagues have teams with similar short names.
Token-fuzzy fallback is intentionally NOT applied here: misattributing a
full XI is much worse than missing one, and the five leagues have stable
canonical names.
"""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from winamax_map import _norm

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / 'data.js'
HTML = ROOT / 'pronostics.html'
LINEUPS = ROOT / 'lineups_soccer.json'

SOCCER_LEAGUES = {'eng.1', 'esp.1', 'ger.1', 'ita.1', 'fra.1'}


def parse_names(ev_name: str) -> tuple[str, str]:
    """'Away at Home' → (away, home). Mirrors patch_injuries_soccer.parse_names."""
    if not ev_name or ' at ' not in ev_name:
        return ('', '')
    parts = ev_name.split(' at ', 1)
    if len(parts) != 2:
        return ('', '')
    return (parts[0].strip(), parts[1].strip())


def main() -> int:
    if not LINEUPS.exists():
        print(f'[patch_lineups] {LINEUPS.name} missing — run fetch_lineups_soccer.py first')
        return 0  # non-fatal
    if not DATA_JS.exists():
        print(f'[patch_lineups] {DATA_JS} missing')
        return 1

    raw = json.loads(LINEUPS.read_text(encoding='utf-8'))
    events_idx: dict[str, dict] = raw.get('events') or {}
    if not events_idx:
        print('[patch_lineups] empty lineups file — nothing to patch')
        return 0

    txt = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        print('[patch_lineups] could not parse data.js', file=sys.stderr)
        return 1
    data = json.loads(m.group(1))

    patched = 0
    scanned = 0
    for day, evs in (data.get('days') or {}).items():
        for ev in evs:
            if ev.get('league_code') not in SOCCER_LEAGUES:
                continue
            if ev.get('completed'):
                continue
            away_name, home_name = parse_names(ev.get('name') or '')
            if not (home_name and away_name):
                continue
            scanned += 1
            key = f'{_norm(home_name)}|{_norm(away_name)}'
            entry = events_idx.get(key)
            if not entry:
                continue
            # Attach per-side lineup to the matching competitor.
            for c in ev.get('competitors') or []:
                ha = c.get('home_away')
                side = entry.get(ha)  # 'home' or 'away'
                if not side:
                    continue
                c['lineup'] = {
                    'formation': side.get('formation') or '',
                    'confirmed': bool(side.get('confirmed')),
                    'coach': side.get('coach') or '',
                    'starters': side.get('starters') or [],
                    'subs': side.get('subs') or [],
                }
            patched += 1

    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    DATA_JS.write_text(f'window.PRONOSTICS_DATA = {payload};\n', encoding='utf-8')

    if HTML.exists():
        html_text = HTML.read_text(encoding='utf-8')
        new_block = f'<script>\nwindow.PRONOSTICS_DATA = {payload};\n</script>'
        html_text = re.sub(r'<script>\s*window\.PRONOSTICS_DATA\s*=.*?;?\s*</script>',
                           new_block, html_text, count=1, flags=re.DOTALL)
        HTML.write_text(html_text, encoding='utf-8')

    print(f'[patch_lineups] patched {patched}/{scanned} soccer events w/ lineups '
          f'({len(events_idx)} available)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
