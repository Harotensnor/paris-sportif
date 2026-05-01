#!/usr/bin/env python3
"""Fetch ALL scheduled events from Sofascore for today (multi-sport).

Sofascore couvre BEAUCOUP plus de matchs qu'ESPN :
  football : ~150 events/jour vs ~30 ESPN
  tennis   : ~1000 events/jour (qualifs + ATP/WTA + challengers)
  basketball : ~350 events/jour (NBA + NCAA + Euro + autres)
  ice-hockey : ~50 events/jour
  baseball : ~250 events/jour (MLB + KBO + NPB + autres)

  → Total ~1800 events/jour vs ~50 ESPN actuellement.

Usage : invoqué quand ESPN ban GHA (fetch_v3 / fetch_live retourne peu).
Le patcher (patch_sofascore_events.py) MERGE ces events dans data.js
en deduppant par (homeTeam, awayTeam, jour) pour ne pas doubler les
matchs ESPN.

Output : sofascore_events.json
{
  "generated_at": "2026-05-01T02:00:00Z",
  "events": {
    "football": [{...}, ...],
    "tennis": [...],
    ...
  }
}

Format de chaque event normalisé (proche du shape ESPN dans data.js) :
  {
    "id": "sofa_<event_id>",  // préfixé pour ne pas collisionner ESPN
    "source": "sofascore",
    "date": "2026-05-01T16:00:00Z",  // ISO
    "name": "Team A vs Team B",
    "shortName": "TA vs TB",
    "sport": "football",  // ESPN-like sport name
    "league_code": "uefa.champions",  // mapping vers ESPN code si possible
    "league_name": "UEFA Champions League",
    "competitors": [
      {"name": "...", "abbr": "...", "home_away": "home"},
      {"name": "...", "abbr": "...", "home_away": "away"},
    ],
    "completed": false,
    "winamax": {"available": False},  # pas de cote, sera enrichi par catalog
  }

Ce fetcher est SAFE en cas d'échec : retourne {} si Sofascore ban.
"""
from __future__ import annotations
import json
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

try:
    from curl_cffi import requests as cr
except ImportError:
    print('ERROR: curl_cffi requis. pip install curl_cffi --break-system-packages')
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'sofascore_events.json'
API = 'https://api.sofascore.com/api/v1'

# Mapping Sofascore sport → ESPN sport name (pour cohérence data.js)
SPORT_MAPPING = {
    'football': 'football',
    'tennis': 'tennis',
    'basketball': 'basketball',
    'ice-hockey': 'hockey',
    'baseball': 'baseball',
    'american-football': 'football-american',
}

# Quelques mappings de tournois Sofascore → ESPN league_code pour les top
# leagues. Pour les autres, on laisse le league_name brut.
LEAGUE_MAPPING = {
    'Premier League': 'eng.1',
    'LaLiga': 'esp.1',
    'La Liga': 'esp.1',
    'Bundesliga': 'ger.1',
    'Serie A': 'ita.1',
    'Ligue 1': 'fra.1',
    'UEFA Champions League': 'uefa.champions',
    'UEFA Europa League': 'uefa.europa',
    'NBA': 'nba',
    'WNBA': 'wnba',
    'MLB': 'mlb',
    'NHL': 'nhl',
    'ATP': 'atp',
    'WTA': 'wta',
}


def _get(url: str) -> dict | None:
    try:
        r = cr.get(url, impersonate='chrome131', timeout=15)
    except Exception as e:
        print(f'  WARN {url}: {type(e).__name__}: {e}', flush=True)
        return None
    if r.status_code != 200:
        if r.status_code == 429:
            print(f'  [429] rate-limit on {url}', flush=True)
        elif r.status_code != 404:
            print(f'  HTTP {r.status_code} on {url}', flush=True)
        return None
    try:
        return r.json()
    except Exception:
        return None


def _normalize(name: str) -> str:
    """ASCII lowercase pour dedup avec ESPN events."""
    if not name:
        return ''
    n = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode()
    return ''.join(c for c in n.lower() if c.isalnum())


def _abbrev(name: str, length: int = 4) -> str:
    """Abbréviation 3-4 chars pour matcher le format ESPN."""
    if not name:
        return ''
    parts = name.split()
    if len(parts) == 1:
        return name[:length].upper()
    # 2+ words : take first letters
    return ''.join(p[0].upper() for p in parts if p)[:length]


def _to_espn_event(sofa_evt: dict, sport: str) -> dict | None:
    """Transforme un event Sofascore en format ESPN-like compatible data.js."""
    try:
        eid = sofa_evt.get('id')
        if not eid:
            return None
        ts = sofa_evt.get('startTimestamp')
        if not ts:
            return None
        # ISO date UTC
        dt = datetime.fromtimestamp(ts, tz=timezone.utc)
        date_iso = dt.strftime('%Y-%m-%dT%H:%MZ')

        home = sofa_evt.get('homeTeam') or {}
        away = sofa_evt.get('awayTeam') or {}
        home_name = home.get('name') or '?'
        away_name = away.get('name') or '?'

        tournament = sofa_evt.get('tournament') or {}
        league_name = tournament.get('name') or ''
        league_code = LEAGUE_MAPPING.get(league_name, '')
        if not league_code:
            # Try slug-style fallback
            league_code = _normalize(league_name)[:20] or 'other'

        # Status : Sofascore code 100 = finished, 0 = not started, 7 = in progress
        status = sofa_evt.get('status') or {}
        status_code = status.get('code', 0)
        completed = status_code == 100

        home_score = (sofa_evt.get('homeScore') or {}).get('current')
        away_score = (sofa_evt.get('awayScore') or {}).get('current')

        return {
            'id': f'sofa_{eid}',
            'source': 'sofascore',
            'date': date_iso,
            'name': f'{home_name} vs {away_name}',
            'shortName': f'{_abbrev(home_name)} vs {_abbrev(away_name)}',
            'sport': SPORT_MAPPING.get(sport, sport),
            'league_code': league_code,
            'league_name': league_name,
            'leagueShort': tournament.get('uniqueTournament', {}).get('slug') or league_name[:20],
            'competitors': [
                {
                    'id': str(home.get('id', '')),
                    'name': home_name,
                    'abbr': _abbrev(home_name),
                    'home_away': 'home',
                    'score': str(home_score) if home_score is not None else None,
                },
                {
                    'id': str(away.get('id', '')),
                    'name': away_name,
                    'abbr': _abbrev(away_name),
                    'home_away': 'away',
                    'score': str(away_score) if away_score is not None else None,
                },
            ],
            'completed': completed,
            'status': 'STATUS_FINAL' if completed else ('STATUS_IN_PROGRESS' if status_code == 7 else 'STATUS_SCHEDULED'),
            'winamax': {'available': False},  # à enrichir par patch_winamax
        }
    except Exception as e:
        print(f'  WARN normalize failed: {e}', flush=True)
        return None


def fetch_sport(sport: str, today: str) -> list[dict]:
    """Fetch les events scheduled pour un sport et un jour."""
    url = f'{API}/sport/{sport}/scheduled-events/{today}'
    data = _get(url)
    if not data:
        return []
    events = data.get('events') or []
    out = []
    for ev in events:
        e = _to_espn_event(ev, sport)
        if e:
            out.append(e)
    return out


def main() -> int:
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    print(f'[{datetime.now():%H:%M:%S}] fetch_sofascore_events for {today}', flush=True)

    out = {
        'generated_at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'events': {},
    }
    total = 0
    for sofa_sport in ('football', 'tennis', 'basketball', 'ice-hockey', 'baseball'):
        evs = fetch_sport(sofa_sport, today)
        espn_sport = SPORT_MAPPING.get(sofa_sport, sofa_sport)
        out['events'][espn_sport] = evs
        total += len(evs)
        print(f'  {sofa_sport} ({espn_sport}): {len(evs)} events', flush=True)

    out['total'] = total
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'  wrote {OUT.name} : {total} events ({OUT.stat().st_size/1024:.1f}KB)', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
