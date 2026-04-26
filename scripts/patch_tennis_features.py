#!/usr/bin/env python3
"""
patch_tennis_features.py — Inject `event.tennis_features` into data.js.

Reads `tennis_ratings.json` (built by fetch_tennis_sackmann.py) and matches
each tennis event in data.js to two players via normalized last-name
tokens. Falls back gracefully when a player is not in the Sackmann dataset
(challenger / qualifier) — the event simply has no tennis_features.

Schema attached to each tennis event :

    event.tennis_features = {
      "home": { "elo": 2148.0, "surface_elo": {Hard: 2150, ...},
                "fatigue_14d": 4, "last10": "WWLWWWLWWW", "wins_last10": 8,
                "rank": 2, "tour": "atp" },
      "away": { ... },
      "surface": "Clay",   # match surface (from event or fallback)
    }

Also writes ev.elo_surface_diff = home_surface - away_surface (signed,
clamped) so predictMatch can read a single number for the "Forme surface"
component without re-doing the lookup.

Idempotent. ~0.3s.
"""
from __future__ import annotations
import json
import re
import sys
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from winamax_map import _norm, _name_tokens

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / 'data.js'
HTML = ROOT / 'pronostics.html'
RATINGS = ROOT / 'tennis_ratings.json'


def load_data():
    txt = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        print('[patch_tennis_features] could not parse data.js', file=sys.stderr)
        sys.exit(1)
    return json.loads(m.group(1))


def lookup_player(name: str, players: dict, by_token: dict) -> dict | None:
    """Resolve an ESPN-style player name to its Sackmann record. Tries
    exact normalized lookup first, then last-name token intersection."""
    if not name:
        return None
    norm = _norm(name)
    if norm in players:
        return players[norm]
    tokens = _name_tokens(name)
    if not tokens:
        return None
    candidates: list[tuple[int, str]] = []
    for tok in tokens:
        if tok in by_token:
            for cand_norm in by_token[tok]:
                cand_tokens = _name_tokens(players[cand_norm]['name'])
                shared = len(tokens & cand_tokens)
                if shared >= 1:
                    candidates.append((shared, cand_norm))
    if not candidates:
        return None
    candidates.sort(reverse=True)
    return players[candidates[0][1]]


def main() -> int:
    if not RATINGS.exists():
        print(f'[patch_tennis_features] {RATINGS.name} missing — run '
              f'fetch_tennis_sackmann.py first. Skip.', flush=True)
        return 0
    ratings = json.loads(RATINGS.read_text(encoding='utf-8'))
    players = ratings.get('players') or {}
    if not players:
        print('[patch_tennis_features] empty players dict, skip.', flush=True)
        return 0

    # Reverse index: token -> set of player normalized keys, for fuzzy fallback.
    by_token: dict[str, set[str]] = {}
    for norm, p in players.items():
        for tok in _name_tokens(p['name']):
            by_token.setdefault(tok, set()).add(norm)

    data = load_data()
    days = data.get('days') or {}
    stats = {'events': 0, 'matched_full': 0, 'matched_partial': 0, 'unmatched': 0}

    for _day, evs in days.items():
        for ev in (evs or []):
            if ev.get('sport') != 'tennis':
                continue
            comps = ev.get('competitors') or []
            if len(comps) != 2:
                continue
            stats['events'] += 1
            home = comps[0].get('name') or comps[0].get('short') or ''
            away = comps[1].get('name') or comps[1].get('short') or ''
            ph = lookup_player(home, players, by_token)
            pa = lookup_player(away, players, by_token)
            if not ph and not pa:
                stats['unmatched'] += 1
                continue
            if ph and pa:
                stats['matched_full'] += 1
            else:
                stats['matched_partial'] += 1

            def shape(p: dict | None) -> dict | None:
                if not p:
                    return None
                return {
                    'elo': p.get('elo'),
                    'surface_elo': p.get('surface_elo') or {},
                    'fatigue_14d': p.get('matches_14d') or 0,
                    'last10': p.get('last10') or '',
                    'wins_last10': p.get('wins_last10') or 0,
                    'rank': p.get('rank'),
                    'tour': p.get('tour'),
                    'n_matches': p.get('n_matches') or 0,
                }

            surface = ev.get('surface') or ''
            features = {
                'home': shape(ph),
                'away': shape(pa),
                'surface': surface,
            }
            # Surface elo diff (signed) — convenient for predictMatch consumer
            if ph and pa and surface in ('Hard', 'Clay', 'Grass'):
                he = (ph.get('surface_elo') or {}).get(surface) or ph.get('elo') or 1500
                ae = (pa.get('surface_elo') or {}).get(surface) or pa.get('elo') or 1500
                features['surface_elo_diff'] = round(he - ae, 1)
            elif ph and pa:
                # No surface known → fall back to global elo diff
                features['surface_elo_diff'] = round((ph.get('elo') or 1500) - (pa.get('elo') or 1500), 1)
            ev['tennis_features'] = features

    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    DATA_JS.write_text(f'window.PRONOSTICS_DATA = {payload};\n', encoding='utf-8')
    if HTML.exists():
        html_text = HTML.read_text(encoding='utf-8')
        new_block = f'<script>\nwindow.PRONOSTICS_DATA = {payload};\n</script>'
        html_text = re.sub(r'<script>\s*window\.PRONOSTICS_DATA\s*=.*?;?\s*</script>',
                           new_block, html_text, count=1, flags=re.DOTALL)
        HTML.write_text(html_text, encoding='utf-8')

    print(f'[{datetime.now():%H:%M:%S}] patch_tennis_features: '
          f'{stats["events"]} tennis events scanned · '
          f'{stats["matched_full"]} full · {stats["matched_partial"]} partial · '
          f'{stats["unmatched"]} unmatched (challenger/qualifier ?)', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
