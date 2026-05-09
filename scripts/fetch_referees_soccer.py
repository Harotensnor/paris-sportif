#!/usr/bin/env python3
"""Scrape Sofascore referee assignments + season stats for upcoming top-5 soccer fixtures.

Why referees matter for pronostics:
- Referee strictness is a stable, measurable, and public prior. Typical
  yellows-per-game range 2.5 – 5.5. Strict refs (>5 Y/g) correlate with
  more stoppages and slightly fewer goals; lenient refs let play flow
  and see marginally more goals per game.
- Penalty rate per referee (pens/game) has a small but consistent
  effect on total goals.
- Most importantly, it's a signal that is NOT correlated with our other
  priors (odds, Poisson xG from GF/GA, ELO, form). That independence
  buys us a bit of edge even if the effect size is small.

Endpoint: Sofascore ``/api/v1/event/{event_id}`` — returns the event
record including a ``referee`` block with season totals::

    referee: {
      id, name, yellowCards, redCards, yellowRedCards, games, ...
    }

Output: ``referees_soccer.json`` at repo root, keyed by
``home_norm|away_norm`` (mirrors lineups/injuries scrapers for easy
cross-join at patch time). Small file (<10KB), cheap to fetch.

Cadence: Assignments are announced ~2-3 days before kickoff and rarely
change. Script self-throttles — skips refresh if file <6h old. Safe on
every tick; per-tick network cost is usually zero.
"""
from __future__ import annotations
import json
import sys
import time
import argparse
from datetime import datetime, timezone, timedelta
from pathlib import Path

try:
    from curl_cffi import requests as cr
except ImportError:
    print('ERROR: curl_cffi not installed. Run: pip install curl_cffi --break-system-packages')
    sys.exit(1)

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from winamax_map import _norm

OUT = Path(__file__).resolve().parent.parent / 'referees_soccer.json'
API = 'https://api.sofascore.com/api/v1'
STALE_H = 2  # v31.7.2 : 2h (avant 6h — coverage referee 8% trop faible)
DEBUG = False

# v31.7.60 — Extension tier 2 (audit V2 #11), aligné avec
# fetch_injuries_soccer + fetch_lineups_soccer.
LEAGUES: dict[str, int] = {
    # Tier 1
    'eng.1': 17,
    'esp.1': 8,
    'ger.1': 35,
    'ita.1': 23,
    'fra.1': 34,
    # Tier 2
    'ned.1': 37,
    'por.1': 238,
    'tur.1': 52,
    'bel.1': 38,
    'sco.1': 36,
    'eng.2': 18,
    'esp.2': 54,
    'ita.2': 24,
    'ger.2': 44,
    'fra.2': 182,
    # Europe cups. Referee assignments are often published earlier here.
    'uefa.champions': 7,
    'uefa.europa': 679,
    'uefa.europa.conf': 17015,
    # Tier 3 (v51.8 — élargissement coverage referees)
    'aut.1': 45,        # Austrian Bundesliga
    'gre.1': 185,       # Greek SuperLeague
    'jpn.1': 196,       # J-League
    'mls.1': 242,       # MLS
    'bra.1': 325,       # Brasileirão
}


def _get(url: str) -> dict | None:
    try:
        # v31.7.208 — bump chrome110 → chrome131.
        r = cr.get(url, impersonate='chrome131', timeout=15)
    except Exception as e:
        print(f'  ERR {url}: {e}', flush=True)
        return None
    if r.status_code == 429:
        print(f'  [rate-limit] Sofascore 429 on {url}', flush=True)
        return None
    if r.status_code in (404, 403):
        if DEBUG:
            print(f'  [debug] HTTP {r.status_code} on {url}', flush=True)
        return None
    if r.status_code != 200:
        print(f'  HTTP {r.status_code} on {url}', flush=True)
        return None
    try:
        return r.json()
    except Exception as e:
        print(f'  JSON parse error on {url}: {e}', flush=True)
        return None


def is_fresh(path: Path) -> bool:
    if not path.exists():
        return False
    try:
        j = json.loads(path.read_text(encoding='utf-8'))
        ts = j.get('generated_at', '')
        dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
        age = datetime.now(timezone.utc) - dt
        return age < timedelta(hours=STALE_H)
    except Exception:
        return False


def current_season_id(tournament_id: int) -> int | None:
    d = _get(f'{API}/unique-tournament/{tournament_id}/seasons')
    if not d:
        return None
    seasons = d.get('seasons') or []
    return seasons[0].get('id') if seasons else None


def upcoming_fixtures(tournament_id: int, season_id: int, pages: int = 5,
                      hours_ahead: int = 168) -> list[dict]:
    """v31.7.208 — Filter cutoff. Referees are assigned ~24-72h before
    kickoff. Beyond that the field is null on Sofascore. Cutting at 72h
    halves the per-league fixture count, ensures the run fits in GHA's
    10min timeout."""
    import time as _t
    out: list[dict] = []
    cutoff_ts = _t.time() + hours_ahead * 3600 if hours_ahead > 0 else None
    for p in range(pages):
        d = _get(f'{API}/unique-tournament/{tournament_id}/season/{season_id}/events/next/{p}')
        if not d:
            break
        evs = d.get('events') or []
        if not evs:
            break
        if cutoff_ts is not None:
            evs = [ev for ev in evs if (ev.get('startTimestamp') or 0) <= cutoff_ts]
        out.extend(evs)
        if not d.get('hasNextPage') or len(evs) == 0:
            break
        time.sleep(0.2)
    return out


def referee_for_event(event_id: int) -> dict | None:
    """Fetch base event record and extract referee block (if present)."""
    d = _get(f'{API}/event/{event_id}')
    if not d:
        return None
    ev = d.get('event') or {}
    ref = ev.get('referee')
    if not ref or not ref.get('name'):
        return None
    country = ref.get('country') or {}
    games = ref.get('games') or 0
    if games <= 0:
        return {
            'name': ref.get('name'),
            'country': country.get('name'),
            'yellowPerGame': None,
            'redPerGame': None,
            'cardsPerGame': None,
            'games': 0,
        }
    yellow = (ref.get('yellowCards') or 0) + (ref.get('yellowRedCards') or 0)
    red = ref.get('redCards') or 0
    cards = yellow + red
    return {
        'name': ref.get('name'),
        'country': country.get('name'),
        'yellowPerGame': round(yellow / games, 2),
        'redPerGame': round(red / games, 3),
        'cardsPerGame': round(cards / games, 2),
        'games': games,
    }


def collect(selected_leagues: set[str] | None = None, pages: int = 5,
            hours_ahead: int = 168) -> dict:
    t0 = time.time()
    print(f'[{datetime.now():%H:%M:%S}] Sofascore soccer referees scrape', flush=True)
    events: dict[str, dict] = {}
    totals = {'leagues': 0, 'fixtures': 0, 'with_ref': 0, 'misses': 0}

    for code, tid in LEAGUES.items():
        if selected_leagues and code not in selected_leagues:
            continue
        season_id = current_season_id(tid)
        if not season_id:
            print(f'  {code}: no season found, skipping', flush=True)
            continue
        fixtures = upcoming_fixtures(tid, season_id, pages=pages, hours_ahead=hours_ahead)
        print(f'  {code} (tid={tid}): {len(fixtures)} upcoming', flush=True)
        totals['leagues'] += 1
        totals['fixtures'] += len(fixtures)

        for ev in fixtures:
            eid = ev.get('id')
            home_name = (ev.get('homeTeam') or {}).get('name') or ''
            away_name = (ev.get('awayTeam') or {}).get('name') or ''
            if not (eid and home_name and away_name):
                continue
            ref = referee_for_event(eid)
            if not ref:
                totals['misses'] += 1
                # v31.7.208 — sleep réduit pour tenir le timeout GHA 10min.
                time.sleep(0.10)
                continue
            key = f'{_norm(home_name)}|{_norm(away_name)}'
            events[key] = {
                'referee': ref,
                'league_code': code,
                'sofa_event_id': eid,
            }
            totals['with_ref'] += 1
            time.sleep(0.15)

    elapsed = time.time() - t0
    print(f'[{datetime.now():%H:%M:%S}] Done: {totals["leagues"]} leagues, '
          f'{totals["fixtures"]} fixtures, {totals["with_ref"]} w/ referee '
          f'({totals["misses"]} misses, {elapsed:.1f}s)', flush=True)
    return {
        'generated_at': datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z'),
        'status': 'ok' if events else 'no_fresh_referees',
        'events': events,
        'stats': totals,
    }


def merge_existing_referees(fresh: dict) -> dict:
    """Merge fresh referee assignments with the existing cache.

    Sofascore only exposes referee assignments close to kickoff and can return
    a much smaller set on a later run.  Replacing the cache would silently drop
    still-useful assignments for tomorrow/weekend matches, so fresh entries win
    by key while older entries are retained.
    """
    old: dict = {}
    if OUT.exists():
        try:
            old = json.loads(OUT.read_text(encoding='utf-8'))
        except Exception:
            old = {}
    old_events = old.get('events') or {}
    fresh_events = fresh.get('events') or {}
    if not isinstance(old_events, dict):
        old_events = {}
    if not isinstance(fresh_events, dict):
        fresh_events = {}
    merged_events = dict(old_events)
    merged_events.update(fresh_events)

    stats = dict(fresh.get('stats') or {})
    stats['fresh_with_ref'] = len(fresh_events)
    stats['retained_existing'] = max(0, len(merged_events) - len(fresh_events))
    stats['events_total'] = len(merged_events)

    out = dict(fresh)
    out['events'] = merged_events
    out['stats'] = stats
    out['merged_from_existing'] = bool(old_events)
    return out


def main() -> int:
    global DEBUG
    ap = argparse.ArgumentParser(description='Fetch Sofascore soccer referees.')
    ap.add_argument('--debug', action='store_true')
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--top-leagues', default='', help='comma-separated league codes to fetch')
    ap.add_argument('--hours-ahead', type=int, default=168, help='upcoming window')
    ap.add_argument('--pages', type=int, default=4, help='Sofascore pagination depth per league')
    args = ap.parse_args()
    DEBUG = bool(args.debug)
    if not args.force and is_fresh(OUT):
        print(f'[fetch_referees] {OUT.name} is fresh (<{STALE_H}h), skipping')
        return 0
    selected = {x.strip() for x in args.top_leagues.split(',') if x.strip()} or None
    data = collect(selected_leagues=selected, pages=max(1, args.pages),
                   hours_ahead=max(1, args.hours_ahead))
    data = merge_existing_referees(data)
    if not data.get('events'):
        data['status'] = 'no_referees_available'
    elif data.get('status') == 'no_fresh_referees':
        data['status'] = 'retained_existing_referees'
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')),
                   encoding='utf-8')
    print(f'[fetch_referees] wrote {OUT.name} ({OUT.stat().st_size / 1024:.1f}KB)', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
