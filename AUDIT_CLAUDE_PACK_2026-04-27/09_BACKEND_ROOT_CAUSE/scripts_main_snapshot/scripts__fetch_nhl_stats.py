#!/usr/bin/env python3
"""
fetch_nhl_stats.py — NHL team season stats + leading goalie stats.

Free official NHL API (api-web.nhle.com), no key required. Tried
MoneyPuck first for advanced xG/Corsi but Cloudflare blocks curl_cffi.
The official API doesn't ship xG but covers what matters most :
  - Per-team goals for/against per game (home + away splits)
  - Goalie save percentage / GAA for the leading starter
  - Win/loss record + last-10 form

ESPN already gives us team records as a string. NHL API delivers them
as numbers + clean home/away splits, which is what we need to build a
sport-specific pH non-market signal.

Output : `nhl_stats.json` keyed by team abbreviation.

    {
      "generated_at": "...",
      "season": "20252026",
      "teams": {
        "TOR": {
          "name": "Toronto Maple Leafs",
          "gp": 80, "gf_per_game": 3.4, "ga_per_game": 2.8,
          "home_wins": 25, "home_losses": 12, "home_ot_losses": 3,
          "road_wins": 22, "road_losses": 14, "road_ot_losses": 4,
          "l10_wins": 7, "l10_losses": 2, "l10_ot_losses": 1,
          "goalie": { "name": "Joseph Woll", "gs": 45,
                      "save_pct": 0.918, "gaa": 2.65 }
        }
      }
    }

Idempotent. ~5s, all 32 teams in standings + 32 goalie probes.
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
OUTPUT = ROOT / 'nhl_stats.json'
MIN_INTERVAL = 600  # 10 min — standings update slowly


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


def fetch_standings() -> dict | None:
    txt = _ua_request('https://api-web.nhle.com/v1/standings/now')
    if not txt:
        return None
    try:
        return json.loads(txt)
    except json.JSONDecodeError:
        return None


def fetch_club_stats(team_abbrev: str) -> dict | None:
    """Fetch per-team skater + goalie stats for the current season."""
    txt = _ua_request(f'https://api-web.nhle.com/v1/club-stats/{team_abbrev}/now')
    if not txt:
        return None
    try:
        return json.loads(txt)
    except json.JSONDecodeError:
        return None


def pick_starting_goalie(club_stats: dict) -> dict | None:
    """Identify the team's #1 goalie : the one with the most games started.
    Returns the simplified record we ship in nhl_stats.json or None."""
    goalies = (club_stats or {}).get('goalies') or []
    if not goalies:
        return None
    # Sort by games started desc, then save% desc as tiebreak
    sorted_g = sorted(goalies, key=lambda g: (
        -(g.get('gamesStarted') or 0),
        -(g.get('savePercentage') or 0),
    ))
    top = sorted_g[0]
    # Threshold relaxed to GS≥2 to cover playoff-only periods where teams
    # have 2-3 game starts. Below that the SV% is too noisy to surface.
    if (top.get('gamesStarted') or 0) < 2:
        return None
    return {
        'name': f"{top.get('firstName',{}).get('default','')} {top.get('lastName',{}).get('default','')}".strip(),
        'gs': top.get('gamesStarted') or 0,
        'save_pct': round(top.get('savePercentage') or 0, 4),
        'gaa': round(top.get('goalsAgainstAverage') or 0, 2),
        'wins': top.get('wins') or 0,
    }


def main() -> int:
    if OUTPUT.exists() and (time.time() - OUTPUT.stat().st_mtime) < MIN_INTERVAL:
        print('[nhl_stats] cache fresh, skip.', flush=True)
        return 0

    standings = fetch_standings()
    if not standings:
        print('[nhl_stats] standings fetch failed, skip.', flush=True)
        return 0

    teams_out: dict[str, dict] = {}
    season = ''
    for team in (standings.get('standings') or []):
        abbr = (team.get('teamAbbrev') or {}).get('default')
        if not abbr:
            continue
        gp = team.get('gamesPlayed') or 1
        gf = team.get('goalFor') or 0
        ga = team.get('goalAgainst') or 0
        rec = {
            'name': (team.get('teamName') or {}).get('default') or abbr,
            'abbr': abbr,
            'gp': gp,
            'gf_per_game': round(gf / max(gp, 1), 2),
            'ga_per_game': round(ga / max(gp, 1), 2),
            'home_wins': team.get('homeWins') or 0,
            'home_losses': team.get('homeLosses') or 0,
            'home_ot_losses': team.get('homeOtLosses') or 0,
            'road_wins': team.get('roadWins') or 0,
            'road_losses': team.get('roadLosses') or 0,
            'road_ot_losses': team.get('roadOtLosses') or 0,
            'l10_wins': team.get('l10Wins') or 0,
            'l10_losses': team.get('l10Losses') or 0,
            'l10_ot_losses': team.get('l10OtLosses') or 0,
            'points': team.get('points') or 0,
        }
        season = season or str(team.get('seasonId') or '')
        teams_out[abbr] = rec

    # Now fetch club stats for each team to extract starting goalie.
    # Light cadence (~32 calls × ~150ms = 5s) + rate-friendly.
    print(f'[nhl_stats] fetching goalie stats for {len(teams_out)} teams...', flush=True)
    for i, abbr in enumerate(list(teams_out.keys())):
        cs = fetch_club_stats(abbr)
        goalie = pick_starting_goalie(cs)
        if goalie:
            teams_out[abbr]['goalie'] = goalie
        if i and i % 10 == 0:
            print(f'  ...{i}/{len(teams_out)}', flush=True)
        time.sleep(0.15)  # be nice

    payload = {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'season': season,
        'attribution': 'NHL stats from official api-web.nhle.com. © NHL.com.',
        'teams': teams_out,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'[{datetime.now():%H:%M:%S}] nhl_stats: {len(teams_out)} teams · '
          f'{sum(1 for t in teams_out.values() if t.get("goalie"))} with starting goalie '
          f'→ {OUTPUT.name} ({OUTPUT.stat().st_size // 1024} KB)', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
