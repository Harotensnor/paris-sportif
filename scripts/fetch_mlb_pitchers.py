#!/usr/bin/env python3
"""
fetch_mlb_pitchers.py — MLB probable pitchers + season stats.

The single biggest non-market signal in baseball is who's on the mound.
ESPN's scoreboard ships team metadata but no pitcher info. MLB Stats API
(`statsapi.mlb.com`) is free, no key required, and exposes both the
schedule with probable pitchers AND per-pitcher season stats (ERA,
WHIP, K/9, BB/9, HR/9).

Output : `mlb_pitchers.json` keyed by `(home_team_norm, away_team_norm,
date_iso)`. patch_mlb_pitchers.py looks up by ESPN's competitor names
+ kickoff date.

    {
      "generated_at": "...",
      "matches": {
        "<home_norm>|<away_norm>|<YYYY-MM-DD>": {
          "home": {"name": "Chris Sale", "id": 519242, "era": 3.20, "whip": 1.10,
                   "k9": 9.5, "bb9": 2.4, "hr9": 0.9, "ip": 75.0, "hand": "L"},
          "away": {...}
        }
      }
    }

Rate budget : ~16 games/day × 2 pitchers = 32 player calls + 1 schedule
call. ~10s typical. Pitcher stats cached 6h (rotation rotates ≤1×/5d).

Idempotent. Safe to call every refresh tick.
"""
from __future__ import annotations
import json
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from winamax_map import _norm

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'mlb_pitchers.json'
CACHE_DIR = ROOT / '.cache' / 'mlb_pitchers'
PITCHER_TTL = 6 * 3600   # 6h on per-pitcher season stats
MIN_INTERVAL = 60         # don't re-run more than once per minute


def _ua_request(url: str) -> str | None:
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'paris-sportif/1.0 (educational)',
        })
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.read().decode('utf-8', errors='ignore')
    except (urllib.error.URLError, urllib.error.HTTPError, OSError) as e:
        print(f'  ERR fetch {url[:80]}: {e}', flush=True)
        return None


def fetch_schedule(date_iso: str) -> dict | None:
    """Schedule with probablePitcher hydrated."""
    url = ('https://statsapi.mlb.com/api/v1/schedule'
           f'?sportId=1&date={date_iso}&hydrate=probablePitcher,team')
    txt = _ua_request(url)
    if not txt:
        return None
    try:
        return json.loads(txt)
    except json.JSONDecodeError:
        return None


def fetch_pitcher_stats(player_id: int) -> dict | None:
    """Pitcher season stats with on-disk 6h cache."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache = CACHE_DIR / f'{player_id}.json'
    if cache.exists() and (time.time() - cache.stat().st_mtime) < PITCHER_TTL:
        try:
            return json.loads(cache.read_text(encoding='utf-8'))
        except (json.JSONDecodeError, OSError):
            pass
    url = (f'https://statsapi.mlb.com/api/v1/people/{player_id}'
           '?hydrate=stats(group=%5Bpitching%5D,type=%5Bseason%5D)')
    txt = _ua_request(url)
    if not txt:
        return None
    try:
        data = json.loads(txt)
    except json.JSONDecodeError:
        return None
    p = (data.get('people') or [{}])[0]
    out = {
        'id': player_id,
        'name': p.get('fullName') or '',
        'hand': (p.get('pitchHand') or {}).get('code') or '',
    }
    # Find the pitching season split
    for s in (p.get('stats') or []):
        if (s.get('group') or {}).get('displayName') != 'pitching':
            continue
        splits = s.get('splits') or []
        if not splits:
            continue
        # Take the most recent season split
        stat = (splits[-1].get('stat') or {})
        out.update({
            'era': _f(stat.get('era')),
            'whip': _f(stat.get('whip')),
            'k9': _f(stat.get('strikeoutsPer9Inn')),
            'bb9': _f(stat.get('walksPer9Inn')),
            'hr9': _f(stat.get('homeRunsPer9')),
            'ip': _f(stat.get('inningsPitched')),
            'gs': stat.get('gamesStarted') or 0,
            'season': splits[-1].get('season'),
        })
        break
    try:
        cache.write_text(json.dumps(out, separators=(',', ':')), encoding='utf-8')
    except OSError:
        pass
    return out


def _f(s) -> float | None:
    if s is None or s == '' or s == '-.--':
        return None
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


def main() -> int:
    now = datetime.now(timezone.utc)
    # Throttle : refuse to re-run more than once per minute (safe to call
    # from auto_refresh.py at 1-tick cadence — internal cache covers most).
    if OUTPUT.exists() and (time.time() - OUTPUT.stat().st_mtime) < MIN_INTERVAL:
        print(f'[mlb_pitchers] cache fresh, skip.', flush=True)
        return 0

    matches: dict[str, dict] = {}
    pitcher_cache: dict[int, dict] = {}

    # Today + next 2 days (MLB games are scheduled day-by-day, mostly
    # afternoon/evening US time — ahead of EU TZ window).
    for offset in range(0, 3):
        date_iso = (now + timedelta(days=offset)).strftime('%Y-%m-%d')
        sched = fetch_schedule(date_iso)
        if not sched:
            continue
        n_games = 0
        for d in (sched.get('dates') or []):
            for g in (d.get('games') or []):
                teams = g.get('teams') or {}
                home = teams.get('home') or {}
                away = teams.get('away') or {}
                home_team = (home.get('team') or {}).get('name') or ''
                away_team = (away.get('team') or {}).get('name') or ''
                if not home_team or not away_team:
                    continue
                home_pp = home.get('probablePitcher') or {}
                away_pp = away.get('probablePitcher') or {}
                if not home_pp.get('id') and not away_pp.get('id'):
                    continue  # not announced yet
                key = f'{_norm(home_team)}|{_norm(away_team)}|{date_iso}'
                rec = {'home': None, 'away': None, 'home_team': home_team, 'away_team': away_team,
                       'date': date_iso, 'game_pk': g.get('gamePk')}
                for slot, pp in (('home', home_pp), ('away', away_pp)):
                    pid = pp.get('id')
                    if not pid:
                        continue
                    if pid not in pitcher_cache:
                        stats = fetch_pitcher_stats(pid)
                        if stats:
                            pitcher_cache[pid] = stats
                    if pid in pitcher_cache:
                        rec[slot] = pitcher_cache[pid]
                if rec['home'] or rec['away']:
                    matches[key] = rec
                    n_games += 1
        print(f'[mlb_pitchers] {date_iso}: {n_games} games with announced pitchers', flush=True)

    payload = {
        'generated_at': now.isoformat(),
        'attribution': 'Pitcher data from MLB Stats API (statsapi.mlb.com). © MLB Advanced Media, L.P.',
        'matches': matches,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'[{now:%H:%M:%S}] mlb_pitchers: {len(matches)} games · '
          f'{len(pitcher_cache)} unique pitchers → {OUTPUT.name} '
          f'({OUTPUT.stat().st_size // 1024} KB)', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
