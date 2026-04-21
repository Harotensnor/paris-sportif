#!/usr/bin/env python3
"""Attach Sofascore referee stats from ``referees_soccer.json`` to events.

Mirrors ``patch_lineups_soccer.py`` — same matching strategy (exact
normalized home+away key), same idempotent overwrite pattern.

Adds to each matched event::

    ev.referee = {
        'name': 'Anthony Taylor',
        'yellowPerGame': 4.2,
        'redPerGame': 0.17,
        'games': 18,
    }

The JS side consumes ``ev.referee`` to:
- surface a 🟨 reason on the card ("Arbitre sévère" / "Arbitre laxiste")
- nudge total xG ±0.03 when ref is markedly outside the ~3-4.5 range
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
REFS = ROOT / 'referees_soccer.json'

SOCCER_LEAGUES = {'eng.1', 'esp.1', 'ger.1', 'ita.1', 'fra.1'}


def parse_names(ev_name: str) -> tuple[str, str]:
    """'Away at Home' → (away, home). Mirrors patch_lineups_soccer."""
    if not ev_name or ' at ' not in ev_name:
        return ('', '')
    parts = ev_name.split(' at ', 1)
    if len(parts) != 2:
        return ('', '')
    return (parts[0].strip(), parts[1].strip())


def main() -> int:
    if not REFS.exists():
        print(f'[patch_referees] {REFS.name} missing — run fetch_referees_soccer.py first')
        return 0  # non-fatal
    if not DATA_JS.exists():
        print(f'[patch_referees] {DATA_JS} missing')
        return 1

    raw = json.loads(REFS.read_text(encoding='utf-8'))
    events_idx: dict[str, dict] = raw.get('events') or {}
    if not events_idx:
        print('[patch_referees] empty referees file — nothing to patch')
        return 0

    txt = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        print('[patch_referees] could not parse data.js', file=sys.stderr)
        return 1
    data = json.loads(m.group(1))

    patched = 0
    scanned = 0
    for _day, evs in (data.get('days') or {}).items():
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
            ref = entry.get('referee') or {}
            if not ref.get('name'):
                continue
            ev['referee'] = {
                'name': ref.get('name'),
                'yellowPerGame': ref.get('yellowPerGame'),
                'redPerGame': ref.get('redPerGame'),
                'games': ref.get('games'),
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

    print(f'[patch_referees] patched {patched}/{scanned} soccer events w/ referee '
          f'({len(events_idx)} available)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
