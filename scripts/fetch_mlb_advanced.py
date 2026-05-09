#!/usr/bin/env python3
"""fetch_mlb_advanced.py — Stats avancées MLB via ESPN team-level API.

Source : ESPN site API publique :
  https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/{id}/statistics

Per team, on récupère :
- Batting : AVG, OBP, SLG, HR, RBI, SB, OPS approx
- Pitching : ERA team, WHIP team, K/9, BB/9, HR/9
- Fielding : FPCT, errors

Output : mlb_advanced.json keyed by team abbreviation.

Cadence : 60 min (stats agrégées bougent peu en MLB).

Patcher associé : à venir, mlb_advanced.team_stats peut enrichir predictMatch
baseball branch (au-delà du pitcher partant).

v51.3 — Plan Pronostics Phase 2.2 source expansion.
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
OUTPUT = ROOT / 'mlb_advanced.json'
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
    raw = _ua_request('https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams')
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
    url = f'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/{team_id}/statistics'
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
        print(f'[fetch_mlb_advanced] {OUTPUT.name} fresh (<60min), skip', file=sys.stderr)
        return 0

    teams = fetch_team_ids()
    if not teams:
        print('[fetch_mlb_advanced] no teams found', file=sys.stderr)
        return 0

    print(f'[fetch_mlb_advanced] fetching advanced stats for {len(teams)} teams...', file=sys.stderr)
    out_teams = {}
    for tid, abbr in teams:
        stats = fetch_team_advanced(tid)
        if stats:
            entry = {
                'team_id': tid,
                'abbr': abbr,
                # Batting
                'batting_avg': stats.get('batting_avg'),
                'batting_OBP': stats.get('batting_onBasePct'),
                'batting_SLG': stats.get('batting_sluggingPct'),
                'batting_OPS': stats.get('batting_OPS'),
                'batting_HR': stats.get('batting_homeRuns'),
                'batting_R': stats.get('batting_runs'),
                'batting_RBI': stats.get('batting_RBIs'),
                'batting_SB': stats.get('batting_stolenBases'),
                'batting_K': stats.get('batting_strikeouts'),
                # Pitching team
                'pitching_ERA': stats.get('pitching_ERA'),
                'pitching_WHIP': stats.get('pitching_WHIP'),
                'pitching_K9': stats.get('pitching_strikeoutsPerNineInnings'),
                'pitching_BB9': stats.get('pitching_walksPerNineInnings'),
                'pitching_HR9': stats.get('pitching_homeRunsPerNineInnings'),
                'pitching_QS': stats.get('pitching_qualityStarts'),
                'pitching_saves': stats.get('pitching_saves'),
                # Fielding
                'fielding_FPCT': stats.get('fielding_fieldingPct'),
                'fielding_E': stats.get('fielding_errors'),
                # Run differential proxy
                'runs_per_game': (stats.get('batting_runs') or 0) / max(1, stats.get('batting_teamGamesPlayed') or 1),
                'runs_against_per_game': (stats.get('pitching_earnedRuns') or 0) / max(1, stats.get('batting_teamGamesPlayed') or 1),
            }
            out_teams[abbr] = entry
        time.sleep(0.3)

    out = {
        'generated_at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'attribution': 'ESPN MLB team statistics API (site.api.espn.com)',
        'source': 'fetch_mlb_advanced.py v51.3',
        'teams': out_teams,
    }
    OUTPUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'[fetch_mlb_advanced] {len(out_teams)} teams written to {OUTPUT.name}',
          file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
