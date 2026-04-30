#!/usr/bin/env python3
"""Inject fbref xG stats into each football match competitor in data.js.

Reads fbref_xg.json (built by fetch_fbref_xg.py) and attaches per-team xG
metrics to matching competitors :

    competitor.fbref_xg = {
        'xg_for_avg': 2.15,
        'xg_against_avg': 0.85,
        'matches_played': 32,
        'goals_diff': 1.30,
    }

Used downstream by predictMatch JS to refine the Poisson xG prior.

Run AFTER patch_winamax.py (data.js rewrite) and IDEALLY BEFORE patch_clubelo
(naming uniformity). Idempotent — safe per cron tick.

Match strategy :
1. Exact normalized name match
2. ALIASES table lookup (espn → fbref naming differences)
3. Skip silently if no match (most non-top-5 leagues)
"""
from __future__ import annotations
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / 'data.js'
XG_PATH = ROOT / 'fbref_xg.json'

# Data.js (espn) name → fbref name (normalized)
ALIASES = {
    # Premier League
    'manchesterunited': 'manchesterutd',
    'manunited': 'manchesterutd',
    'manchestercity': 'manchestercity',
    'mancity': 'manchestercity',
    'newcastleunited': 'newcastleutd',
    'wolverhamptonwanderers': 'wolves',
    'tottenhamhotspur': 'tottenham',
    'westhamunited': 'westham',
    'nottinghamforest': 'nottmforest',
    'brightonhoveralbion': 'brighton',
    'brightonhovealbion': 'brighton',
    'afcbournemouth': 'bournemouth',
    'sheffieldunited': 'sheffieldutd',

    # Ligue 1
    'parissaintgermain': 'parissg',
    'psg': 'parissg',
    'olympiquemarseille': 'marseille',
    'olympiquedemarseille': 'marseille',
    'olympiquelyonnais': 'lyon',
    'asmonaco': 'monaco',
    'rclens': 'lens',
    'lilleosc': 'lille',
    'stadebrestois29': 'brest',
    'ogcnice': 'nice',
    'fcnantes': 'nantes',
    'stadereims': 'reims',
    'staderennes': 'rennes',
    'fcmetz': 'metz',

    # La Liga
    'realmadrid': 'realmadrid',
    'fcbarcelona': 'barcelona',
    'barcelona': 'barcelona',
    'atleticodemadrid': 'atleticomadrid',
    'realsociedaddefutbol': 'realsociedad',
    'realsociedad': 'realsociedad',
    'athleticbilbao': 'athleticclub',
    'athleticclub': 'athleticclub',

    # Bundesliga
    'bayernmunchen': 'bayernmunich',
    'bayernmunich': 'bayernmunich',
    'fcbayernmunchen': 'bayernmunich',
    'borussiadortmund': 'dortmund',
    'bvborussiadortmund': 'dortmund',
    'dortmund': 'dortmund',
    'rbleipzig': 'rbleipzig',
    'redbullleipzig': 'rbleipzig',
    'borussiamonchengladbach': 'monchengladbach',
    'eintrachtfrankfurt': 'eintfrankfurt',
    'bayer04leverkusen': 'leverkusen',
    'bayerleverkusen': 'leverkusen',
    'vflwolfsburg': 'wolfsburg',

    # Serie A
    'internazionale': 'inter',
    'fcinter': 'inter',
    'internationazionale': 'inter',
    'acmilan': 'milan',
    'milan': 'milan',
    'asroma': 'roma',
    'ssclazio': 'lazio',
    'sscnapoli': 'napoli',
    'juventus': 'juventus',
    'juventusfc': 'juventus',
    'acfioretina': 'fiorentina',
    'acffiorentina': 'fiorentina',
    'atalantabc': 'atalanta',
    'bolognafc': 'bologna',
    'torino': 'torino',
}


def normalize(name: str) -> str:
    if not name:
        return ''
    n = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode()
    return ''.join(c for c in n.lower() if c.isalnum())


def build_team_index(xg_data: dict) -> dict:
    """Flatten {league: {teams: {name: stats}}} → {normalized_name: stats}."""
    index = {}
    for league_name, league_data in (xg_data.get('leagues') or {}).items():
        for team_name, stats in (league_data.get('teams') or {}).items():
            norm = stats.get('normalized_name') or normalize(team_name)
            index[norm] = {**stats, '_league': league_name, '_original_name': team_name}
    return index


def find_xg(team_name: str, index: dict) -> dict | None:
    if not team_name:
        return None
    norm = normalize(team_name)
    # 1. Exact match
    if norm in index:
        return index[norm]
    # 2. Alias
    if norm in ALIASES and ALIASES[norm] in index:
        return index[ALIASES[norm]]
    # 3. Prefix fallback (6+ chars unambiguous)
    if len(norm) >= 6:
        prefix = norm[:6]
        candidates = [k for k in index if k.startswith(prefix)]
        if len(candidates) == 1:
            return index[candidates[0]]
    return None


def main():
    if not XG_PATH.exists():
        print(f'fbref_xg.json missing — run fetch_fbref_xg.py first')
        return 0  # not an error, just nothing to inject

    if not DATA_PATH.exists():
        print(f'data.js missing', file=sys.stderr)
        return 1

    xg_data = json.loads(XG_PATH.read_text(encoding='utf-8'))
    index = build_team_index(xg_data)
    if not index:
        print('fbref_xg.json contains no teams, skipping')
        return 0

    print(f'Loaded fbref xG data : {len(index)} teams across {len(xg_data.get("leagues") or {})} leagues')

    # Read data.js
    text = DATA_PATH.read_text(encoding='utf-8')
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;', text, flags=re.DOTALL)
    if not m:
        print('PRONOSTICS_DATA not found in data.js', file=sys.stderr)
        return 1

    raw_json = m.group(1)
    data = json.loads(raw_json)

    # Iterate matches
    n_total = 0
    n_injected = 0
    n_unmatched = []
    for day_iso, matches in (data.get('days') or {}).items():
        for m in matches or []:
            if m.get('sport') != 'football':
                continue
            for c in (m.get('competitors') or []):
                if not isinstance(c, dict):
                    continue
                n_total += 1
                team_name = c.get('name', '')
                stats = find_xg(team_name, index)
                if stats:
                    c['fbref_xg'] = {
                        'xg_for_avg': stats['xg_for_avg'],
                        'xg_against_avg': stats['xg_against_avg'],
                        'matches_played': stats['matches_played'],
                        'goals_diff': round(stats.get('goals_diff', 0), 2),
                    }
                    n_injected += 1
                else:
                    n_unmatched.append(team_name)

    # Write back
    new_json = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    new_text = text[:m.start(1)] + new_json + text[m.end(1):]
    DATA_PATH.write_text(new_text, encoding='utf-8')

    coverage = (n_injected / n_total * 100) if n_total else 0
    print(f'\nfbref xG injected : {n_injected}/{n_total} foot competitors ({coverage:.1f}%)')
    if n_unmatched:
        sample = list(set(n_unmatched))[:10]
        print(f'Unmatched (sample) : {sample}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
