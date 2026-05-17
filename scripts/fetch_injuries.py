#!/usr/bin/env python3
"""Fetch injury list per team from ESPN and attach to events in data.js.

ESPN has reliable injury endpoints for NBA, NHL, NFL, MLB. For soccer the
endpoint usually returns an empty list. The payload shape is:

  /apis/site/v2/sports/{sport_path}/injuries
  → { "injuries": [ { "team": { "id": "..." }, "injuries": [ { "athlete": {...}, "status": "Out", ... } ] } ] }

We only care about status in {"Out", "Doubtful", "Day-to-day"}.

Output: attaches ev.competitors[i].injuries = [{name, pos, status}] and
        sets ev.injuries_count_home / injuries_count_away.

Usage: python3 fetch_injuries.py
"""
import json, re, sys, time, ssl, urllib.request, urllib.error
from pathlib import Path
from datetime import datetime, timezone

DATA_JS = Path(__file__).resolve().parent.parent / 'data.js'
HTML = Path(__file__).resolve().parent.parent / 'pronostics.html'
INJ_OUT = Path(__file__).resolve().parent.parent / 'injuries_multisport.json'

from _data_io import save_data_js, update_inline_blob_in_html

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

# sport_path segments where ESPN reliably populates injuries
ESPN_INJURY_PATHS = [
    ('nba',    'basketball/nba'),
    ('wnba',   'basketball/wnba'),
    ('nhl',    'hockey/nhl'),
    ('nfl',    'football/nfl'),
    ('mlb',    'baseball/mlb'),
]


def is_severe_status(status):
    """Return True for absences that should materially affect a model pick."""
    s = (status or '').lower()
    if not s:
        return False
    if any(token in s for token in ('out', 'doubt', 'suspend', 'injured reserve')):
        return True
    # MLB/NBA style injured-list strings: 10-Day-IL, 15-Day-IL, 60-Day-IL.
    if re.search(r'\b\d+\s*-?\s*day\s*-?\s*il\b', s) or re.search(r'\b\d+\s*-?\s*il\b', s):
        return True
    if re.search(r'\b(il|ir)\b', s) and 'day-to-day' not in s:
        return True
    return False


def http_get_json(url, timeout=15):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        return json.loads(urllib.request.urlopen(req, timeout=timeout, context=CTX).read())
    except urllib.error.HTTPError as e:
        # Explicit rate-limit flag so retries can back off intelligently rather
        # than being swallowed into a generic "error".
        if e.code == 429:
            print(f'  [rate-limit] ESPN 429 Too Many Requests on {url}', flush=True)
        raise


def fetch_injuries_for(league_code, espn_path):
    try:
        data = http_get_json(f'https://site.api.espn.com/apis/site/v2/sports/{espn_path}/injuries')
    except urllib.error.HTTPError as e:
        print(f'  {league_code}: HTTP {e.code} {e.reason}')
        return {}
    except Exception as e:
        print(f'  {league_code}: error {e}')
        return {}
    out = {}  # team_id → list[{name,pos,status}]
    for block in data.get('injuries', []):
        team = block.get('team') or block.get('displayName')
        tid = None
        if isinstance(team, dict):
            tid = str(team.get('id') or '')
        elif block.get('id'):
            tid = str(block.get('id'))
        if not tid:
            # Some payloads have team metadata at top level of the block
            tid = str(block.get('id') or '')
        if not tid:
            continue
        inj_list = []
        for inj in block.get('injuries', []):
            status = inj.get('status') or ''
            if status.lower() in ('active', 'probable', ''):
                continue  # not meaningful
            ath = inj.get('athlete') or {}
            pos = ''
            if isinstance(ath.get('position'), dict):
                pos = ath['position'].get('abbreviation') or ''
            inj_list.append({
                'name': ath.get('displayName') or ath.get('fullName') or '?',
                'pos': pos,
                'status': status,
            })
        if inj_list:
            out[tid] = inj_list
    print(f'  {league_code}: {sum(len(v) for v in out.values())} injuries across {len(out)} teams')
    return out


def attach(events, league_code, inj_by_team):
    touched = 0
    for ev in events:
        if ev.get('league_code') != league_code:
            continue
        if ev.get('completed'):
            continue
        comps = ev.get('competitors') or []
        if len(comps) < 2:
            continue
        any_hit = False
        for i, c in enumerate(comps):
            tid = str(c.get('id') or '')
            inj = inj_by_team.get(tid, [])
            c['injuries'] = inj
            if inj:
                any_hit = True
            ha = c.get('home_away')
            key = 'injuries_home' if ha == 'home' else 'injuries_away'
            # Count only severe absences
            severe = [x for x in inj if is_severe_status(x.get('status'))]
            ev[key] = len(severe)
        if any_hit:
            touched += 1
    return touched


def write_sidecar(by_league):
    teams = {}
    by_sport = {}
    for league_code, inj_by_team in sorted((by_league or {}).items()):
        sport = {
            'nba': 'basketball', 'wnba': 'basketball',
            'nhl': 'hockey', 'nfl': 'american-football', 'mlb': 'baseball',
        }.get(league_code, league_code)
        bucket = by_sport.setdefault(sport, {'teams': 0, 'injuries': 0, 'leagues': {}})
        bucket['leagues'].setdefault(league_code, {'teams': 0, 'injuries': 0})
        for team_id, injuries in (inj_by_team or {}).items():
            key = f'{league_code}:{team_id}'
            severe = [x for x in injuries if is_severe_status(x.get('status'))]
            teams[key] = {
                'sport': sport,
                'league_code': league_code,
                'team_id': team_id,
                'injuries': injuries,
                'injuries_count': len(injuries),
                'severe_count': len(severe),
            }
            bucket['teams'] += 1
            bucket['injuries'] += len(injuries)
            bucket['leagues'][league_code]['teams'] += 1
            bucket['leagues'][league_code]['injuries'] += len(injuries)
    payload = {
        'generated_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        'source': 'ESPN public injuries endpoints',
        'teams_total': len(teams),
        'sports_total': len(by_sport),
        'by_sport': by_sport,
        'teams': teams,
    }
    INJ_OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')


def main():
    t0 = time.time()
    print(f'[{datetime.now():%H:%M:%S}] injuries refresh')
    text = DATA_JS.read_text(encoding='utf-8')
    data = json.loads(re.search(r'=\s*(\{.*\})\s*;?\s*$', text, re.DOTALL).group(1))

    total_touched = 0
    by_league = {}
    for league_code, espn_path in ESPN_INJURY_PATHS:
        inj_by_team = fetch_injuries_for(league_code, espn_path)
        by_league[league_code] = inj_by_team
        if not inj_by_team:
            continue
        if '--sidecar-only' in sys.argv:
            continue
        for day, events in data.get('days', {}).items():
            total_touched += attach(events, league_code, inj_by_team)

    write_sidecar(by_league)
    if '--sidecar-only' in sys.argv:
        print(f'[{datetime.now():%H:%M:%S}] sidecar only · wrote {INJ_OUT.name}')
        return

    save_data_js(data, DATA_JS)
    update_inline_blob_in_html(data, HTML)

    print(f'[{datetime.now():%H:%M:%S}] done in {time.time()-t0:.1f}s · {total_touched} events tagged with injuries')


if __name__ == '__main__':
    main()
