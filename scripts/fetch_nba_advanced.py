#!/usr/bin/env python3
"""fetch_nba_advanced.py — Stats avancées NBA via ESPN team-level API.

Source : ESPN site API publique (no auth required) :
  https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{id}/statistics

Permet de récupérer pour chaque équipe NBA :
- Offensive : PPG, FG%, 3P%, FT%, AST per game
- Defensive : REB, STL, BLK, opp PPG
- Pace proxy : PPG total + opp PPG (= rough pace estimation)

Output : nba_advanced.json keyed by team abbreviation.

Cadence : 60 min (advanced stats bougent lentement).

Patcher associé : patch_nba_advanced.py qui injecte sur competitor.advanced_stats
puis predictMatch peut utiliser eFG%, off rating, def rating si disponibles.

v51.2 — Plan Pronostics Phase 2.1 source expansion.
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
OUTPUT = ROOT / 'nba_advanced.json'
STANDINGS = ROOT / 'nba_team_stats.json'
MIN_INTERVAL = 3600  # 60 min


def _ua_request(url: str) -> str | None:
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'paris-sportif/1.0 (educational, public ESPN endpoints)',
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
    """Retourne (id, abbr) pour chaque équipe NBA depuis nba_team_stats.json."""
    if not STANDINGS.exists():
        # Fallback : ESPN /teams endpoint
        raw = _ua_request('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams')
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
    try:
        d = json.loads(STANDINGS.read_text(encoding='utf-8'))
    except json.JSONDecodeError:
        return []
    teams = d.get('teams') or {}
    # Standings file doesn't always have ESPN team_id, fallback to /teams
    if not all(any(c.isdigit() for c in str(v.get('id', ''))) for v in teams.values()):
        # Get team_ids from /teams endpoint
        raw = _ua_request('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams')
        if raw:
            try:
                tdata = json.loads(raw)
                id_by_abbr = {}
                for sport in tdata.get('sports') or []:
                    for league in sport.get('leagues') or []:
                        for team_entry in league.get('teams') or []:
                            t = team_entry.get('team') or {}
                            if t.get('id') and t.get('abbreviation'):
                                id_by_abbr[t['abbreviation'].upper()] = str(t['id'])
                return [(tid, abbr) for abbr, tid in id_by_abbr.items()]
            except json.JSONDecodeError:
                pass
    return [(str(v.get('id', '0')), abbr) for abbr, v in teams.items() if v.get('id')]


def fetch_team_advanced(team_id: str) -> dict:
    """ESPN /teams/{id}/statistics retourne les categories.stats détaillées."""
    url = f'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{team_id}/statistics'
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
        for s in cat.get('stats', []) or []:
            name = s.get('name')
            value = s.get('value')
            if name and value is not None:
                out[name] = value
    return out


def main() -> int:
    if _should_skip():
        print(f'[fetch_nba_advanced] {OUTPUT.name} fresh (<60min), skip', file=sys.stderr)
        return 0

    teams = fetch_team_ids()
    if not teams:
        print('[fetch_nba_advanced] no teams found', file=sys.stderr)
        return 0

    print(f'[fetch_nba_advanced] fetching advanced stats for {len(teams)} teams...', file=sys.stderr)
    out_teams = {}
    for tid, abbr in teams:
        stats = fetch_team_advanced(tid)
        if stats:
            # Extract key stats
            entry = {
                'team_id': tid,
                'abbr': abbr,
                'avgPoints': stats.get('avgPoints'),
                'avgFieldGoalPct': stats.get('avgFieldGoalPct'),
                'avg3PointPct': stats.get('avg3PointPct'),
                'avgFreeThrowPct': stats.get('avgFreeThrowPct'),
                'avgAssists': stats.get('avgAssists'),
                'avgRebounds': stats.get('avgRebounds'),
                'avgSteals': stats.get('avgSteals'),
                'avgBlocks': stats.get('avgBlocks'),
                'avgTurnovers': stats.get('avgTurnovers'),
                'assistTurnoverRatio': stats.get('assistTurnoverRatio'),
                'avgPointsAgainst': stats.get('avgPointsAgainst'),
                # Effective FG% : (FG + 0.5 * 3P) / FGA — approximation
                # On estime via avgFieldGoalPct + boost for 3P
            }
            # Compute eFG approximation
            fgp = entry.get('avgFieldGoalPct')
            tpp = entry.get('avg3PointPct')
            if fgp is not None and tpp is not None:
                # Simplified eFG = FG% + (3P% × 0.5 / 4 of attempts)
                # Modern NBA : ~35% of attempts are 3P, so eFG ≈ FG% + 0.175 × 3P%
                entry['efg_approx'] = round(fgp + 0.175 * tpp, 4)
            # Pace proxy = points + opp points
            pp = entry.get('avgPoints')
            opa = entry.get('avgPointsAgainst')
            if pp is not None and opa is not None:
                entry['pace_proxy'] = round(pp + opa, 1)
            out_teams[abbr] = entry
        time.sleep(0.3)  # rate limit politeness

    out = {
        'generated_at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'attribution': 'ESPN NBA team statistics API (site.api.espn.com)',
        'source': 'fetch_nba_advanced.py v51.2',
        'teams': out_teams,
    }
    OUTPUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'[fetch_nba_advanced] {len(out_teams)} teams written to {OUTPUT.name}',
          file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
