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
import json, re, time, ssl, urllib.request
from pathlib import Path
from datetime import datetime

DATA_JS = Path(__file__).resolve().parent.parent / 'data.js'
HTML = Path(__file__).resolve().parent.parent / 'pronostics.html'

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


def http_get_json(url, timeout=15):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    return json.loads(urllib.request.urlopen(req, timeout=timeout, context=CTX).read())


def fetch_injuries_for(league_code, espn_path):
    try:
        data = http_get_json(f'https://site.api.espn.com/apis/site/v2/sports/{espn_path}/injuries')
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
            severe = [x for x in inj if (x.get('status') or '').lower() in ('out', 'suspended', 'doubtful')]
            ev[key] = len(severe)
        if any_hit:
            touched += 1
    return touched


def main():
    t0 = time.time()
    print(f'[{datetime.now():%H:%M:%S}] injuries refresh')
    text = DATA_JS.read_text(encoding='utf-8')
    data = json.loads(re.search(r'=\s*(\{.*\})\s*;?\s*$', text, re.DOTALL).group(1))

    total_touched = 0
    for league_code, espn_path in ESPN_INJURY_PATHS:
        inj_by_team = fetch_injuries_for(league_code, espn_path)
        if not inj_by_team:
            continue
        for day, events in data.get('days', {}).items():
            total_touched += attach(events, league_code, inj_by_team)

    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    DATA_JS.write_text(f'window.PRONOSTICS_DATA = {payload};\n', encoding='utf-8')
    html_text = HTML.read_text(encoding='utf-8')
    new_block = f'<script>\nwindow.PRONOSTICS_DATA = {payload};\n</script>'
    html_text = re.sub(r'<script>\s*window\.PRONOSTICS_DATA\s*=.*?;?\s*</script>',
                       new_block, html_text, count=1, flags=re.DOTALL)
    HTML.write_text(html_text, encoding='utf-8')

    print(f'[{datetime.now():%H:%M:%S}] done in {time.time()-t0:.1f}s · {total_touched} events tagged with injuries')


if __name__ == '__main__':
    main()
