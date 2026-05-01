#!/usr/bin/env python3
"""Fetch recent W/L form for non-football team sports (basket/hockey/baseball).

ESPN's scoreboard endpoint omits the `form` field for these sports —
football events ship a 5-game string ("WLWWL") natively but the others
have `form: null`. This script visits each team's `schedule` endpoint
once per cron run, extracts the last 5 completed results, and writes
them to a JSON sidecar that `patch_team_form.py` injects back into
each upcoming event.

Goal : Théo voit la forme récente sur les cards NBA / NHL / MLB comme
sur le foot, ce qui aide vraiment à prendre des décisions (un favori
qui vient de perdre 4 sur 5 mérite plus de prudence).

Self-throttling :
  * cache `team_form.json` is keyed by team ID + sport
  * a per-team entry refreshed if older than RECAPTURE_HOURS
  * concurrent.futures with 6 workers (ESPN tolerates ~10 req/s)
  * cron cadence : every 30 min (cf auto_refresh.py / refresh.yml)
"""
from __future__ import annotations
import json
import re
import time
from datetime import datetime, timedelta
from pathlib import Path
import concurrent.futures

try:
    from curl_cffi import requests as cr
except ImportError:
    import urllib.request
    cr = None  # graceful degradation, we'll use urllib

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / 'data.js'
OUT = ROOT / 'team_form.json'

RECAPTURE_HOURS = 6.0  # team form changes ~daily, no need to spam ESPN

# ESPN team-schedule endpoint base URLs by (sport, league_code)
SCHEDULE_URLS = {
    ('basketball', 'nba'): 'https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{tid}/schedule',
    ('basketball', 'wnba'): 'https://site.web.api.espn.com/apis/site/v2/sports/basketball/wnba/teams/{tid}/schedule',
    ('basketball', 'ncaa'): 'https://site.web.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/{tid}/schedule',
    ('hockey', 'nhl'): 'https://site.web.api.espn.com/apis/site/v2/sports/hockey/nhl/teams/{tid}/schedule',
    ('baseball', 'mlb'): 'https://site.web.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/{tid}/schedule',
    ('american-football', 'nfl'): 'https://site.web.api.espn.com/apis/site/v2/sports/football/nfl/teams/{tid}/schedule',
}


def _fetch_json(url: str) -> dict | None:
    try:
        if cr is not None:
            r = cr.get(url, impersonate='chrome110', timeout=15)
            if r.status_code != 200:
                return None
            return r.json()
        else:
            import urllib.request
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status != 200:
                    return None
                return json.loads(resp.read().decode('utf-8'))
    except Exception:
        return None


def _team_form_from_schedule(payload: dict, team_id: str) -> dict | None:
    """Extract a 5-game form string + record from ESPN's schedule payload."""
    if not isinstance(payload, dict):
        return None
    events = payload.get('events') or []
    completed = []
    for e in events:
        comp = (e.get('competitions') or [{}])[0]
        status = (comp.get('status') or {}).get('type') or {}
        if not status.get('completed'):
            continue
        teams = comp.get('competitors') or []
        me = next((t for t in teams if str(t.get('id')) == str(team_id)), None)
        op = next((t for t in teams if str(t.get('id')) != str(team_id)), None)
        if not me or not op:
            continue
        winner = me.get('winner')
        ms = me.get('score') or {}
        os_ = op.get('score') or {}
        if isinstance(ms, dict):
            ms = ms.get('value')
        if isinstance(os_, dict):
            os_ = os_.get('value')
        try:
            ms = int(float(ms)) if ms is not None else None
            os_ = int(float(os_)) if os_ is not None else None
        except (TypeError, ValueError):
            ms = os_ = None
        completed.append({
            'date': e.get('date'),
            'won': bool(winner),
            'score_for': ms,
            'score_against': os_,
            'opponent_abbr': (op.get('team') or {}).get('abbreviation'),
        })
    if not completed:
        return None
    completed.sort(key=lambda r: r.get('date') or '')
    last5 = completed[-5:]
    form = ''.join('W' if r['won'] else 'L' for r in last5)
    # Padding inversion (most recent first like ESPN football "WLWWL"
    # which is also "most recent first" — see derivedForm in pronostics.html).
    form_recent_first = form[::-1]
    return {
        'form': form_recent_first,
        'last5': last5,
        'updated_at': datetime.utcnow().isoformat() + 'Z',
    }


def _collect_teams(data: dict) -> list[tuple[str, str, str]]:
    """Walk data.js and return list of (sport, league_code, team_id) triples
    that we know how to look up."""
    out = set()
    for day, evs in (data.get('days') or {}).items():
        for ev in evs or []:
            sport = ev.get('sport')
            code = ev.get('league_code')
            key = (sport, code)
            if key not in SCHEDULE_URLS:
                continue
            for c in ev.get('competitors') or []:
                tid = c.get('id')
                if tid:
                    out.add((sport, code, str(tid)))
    return sorted(out)


def main():
    t0 = time.time()
    if not DATA_JS.exists():
        print('[fetch_team_form] data.js missing, skipping.')
        return

    text = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'=\s*(\{.*\})\s*;?\s*$', text, re.DOTALL)
    if not m:
        print('[fetch_team_form] could not parse data.js')
        return
    data = json.loads(m.group(1))

    # Load existing cache (skip recently-fetched teams)
    cache: dict = {}
    if OUT.exists():
        try:
            cache = json.loads(OUT.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            cache = {}

    cutoff = datetime.utcnow() - timedelta(hours=RECAPTURE_HOURS)
    teams = _collect_teams(data)
    todo = []
    for sport, code, tid in teams:
        key = f'{sport}:{code}:{tid}'
        prev = cache.get(key)
        if prev:
            try:
                ts = datetime.fromisoformat(str(prev.get('updated_at', '')).rstrip('Z'))
                if ts > cutoff:
                    continue  # fresh enough, skip
            except (ValueError, TypeError):
                pass
        todo.append((sport, code, tid, key))

    print(f'[fetch_team_form] {len(teams)} teams seen | {len(todo)} need refresh', flush=True)

    def work(item):
        sport, code, tid, key = item
        url_tpl = SCHEDULE_URLS.get((sport, code))
        if not url_tpl:
            return key, None
        url = url_tpl.format(tid=tid)
        payload = _fetch_json(url)
        return key, _team_form_from_schedule(payload, tid)

    written = 0
    if todo:
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
            for key, info in ex.map(work, todo):
                if info:
                    cache[key] = info
                    written += 1

    OUT.write_text(json.dumps(cache, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    elapsed = time.time() - t0
    print(f'[fetch_team_form] wrote {written} forms, total cache size {len(cache)} | {elapsed:.1f}s', flush=True)


if __name__ == '__main__':
    main()
