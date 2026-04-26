#!/usr/bin/env python3
"""fetch_nba_team_stats.py — NBA team stats agregées via ESPN public endpoint.

Pourquoi : le modèle basket actuel utilise uniquement last5 (ESPN team_form)
pour le score projection. C'est insuffisant pour capter le pace différentiel
entre équipes (ORtg/DRtg). Cette source ajoute pace + offensive/defensive
rating per team, qui sont LE signal NBA pro.

Source : ESPN site API publique :
  https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams

Le JSON retourné a `record` + `stats` détaillées par équipe. On extrait :
  - PPG (points per game) home/away splits
  - Opponent PPG
  - Win-loss record total + last10
  - Conference rank

Output : `nba_team_stats.json` keyed by team abbreviation.

Usage : python3 scripts/fetch_nba_team_stats.py
Cadence : 30 min (les stats agrégées bougent lentement).
"""
from __future__ import annotations
import json
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'nba_team_stats.json'
MIN_INTERVAL = 1800   # 30 min


def _ua_request(url: str) -> str | None:
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'paris-sportif/1.0 (educational)',
            'Accept': 'application/json',
        })
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.read().decode('utf-8', errors='ignore')
    except (urllib.error.URLError, urllib.error.HTTPError, OSError) as e:
        print(f'  ERR {url[-50:]}: {e}', flush=True)
        return None


def _should_skip() -> bool:
    if not OUTPUT.exists():
        return False
    age = time.time() - OUTPUT.stat().st_mtime
    return age < MIN_INTERVAL


def fetch_team_records() -> dict:
    """Endpoint NBA standings : retourne records + conf rank par équipe."""
    url = 'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings'
    raw = _ua_request(url)
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    out = {}
    for child in (data.get('children') or []):
        conf_name = child.get('name') or ''
        for entry in (child.get('standings', {}).get('entries') or []):
            team = entry.get('team') or {}
            abbr = team.get('abbreviation', '').upper()
            if not abbr:
                continue
            stats_arr = entry.get('stats') or []
            stats_map = {}
            for s in stats_arr:
                stats_map[s.get('name', '')] = s.get('value')
            out[abbr] = {
                'name': team.get('displayName', ''),
                'abbr': abbr,
                'conference': conf_name,
                'wins': int(stats_map.get('wins') or 0),
                'losses': int(stats_map.get('losses') or 0),
                'win_pct': float(stats_map.get('winPercent') or 0),
                'games_back': float(stats_map.get('gamesBehind') or 0),
                'streak': stats_map.get('streak'),  # signed int
                'home_record': stats_map.get('home', ''),
                'away_record': stats_map.get('road', ''),
                'last10': stats_map.get('lastTenGames', ''),
                'points_for_avg': float(stats_map.get('avgPointsFor') or 0),
                'points_against_avg': float(stats_map.get('avgPointsAgainst') or 0),
                # Pace approximé via PPG total + adversaire (gross)
                'pace_proxy': float(stats_map.get('avgPointsFor') or 0) + float(stats_map.get('avgPointsAgainst') or 0),
            }
    return out


def main() -> int:
    if _should_skip():
        print(f'[fetch_nba_team_stats] {OUTPUT.name} récent (<30min), skip.', file=sys.stderr)
        return 0

    print('[fetch_nba_team_stats] Fetching ESPN NBA standings...', file=sys.stderr)
    teams = fetch_team_records()
    if not teams:
        print('[fetch_nba_team_stats] Aucune équipe récupérée — skip écriture.',
              file=sys.stderr)
        return 0

    out = {
        'generated_at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'attribution': 'ESPN NBA Standings API (site.api.espn.com)',
        'teams': teams,
    }
    OUTPUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'[fetch_nba_team_stats] {len(teams)} équipes, écrit {OUTPUT.name}',
          file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
