#!/usr/bin/env python3
"""Scrape Winamax's full state tree in ONE request — THE source of truth for
"what's bookable, at what 1N2 odds, in which tournament".

v28 (2026-04-23) : total rewrite. The old version looped over each tournament
and re-fetched the tournament page (204 requests, often blocked by Winamax
or timing out on GHA, producing an empty catalog). The new version hits
ONLY ``/paris-sportifs/sports/1`` whose ``PRELOADED_STATE`` already contains
the COMPLETE tree : all sports, categories, tournaments, matches, main bets
(= Résultat 1N2), outcomes and odds (decimal). One request, no delays, no
per-tournament fan-out.

Outputs :
  * ``winamax_catalog.json`` — same schema as before (tournament + matches list)
  * ``winamax_markets.json`` — map match_id -> 1N2 odds {home, draw, away}

Consumers :
  * ``patch_winamax.py``         -> reads winamax_catalog.json  (match availability)
  * ``patch_winamax_markets.py`` -> reads winamax_markets.json  (1N2 odds injection)
"""
from __future__ import annotations
import json
import re
import sys
from datetime import datetime
from pathlib import Path

try:
    from curl_cffi import requests as cr
except ImportError:
    print('ERROR: curl_cffi not installed. Run: pip install curl_cffi --break-system-packages')
    sys.exit(1)

ROOT        = Path(__file__).resolve().parent.parent
OUT_CAT     = ROOT / 'winamax_catalog.json'
OUT_MARKETS = ROOT / 'winamax_markets.json'

# Each sport has its own landing page whose PRELOADED_STATE only contains
# THAT sport's tree. The football index does NOT include basket/tennis/etc.
# matches — that was a v28 oversight that meant Théo only saw foot picks
# even though Winamax accepts bets on every sport listed here.
# v30 fix : fetch one page per sport, merge the trees.
SPORTS_OF_INTEREST = {1, 2, 3, 4, 5, 16, 117}  # foot, basket, baseball, hockey, tennis, us-foot, MMA
SPORTS_STR = {str(s) for s in SPORTS_OF_INTEREST}
INDEX_URL_FMT = 'https://www.winamax.fr/paris-sportifs/sports/{sid}'


def fetch_index_state(sport_id: int) -> dict | None:
    """Fetch the PRELOADED_STATE blob for one sport's landing page."""
    url = INDEX_URL_FMT.format(sid=sport_id)
    try:
        r = cr.get(url, impersonate='chrome110', timeout=25)
    except Exception as e:
        print(f'  ERR GET {url}: {e}', flush=True)
        return None
    if r.status_code != 200:
        print(f'  HTTP {r.status_code} on {url}', flush=True)
        return None
    m = re.search(r'var PRELOADED_STATE = (\{.*?\});\s*\n', r.text, re.DOTALL)
    if not m:
        print(f'  no PRELOADED_STATE on sport {sport_id}', flush=True)
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError as e:
        print(f'  JSON decode err sport {sport_id}: {e}', flush=True)
        return None


def fetch_all_states() -> dict:
    """Fetch PRELOADED_STATE for each sport, merge into a single state dict
    with the union of all sports/categories/tournaments/matches/bets/etc.
    Latter-fetched sports overwrite earlier ones on key collisions, but in
    practice IDs are sport-scoped so collisions are rare. We start with the
    football page (largest, most stable) so partial failures still leave us
    with a viable catalog."""
    merged = {
        'sports': {}, 'categories': {}, 'tournaments': {},
        'matches': {}, 'bets': {}, 'outcomes': {}, 'odds': {},
    }
    fetched = []
    for sid in sorted(SPORTS_OF_INTEREST, key=lambda s: 0 if s == 1 else s):
        state = fetch_index_state(sid)
        if not state:
            continue
        fetched.append(sid)
        for k in merged.keys():
            v = state.get(k)
            if isinstance(v, dict):
                merged[k].update(v)
    print(f'  fetched {len(fetched)}/{len(SPORTS_OF_INTEREST)} sport pages: {fetched}', flush=True)
    return merged


def build_outputs(state: dict) -> tuple[dict, dict]:
    """Build both catalog + markets from a single PRELOADED_STATE dict."""
    sports      = state.get('sports')      or {}
    categories  = state.get('categories')  or {}
    tournaments = state.get('tournaments') or {}
    matches     = state.get('matches')     or {}
    bets        = state.get('bets')        or {}
    outcomes    = state.get('outcomes')    or {}
    odds        = state.get('odds')        or {}

    # Build tournament_id -> (sport_id, category_id) lookup by walking sports+categories
    t_parents: dict[str, tuple[str, str]] = {}
    for sid, sport in sports.items():
        if sid not in SPORTS_STR: continue
        if not isinstance(sport, dict): continue
        for cid in sport.get('categories') or []:
            cat = categories.get(str(cid))
            if not isinstance(cat, dict): continue
            for tid in cat.get('tournaments') or []:
                t_parents[str(tid)] = (sid, str(cid))

    # Iterate matches once, bucket by tournament, keep only sports of interest
    t_matches: dict[str, list[dict]] = {}
    for mid, mm in matches.items():
        if not isinstance(mm, dict): continue
        if mm.get('sportId') not in SPORTS_OF_INTEREST: continue
        tid = mm.get('tournamentId')
        if not tid: continue
        title = mm.get('title') or ''
        parts = [p.strip() for p in title.split(' - ', 1)]
        if len(parts) != 2: continue
        t_matches.setdefault(str(tid), []).append({
            'match_id': int(mid),
            'home': parts[0],
            'away': parts[1],
        })

    # Build catalog tournaments list
    out_sports: dict[str, str] = {}
    out_tourns: list[dict] = []
    for tid_str, mlist in t_matches.items():
        parents = t_parents.get(tid_str)
        if not parents: continue
        sid, cid = parents
        t   = tournaments.get(tid_str) or {}
        sport = sports.get(sid) or {}
        cat   = categories.get(cid) or {}
        sport_name = sport.get('sportName') or f'sport{sid}'
        out_sports[sid] = sport_name
        out_tourns.append({
            'sport_id': int(sid),
            'sport_name': sport_name,
            'category_id': int(cid) if cid.isdigit() else None,
            'category_name': cat.get('categoryName') or '?',
            'tournament_id': int(tid_str),
            'tournament_name': t.get('tournamentName') or '?',
            'url': f'https://www.winamax.fr/paris-sportifs/sports/{sid}/{cid}/{tid_str}',
            'match_count': int(t.get('mainMatchCount') or len(mlist)),
            'matches': mlist,
        })

    catalog = {
        'generated_at': datetime.utcnow().isoformat() + 'Z',
        'sports': out_sports,
        'tournaments': out_tourns,
    }

    # Build markets : match_id -> 1N2 from mainBetId (Résultat / Vainqueur)
    markets_by_mid: dict[str, dict] = {}
    for mid, mm in matches.items():
        if not isinstance(mm, dict): continue
        if mm.get('sportId') not in SPORTS_OF_INTEREST: continue
        mbid = mm.get('mainBetId')
        if not mbid: continue
        b = bets.get(str(mbid))
        if not isinstance(b, dict): continue
        btn = b.get('betTypeName') or ''
        if btn not in ('Résultat', 'Vainqueur', 'Résultat final', 'Vainqueur du match'):
            continue
        oids = b.get('outcomes') or []
        if len(oids) not in (2, 3): continue
        vals = []
        for oid in oids:
            o = outcomes.get(str(oid)) or {}
            od = odds.get(str(oid))
            try:
                od = float(od) if od is not None else None
            except (TypeError, ValueError):
                od = None
            vals.append((o.get('label') or '', od))
        mkt_1n2: dict = {}
        # Persist the selection labels (home_name/away_name) alongside the
        # odds. patch_winamax_markets._align_markets_to_espn needs them to
        # detect when Winamax stored its 'home' selection under what is
        # actually ESPN's away competitor (frequent on tennis where the
        # favorite is listed first regardless of match-title order).
        # Without these labels the alignment is a no-op and we surface
        # absurd edges like Arthur Fils @6.00 vs Nava on clay.
        if len(vals) == 3 and all(v[1] for v in vals):
            mkt_1n2 = {
                'home': vals[0][1], 'draw': vals[1][1], 'away': vals[2][1],
                'home_name': vals[0][0], 'away_name': vals[2][0],
            }
        elif len(vals) == 2 and all(v[1] for v in vals):
            mkt_1n2 = {
                'home': vals[0][1], 'away': vals[1][1],
                'home_name': vals[0][0], 'away_name': vals[1][0],
            }
        if not mkt_1n2: continue
        markets_by_mid[str(mid)] = {
            'tournament_id': mm.get('tournamentId'),
            'title': mm.get('title'),
            'odds': {'1n2': mkt_1n2},
            'fetched_at': datetime.utcnow().isoformat() + 'Z',
        }

    markets = {
        'generated_at': datetime.utcnow().isoformat() + 'Z',
        'matches': markets_by_mid,
    }
    return catalog, markets


def main() -> int:
    # AUDIT-2026-04-27 (Sprint 39 #31) — Adoption logger structuré.
    try:
        from _log import log
    except ImportError:
        def log(s, lvl, msg, data=None):
            print(f'[{lvl}] [{s}] {msg}' + (f' ({data})' if data else ''), flush=True)
    log('fetch_winamax_catalog', 'info', 'starting v30 multi-sport scrape')
    state = fetch_all_states()
    if not state.get('matches'):
        log('fetch_winamax_catalog', 'error', 'no matches retrieved, keeping previous files unchanged')
        return 1
    catalog, markets = build_outputs(state)
    n_tourns = len(catalog['tournaments'])
    n_matches = sum(len(t['matches']) for t in catalog['tournaments'])
    n_markets = len(markets['matches'])
    # Per-sport breakdown for debug.
    by_sport: dict[str, int] = {}
    for t in catalog['tournaments']:
        sn = t.get('sport_name', '?')
        by_sport[sn] = by_sport.get(sn, 0) + len(t.get('matches') or [])
    print(f'  catalog: {n_tourns} tournaments, {n_matches} matches', flush=True)
    print(f'  by sport: {by_sport}', flush=True)
    print(f'  markets: {n_markets} matches with 1N2 odds', flush=True)
    # Sanity guard : Winamax sometimes returns 200 with a partial PRELOADED_STATE
    # (Cloudflare soft-block, preloader not yet hydrated). The result is a
    # valid but near-empty catalog that, when written, erases a healthy one
    # and makes the whole downstream patch_winamax drop today's matches.
    # We keep whatever is on disk if the fresh payload looks suspicious.
    if n_tourns < 10 or n_matches < 50:
        print('  SUSPICIOUS (below safety threshold) — keeping previous files unchanged')
        return 1
    OUT_CAT.write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    OUT_MARKETS.write_text(json.dumps(markets, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'  wrote {OUT_CAT.name} ({OUT_CAT.stat().st_size/1024:.1f}KB) + {OUT_MARKETS.name} ({OUT_MARKETS.stat().st_size/1024:.1f}KB)', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
