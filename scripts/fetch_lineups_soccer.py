#!/usr/bin/env python3
"""Scrape Sofascore starting XI + subs + formation for upcoming top-5 soccer fixtures.

Complements ``fetch_injuries_soccer.py`` (same endpoint, different payload
slice). We hit ``/event/{id}/lineups`` — the same endpoint that exposes
``missingPlayers`` — and extract ``home.players`` / ``away.players``
plus the ``formation`` and ``confirmed`` flag.

Sofascore's lineups endpoint sometimes returns 404 when a match is too
far out (typically >48h). That's fine: absent lineups just mean the UI
falls back to "composition non publiée" and we retry on the next run.

Output: ``lineups_soccer.json`` at repo root, consumed by
``patch_lineups_soccer.py`` and keyed by Sofascore event id (mapping back
to ESPN events is done by team-name normalization at patch time).

Schema::

    {
      "generated_at": "2026-04-20T18:30:00Z",
      "events": {                             # keyed by "home_norm|away_norm"
        "crystalpalace|chelsea": {
          "home": {
            "team": "Crystal Palace",
            "formation": "4-2-3-1",
            "confirmed": false,
            "coach": "Oliver Glasner",
            "starters": [
              {"name": "Dean Henderson", "pos": "G", "shirt": 1,
               "rating": 6.8, "captain": false},
              ...
            ],
            "subs": [{"name": "Sam Johnstone", "pos": "G", "shirt": 12}, ...]
          },
          "away": {...},
          "league_code": "eng.1",
          "sofa_event_id": 12345678
        },
        ...
      }
    }

Lineups typically lock ~1h before kickoff; before that they reflect the
previous match's starting XI plus coach's expected rotation.
"""
from __future__ import annotations
import json
import sys
import time
from datetime import datetime
from pathlib import Path

try:
    from curl_cffi import requests as cr
except ImportError:
    print('ERROR: curl_cffi not installed. Run: pip install curl_cffi --break-system-packages')
    sys.exit(1)

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from winamax_map import _norm

OUT = Path(__file__).resolve().parent.parent / 'lineups_soccer.json'
API = 'https://api.sofascore.com/api/v1'

# Same five leagues as fetch_injuries_soccer.py — keep the two files in sync.
LEAGUES: dict[str, int] = {
    'eng.1': 17,
    'esp.1': 8,
    'ger.1': 35,
    'ita.1': 23,
    'fra.1': 34,
}

# Position code mapping (Sofascore uses single letters: G/D/M/F).
# Kept as identity for now — front-end expects single-letter codes.
POS_CODES = {'G', 'D', 'M', 'F'}


def _get(url: str) -> dict | None:
    try:
        r = cr.get(url, impersonate='chrome110', timeout=15)
    except Exception as e:
        print(f'  ERR {url}: {e}', flush=True)
        return None
    if r.status_code == 429:
        print(f'  [rate-limit] Sofascore 429 on {url}', flush=True)
        return None
    if r.status_code == 404:
        # Expected for matches too far out — no lineup yet.
        return None
    if r.status_code != 200:
        print(f'  HTTP {r.status_code} on {url}', flush=True)
        return None
    try:
        return r.json()
    except Exception as e:
        print(f'  JSON parse error on {url}: {e}', flush=True)
        return None


def current_season_id(tournament_id: int) -> int | None:
    d = _get(f'{API}/unique-tournament/{tournament_id}/seasons')
    if not d:
        return None
    seasons = d.get('seasons') or []
    return seasons[0].get('id') if seasons else None


def upcoming_fixtures(tournament_id: int, season_id: int, pages: int = 2) -> list[dict]:
    out: list[dict] = []
    for p in range(pages):
        d = _get(f'{API}/unique-tournament/{tournament_id}/season/{season_id}/events/next/{p}')
        if not d:
            break
        evs = d.get('events') or []
        if not evs:
            break
        out.extend(evs)
        if not d.get('hasNextPage'):
            break
        time.sleep(0.3)
    return out


def _extract_player(p: dict) -> dict | None:
    pl = p.get('player') or {}
    name = pl.get('name')
    if not name:
        return None
    pos = p.get('position') or pl.get('position') or ''
    # Some payloads return full position like "Goalkeeper" — keep first letter.
    if pos and pos[0].upper() in POS_CODES:
        pos = pos[0].upper()
    shirt = p.get('shirtNumber') or pl.get('shirtNumber')
    stats = p.get('statistics') or {}
    rating = stats.get('rating')  # may be None for probable lineups
    captain = bool(p.get('captain'))
    return {
        'name': name,
        'pos': pos,
        'shirt': shirt,
        'rating': rating,
        'captain': captain,
    }


def _extract_side(side: dict) -> dict | None:
    players = side.get('players') or []
    if not players:
        return None
    starters_raw = [p for p in players if not p.get('substitute')]
    subs_raw = [p for p in players if p.get('substitute')]
    starters = [x for x in (_extract_player(p) for p in starters_raw) if x]
    subs = [x for x in (_extract_player(p) for p in subs_raw) if x]
    # Require at least 7 starters to call it a real lineup (pre-game
    # "expected XI" often has 11; after kickoff we'll have confirmed 11).
    if len(starters) < 7:
        return None
    formation = side.get('formation') or ''
    # Coach info lives on the side's 'coach' field when available.
    coach = ((side.get('coach') or {}).get('name') or '') or ''
    return {
        'formation': formation,
        'confirmed': bool(side.get('confirmed')),  # usually absent pre-match
        'coach': coach,
        'starters': starters,
        'subs': subs,
    }


def lineup_for_event(event_id: int) -> dict | None:
    d = _get(f'{API}/event/{event_id}/lineups')
    if not d:
        return None
    home = _extract_side(d.get('home') or {})
    away = _extract_side(d.get('away') or {})
    if not (home or away):
        return None
    # Confirmed flag lives at the top level on Sofascore's response.
    confirmed = bool(d.get('confirmed'))
    if home:
        home['confirmed'] = home.get('confirmed') or confirmed
    if away:
        away['confirmed'] = away.get('confirmed') or confirmed
    return {'home': home, 'away': away}


def collect() -> dict:
    t0 = time.time()
    print(f'[{datetime.now():%H:%M:%S}] Sofascore soccer lineups scrape', flush=True)
    events: dict[str, dict] = {}
    totals = {'leagues': 0, 'fixtures': 0, 'with_lineup': 0, 'misses': 0}

    for code, tid in LEAGUES.items():
        season_id = current_season_id(tid)
        if not season_id:
            print(f'  {code}: no season found, skipping', flush=True)
            continue
        fixtures = upcoming_fixtures(tid, season_id, pages=2)
        print(f'  {code} (tid={tid}, season={season_id}): {len(fixtures)} upcoming', flush=True)
        totals['leagues'] += 1
        totals['fixtures'] += len(fixtures)

        for ev in fixtures:
            eid = ev.get('id')
            home_name = (ev.get('homeTeam') or {}).get('name') or ''
            away_name = (ev.get('awayTeam') or {}).get('name') or ''
            if not (eid and home_name and away_name):
                continue
            lu = lineup_for_event(eid)
            if not lu:
                totals['misses'] += 1
                time.sleep(0.25)
                continue
            if lu.get('home'):
                lu['home']['team'] = home_name
            if lu.get('away'):
                lu['away']['team'] = away_name
            key = f'{_norm(home_name)}|{_norm(away_name)}'
            events[key] = {
                **lu,
                'league_code': code,
                'sofa_event_id': eid,
            }
            totals['with_lineup'] += 1
            time.sleep(0.3)

    elapsed = time.time() - t0
    print(f'[{datetime.now():%H:%M:%S}] Done: {totals["leagues"]} leagues, '
          f'{totals["fixtures"]} fixtures, {totals["with_lineup"]} w/ lineup '
          f'({totals["misses"]} misses, {elapsed:.1f}s)', flush=True)
    return {
        'generated_at': datetime.utcnow().isoformat() + 'Z',
        'events': events,
    }


def main() -> int:
    data = collect()
    if not data.get('events'):
        print('  no lineups collected — not overwriting existing file')
        return 1
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')),
                   encoding='utf-8')
    print(f'  wrote {OUT} ({OUT.stat().st_size / 1024:.1f}KB)', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
