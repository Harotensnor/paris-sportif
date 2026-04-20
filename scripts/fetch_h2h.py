#!/usr/bin/env python3
"""
fetch_h2h.py — Enrich each upcoming match with head-to-head history.

Hits ESPN's `/summary?event=ID` endpoint (same used in browsers) which
returns a `headToHeadGames` block listing the 3-5 most recent meetings
between the two teams. We attach this to the event as `m['h2h']`.

Designed to be:
  - idempotent (skips events already enriched within ~12h window)
  - safe (catches per-event errors, never aborts the whole run)
  - cheap (one HTTP call per upcoming match, rate-limited to 2 req/s)

Only processes matches in the next 72h to keep the total requests
reasonable (~100-200/run for typical days).
"""
import json, re, sys, time, urllib.request, urllib.error
from pathlib import Path
from datetime import datetime, timezone, timedelta

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / 'data.js'

# ESPN summary endpoint — same slug path as fetch_v3 uses
SPORT_TO_ESPN_PATH = {
    'football': 'soccer',
    'basketball': 'basketball',
    'hockey': 'hockey',
    'tennis': 'tennis',
}

def load_data():
    txt = DATA_PATH.read_text(encoding='utf-8')
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        print('[h2h] could not parse data.js', file=sys.stderr)
        sys.exit(1)
    return json.loads(m.group(1))

def save_data(d):
    DATA_PATH.write_text(
        'window.PRONOSTICS_DATA = ' + json.dumps(d, ensure_ascii=False) + ';\n',
        encoding='utf-8'
    )

def league_espn_path(event):
    """Turn 'fra.1' / 'nba' etc. into 'soccer/fra.1' etc."""
    sport = event.get('sport', '')
    code = event.get('league_code', '')
    base = SPORT_TO_ESPN_PATH.get(sport, sport)
    if sport == 'football':
        return f'soccer/{code}'
    if sport == 'basketball':
        if code in ('nba', 'wnba', 'nba-summer-las-vegas', 'mens-college-basketball', 'womens-college-basketball'):
            return f'basketball/{code}'
        return f'basketball/{code}'
    if sport == 'hockey':
        return f'hockey/{code}'
    if sport == 'tennis':
        # Tennis doesn't really have H2H via the same summary endpoint
        return None
    return f'{base}/{code}' if code else None

def fetch_h2h(event):
    path = league_espn_path(event)
    if not path:
        return None
    url = f'https://site.api.espn.com/apis/site/v2/sports/{path}/summary?event={event["id"]}'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        raw = urllib.request.urlopen(req, timeout=10).read()
        d = json.loads(raw)
    except urllib.error.HTTPError as e:
        if e.code == 429:
            print(f'  [rate-limit] ESPN 429 on h2h {event.get("id")}', flush=True, file=sys.stderr)
        return None
    except (urllib.error.URLError, TimeoutError):
        return None
    except Exception:
        return None
    h2h_blocks = d.get('headToHeadGames') or []
    if not h2h_blocks:
        return None
    # Normalize into a compact shape: list of past meetings
    # { date, scoreHome, scoreAway, homeTeam, awayTeam, winner, league }
    meetings = []
    seen_keys = set()
    for block in h2h_blocks:
        team_name = (block.get('team') or {}).get('displayName') or ''
        for ev in block.get('events', []) or []:
            raw_score = ev.get('score') or ''   # e.g. "2-1" — always team_name-first
            at_vs = ev.get('atVs', '')
            result = ev.get('gameResult', '')   # W / L / D / T from team_name perspective
            opp = (ev.get('opponent') or {}).get('displayName') or '?'
            date = ev.get('gameDate') or ev.get('date') or ''
            league = (ev.get('leagueName') or ev.get('league') or '')
            # ESPN returns score in team_name-first order (team-opp). We want
            # home-away order for display.
            parts = raw_score.split('-') if raw_score else []
            if len(parts) == 2:
                team_score, opp_score = parts[0].strip(), parts[1].strip()
                if at_vs == '@':
                    # team_name is away → home is opp
                    home_score, away_score = opp_score, team_score
                else:
                    home_score, away_score = team_score, opp_score
                display_score = f'{home_score}-{away_score}'
            else:
                display_score = raw_score
            # Deduplicate: both teams can report the same match mirror-imaged
            key = (date, tuple(sorted([team_name, opp])), display_score)
            if key in seen_keys:
                continue
            seen_keys.add(key)
            home_name = team_name if at_vs != '@' else opp
            away_name = opp if at_vs != '@' else team_name
            # Normalize result to a "winner" field (home/away/draw) that's
            # easier to consume on the client.
            if result in ('D', 'T'):
                winner = 'draw'
            elif result == 'W':
                winner = 'home' if team_name == home_name else 'away'
            elif result == 'L':
                winner = 'away' if team_name == home_name else 'home'
            else:
                winner = ''
            meetings.append({
                'date': date,
                'home': home_name,
                'away': away_name,
                'score': display_score,
                'result': result,
                'winner': winner,
                'for': team_name,
                'league': league,
            })
    # Sort most recent first (date may be ISO string or None)
    def _k(m):
        try:
            return datetime.fromisoformat(m['date'].replace('Z','+00:00'))
        except Exception:
            return datetime(1970, 1, 1, tzinfo=timezone.utc)
    meetings.sort(key=_k, reverse=True)
    return meetings[:6]

def should_refetch(event, now):
    h = event.get('h2h')
    if not h or not isinstance(h, dict):
        return True
    # If meetings exist but lack the normalized `winner` field, re-fetch once
    # to upgrade them to the new schema.
    meetings = h.get('meetings') or []
    if meetings and 'winner' not in (meetings[0] or {}):
        return True
    fetched_at = h.get('fetched_at')
    if not fetched_at:
        return True
    try:
        age_h = (now - datetime.fromisoformat(fetched_at)).total_seconds() / 3600
        return age_h > 12
    except Exception:
        return True

def main():
    d = load_data()
    now_utc = datetime.now(timezone.utc)
    horizon = now_utc + timedelta(hours=72)
    days = d.get('days', {})
    checked = 0
    enriched = 0
    errors = 0
    for day_key, events in days.items():
        for ev in events:
            if ev.get('completed') or ev.get('status') == 'STATUS_IN_PROGRESS':
                continue
            if not ev.get('date'):
                continue
            try:
                start = datetime.fromisoformat(ev['date'].replace('Z','+00:00'))
            except Exception:
                continue
            if start < now_utc or start > horizon:
                continue
            if not should_refetch(ev, now_utc):
                continue
            # Only process events that are on Winamax (don't waste calls)
            wm = ev.get('winamax') or {}
            if wm.get('available') is False:
                continue
            checked += 1
            if checked > 180:    # cap per run (~90s at 2 req/s)
                break
            try:
                meetings = fetch_h2h(ev)
            except Exception:
                meetings = None
                errors += 1
            ev['h2h'] = {
                'fetched_at': now_utc.isoformat(),
                'meetings': meetings or [],
            }
            if meetings:
                enriched += 1
            time.sleep(0.5)     # 2 req/s
        if checked > 180:
            break
    save_data(d)
    print(f'[h2h] checked={checked} enriched={enriched} errors={errors}')

if __name__ == '__main__':
    main()
