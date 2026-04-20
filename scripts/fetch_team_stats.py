#!/usr/bin/env python3
"""Pull each team's last-5 results from ESPN and cache granular stats.

Existing enrichment gives us `competitor.form` as "WLWDW" letters but no
scores — so the model can't see goal differentials, xG-proxies, or clean
sheets. This script fills that gap via ESPN's
``/teams/{team_id}/schedule`` endpoint (~1 HTTP call per team, ~150
teams across the soccer/basketball/hockey leagues in data.js).

Output: ``team_stats.json`` at repo root, consumed by
``patch_team_stats.py``. Schema::

    {
      "generated_at": "2026-04-20T17:00Z",
      "teams": {
        "{team_id}": {
          "name": "Crystal Palace",
          "league_code": "eng.1",
          "sport": "football",
          "played5": 5,
          "wins5": 3, "draws5": 1, "losses5": 1,
          "gf5": 7, "ga5": 4,
          "avg_gf5": 1.40, "avg_ga5": 0.80,
          "cleans5": 2,
          "failed_to_score5": 1,
          "last5": [
            {"date": "2025-10-18", "ha": "home",
             "opp": "AFC Bournemouth", "gf": 3, "ga": 3, "result": "D"},
            ...
          ]
        },
        ...
      }
    }

We filter recent matches to the **same league** as the team's target
fixture. That keeps form apples-to-apples (a Premier League club's
Champions League mauling doesn't distort its domestic form). Falls
back to any-league last-5 if same-league coverage is <3 matches.
"""
from __future__ import annotations
import json
import re
import ssl
import sys
import time
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / 'data.js'
OUT = ROOT / 'team_stats.json'

# ESPN sport path per ESPN league_code prefix. We only enrich leagues where
# last-5 goal/result data is meaningfully interpretable — i.e. team sports.
# Tennis is skipped (player-based, different shape).
LEAGUE_TO_SPORT_PATH: dict[str, str] = {
    # Soccer (the big ones — extend as needed)
    'eng.1': 'soccer/eng.1', 'esp.1': 'soccer/esp.1',
    'ger.1': 'soccer/ger.1', 'ita.1': 'soccer/ita.1',
    'fra.1': 'soccer/fra.1', 'por.1': 'soccer/por.1',
    'ned.1': 'soccer/ned.1', 'bel.1': 'soccer/bel.1',
    'tur.1': 'soccer/tur.1', 'gre.1': 'soccer/gre.1',
    'aut.1': 'soccer/aut.1', 'sui.1': 'soccer/sui.1',
    'sco.1': 'soccer/sco.1', 'mex.1': 'soccer/mex.1',
    'arg.1': 'soccer/arg.1', 'bra.1': 'soccer/bra.1',
    'col.1': 'soccer/col.1', 'chi.1': 'soccer/chi.1',
    'rus.1': 'soccer/rus.1', 'usa.1': 'soccer/usa.1',
    'esp.2': 'soccer/esp.2', 'eng.2': 'soccer/eng.2',
    'ita.2': 'soccer/ita.2', 'ger.2': 'soccer/ger.2',
    'fra.2': 'soccer/fra.2',
    'uefa.champions': 'soccer/uefa.champions',
    'uefa.europa': 'soccer/uefa.europa',
    'uefa.europa.conf': 'soccer/uefa.europa.conf',
    # Basketball / hockey — same endpoint pattern
    'nba': 'basketball/nba', 'wnba': 'basketball/wnba',
    'nhl': 'hockey/nhl',
    'mens-college-basketball': 'basketball/mens-college-basketball',
    # American football (MLB dropped from pipeline earlier)
    'nfl': 'football/nfl',
}

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

WINDOW = 5  # last N matches


def http_get_json(url: str, timeout: int = 15) -> dict | None:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        return json.loads(urllib.request.urlopen(req, timeout=timeout, context=CTX).read())
    except Exception as e:
        print(f'  ERR {url[:80]}: {e}', flush=True)
        return None


def load_upcoming_teams() -> list[tuple[str, str, str, str]]:
    """Return list of (team_id, team_name, league_code, sport_path) for
    every team that has at least one upcoming (non-completed) event."""
    txt = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        print('ERROR: could not parse data.js', file=sys.stderr)
        return []
    data = json.loads(m.group(1))
    seen: dict[str, tuple[str, str, str, str]] = {}
    for day, evs in (data.get('days') or {}).items():
        for ev in evs:
            if ev.get('completed'):
                continue
            lc = ev.get('league_code') or ''
            path = LEAGUE_TO_SPORT_PATH.get(lc)
            if not path:
                continue
            for c in ev.get('competitors') or []:
                tid = str(c.get('id') or '')
                if not tid or tid in seen:
                    continue
                seen[tid] = (tid, c.get('name') or c.get('abbr') or tid, lc, path)
    return list(seen.values())


def extract_last5(tid: str, schedule: dict, target_league: str) -> list[dict]:
    """Pull the team's last WINDOW completed matches, preferring the
    target league. Returns matches newest-first as list of normalized
    dicts: {date, ha, opp, gf, ga, result}. Result ∈ {'W','D','L'}."""
    events = schedule.get('events') or []
    same_league = []
    any_league = []
    for ev in events:
        comps = ev.get('competitions', [{}])[0]
        status = (comps.get('status') or {}).get('type') or {}
        if not status.get('completed'):
            continue
        # We want newest first — schedules arrive oldest-first, reverse later
        cpts = comps.get('competitors') or []
        me = next((c for c in cpts if str(c.get('team', {}).get('id')) == tid), None)
        opp = next((c for c in cpts if str(c.get('team', {}).get('id')) != tid), None)
        if not (me and opp):
            continue
        # Score may be in 'score' or 'score.displayValue' depending on sport
        def _score(cp: dict) -> int | None:
            s = cp.get('score')
            if isinstance(s, dict):
                s = s.get('value') if s.get('value') is not None else s.get('displayValue')
            try:
                return int(s) if s is not None else None
            except (TypeError, ValueError):
                return None
        gf = _score(me); ga = _score(opp)
        if gf is None or ga is None:
            continue
        result = 'W' if gf > ga else ('L' if gf < ga else 'D')
        match = {
            'date': (ev.get('date') or '')[:10],
            'ha': 'home' if me.get('homeAway') == 'home' else 'away',
            'opp': (opp.get('team') or {}).get('displayName') or '?',
            'gf': gf,
            'ga': ga,
            'result': result,
        }
        # ESPN's schedule endpoint is for one league, so the team_lg is always target
        any_league.append(match)
        # Same-league filter: schedule is already scoped per league, so anything
        # here is same-league by construction. (If we later query a generic
        # schedule we'd discriminate here.)
        same_league.append(match)

    # Newest first
    any_league.sort(key=lambda m: m['date'], reverse=True)
    same_league.sort(key=lambda m: m['date'], reverse=True)
    if len(same_league) >= 3:
        return same_league[:WINDOW]
    return any_league[:WINDOW]


def aggregate(matches: list[dict]) -> dict:
    n = len(matches)
    if n == 0:
        return {'played5': 0, 'wins5': 0, 'draws5': 0, 'losses5': 0,
                'gf5': 0, 'ga5': 0, 'avg_gf5': 0.0, 'avg_ga5': 0.0,
                'cleans5': 0, 'failed_to_score5': 0}
    wins = sum(1 for m in matches if m['result'] == 'W')
    draws = sum(1 for m in matches if m['result'] == 'D')
    losses = sum(1 for m in matches if m['result'] == 'L')
    gf = sum(m['gf'] for m in matches)
    ga = sum(m['ga'] for m in matches)
    cleans = sum(1 for m in matches if m['ga'] == 0)
    fts = sum(1 for m in matches if m['gf'] == 0)
    return {
        'played5': n,
        'wins5': wins, 'draws5': draws, 'losses5': losses,
        'gf5': gf, 'ga5': ga,
        'avg_gf5': round(gf / n, 2),
        'avg_ga5': round(ga / n, 2),
        'cleans5': cleans,
        'failed_to_score5': fts,
    }


def main() -> int:
    t0 = time.time()
    teams = load_upcoming_teams()
    if not teams:
        print('[team_stats] no upcoming teams to enrich — aborting')
        return 1

    print(f'[{datetime.now():%H:%M:%S}] team_stats: {len(teams)} unique teams to scan',
          flush=True)

    out: dict[str, dict] = {}
    errs = 0
    # Politeness delay between calls — ESPN is generous but not infinite.
    for i, (tid, name, lc, path) in enumerate(teams, 1):
        url = f'https://site.api.espn.com/apis/site/v2/sports/{path}/teams/{tid}/schedule'
        sched = http_get_json(url)
        if not sched:
            errs += 1
            continue
        last5 = extract_last5(tid, sched, lc)
        agg = aggregate(last5)
        out[tid] = {
            'name': name,
            'league_code': lc,
            'sport': path.split('/')[0],
            **agg,
            'last5': last5,
        }
        if i % 20 == 0:
            print(f'  {i}/{len(teams)} scanned ({errs} errors so far)', flush=True)
        time.sleep(0.15)

    elapsed = time.time() - t0
    OUT.write_text(json.dumps({
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'teams': out,
    }, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'[{datetime.now():%H:%M:%S}] Done in {elapsed:.1f}s · '
          f'{len(out)}/{len(teams)} teams enriched · {errs} errors · '
          f'wrote {OUT.name} ({OUT.stat().st_size/1024:.1f}KB)', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
