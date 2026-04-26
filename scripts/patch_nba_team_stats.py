#!/usr/bin/env python3
"""patch_nba_team_stats.py — Injecte nba_team_stats.json dans data.js.

Pour chaque event basketball:nba dans PRONOSTICS_DATA, attache aux deux
compétiteurs (home/away) un sous-objet `nba_stats` avec :
  - wins, losses, win_pct
  - points_for_avg, points_against_avg, pace_proxy
  - last10 (W-L string)

Le code app.js (basketScoreProjection) peut alors utiliser ces stats
saison comme blend avec last5 — réduit la variance des prédictions.
"""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / 'data.js'
NBA_STATS = ROOT / 'nba_team_stats.json'


def main() -> int:
    if not DATA_JS.exists() or not NBA_STATS.exists():
        print('[patch_nba_team_stats] data.js ou nba_team_stats.json absents, skip.',
              file=sys.stderr)
        return 0

    nba = json.loads(NBA_STATS.read_text(encoding='utf-8')).get('teams') or {}
    if not nba:
        print('[patch_nba_team_stats] nba_team_stats.json vide, skip.', file=sys.stderr)
        return 0

    js = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'(window\.PRONOSTICS_DATA\s*=\s*)(\{[\s\S]*\})(\s*;?\s*)$', js)
    if not m:
        print('[patch_nba_team_stats] data.js parse failed.', file=sys.stderr)
        return 0
    try:
        data = json.loads(m.group(2))
    except json.JSONDecodeError as e:
        print(f'[patch_nba_team_stats] JSON parse error: {e}', file=sys.stderr)
        return 0

    n_attached = 0
    for day, evs in (data.get('days') or {}).items():
        for ev in evs or []:
            if ev.get('sport') != 'basketball':
                continue
            if (ev.get('league_code') or '').lower() != 'nba':
                continue
            comps = ev.get('competitors') or []
            if len(comps) != 2:
                continue
            for comp in comps:
                abbr = (comp.get('abbr') or '').upper()
                if not abbr or abbr not in nba:
                    continue
                stats = nba[abbr]
                comp['nba_stats'] = {
                    'wins': stats.get('wins'),
                    'losses': stats.get('losses'),
                    'win_pct': stats.get('win_pct'),
                    'pf_avg': stats.get('points_for_avg'),
                    'pa_avg': stats.get('points_against_avg'),
                    'pace_proxy': stats.get('pace_proxy'),
                    'last10': stats.get('last10', ''),
                    'streak': stats.get('streak'),
                    'home_record': stats.get('home_record', ''),
                    'away_record': stats.get('away_record', ''),
                }
                n_attached += 1

    out = m.group(1) + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + (m.group(3) or ';')
    DATA_JS.write_text(out, encoding='utf-8')
    print(f'[patch_nba_team_stats] {n_attached} compétiteurs NBA enrichis avec nba_stats.',
          file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
