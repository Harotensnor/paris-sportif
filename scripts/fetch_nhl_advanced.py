#!/usr/bin/env python3
"""fetch_nhl_advanced.py — Stats avancées NHL via ESPN team-level API.

Source : ESPN site API publique :
  https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams/{id}/statistics

Per team, on récupère :
- Offensive : goals/game, shots/game, PP%, FOW%
- Defensive : goals against/game, save%, SHGA, PK%
- Pace : combined goals total

Output : nhl_advanced.json keyed by team abbreviation.

Cadence : 60 min.

v51.4 — Plan Pronostics Phase 2.2 source expansion.
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
OUTPUT = ROOT / 'nhl_advanced.json'
MIN_INTERVAL = 3600


def _ua_request(url: str) -> str | None:
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'paris-sportif/1.0 (educational)',
            'Accept': 'application/json',
        })
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.read().decode('utf-8', errors='ignore')
    except (urllib.error.URLError, urllib.error.HTTPError, OSError) as e:
        print(f'  ERR {url[-50:]}: {e}', flush=True)
        return None


def _should_skip() -> bool:
    if not OUTPUT.exists():
        return False
    age = time.time() - OUTPUT.stat().st_mtime
    return age < MIN_INTERVAL


def fetch_team_ids() -> list[tuple[str, str]]:
    raw = _ua_request('https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams')
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    out = []
    for sport in data.get('sports') or []:
        for league in sport.get('leagues') or []:
            for team_entry in league.get('teams') or []:
                t = team_entry.get('team') or {}
                if t.get('id') and t.get('abbreviation'):
                    out.append((str(t['id']), t['abbreviation'].upper()))
    return out


def fetch_team_advanced(team_id: str) -> dict:
    url = f'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams/{team_id}/statistics'
    raw = _ua_request(url)
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    stats_root = data.get('results', {}).get('stats', {})
    categories = stats_root.get('categories', []) or []
    out = {}
    for cat in categories:
        cat_name = cat.get('name') or ''
        for s in cat.get('stats', []) or []:
            name = s.get('name')
            value = s.get('value')
            if name and value is not None:
                out[f'{cat_name}_{name}'] = value
    return out


def main() -> int:
    if _should_skip():
        print(f'[fetch_nhl_advanced] fresh, skip', file=sys.stderr)
        return 0

    teams = fetch_team_ids()
    if not teams:
        print('[fetch_nhl_advanced] no teams found', file=sys.stderr)
        return 0

    print(f'[fetch_nhl_advanced] fetching advanced stats for {len(teams)} teams...', file=sys.stderr)
    out_teams = {}
    for tid, abbr in teams:
        stats = fetch_team_advanced(tid)
        if stats:
            # Try common key paths (NHL ESPN uses different category names)
            entry = {
                'team_id': tid,
                'abbr': abbr,
                'all_stats_count': len(stats),
                # Common offensive / defensive
                'goals_per_game': stats.get('offensive_avgGoals') or stats.get('general_avgGoals'),
                'goals_against_per_game': stats.get('defensive_avgGoalsAgainst') or stats.get('general_avgGoalsAgainst'),
                'shots_per_game': stats.get('offensive_avgShotsTotal') or stats.get('offensive_avgShots'),
                'shots_against_per_game': stats.get('defensive_avgShotsAgainst'),
                'power_play_pct': stats.get('offensive_powerPlayPct') or stats.get('powerPlay_powerPlayPct'),
                'penalty_kill_pct': stats.get('defensive_penaltyKillPct') or stats.get('penaltyKill_penaltyKillPct'),
                'save_pct': stats.get('defensive_savePct') or stats.get('goaltending_savePct'),
                'face_off_win_pct': stats.get('offensive_faceoffsWonPct'),
                # Pace
                'all_stats': stats,  # Full dict for debugging / future use
            }
            out_teams[abbr] = entry
        time.sleep(0.3)

    out = {
        'generated_at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'attribution': 'ESPN NHL team statistics API (site.api.espn.com)',
        'source': 'fetch_nhl_advanced.py v51.4',
        'teams': out_teams,
    }
    OUTPUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'[fetch_nhl_advanced] {len(out_teams)} teams written to {OUTPUT.name}',
          file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
