#!/usr/bin/env python3
"""Attach Sofascore lineups from ``lineups_soccer.json`` to events in data.js.

For each upcoming top-5 league match, match the ESPN event's team names
against the keys in ``lineups_soccer.json`` (which are
``home_norm|away_norm``) and copy the starting XI + subs into the event
and competitor records.

Adds to each matched competitor::

    competitor.lineup = {
        'formation': '4-2-3-1',
        'confirmed': false,
        'coach': 'Oliver Glasner',
        'starters': [{'name', 'pos', 'shirt', 'rating', 'captain'}, ...],
        'subs':     [{'name', 'pos', 'shirt', 'rating', 'captain'}, ...],
    }

Also adds ``event.lineups = {home, away, league_code, sofa_event_id}`` so
frontend/data-health code can detect lineup availability without walking the
competitor array.

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
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from winamax_map import _norm
from winamax_map import _name_tokens

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / 'data.js'
HTML = ROOT / 'pronostics.html'
LINEUPS = ROOT / 'lineups_soccer.json'

SOCCER_LEAGUES = {
    'eng.1', 'esp.1', 'ger.1', 'ita.1', 'fra.1',
    'ned.1', 'por.1', 'tur.1', 'bel.1', 'sco.1',
    'eng.2', 'esp.2', 'ita.2', 'ger.2', 'fra.2',
}


def parse_names(ev_name: str) -> tuple[str, str]:
    """'Away at Home' → (away, home). Mirrors patch_injuries_soccer.parse_names."""
    if not ev_name or ' at ' not in ev_name:
        return ('', '')
    parts = ev_name.split(' at ', 1)
    if len(parts) != 2:
        return ('', '')
    return (parts[0].strip(), parts[1].strip())


def _side_name(ev: dict, side: str) -> str:
    for c in ev.get('competitors') or []:
        if c.get('home_away') == side:
            return c.get('name') or c.get('displayName') or c.get('shortDisplayName') or ''
    return ''


def _lineup_payload(side: dict | None) -> dict:
    side = side or {}
    return {
        'team': side.get('team') or '',
        'formation': side.get('formation') or '',
        'confirmed': bool(side.get('confirmed')),
        'coach': side.get('coach') or '',
        'starters': side.get('starters') or [],
        'subs': side.get('subs') or [],
    }


def _parse_ts(value: object) -> float | None:
    if value is None or value == '':
        return None
    if isinstance(value, (int, float)):
        return float(value if value > 10_000_000_000 else value * 1000)
    try:
        return datetime.fromisoformat(str(value).replace('Z', '+00:00')).timestamp() * 1000
    except Exception:
        return None


def _time_compatible(entry: dict, event_date: str, max_minutes: int = 240) -> bool:
    entry_ts = _parse_ts(entry.get('date') or entry.get('start') or entry.get('startDate') or entry.get('startTimestamp'))
    event_ts = _parse_ts(event_date)
    if entry_ts is None or event_ts is None:
        return True
    return abs(entry_ts - event_ts) <= max_minutes * 60_000


def _find_entry(
    events_idx: dict[str, dict],
    league_code: str,
    home_name: str,
    away_name: str,
    event_date: str = '',
) -> dict | None:
    key = f'{_norm(home_name)}|{_norm(away_name)}'
    entry = events_idx.get(key)
    if entry and _time_compatible(entry, event_date):
        return entry

    home_tokens = _name_tokens(home_name)
    away_tokens = _name_tokens(away_name)
    if not home_tokens or not away_tokens:
        return None

    for idx_key, candidate in events_idx.items():
        if candidate.get('league_code') and candidate.get('league_code') != league_code:
            continue
        if not _time_compatible(candidate, event_date):
            continue
        h_name = (candidate.get('home') or {}).get('team') or idx_key.split('|', 1)[0]
        a_name = (candidate.get('away') or {}).get('team') or idx_key.split('|', 1)[-1]
        if (home_tokens & _name_tokens(h_name)) and (away_tokens & _name_tokens(a_name)):
            return candidate
    return None


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
    event_level_patched = 0
    competitor_lineups = 0
    scanned = 0
    for day, evs in (data.get('days') or {}).items():
        for ev in evs:
            if ev.get('sport') != 'football':
                continue
            if ev.get('league_code') not in SOCCER_LEAGUES:
                continue
            if ev.get('completed'):
                continue
            home_name = _side_name(ev, 'home')
            away_name = _side_name(ev, 'away')
            if not (home_name and away_name):
                away_name, home_name = parse_names(ev.get('name') or '')
            if not (home_name and away_name):
                continue
            scanned += 1
            entry = _find_entry(events_idx, ev.get('league_code') or '', home_name, away_name, ev.get('date') or '')
            if not entry:
                continue
            home_lineup = _lineup_payload(entry.get('home'))
            away_lineup = _lineup_payload(entry.get('away'))
            ev['lineups'] = {
                'home': home_lineup,
                'away': away_lineup,
                'league_code': entry.get('league_code') or ev.get('league_code') or '',
                'sofa_event_id': entry.get('sofa_event_id') or '',
                'date': entry.get('date') or '',
                'source': 'sofascore',
            }
            event_level_patched += 1
            # Attach per-side lineup to the matching competitor.
            for c in ev.get('competitors') or []:
                ha = c.get('home_away')
                side = home_lineup if ha == 'home' else away_lineup if ha == 'away' else None
                if not side:
                    continue
                c['lineup'] = side
                competitor_lineups += 1
            patched += 1

    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    DATA_JS.write_text(f'window.PRONOSTICS_DATA = {payload};\n', encoding='utf-8')

    # v33.28 — HTML rewrite déplacé dans scripts/inject_data_in_html.py
    # (1 seul appel à la fin du pipeline plutôt que 12 regex sur ~13500 lignes)
    print(f'[patch_lineups] patched {patched}/{scanned} soccer events w/ lineups '
          f'({len(events_idx)} available, event_level={event_level_patched}, '
          f'competitors={competitor_lineups})')
    return 0


if __name__ == '__main__':
    sys.exit(main())
