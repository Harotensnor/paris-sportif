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
TEAM_STATS_PATH = ROOT / 'team_stats.json'

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

    # Primeira Liga / Portugal
    'sportingcp': 'sportingcp',
    'sportingclubedeportugal': 'sportingcp',
    'vitoriadeguimaraes': 'vitoriaguimaraes',
    'vitoriasc': 'vitoriaguimaraes',
    'guimaraes': 'vitoriaguimaraes',
    'fcporto': 'porto',
    'portofc': 'porto',
    'slbenfica': 'benfica',
    'benfica': 'benfica',
    'sportingbraga': 'braga',
    'scbraga': 'braga',

    # Scotland / Austria / Netherlands
    'heartofmidlothian': 'hearts',
    'hearts': 'hearts',
    'rangersfc': 'rangers',
    'rangers': 'rangers',
    'lasklinz': 'lask',
    'lask': 'lask',
    'rapidvienna': 'rapidvienna',
    'skrapidwien': 'rapidvienna',
    'psveindhoven': 'psv',
    'psv': 'psv',
    'ajaxamsterdam': 'ajax',
    'ajax': 'ajax',
    'feyenoordrotterdam': 'feyenoord',
    'feyenoord': 'feyenoord',

    # MLS / North America common ESPN-vs-FBref differences
    'lafc': 'losangelesfc',
    'losangelesfc': 'losangelesfc',
    'lagalaxy': 'lagalaxy',
    'intermiamicf': 'intermiami',
    'intermiami': 'intermiami',
    'newyorkredbulls': 'newyorkrb',
    'nyredbulls': 'newyorkrb',
    'newyorkcityfc': 'nycfc',
    'nycfc': 'nycfc',
    'sportingkansascity': 'sportingkc',
    'sportingkc': 'sportingkc',
    'seattlesounders': 'seattlesounders',
    'seattlesoundersfc': 'seattlesounders',
    'vancouverwhitecaps': 'vancouverwhitecapsfc',
    'vancouverwhitecapsfc': 'vancouverwhitecapsfc',

    # Segunda / lower tiers frequent current-table names
    'almeria': 'almeria',
    'udalmeria': 'almeria',
    'mirandes': 'mirandes',
    'cdmirandes': 'mirandes',
    'kaiserslautern': 'kaiserslautern',
    'arminiabielefeld': 'arminiabielefeld',
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


def _num(value, default=None):
    try:
        n = float(value)
    except (TypeError, ValueError):
        return default
    if n != n:
        return default
    return n


def _clamp(n: float, low: float, high: float) -> float:
    return max(low, min(high, n))


def build_team_stats_index() -> dict:
    if not TEAM_STATS_PATH.exists():
        return {}
    try:
        raw = json.loads(TEAM_STATS_PATH.read_text(encoding='utf-8'))
    except Exception:
        return {}
    teams = raw.get('teams') or raw.get('by_team') or {}
    index = {}
    if not isinstance(teams, dict):
        return index
    for key, rec in teams.items():
        if not isinstance(rec, dict):
            continue
        index[str(key)] = rec
        league_code = rec.get('league_code') or ''
        team_id = str(rec.get('team_id') or '')
        if league_code and team_id:
            index[f'{league_code}:{team_id}'] = rec
        name_key = normalize(rec.get('name') or rec.get('team') or '')
        if name_key:
            index[name_key] = rec
    return index


def lookup_team_stats(competitor: dict, event: dict, team_stats_index: dict) -> dict:
    embedded = competitor.get('team_stats') or {}
    if isinstance(embedded, dict) and embedded:
        return embedded
    league_code = event.get('league_code') or event.get('league') or ''
    team_id = str(competitor.get('id') or competitor.get('team_id') or '')
    if league_code and team_id:
        rec = team_stats_index.get(f'{league_code}:{team_id}')
        if rec:
            return rec
    return team_stats_index.get(normalize(competitor.get('name') or '')) or {}


def recent_results_proxy(competitor: dict) -> dict | None:
    rows = competitor.get('last10') or competitor.get('last5') or []
    if not isinstance(rows, list):
        return None
    clean = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        gf = _num(row.get('score_for'))
        ga = _num(row.get('score_against'))
        if gf is None or ga is None:
            continue
        clean.append((gf, ga))
    if len(clean) < 3:
        return None
    gf = sum(x[0] for x in clean) / len(clean)
    ga = sum(x[1] for x in clean) / len(clean)
    baseline = 1.35
    xg_for = _clamp((gf * 0.62) + (baseline * 0.38), 0.25, 3.25)
    xg_against = _clamp((ga * 0.62) + (baseline * 0.38), 0.25, 3.25)
    return {
        'xg_for_avg': round(xg_for, 3),
        'xg_against_avg': round(xg_against, 3),
        'matches_played': len(clean),
        'goals_diff': round(xg_for - xg_against, 3),
        'source': 'espn_recent_results_proxy',
        'method': 'recent_results_proxy_not_true_xg',
        'proxy': True,
    }


def build_goal_proxy_xg(competitor: dict, event: dict, team_stats_index: dict) -> dict | None:
    """Fallback for leagues where true xG is unavailable.

    This intentionally carries source/method flags so downstream reports can
    distinguish it from Understat/FBref. It is a conservative goals-form proxy,
    not true shot-quality xG.
    """
    stats = lookup_team_stats(competitor, event, team_stats_index)
    if not isinstance(stats, dict):
        return recent_results_proxy(competitor)
    if not stats:
        return recent_results_proxy(competitor)
    played = int(_num(stats.get('played5') or stats.get('games_l10'), 0) or 0)
    if played < 3:
        return recent_results_proxy(competitor)
    gf = _num(stats.get('avg_gf5') or stats.get('avg_for5') or stats.get('avg_for_l10'))
    ga = _num(stats.get('avg_ga5') or stats.get('avg_against5') or stats.get('avg_against_l10'))
    if gf is None or ga is None:
        return recent_results_proxy(competitor)
    # Goals are noisier than xG. Pull extremes gently toward a normal football
    # baseline so one wild five-game run does not dominate Poisson.
    baseline = 1.35
    xg_for = _clamp((gf * 0.72) + (baseline * 0.28), 0.25, 3.40)
    xg_against = _clamp((ga * 0.72) + (baseline * 0.28), 0.25, 3.40)
    return {
        'xg_for_avg': round(xg_for, 3),
        'xg_against_avg': round(xg_against, 3),
        'matches_played': played,
        'goals_diff': round(xg_for - xg_against, 3),
        'source': 'espn_form_proxy',
        'method': 'goals_l5_proxy_not_true_xg',
        'proxy': True,
    }


def main():
    if not XG_PATH.exists():
        print(f'fbref_xg.json missing — run fetch_fbref_xg.py first')
        return 0  # not an error, just nothing to inject

    if not DATA_PATH.exists():
        print(f'data.js missing', file=sys.stderr)
        return 1

    xg_data = json.loads(XG_PATH.read_text(encoding='utf-8'))
    index = build_team_index(xg_data)
    team_stats_index = build_team_stats_index()
    if not index:
        print('fbref_xg.json contains no teams, skipping')
        return 0

    print(f'Loaded fbref xG data : {len(index)} teams across {len(xg_data.get("leagues") or {})} leagues')

    # Read data.js
    text = DATA_PATH.read_text(encoding='utf-8')
    data_match = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;', text, flags=re.DOTALL)
    if not data_match:
        print('PRONOSTICS_DATA not found in data.js', file=sys.stderr)
        return 1

    raw_json = data_match.group(1)
    data = json.loads(raw_json)

    # Iterate matches
    n_total = 0
    n_injected = 0
    n_unmatched = []
    for day_iso, matches in (data.get('days') or {}).items():
        for ev in matches or []:
            if ev.get('sport') != 'football':
                continue
            for c in (ev.get('competitors') or []):
                if not isinstance(c, dict):
                    continue
                n_total += 1
                team_name = c.get('name', '')
                stats = find_xg(team_name, index)
                if not stats and not c.get('xg_stats') and not c.get('fbref_xg'):
                    stats = build_goal_proxy_xg(c, ev, team_stats_index)
                if stats:
                    c['fbref_xg'] = {
                        'xg_for_avg': stats['xg_for_avg'],
                        'xg_against_avg': stats['xg_against_avg'],
                        'matches_played': stats['matches_played'],
                        'goals_diff': round(stats.get('goals_diff', 0), 2),
                        'source': stats.get('source') or 'fbref',
                        'method': stats.get('method') or 'squad_standard',
                        'proxy': bool(stats.get('proxy')),
                    }
                    n_injected += 1
                else:
                    n_unmatched.append(team_name)

    # Write back
    new_json = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    new_text = text[:data_match.start(1)] + new_json + text[data_match.end(1):]
    DATA_PATH.write_text(new_text, encoding='utf-8')

    coverage = (n_injected / n_total * 100) if n_total else 0
    print(f'\nfbref xG injected : {n_injected}/{n_total} foot competitors ({coverage:.1f}%)')
    if n_unmatched:
        sample = list(set(n_unmatched))[:10]
        print(f'Unmatched (sample) : {sample}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
