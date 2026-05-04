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
from difflib import SequenceMatcher
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from winamax_map import _alias, _norm

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / 'data.js'
HTML = ROOT / 'pronostics.html'
REFS = ROOT / 'referees_soccer.json'

SOCCER_LEAGUES = {
    'eng.1', 'esp.1', 'ger.1', 'ita.1', 'fra.1',
    'ned.1', 'por.1', 'tur.1', 'bel.1', 'sco.1',
    'eng.2', 'esp.2', 'ita.2', 'ger.2', 'fra.2',
    'uefa.champions', 'uefa.europa', 'uefa.europa.conf',
}

REFEREE_TEAM_ALIASES = {
    'afcbournemouth': 'bournemouth',
    'athleticbilbao': 'athleticclub',
    'barcelona': 'barca',
    'fcbarcelona': 'barca',
    'parissaintgermain': 'psg',
    'psg': 'psg',
    'bayernmunich': 'bayern',
    'bayernmunchen': 'bayern',
    'fcbayernmunchen': 'bayern',
    'wolverhamptonwanderers': 'wolverhampton',
    'wolves': 'wolverhampton',
    'alaves': 'deportivoalaves',
    'deportivoalaves': 'deportivoalaves',
    'levante': 'levanteud',
    'levanteud': 'levanteud',
    'asroma': 'roma',
    'asrome': 'roma',
    'roma': 'roma',
    'sportingcp': 'sporting',
    'sportingportugal': 'sporting',
    'vitoriadeguimaraes': 'vitoriasc',
    'victoriaguimaraes': 'vitoriasc',
    'vitoriasc': 'vitoriasc',
    'manchestercity': 'mancity',
    'mancity': 'mancity',
    'manchesterunited': 'manutd',
    'manunited': 'manutd',
    'manutd': 'manutd',
    'nottinghamforest': 'nottinghamforest',
}


def parse_names(ev_name: str) -> tuple[str, str]:
    """'Away at Home' → (away, home). Mirrors patch_lineups_soccer."""
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


def _canon_name(name: str | None) -> str:
    norm = _norm(name)
    if not norm:
        return ''
    return REFEREE_TEAM_ALIASES.get(norm) or _alias(norm) or norm


def _canon_key(home_name: str, away_name: str) -> str:
    return f'{_canon_name(home_name)}|{_canon_name(away_name)}'


def _index_referees(events_idx: dict[str, dict]) -> dict[str, dict]:
    """Index exact Sofascore keys and canonical alias keys.

    Sofascore/ESPN/Winamax disagree on a surprising number of official team
    names ("AFC Bournemouth" vs "Bournemouth", "AS Roma" vs "Roma"). Exact
    matching is still preferred, but the canonical key avoids losing already
    fetched referee data just because one source includes a prefix/suffix.
    """
    idx: dict[str, dict] = {}
    for raw_key, entry in events_idx.items():
        idx.setdefault(raw_key, entry)
        if '|' not in raw_key:
            continue
        home, away = raw_key.split('|', 1)
        idx.setdefault(_canon_key(home, away), entry)
    return idx


def _best_fuzzy_ref(events_idx: dict[str, dict], home_name: str, away_name: str,
                    league_code: str | None) -> tuple[dict | None, float]:
    home = _canon_name(home_name)
    away = _canon_name(away_name)
    if not (home and away):
        return (None, 0.0)

    best_entry: dict | None = None
    best_score = 0.0
    for raw_key, entry in events_idx.items():
        if league_code and entry.get('league_code') and entry.get('league_code') != league_code:
            continue
        if '|' not in raw_key:
            continue
        ref_home, ref_away = raw_key.split('|', 1)
        ref_home = _canon_name(ref_home)
        ref_away = _canon_name(ref_away)
        if not (ref_home and ref_away):
            continue
        direct = (
            SequenceMatcher(None, home, ref_home).ratio()
            + SequenceMatcher(None, away, ref_away).ratio()
        ) / 2
        reverse = (
            SequenceMatcher(None, home, ref_away).ratio()
            + SequenceMatcher(None, away, ref_home).ratio()
        ) / 2
        score = max(direct, reverse)
        if score > best_score:
            best_score = score
            best_entry = entry
    if best_score >= 0.88:
        return (best_entry, best_score)
    return (None, best_score)


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
    ref_index = _index_referees(events_idx)

    txt = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        print('[patch_referees] could not parse data.js', file=sys.stderr)
        return 1
    data = json.loads(m.group(1))

    patched = 0
    matched_exact = 0
    matched_alias = 0
    matched_fuzzy = 0
    scanned = 0
    missing_samples: list[dict] = []
    for _day, evs in (data.get('days') or {}).items():
        for ev in evs:
            if ev.get('league_code') not in SOCCER_LEAGUES:
                continue
            home_name = _side_name(ev, 'home')
            away_name = _side_name(ev, 'away')
            if not (home_name and away_name):
                away_name, home_name = parse_names(ev.get('name') or '')
            if not (home_name and away_name):
                continue
            scanned += 1
            key = f'{_norm(home_name)}|{_norm(away_name)}'
            canon_key = _canon_key(home_name, away_name)
            entry = events_idx.get(key)
            if entry:
                matched_exact += 1
            else:
                entry = ref_index.get(canon_key)
                if entry:
                    matched_alias += 1
                else:
                    entry, _score = _best_fuzzy_ref(
                        events_idx,
                        home_name,
                        away_name,
                        ev.get('league_code'),
                    )
                    if entry:
                        matched_fuzzy += 1
            if not entry:
                if len(missing_samples) < 25:
                    missing_samples.append({
                        'league_code': ev.get('league_code'),
                        'home': home_name,
                        'away': away_name,
                        'key': key,
                        'canonical_key': canon_key,
                    })
                continue
            ref = entry.get('referee') or {}
            if not ref.get('name'):
                continue
            ev['referee'] = {
                'name': ref.get('name'),
                'country': ref.get('country'),
                'yellowPerGame': ref.get('yellowPerGame'),
                'redPerGame': ref.get('redPerGame'),
                'cardsPerGame': ref.get('cardsPerGame') or ref.get('yellowPerGame'),
                'games': ref.get('games'),
                'league_code': entry.get('league_code'),
                'sofa_event_id': entry.get('sofa_event_id'),
            }
            patched += 1

    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    DATA_JS.write_text(f'window.PRONOSTICS_DATA = {payload};\n', encoding='utf-8')

    audit = {
        'source': REFS.name,
        'available_referee_events': len(events_idx),
        'soccer_events_scanned': scanned,
        'patched': patched,
        'matched_exact': matched_exact,
        'matched_alias': matched_alias,
        'matched_fuzzy': matched_fuzzy,
        'missing_samples': missing_samples,
    }
    (ROOT / 'referees_patch_audit.json').write_text(
        json.dumps(audit, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8',
    )

    # v33.28 — HTML rewrite déplacé dans scripts/inject_data_in_html.py
    # (1 seul appel à la fin du pipeline plutôt que 12 regex sur ~13500 lignes)
    print(f'[patch_referees] patched {patched}/{scanned} soccer events w/ referee '
          f'({len(events_idx)} available; exact={matched_exact}, '
          f'alias={matched_alias}, fuzzy={matched_fuzzy})')
    return 0


if __name__ == '__main__':
    sys.exit(main())
