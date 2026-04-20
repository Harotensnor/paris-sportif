#!/usr/bin/env python3
"""Scrape Sofascore ``missingPlayers`` for the five top football leagues.

ESPN's injuries endpoint returns empty for soccer — fetch_injuries.py
only covers US sports (NBA/NHL/NFL/MLB/WNBA). This fills the soccer gap.

Output: ``injuries_soccer.json`` at repo root, consumed by
``patch_injuries_soccer.py`` (keyed by normalized team name, since
Sofascore event/team ids don't align with ESPN's).

Sofascore team-level injury endpoints (/team/*/squad,
/team/*/missing-players, /team/*/injuries) all return 404. The only
working path is per-event: ``/api/v1/event/{id}/lineups`` exposes
``home.missingPlayers`` and ``away.missingPlayers``. So we walk each
league's upcoming fixtures, pull lineups, and bucket by team name.

Schema::

    {
      "generated_at": "2026-04-20T18:30:00Z",
      "reason_labels": {"1": "injured", ...},
      "teams": {                        # teams with ≥1 missing player
        "crystalpalace": [
          {"player": "Adam Wharton", "reason": 1, "reason_label": "injured",
           "type": "missing", "league_code": "eng.1", "team": "Crystal Palace"}
        ],
        ...
      },
      "scanned_teams": {                # every team whose lineups we pulled
        "acmilan": "AC Milan",          # (so downstream can distinguish
        ...                             # "0 injuries known" from "unknown")
      }
    }

Reason codes observed: 0=unknown, 1=injured, 2=suspended,
3=disciplinary, 4=coach decision, 10=doubtful, 13=international duty.
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
from winamax_map import _norm  # reuse the exact normalization the Winamax pipeline uses

OUT = Path(__file__).resolve().parent.parent / 'injuries_soccer.json'
API = 'https://api.sofascore.com/api/v1'

# ESPN league code → Sofascore uniqueTournament id.
# Focused on the five leagues where injury data actually moves the line.
LEAGUES: dict[str, int] = {
    'eng.1': 17,   # Premier League
    'esp.1': 8,    # LaLiga
    'ger.1': 35,   # Bundesliga
    'ita.1': 23,   # Serie A
    'fra.1': 34,   # Ligue 1
}

REASON_LABELS = {
    0: 'unknown',
    1: 'injured',
    2: 'suspended',
    3: 'disciplinary',
    4: 'coach decision',
    10: 'doubtful',
    13: 'international duty',
}


def _get(url: str) -> dict | None:
    try:
        r = cr.get(url, impersonate='chrome110', timeout=15)
    except Exception as e:
        print(f'  ERR {url}: {e}', flush=True)
        return None
    if r.status_code == 429:
        print(f'  [rate-limit] Sofascore 429 on {url}', flush=True)
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
    """First season in the list is the current one (Sofascore orders desc)."""
    d = _get(f'{API}/unique-tournament/{tournament_id}/seasons')
    if not d:
        return None
    seasons = d.get('seasons') or []
    return seasons[0].get('id') if seasons else None


def upcoming_fixtures(tournament_id: int, season_id: int, pages: int = 2) -> list[dict]:
    """Next ``pages`` pages of upcoming events. 30 per page is plenty —
    injuries decay fast, no point fetching lineups for matches weeks out."""
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


def missing_for_event(event_id: int) -> dict[str, list[dict]]:
    """Returns {'home': [...], 'away': [...]} or empty dict on failure."""
    d = _get(f'{API}/event/{event_id}/lineups')
    if not d:
        return {}
    out: dict[str, list[dict]] = {}
    for side in ('home', 'away'):
        missing = (d.get(side) or {}).get('missingPlayers') or []
        clean = []
        for p in missing:
            player = (p.get('player') or {}).get('name')
            if not player:
                continue
            reason = p.get('reason')
            clean.append({
                'player': player,
                'reason': reason,
                'reason_label': REASON_LABELS.get(reason, 'unknown'),
                'type': p.get('type') or 'missing',  # 'missing' or 'doubtful'
            })
        out[side] = clean
    return out


def collect() -> dict:
    t0 = time.time()
    print(f'[{datetime.now():%H:%M:%S}] Sofascore soccer injuries scrape', flush=True)

    teams: dict[str, list[dict]] = {}
    scanned: dict[str, str] = {}  # norm_name -> display name; every team we successfully pulled lineups for
    totals = {'leagues': 0, 'fixtures': 0, 'players': 0, 'lineup_misses': 0}

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
            miss = missing_for_event(eid)
            if not miss:
                totals['lineup_misses'] += 1
                time.sleep(0.25)
                continue
            # We got a lineups response — both teams are "scanned", even if
            # their missingPlayers lists are empty.
            for side_name in (home_name, away_name):
                k = _norm(side_name)
                if k:
                    scanned.setdefault(k, side_name)
            for side, side_name in (('home', home_name), ('away', away_name)):
                key = _norm(side_name)
                if not key:
                    continue
                for mp in miss.get(side, []) or []:
                    rec = {**mp, 'league_code': code, 'team': side_name}
                    teams.setdefault(key, []).append(rec)
                    totals['players'] += 1
            time.sleep(0.3)

    # Dedupe per team — a player can appear on multiple upcoming fixtures.
    for key, lst in teams.items():
        seen = set()
        deduped = []
        for rec in lst:
            k = (rec['player'], rec.get('reason'))
            if k in seen:
                continue
            seen.add(k)
            deduped.append(rec)
        teams[key] = deduped

    elapsed = time.time() - t0
    print(f'[{datetime.now():%H:%M:%S}] Done: {totals["leagues"]} leagues, '
          f'{totals["fixtures"]} fixtures, {len(scanned)} teams scanned, '
          f'{len(teams)} with injuries, {totals["players"]} player-entries '
          f'({elapsed:.1f}s, {totals["lineup_misses"]} lineups missing)',
          flush=True)

    return {
        'generated_at': datetime.utcnow().isoformat() + 'Z',
        'reason_labels': REASON_LABELS,
        'teams': teams,
        'scanned_teams': scanned,
    }


def main() -> int:
    data = collect()
    if not data.get('teams'):
        print('  no injuries collected — not overwriting existing file')
        return 1
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')),
                   encoding='utf-8')
    print(f'  wrote {OUT} ({OUT.stat().st_size / 1024:.1f}KB)', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
