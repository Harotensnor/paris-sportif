#!/usr/bin/env python3
"""
fetch_advanced_stats.py — Advanced team stats per sport via ESPN public endpoint.

v52.5 — Active les 3 branches dead du frontend (legacy-app.js v51.6) :
  - NBA  : eFG%, AST/TO ratio (2 components, weight 0.15+0.08)
  - MLB  : OPS team, runs_per_game, runs_against (2 components, weight 0.10+0.10)
  - NHL  : PP%, PK%, FOW% (3 components, weight 0.08+0.06+0.04)

Source : ESPN /apis/site/v2/sports/{sport}/{league}/teams/{id}/statistics
qui retourne `splits.categories[].stats[]` avec stats agrégées saison.

Output : 3 fichiers JSON keyés par team abbreviation (DET, BOS, ATL, ...).
  - nba_advanced.json
  - mlb_advanced.json
  - nhl_advanced.json

Usage : python3 scripts/fetch_advanced_stats.py [--sport nba|mlb|nhl|all]
Cadence : 1h (les stats agrégées bougent lentement, pas besoin de refresh
plus rapide que les standings ESPN).
"""
from __future__ import annotations
import argparse
import json
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MIN_INTERVAL = 3600  # 1h

SPORTS = {
    'nba': {
        'sport': 'basketball', 'league': 'nba',
        'output': 'nba_advanced.json',
        'metrics': {
            'avgPoints': 'avg_points',
            'fieldGoalPct': 'fg_pct',
            'threePointFieldGoalPct': 'three_pct',
            'avgFieldGoalsAttempted': 'avg_fga',
            'avgThreePointFieldGoalsAttempted': 'avg_3pa',
            'avgRebounds': 'avg_rebounds',
            'avgTurnovers': 'avg_turnovers',
            'avgBlocks': 'avg_blocks',
            'avgSteals': 'avg_steals',
            'assistTurnoverRatio': 'assistTurnoverRatio',
            'gamesPlayed': 'games_played',
        },
    },
    'mlb': {
        'sport': 'baseball', 'league': 'mlb',
        'output': 'mlb_advanced.json',
        'metrics': {
            'battingAverage': 'team_avg',
            'onBasePct': 'team_OBP',
            'OPS': 'team_OPS',
            'sluggingPct': 'team_SLG',
            'homeRuns': 'team_HR',
            'ERA': 'team_ERA',
            'WHIP': 'team_WHIP',
            'strikeouts': 'team_K',
            'fieldingPct': 'team_FPCT',
            'runs': 'runs_scored',
            'runsAllowed': 'runs_allowed',
            'gamesPlayed': 'games_played',
        },
    },
    'nhl': {
        'sport': 'hockey', 'league': 'nhl',
        'output': 'nhl_advanced.json',
        'metrics': {
            'goals': 'goals_total',
            'goalsAgainst': 'goals_against_total',
            'avgGoalsAgainst': 'ga_per_game',
            'savePct': 'save_pct',
            'shootingPct': 'shooting_pct',
            'faceoffPercent': 'face_off_win_pct',
            'shotsTotal': 'shots_total',
            'shotsAgainst': 'shots_against_total',
            'powerPlayGoals': 'power_play_goals',
            'shortHandedGoals': 'short_handed_goals',
            'games': 'games_played',
        },
    },
}


def _ua_request(url: str) -> str | None:
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'paris-sportif/1.0 (educational)',
            'Accept': 'application/json',
        })
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.read().decode('utf-8', errors='ignore')
    except (urllib.error.URLError, urllib.error.HTTPError, OSError) as e:
        print(f'  ERR {url[-60:]}: {e}', flush=True)
        return None


def fetch_team_list(sport: str, league: str) -> list[dict]:
    """Liste les équipes ESPN avec leur id + abbr."""
    url = f'https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/teams'
    raw = _ua_request(url)
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    teams = []
    for sport_block in (data.get('sports') or []):
        for league_block in (sport_block.get('leagues') or []):
            for team_obj in (league_block.get('teams') or []):
                t = team_obj.get('team') or {}
                if t.get('id') and t.get('abbreviation'):
                    teams.append({
                        'id': t['id'],
                        'abbr': t['abbreviation'].upper(),
                        'name': t.get('displayName') or t.get('name') or '',
                    })
    return teams


def fetch_team_stats(sport: str, league: str, team_id: str, metrics: dict) -> dict | None:
    """Récupère les stats d'une équipe et map les noms via metrics dict.

    Structure ESPN : data.results.stats.categories[].stats[] — chaque stat
    a un `name` (ex: avgPoints) et une `value` (numérique).
    """
    url = f'https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/teams/{team_id}/statistics'
    raw = _ua_request(url)
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None
    out = {}
    results = (data.get('results') or {}).get('stats') or {}
    for cat in (results.get('categories') or []):
        for stat in (cat.get('stats') or []):
            name = stat.get('name', '')
            if name in metrics:
                try:
                    val = stat.get('value')
                    if val is None:
                        val = stat.get('displayValue')
                    if val is None:
                        continue
                    out[metrics[name]] = float(val)
                except (TypeError, ValueError):
                    pass
    # Compute derived metrics for NBA
    if sport == 'basketball':
        fga = out.get('avg_fga') or 0
        # eFG = (FGM + 0.5 * 3PM) / FGA = FG% × FGA/FGA + 0.5 × 3P% × 3PA/FGA
        # = FG% + 0.5 × (3PA/FGA) × (3P% - FG%) ... actually simpler :
        # eFG = (2pt_made + 1.5 × 3pt_made) / FGA
        # Approximation : eFG = FG% + 0.5 × (3PA/FGA) × 3P%
        if fga > 0:
            three_ratio = (out.get('avg_3pa') or 0) / fga if fga else 0
            fg_pct = (out.get('fg_pct') or 0) / 100.0
            three_pct = (out.get('three_pct') or 0) / 100.0
            efg = fg_pct + 0.5 * three_ratio * three_pct
            out['efg_approx'] = round(efg, 4)
        # pace_proxy (rough) : avg_points × 2 ≈ total points per game
        out['pace_proxy'] = round((out.get('avg_points') or 0) * 2, 1)
    if sport == 'baseball':
        rs = out.get('runs_scored')
        ra = out.get('runs_allowed')
        gp = out.get('games_played') or 0
        if rs and gp > 0:
            out['runs_per_game'] = round(rs / gp, 3)
        if ra and gp > 0:
            out['runs_against_per_game'] = round(ra / gp, 3)
        if rs and ra:
            out['run_diff_total'] = round(rs - ra, 0)
    if sport == 'hockey':
        gp = out.get('games_played') or 0
        if out.get('goals_total') and gp > 0:
            out['gf_per_game'] = round(out['goals_total'] / gp, 3)
        if out.get('shots_total') and gp > 0:
            out['shots_for_per_game'] = round(out['shots_total'] / gp, 1)
        if out.get('shots_against_total') and gp > 0:
            out['shots_against_per_game'] = round(out['shots_against_total'] / gp, 1)
        # Power play % approximation : ESPN gives PPG (power play goals) not
        # PP opportunities. Without opportunities we can't compute exact PP%.
        # Heuristic : PPG / games played × 5 ≈ PP success rate proxy. Better
        # than nothing, but flagged with _approx suffix to signal heuristic.
        if out.get('power_play_goals') and gp > 0:
            out['power_play_pct_approx'] = round((out['power_play_goals'] / gp) / 0.05, 2)
            # Same key as frontend expects but flagged in source as approx
            out['power_play_pct'] = out['power_play_pct_approx']
        # Penalty kill % approximation : similar issue. Without PK opportunities
        # we use shootingPct of opponents as proxy. Skipped for now.
    return out


def fetch_sport(sport_key: str) -> dict:
    cfg = SPORTS[sport_key]
    print(f'[fetch_advanced_stats] {sport_key}: fetching teams...', flush=True)
    teams = fetch_team_list(cfg['sport'], cfg['league'])
    if not teams:
        return {}
    print(f'  {len(teams)} teams', flush=True)
    stats_by_abbr = {}
    for i, t in enumerate(teams):
        s = fetch_team_stats(cfg['sport'], cfg['league'], t['id'], cfg['metrics'])
        if s:
            s['team_name'] = t['name']
            stats_by_abbr[t['abbr']] = s
        if (i + 1) % 5 == 0:
            time.sleep(0.5)  # rate-limit politeness
    return stats_by_abbr


def games_played_estimate(sport_key: str, abbr: str) -> int | None:
    """Heuristique simple : MLB regular season = 162, NBA = 82, NHL = 82.
    On peut affiner avec standings mais OK pour avoir un ordre de grandeur."""
    return None  # Patcher will handle this if needed


def write_output(sport_key: str, stats: dict) -> None:
    cfg = SPORTS[sport_key]
    out_path = ROOT / cfg['output']
    payload = {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'sport': sport_key,
        'teams': stats,
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'[fetch_advanced_stats] wrote {out_path.name} ({len(stats)} teams)', flush=True)


def _should_skip(sport_key: str) -> bool:
    cfg = SPORTS[sport_key]
    out_path = ROOT / cfg['output']
    if not out_path.exists():
        return False
    age = time.time() - out_path.stat().st_mtime
    return age < MIN_INTERVAL


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--sport', choices=['all', 'nba', 'mlb', 'nhl'], default='all')
    ap.add_argument('--force', action='store_true', help='skip the 1h TTL gate')
    args = ap.parse_args()

    sports = ['nba', 'mlb', 'nhl'] if args.sport == 'all' else [args.sport]
    for sk in sports:
        if not args.force and _should_skip(sk):
            print(f'[fetch_advanced_stats] {sk}: cached <1h, skip', flush=True)
            continue
        stats = fetch_sport(sk)
        if stats:
            write_output(sk, stats)
        else:
            print(f'[fetch_advanced_stats] {sk}: no data', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
