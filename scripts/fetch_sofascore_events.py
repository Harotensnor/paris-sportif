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
import os
import sys
import argparse
import tempfile
import time
import unicodedata
from datetime import datetime, timezone, timedelta
from pathlib import Path

try:
    from curl_cffi import requests as cr
except ImportError:
    print('ERROR: curl_cffi requis. pip install curl_cffi --break-system-packages')
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'sofascore_events.json'
API = 'https://api.sofascore.com/api/v1'
MIN_TOTAL_TO_OVERWRITE = 100

# Mapping Sofascore sport → ESPN sport name (pour cohérence data.js)
SPORT_MAPPING = {
    'football': 'football',
    'tennis': 'tennis',
    'basketball': 'basketball',
    'ice-hockey': 'hockey',
    'baseball': 'baseball',
    'american-football': 'football-american',
    'rugby': 'rugby',
    'rugby-league': 'rugby',
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
    # Section J — richer taxonomy for already-fetched public schedules.
    # These codes make tier-2 leagues, cups, women football and Asia/LATAM
    # events distinguishable downstream without adding new paid services.
    "UEFA Women's Champions League": 'uefa.women.champions',
    "Women's Super League": 'eng.w.1',
    'Liga F': 'esp.w.1',
    'Serie A, Women': 'ita.w.1',
    'Frauen-Bundesliga': 'ger.w.1',
    'Division 1, Women': 'fra.w.1',
    '2. Bundesliga': 'ger.2',
    'Eerste Divisie': 'ned.2',
    'LaLiga 2': 'esp.2',
    'LaLiga Hypermotion': 'esp.2',
    'Serie B': 'ita.2',
    'Ligue 2': 'fra.2',
    'FA Cup': 'eng.fa_cup',
    'Copa del Rey': 'esp.copa_del_rey',
    'DFB Pokal': 'ger.dfb_pokal',
    'DFB-Pokal': 'ger.dfb_pokal',
    'Coppa Italia': 'ita.coppa_italia',
    'J1 League': 'jpn.1',
    'J1 League, East': 'jpn.1',
    'J1 League, West': 'jpn.1',
    'J2/J3 League, East A': 'jpn.2',
    'J2/J3 League, East B': 'jpn.2',
    'J2/J3 League, West A': 'jpn.2',
    'J2/J3 League, West B': 'jpn.2',
    'K League 1': 'kor.1',
    'Chinese Super League': 'chn.1',
    'Saudi Pro League': 'ksa.1',
    'Brasileirão Série A': 'bra.1',
    'Brasileirão Série B': 'bra.2',
    'Brasileirão Série C': 'bra.3',
    'Liga Profesional de Fútbol, Apertura': 'arg.1',
    'CONMEBOL Libertadores': 'conmebol.libertadores',
    'CONMEBOL Sudamericana': 'conmebol.sudamericana',
    'NHL, Playoffs': 'nhl.playoffs',
    'AHL, Playoffs': 'ahl.playoffs',
    'MLB': 'mlb',
    'KBO League': 'kbo',
    'Professional Baseball, Pacific League': 'npb.pacific',
    'Professional Baseball, Central League': 'npb.central',
    'Rugby Union': 'rugby.union',
    'Rugby League': 'rugby.league',
}


def _league_code(league_name: str, sport: str) -> str:
    """Return a stable internal code for richer sports expansion reporting."""
    mapped = LEAGUE_MAPPING.get(league_name)
    if mapped:
        return mapped
    low = (league_name or '').lower()
    sofa_sport = (sport or '').lower()
    if sofa_sport == 'football':
        if any(tok in low for tok in ('women', 'fémin', 'feminine', 'frauen', 'femen')):
            return 'football.women'
        if 'libertadores' in low:
            return 'conmebol.libertadores'
        if 'sudamericana' in low:
            return 'conmebol.sudamericana'
        if 'j1 league' in low:
            return 'jpn.1'
        if 'j2' in low or 'j3' in low:
            return 'jpn.2'
        if 'k league 1' in low:
            return 'kor.1'
        if 'chinese super league' in low:
            return 'chn.1'
        if 'saudi pro league' in low:
            return 'ksa.1'
        if 'brasileir' in low:
            return 'bra.1'
        if 'liga profesional' in low:
            return 'arg.1'
        if any(tok in low for tok in ('fa cup', 'copa del rey', 'dfb', 'coppa italia', 'cup')):
            return 'football.cup'
    if sofa_sport == 'tennis':
        if low.startswith('itf '):
            return 'itf'
        if 'challenger' in low:
            return 'atp.challenger'
        if low.startswith('atp ') or 'atp ' in low:
            return 'atp'
        if low.startswith('wta ') or 'wta ' in low:
            return 'wta'
    if sofa_sport == 'ice-hockey':
        if 'nhl' in low and 'playoff' in low:
            return 'nhl.playoffs'
        if 'nhl' in low:
            return 'nhl'
    if sofa_sport == 'baseball':
        if 'mlb' in low:
            return 'mlb'
        if 'kbo' in low:
            return 'kbo'
        if 'professional baseball' in low:
            return 'npb'
    if 'rugby' in sofa_sport or 'rugby' in low:
        return 'rugby'
    return _normalize(league_name)[:20] or 'other'


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
        league_code = _league_code(league_name, sport)

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


DEBUG = False


def _previous_total() -> int:
    if not OUT.exists():
        return 0
    try:
        previous = json.loads(OUT.read_text(encoding='utf-8'))
    except Exception:
        return 0
    if isinstance(previous, dict):
        total = previous.get('total')
        if isinstance(total, int):
            return total
        events = previous.get('events') or {}
        if isinstance(events, dict):
            return sum(len(v or []) for v in events.values())
    return 0


def _write_json_atomic(path: Path, payload: dict) -> None:
    """Write JSON through a same-folder temp file, then atomically replace."""
    text = json.dumps(payload, ensure_ascii=False, separators=(',', ':'))
    fd, tmp_path = tempfile.mkstemp(prefix=f'.{path.name}.', suffix='.tmp', dir=str(path.parent))
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as fh:
            fh.write(text)
        last_error: Exception | None = None
        for attempt in range(8):
            try:
                os.replace(tmp_path, path)
                last_error = None
                break
            except (PermissionError, OSError) as exc:
                last_error = exc
                time.sleep(0.08 * (attempt + 1))
        if last_error is not None:
            raise last_error
    except Exception:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


def fetch_sport(sport: str, today: str) -> list[dict]:
    """Fetch les events scheduled pour un sport et un jour."""
    url = f'{API}/sport/{sport}/scheduled-events/{today}'
    data = _get(url)
    if not data:
        return []
    events = data.get('events') or []
    if DEBUG:
        print(f'    [debug] raw {sport} {today}: {len(events)} events', flush=True)
    out = []
    for ev in events:
        e = _to_espn_event(ev, sport)
        if e:
            out.append(e)
    return out


def main() -> int:
    global DEBUG
    ap = argparse.ArgumentParser(description='Fetch Sofascore scheduled events.')
    ap.add_argument('--debug', action='store_true')
    ap.add_argument('--date', default='', help='YYYY-MM-DD UTC date; default today')
    ap.add_argument('--days', type=int, default=1, help='number of UTC days to fetch from --date')
    ap.add_argument('--sports', default='football,tennis,basketball,ice-hockey,baseball,rugby')
    args = ap.parse_args()
    DEBUG = bool(args.debug)
    start = args.date or datetime.now(timezone.utc).strftime('%Y-%m-%d')
    try:
        start_dt = datetime.strptime(start, '%Y-%m-%d').replace(tzinfo=timezone.utc)
    except ValueError:
        print(f'Invalid --date {start!r}, expected YYYY-MM-DD', file=sys.stderr)
        return 2
    days = max(1, min(7, int(args.days or 1)))
    sports = [s.strip() for s in args.sports.split(',') if s.strip()]
    print(f'[{datetime.now():%H:%M:%S}] fetch_sofascore_events from {start_dt:%Y-%m-%d} days={days}', flush=True)

    out = {
        'generated_at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'events': {},
    }
    total = 0
    for day_offset in range(days):
        day = (start_dt + timedelta(days=day_offset)).strftime('%Y-%m-%d')
        for sofa_sport in sports:
            evs = fetch_sport(sofa_sport, day)
            espn_sport = SPORT_MAPPING.get(sofa_sport, sofa_sport)
            out['events'].setdefault(espn_sport, []).extend(evs)
            total += len(evs)
            print(f'  {day} {sofa_sport} ({espn_sport}): {len(evs)} events', flush=True)

    out['total'] = total
    previous_total = _previous_total()
    if total == 0 and OUT.exists():
        print('  no events collected — preserving previous sofascore_events.json', flush=True)
        return 1
    if total < MIN_TOTAL_TO_OVERWRITE and previous_total > total:
        print(
            f'  low coverage ({total} < {MIN_TOTAL_TO_OVERWRITE}) — preserving previous '
            f'snapshot ({previous_total} events)',
            flush=True,
        )
        return 1
    _write_json_atomic(OUT, out)
    print(f'  wrote {OUT.name} : {total} events ({OUT.stat().st_size/1024:.1f}KB)', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
