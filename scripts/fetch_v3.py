#!/usr/bin/env python3
"""Enhanced fetch v3: massive league coverage + real moneyline odds from core endpoint."""
import json
import sys
import urllib.request
import urllib.error
from datetime import date, datetime, timedelta
import concurrent.futures
import os
import time
from pathlib import Path

DATA_JS = str(Path(__file__).resolve().parent.parent / 'data.js')

# ---------------------------------------------------------------------------
# League registry
# ---------------------------------------------------------------------------
SOCCER_LEAGUES = [
    # Tier 1
    ('fra.1', 'Ligue 1', 'France', 5),
    ('eng.1', 'Premier League', 'Angleterre', 5),
    ('esp.1', 'La Liga', 'Espagne', 5),
    ('ita.1', 'Serie A', 'Italie', 5),
    ('ger.1', 'Bundesliga', 'Allemagne', 5),
    # Continental
    ('uefa.champions', 'Champions League', 'Europe', 5),
    ('uefa.europa', 'Europa League', 'Europe', 4),
    ('uefa.europa.conf', 'Conference League', 'Europe', 3),
    ('uefa.nations', 'Nations League', 'Europe', 4),
    ('uefa.super', 'Supercoupe UEFA', 'Europe', 3),
    ('conmebol.libertadores', 'Copa Libertadores', 'Am. Sud', 4),
    ('conmebol.sudamericana', 'Copa Sudamericana', 'Am. Sud', 3),
    ('afc.champions', 'AFC Champions League', 'Asie', 3),
    ('caf.champions', 'CAF Champions League', 'Afrique', 3),
    # Tier 2
    ('fra.2', 'Ligue 2', 'France', 3),
    ('eng.2', 'Championship', 'Angleterre', 3),
    ('eng.3', 'League One', 'Angleterre', 2),
    ('eng.4', 'League Two', 'Angleterre', 2),
    ('ger.2', 'Bundesliga 2', 'Allemagne', 3),
    ('esp.2', 'La Liga 2', 'Espagne', 3),
    ('ita.2', 'Serie B', 'Italie', 2),
    # Other Europe
    ('ned.1', 'Eredivisie', 'Pays-Bas', 3),
    ('por.1', 'Primeira Liga', 'Portugal', 3),
    ('tur.1', 'Süper Lig', 'Turquie', 3),
    ('bel.1', 'Pro League', 'Belgique', 3),
    ('sco.1', 'Scottish Premiership', 'Écosse', 3),
    ('aut.1', 'Bundesliga Autriche', 'Autriche', 2),
    ('sui.1', 'Super League Suisse', 'Suisse', 2),
    ('gre.1', 'Super League Grèce', 'Grèce', 2),
    ('swe.1', 'Allsvenskan', 'Suède', 2),
    ('nor.1', 'Eliteserien', 'Norvège', 2),
    ('pol.1', 'Ekstraklasa', 'Pologne', 2),
    ('cze.1', 'Chance Liga', 'Tchéquie', 2),
    ('rou.1', 'Liga I', 'Roumanie', 2),
    ('ukr.1', 'Premier League Ukraine', 'Ukraine', 2),
    ('rus.1', 'Premier League Russie', 'Russie', 2),
    # Americas
    ('usa.1', 'MLS', 'États-Unis', 3),
    ('mex.1', 'Liga MX', 'Mexique', 3),
    ('bra.1', 'Brasileirão', 'Brésil', 3),
    ('arg.1', 'Primera Argentine', 'Argentine', 3),
    ('col.1', 'Liga Colombie', 'Colombie', 2),
    ('chi.1', 'Liga Chili', 'Chili', 2),
    ('uru.1', 'Primera Uruguay', 'Uruguay', 2),
    ('per.1', 'Liga Pérou', 'Pérou', 2),
    ('ecu.1', 'Liga Équateur', 'Équateur', 2),
    ('par.1', 'Primera Paraguay', 'Paraguay', 2),
    ('ven.1', 'Primera Venezuela', 'Venezuela', 2),
    # Asia / Oceania
    ('jpn.1', 'J-League', 'Japon', 3),
    ('kor.1', 'K-League', 'Corée', 2),
    ('chn.1', 'Chinese Super League', 'Chine', 2),
    ('aus.1', 'A-League', 'Australie', 2),
    ('idn.1', 'Liga Indonésie', 'Indonésie', 1),
    ('tha.1', 'Thai League', 'Thaïlande', 1),
    ('ind.1', 'Indian Super League', 'Inde', 1),
    # Other European
    ('dan.1', 'Superliga Danemark', 'Danemark', 2),
    ('hun.1', 'NB I Hongrie', 'Hongrie', 1),
    ('isr.1', 'Ligat ha\'Al', 'Israël', 1),
    ('cro.1', 'HNL Croatie', 'Croatie', 2),
    ('ser.1', 'SuperLiga Serbie', 'Serbie', 2),
    ('slo.1', 'PrvaLiga Slovénie', 'Slovénie', 1),
    ('fin.1', 'Veikkausliiga', 'Finlande', 1),
    ('bul.1', 'First League Bulgarie', 'Bulgarie', 1),
    # Cups
    ('esp.copa_del_rey', 'Copa del Rey', 'Espagne', 3),
    ('eng.fa', 'FA Cup', 'Angleterre', 4),
    ('eng.league_cup', 'EFL Cup', 'Angleterre', 3),
    ('fra.coupe_de_france', 'Coupe de France', 'France', 4),
    ('ita.coppa_italia', 'Coppa Italia', 'Italie', 3),
    ('ger.dfb_pokal', 'DFB-Pokal', 'Allemagne', 3),
    ('por.taca', 'Taça de Portugal', 'Portugal', 2),
    ('ned.knvb_beker', 'KNVB Beker', 'Pays-Bas', 2),
]

BASKET_LEAGUES = [
    ('basketball', 'nba', 'NBA', 'États-Unis', 5),
    ('basketball', 'wnba', 'WNBA', 'États-Unis', 3),
    ('basketball', 'nba-development', 'NBA G League', 'États-Unis', 2),
    ('basketball', 'mens-college-basketball', 'NCAA M.', 'États-Unis', 2),
    ('basketball', 'womens-college-basketball', 'NCAA F.', 'États-Unis', 2),
    ('basketball', 'nbl', 'NBL (Australie)', 'Australie', 2),
    ('basketball', 'fiba', 'FIBA', 'International', 3),
]

OTHER_LEAGUES = [
    # (sport, league, display, country, priority)
    # Hockey — ESPN coverage: NHL + NCAA only (no KHL/SHL/Liiga coverage)
    ('hockey', 'nhl', 'NHL', 'Am. Nord', 5),
    ('hockey', 'mens-college-hockey', 'NCAA Hockey M.', 'États-Unis', 2),
    ('hockey', 'womens-college-hockey', 'NCAA Hockey F.', 'États-Unis', 1),
    # v30 — baseball restored: Winamax exposes 3 baseball tournaments
    # (~28 matches) but without ESPN context the model can't price them
    # → no edge surfaces. Adding ESPN MLB/MiLB unlocks the catalog match
    # so baseball matchups get a 1n2 prediction and join the pool of
    # parisable events.
    ('baseball', 'mlb', 'MLB', 'États-Unis', 4),
    ('baseball', 'milb', 'MiLB', 'États-Unis', 1),
    ('football', 'nfl', 'NFL', 'États-Unis', 5),
    ('football', 'college-football', 'NCAAF', 'États-Unis', 3),
    ('mma', 'ufc', 'UFC', 'International', 4),
    ('racing', 'f1', 'Formule 1', 'International', 4),
    ('golf', 'pga', 'PGA Tour', 'International', 3),
    ('golf', 'lpga', 'LPGA Tour', 'International', 2),
    ('lacrosse', 'pll', 'PLL', 'États-Unis', 1),
]

TENNIS_LEAGUES = [('atp', 'ATP'), ('wta', 'WTA')]

# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------
def fetch_json(url, timeout=20):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        if e.code == 429:
            print(f'  [rate-limit] ESPN 429 on {url}', flush=True, file=sys.stderr)
        else:
            print(f'  HTTP {e.code} on {url}: {e.reason}', flush=True, file=sys.stderr)
        return {'_err': f'HTTP {e.code}', '_status': e.code}
    except Exception as e:
        return {'_err': str(e)}


def safe_get(d, *keys, default=None):
    cur = d
    for k in keys:
        if cur is None: return default
        if isinstance(cur, dict): cur = cur.get(k)
        else: return default
    return cur if cur is not None else default


# ---------------------------------------------------------------------------
# Event shaping
# ---------------------------------------------------------------------------
def compact_competitor(c):
    t = c.get('team') or {}
    leaders = c.get('leaders') or []
    return {
        'id': t.get('id'),
        'name': t.get('displayName') or t.get('name'),
        'short': t.get('shortDisplayName'),
        'abbr': t.get('abbreviation'),
        'logo': t.get('logo'),
        'color': t.get('color'),
        'home_away': c.get('homeAway'),
        'score': c.get('score'),
        'winner': c.get('winner'),
        'records': [
            {'name': r.get('name'), 'summary': r.get('summary'), 'type': r.get('type')}
            for r in (c.get('records') or [])
        ],
        'form': c.get('form'),
        'rank': c.get('curatedRank', {}).get('current') if isinstance(c.get('curatedRank'), dict) else None,
        'leaders': [
            {
                'cat': (L.get('displayName') or L.get('name')),
                'stat': safe_get(L, 'leaders', 0, 'displayValue'),
                'player': safe_get(L, 'leaders', 0, 'athlete', 'displayName'),
            }
            for L in leaders[:3]
        ],
    }


def compact_odds(odds_list):
    if not odds_list: return []
    out = []
    for o in odds_list:
        if not o: continue
        try:
            out.append({
                'provider': safe_get(o, 'provider', 'name'),
                'details': o.get('details'),
                'overUnder': o.get('overUnder'),
                'spread': o.get('spread'),
                'homeML': safe_get(o, 'homeTeamOdds', 'moneyLine'),
                'awayML': safe_get(o, 'awayTeamOdds', 'moneyLine'),
                'drawML': safe_get(o, 'drawOdds', 'moneyLine'),
                'homeFav': safe_get(o, 'homeTeamOdds', 'favorite'),
                'awayFav': safe_get(o, 'awayTeamOdds', 'favorite'),
            })
        except Exception:
            pass
    return out


def merge_odds(existing, additional):
    """Merge odds lists, preferring entries with ML data. De-dupe by provider."""
    by_prov = {}
    for o in list(existing) + list(additional):
        key = (o.get('provider') or 'unknown').lower()
        if key not in by_prov:
            by_prov[key] = o
        else:
            cur = by_prov[key]
            # Prefer the one with more ML info
            cur_ml = sum(1 for k in ('homeML','awayML','drawML') if cur.get(k) is not None)
            new_ml = sum(1 for k in ('homeML','awayML','drawML') if o.get(k) is not None)
            if new_ml > cur_ml:
                by_prov[key] = o
    return list(by_prov.values())


def enrich_event_odds(event, sport_slug, league_code):
    """Fetch detailed odds from core endpoint if existing odds lack ML data."""
    existing = event.get('odds') or []
    # Check if ANY existing provider has full ML data
    has_full_ml = any(
        (o.get('homeML') is not None and o.get('awayML') is not None) for o in existing
    )
    if has_full_ml:
        return existing  # already good enough
    eid = event.get('id')
    if not eid: return existing
    # Try different sport path mappings for the core endpoint
    sport_map = {
        'football': 'soccer',  # ESPN: soccer
        'basketball': 'basketball',
        'baseball': 'baseball',
        'hockey': 'hockey',
        'american-football': 'football',
    }
    sport_path = sport_map.get(sport_slug, sport_slug)
    url = f'https://sports.core.api.espn.com/v2/sports/{sport_path}/leagues/{league_code}/events/{eid}/competitions/{eid}/odds?limit=20'
    data = fetch_json(url, timeout=10)
    if data.get('_err'):
        return existing
    more = compact_odds(data.get('items') or [])
    if not more: return existing
    return merge_odds(existing, more)


def extract_scorers(comp, sport):
    """Pull goal-scorer events out of `competition.details[]` (foot only).

    ESPN's scoreboard already inlines `details` once a match is completed;
    each entry has a `type.text` we filter on for goal-related events. The
    `athletesInvolved` array gives us the player(s); for own goals we keep
    the type so the UI can label it. Silent-empty when the endpoint hasn't
    populated this yet (early kick-off, niche league).
    """
    if sport != 'football':
        return []
    if not safe_get(comp, 'status', 'type', 'completed', default=False):
        return []
    out = []
    for d in (comp.get('details') or []):
        try:
            t = d.get('type') or {}
            t_text = (t.get('text') or t.get('name') or '').lower()
            # ESPN soccer event types: "Goal", "Penalty Goal", "Own Goal".
            # Free kicks counted as goals (type.text == 'Free Kick Goal') too.
            if 'goal' not in t_text:
                continue
            athletes = d.get('athletesInvolved') or []
            team_id = str(safe_get(d, 'team', 'id', default=''))
            clock = d.get('clock') or {}
            minute = clock.get('displayValue') if isinstance(clock, dict) else None
            for a in athletes:
                name = a.get('displayName') or a.get('name')
                if not name:
                    continue
                out.append({
                    'name': name,
                    'team_id': team_id,
                    'minute': minute,
                    'type': t.get('text') or 'Goal',
                })
        except Exception:
            continue
    return out


def compact_event(e, league_code, league_name, league_country, sport, priority=3, sport_path='soccer'):
    comp = (e.get('competitions') or [{}])[0]
    competitors = comp.get('competitors') or []
    notes = comp.get('notes') or []
    broadcasts = comp.get('broadcasts') or []
    scorers = extract_scorers(comp, sport)
    return {
        'id': e.get('id'),
        'date': e.get('date'),
        'name': e.get('name'),
        'shortName': e.get('shortName'),
        'status': safe_get(e, 'status', 'type', 'name'),
        'detail': safe_get(e, 'status', 'type', 'detail'),
        'completed': safe_get(comp, 'status', 'type', 'completed', default=False),
        'venue': safe_get(comp, 'venue', 'fullName'),
        'city': safe_get(comp, 'venue', 'address', 'city'),
        'country': safe_get(comp, 'venue', 'address', 'country'),
        'attendance': comp.get('attendance'),
        'neutralSite': comp.get('neutralSite'),
        'notes': [n.get('headline') or n.get('type') for n in notes if n],
        'broadcasts': [safe_get(b, 'names', 0) for b in broadcasts if safe_get(b, 'names', 0)],
        'competitors': [compact_competitor(c) for c in competitors],
        'odds': compact_odds(comp.get('odds') or []),
        'league_code': league_code,
        'league_name': league_name,
        'league_country': league_country,
        'league_priority': priority,
        'sport': sport,
        '_sport_path': sport_path,  # internal for odds enrichment
        'scorers': scorers,  # v30: foot-only goal scorers (when match is completed)
    }


# ---------------------------------------------------------------------------
# Per-sport fetchers
# ---------------------------------------------------------------------------
def fetch_soccer_day(d):
    ymd = d.strftime('%Y%m%d')
    out = []
    urls = [(code, name, country, pri,
             f'https://site.api.espn.com/apis/site/v2/sports/soccer/{code}/scoreboard?dates={ymd}')
            for code, name, country, pri in SOCCER_LEAGUES]
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
        futs = {ex.submit(fetch_json, url): (code, name, country, pri) for code, name, country, pri, url in urls}
        for f in concurrent.futures.as_completed(futs):
            code, name, country, pri = futs[f]
            data = f.result()
            if data.get('_err'): continue
            for e in data.get('events', []):
                out.append(compact_event(e, code, name, country, 'football', pri, 'soccer'))
    return out


def fetch_basket_day(d):
    ymd = d.strftime('%Y%m%d')
    out = []
    urls = [(code, name, country, pri,
             f'https://site.api.espn.com/apis/site/v2/sports/{sport}/{code}/scoreboard?dates={ymd}')
            for sport, code, name, country, pri in BASKET_LEAGUES]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
        futs = {ex.submit(fetch_json, url): (code, name, country, pri) for code, name, country, pri, url in urls}
        for f in concurrent.futures.as_completed(futs):
            code, name, country, pri = futs[f]
            data = f.result()
            if data.get('_err'): continue
            for e in data.get('events', []):
                out.append(compact_event(e, code, name, country, 'basketball', pri, 'basketball'))
    return out


def fetch_other_day(d):
    ymd = d.strftime('%Y%m%d')
    out = []
    urls = [(sport, code, name, country, pri,
             f'https://site.api.espn.com/apis/site/v2/sports/{sport}/{code}/scoreboard?dates={ymd}')
            for sport, code, name, country, pri in OTHER_LEAGUES]
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(fetch_json, url): (sport, code, name, country, pri) for sport, code, name, country, pri, url in urls}
        for f in concurrent.futures.as_completed(futs):
            sport, code, name, country, pri = futs[f]
            data = f.result()
            if data.get('_err'): continue
            for e in data.get('events', []):
                # Skip "stage" / series wrappers that have no competitors (e.g. F1 race weekends)
                comps = safe_get(e, 'competitions', 0, 'competitors') or []
                sport_display = {
                    'hockey': 'hockey',
                    'baseball': 'baseball',
                    'football': 'american-football',
                    'mma': 'mma',
                    'racing': 'racing',
                    'golf': 'golf',
                    'lacrosse': 'lacrosse',
                }.get(sport, sport)
                out.append(compact_event(e, code, name, country, sport_display, pri, sport))
    return out


def fetch_tennis_day(d):
    ymd = d.strftime('%Y%m%d')
    out = []
    urls = [(code, name, f'https://site.api.espn.com/apis/site/v2/sports/tennis/{code}/scoreboard?dates={ymd}')
            for code, name in TENNIS_LEAGUES]
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
        futs = {ex.submit(fetch_json, url): (code, name) for code, name, url in urls}
        for f in concurrent.futures.as_completed(futs):
            code, name = futs[f]
            data = f.result()
            if data.get('_err'): continue
            for tourney in data.get('events', []):
                tname = tourney.get('name') or tourney.get('shortName') or name
                tcity = safe_get(tourney, 'addresses', 0, 'city') or safe_get(tourney, 'venues', 0, 'address', 'city')
                surface = safe_get(tourney, 'competitionType', 'text') or None
                for grouping in tourney.get('groupings', []):
                    # 'grouping.displayName' is the draw (e.g., "Men's Singles"),
                    # 'grouping.slug' is the machine-readable form ('mens-singles', 'mens-doubles'…)
                    draw_name = safe_get(grouping, 'grouping', 'displayName', default='') or \
                                safe_get(grouping, 'grouping', 'name', default='')
                    draw_slug = safe_get(grouping, 'grouping', 'slug', default='') or ''
                    for comp in grouping.get('competitions', []):
                        # The ACTUAL round (e.g., "Qualifying 1st Round", "Round of 64") lives on
                        # competition.round, not on grouping. Pull both: `round` = round name
                        # (authoritative for quali detection), `draw` = singles/doubles/mixed.
                        round_name = safe_get(comp, 'round', 'displayName', default='') or draw_name
                        competitors = comp.get('competitors') or []
                        athletes = []
                        for c in competitors:
                            ath = c.get('athlete') or {}
                            athletes.append({
                                'id': ath.get('id'),
                                'name': ath.get('displayName'),
                                'short': ath.get('shortName'),
                                'abbr': ath.get('shortName'),
                                'logo': safe_get(ath, 'flag', 'href') if isinstance(ath.get('flag'), dict) else None,
                                'country': safe_get(ath, 'flag', 'alt') or ath.get('citizenship'),
                                'home_away': None,
                                'score': c.get('score'),
                                'winner': c.get('winner'),
                                'records': [],
                                'form': None,
                                'rank': ath.get('seed') or c.get('order'),
                            })
                        out.append({
                            'id': comp.get('id'),
                            'date': comp.get('date'),
                            'name': comp.get('name') or ' vs '.join([a['name'] or '?' for a in athletes]),
                            'shortName': comp.get('shortName'),
                            'status': safe_get(comp, 'status', 'type', 'name'),
                            'detail': safe_get(comp, 'status', 'type', 'detail'),
                            'completed': safe_get(comp, 'status', 'type', 'completed', default=False),
                            'venue': safe_get(comp, 'venue', 'fullName'),
                            'city': tcity,
                            'competitors': athletes,
                            'odds': compact_odds(comp.get('odds') or []),
                            'league_code': code,
                            'league_name': tname,
                            'league_country': tcity or '',
                            'league_priority': 4,
                            'sport': 'tennis',
                            'round': round_name,
                            'draw': draw_slug,  # 'mens-singles', 'womens-singles', 'mens-doubles', ...
                            'surface': surface,
                            '_sport_path': 'tennis',
                        })
    return out


# ---------------------------------------------------------------------------
# Odds enrichment stage
# ---------------------------------------------------------------------------
def enrich_odds_batch(events):
    """For any event without full ML data, fetch the core odds endpoint."""
    to_enrich = []
    for ev in events:
        if ev.get('completed'):
            continue  # skip finished; odds no longer meaningful
        existing = ev.get('odds') or []
        has_full = any(
            (o.get('homeML') is not None and o.get('awayML') is not None) for o in existing
        )
        if not has_full:
            to_enrich.append(ev)

    if not to_enrich:
        return 0

    def one(ev):
        eid = ev.get('id')
        if not eid: return ev, None
        sport_path = ev.get('_sport_path') or 'soccer'
        code = ev.get('league_code')
        url = f'https://sports.core.api.espn.com/v2/sports/{sport_path}/leagues/{code}/events/{eid}/competitions/{eid}/odds?limit=20'
        data = fetch_json(url, timeout=10)
        if data.get('_err'): return ev, None
        return ev, compact_odds(data.get('items') or [])

    enriched = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as ex:
        for ev, more in ex.map(one, to_enrich):
            if more:
                ev['odds'] = merge_odds(ev.get('odds') or [], more)
                if any((o.get('homeML') is not None and o.get('awayML') is not None) for o in ev['odds']):
                    enriched += 1
    return enriched


# ---------------------------------------------------------------------------
# Standings
# ---------------------------------------------------------------------------
def fetch_standings():
    standings = {}
    codes = [l[0] for l in SOCCER_LEAGUES]
    def one(code):
        url = f'https://site.api.espn.com/apis/v2/sports/soccer/{code}/standings'
        return code, fetch_json(url)
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        for code, data in ex.map(one, codes):
            if data.get('_err'): continue
            entries = safe_get(data, 'children', 0, 'standings', 'entries') or safe_get(data, 'standings', 'entries') or []
            if not entries and data.get('children'):
                for ch in data['children']:
                    entries = safe_get(ch, 'standings', 'entries')
                    if entries: break
            compact = []
            for e in (entries or []):
                team = e.get('team') or {}
                stats = {s.get('name') or s.get('abbreviation'): s.get('displayValue') for s in (e.get('stats') or []) if s.get('name') or s.get('abbreviation')}
                compact.append({
                    'team_id': team.get('id'),
                    'team': team.get('displayName') or team.get('name'),
                    'abbr': team.get('abbreviation'),
                    'rank': stats.get('rank') or stats.get('Rank'),
                    'games': stats.get('gamesPlayed') or stats.get('GP'),
                    'wins': stats.get('wins') or stats.get('W'),
                    'draws': stats.get('ties') or stats.get('D'),
                    'losses': stats.get('losses') or stats.get('L'),
                    'points': stats.get('points') or stats.get('P') or stats.get('PTS'),
                    'gf': stats.get('pointsFor') or stats.get('GF'),
                    'ga': stats.get('pointsAgainst') or stats.get('GA'),
                    'gd': stats.get('pointDifferential') or stats.get('GD'),
                })
            standings[code] = compact
    return standings


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    # Today is resolved dynamically so cron runs always regenerate for the current
    # day. The hardcoded fallback is only used if system clock is somehow broken.
    today = date.today()
    days = [today + timedelta(days=i) for i in range(-2, 8)]
    result = {
        'generated_at': datetime.utcnow().isoformat() + 'Z',
        'today': today.strftime('%Y-%m-%d'),
        'days': {},
        'standings': {},
    }
    t0 = time.time()
    for d in days:
        key = d.strftime('%Y-%m-%d')
        print(f'Fetching {key}...', flush=True)
        events = []
        events.extend(fetch_soccer_day(d))
        events.extend(fetch_basket_day(d))
        events.extend(fetch_other_day(d))
        events.extend(fetch_tennis_day(d))
        print(f'  -> {len(events)} events (base)', flush=True)
        # Only enrich odds for today and tomorrow (core endpoint is slow)
        if d <= today + timedelta(days=1):
            n_en = enrich_odds_batch(events)
            print(f'  enriched odds for {n_en} events', flush=True)
        # Strip internal helper field
        for ev in events:
            ev.pop('_sport_path', None)
        result['days'][key] = events

    print('Fetching standings...', flush=True)
    result['standings'] = fetch_standings()
    print(f'  -> {len(result["standings"])} leagues', flush=True)

    with open(DATA_JS, 'w', encoding='utf-8') as f:
        f.write('window.PRONOSTICS_DATA = ')
        json.dump(result, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')

    total = sum(len(v) for v in result['days'].values())
    size = os.path.getsize(DATA_JS)
    dt = time.time() - t0
    print(f'\nTotal events: {total}')
    print(f'data.js: {size/1024:.1f} KB  (in {dt:.1f}s)')


if __name__ == '__main__':
    main()
