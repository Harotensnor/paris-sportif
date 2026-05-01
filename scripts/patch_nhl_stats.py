#!/usr/bin/env python3
"""
patch_nhl_stats.py — Inject NHL team stats into hockey events.

Attaches `event.nhl_stats = {home: {...}, away: {...}}` for every NHL
event in data.js. Each side carries gf_per_game, ga_per_game, home/road
splits, l10 record, and (when available) the starting goalie's
save_pct + gaa.

Match by team-name token intersection (NHL API uses long names like
"Toronto Maple Leafs", ESPN abbrev is "TOR"). The standings keys are
the team abbreviations so we can also match on `competitor.abbr`.

Idempotent. ~0.2s.
"""
from __future__ import annotations
import json
import re
import sys
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from winamax_map import _name_tokens

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / 'data.js'
HTML = ROOT / 'pronostics.html'
NHL_STATS = ROOT / 'nhl_stats.json'


def load_data():
    txt = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        print('[patch_nhl_stats] could not parse data.js', file=sys.stderr)
        sys.exit(1)
    return json.loads(m.group(1))


def get_sides(ev: dict) -> tuple[dict, dict]:
    comps = ev.get('competitors') or []
    home = next((c for c in comps if c.get('home_away') == 'home'), None)
    away = next((c for c in comps if c.get('home_away') == 'away'), None)
    if not home and len(comps) >= 1:
        home = comps[0]
    if not away and len(comps) >= 2:
        away = comps[1]
    return (home or {}, away or {})


def lookup_team(comp: dict, teams: dict, by_token: dict) -> dict | None:
    """Resolve an ESPN competitor to its NHL stats record."""
    abbr = (comp.get('abbr') or '').upper()
    if abbr in teams:
        return teams[abbr]
    name = comp.get('name') or comp.get('short') or ''
    if not name:
        return None
    name_tokens = _name_tokens(name)
    candidates: list[tuple[int, str]] = []
    for tok in name_tokens:
        if tok in by_token:
            for cand_abbr in by_token[tok]:
                cand_tokens = _name_tokens(teams[cand_abbr]['name'])
                shared = len(name_tokens & cand_tokens)
                if shared >= 1:
                    candidates.append((shared, cand_abbr))
    if not candidates:
        return None
    candidates.sort(reverse=True)
    return teams[candidates[0][1]]


def main() -> int:
    if not NHL_STATS.exists():
        print('[patch_nhl_stats] nhl_stats.json missing — skip.', flush=True)
        return 0
    src = json.loads(NHL_STATS.read_text(encoding='utf-8'))
    teams = src.get('teams') or {}
    if not teams:
        print('[patch_nhl_stats] no team data, skip.', flush=True)
        return 0

    by_token: dict[str, set[str]] = {}
    for abbr, t in teams.items():
        for tok in _name_tokens(t.get('name', '')):
            by_token.setdefault(tok, set()).add(abbr)

    data = load_data()
    days = data.get('days') or {}
    stats = {'nhl_events': 0, 'attached': 0, 'with_goalies': 0}

    for _day, evs in days.items():
        for ev in (evs or []):
            if ev.get('sport') != 'hockey':
                continue
            league_code = ev.get('league_code') or ''
            if league_code and league_code != 'nhl':
                continue
            stats['nhl_events'] += 1
            home_c, away_c = get_sides(ev)
            home_t = lookup_team(home_c, teams, by_token)
            away_t = lookup_team(away_c, teams, by_token)
            if not home_t and not away_t:
                continue
            payload = {}
            if home_t:
                payload['home'] = home_t
            if away_t:
                payload['away'] = away_t
            if payload:
                ev['nhl_stats'] = payload
                stats['attached'] += 1
                if (home_t and home_t.get('goalie')) or (away_t and away_t.get('goalie')):
                    stats['with_goalies'] += 1

    payload_str = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    DATA_JS.write_text(f'window.PRONOSTICS_DATA = {payload_str};\n', encoding='utf-8')
    # v33.28 — HTML rewrite déplacé dans scripts/inject_data_in_html.py
    # (1 seul appel à la fin du pipeline plutôt que 12 regex sur ~13500 lignes)
    print(f'[{datetime.now():%H:%M:%S}] patch_nhl_stats: '
          f'{stats["nhl_events"]} NHL events · '
          f'{stats["attached"]} attached · '
          f'{stats["with_goalies"]} with goalie data', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
