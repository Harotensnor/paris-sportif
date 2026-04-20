#!/usr/bin/env python3
"""Scrape Winamax's public catalog — THE source of truth for "is it bookable?"

Output: ``winamax_catalog.json`` at repo root, consumed by ``patch_winamax.py``.

Winamax injects its full match catalog into ``var PRELOADED_STATE = {...}``
on every ``/paris-sportifs/...`` page. curl_cffi with Chrome impersonation
bypasses the 403 that plain urllib/requests hits.

Schema::

    {
      "generated_at": "2026-04-20T17:45:00Z",
      "sports": {                # sport_id -> sport name
        "1": "Football", "5": "Tennis", ...
      },
      "tournaments": [           # list of tournaments currently accepting bets
        {
          "sport_id": 5,
          "sport_name": "Tennis",
          "category_id": 3,
          "category_name": "ATP",
          "tournament_id": 175543,
          "tournament_name": "Madrid",
          "url": "https://www.winamax.fr/paris-sportifs/sports/5/3/175543",
          "match_count": 22,
          "matches": [
            {"match_id": 70965902, "home": "Nuno Borges",
             "away": "Mariano Navone"}
          ]
        },
        ...
      ]
    }
"""
from __future__ import annotations
import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path

try:
    from curl_cffi import requests as cr
except ImportError:
    print('ERROR: curl_cffi not installed. Run: pip install curl_cffi --break-system-packages')
    sys.exit(1)

OUT = Path(__file__).resolve().parent.parent / 'winamax_catalog.json'
BASE = 'https://www.winamax.fr/paris-sportifs'

# Sports we care about. Winamax exposes more (cyclisme, darts...) but these are
# the ones that intersect with our ESPN pipeline.
SPORTS_OF_INTEREST = [1, 2, 3, 4, 5, 16, 117]  # foot, basket, baseball, hockey, tennis, football us, MMA


def fetch_state(url: str) -> dict | None:
    """Hit a Winamax page, extract PRELOADED_STATE as a dict."""
    try:
        r = cr.get(url, impersonate='chrome110', timeout=20)
    except Exception as e:
        print(f'  ERR {url}: {e}', flush=True)
        return None
    if r.status_code != 200:
        print(f'  HTTP {r.status_code} for {url}', flush=True)
        return None
    m = re.search(r'var PRELOADED_STATE = (\{.*?\});\s*\n', r.text, re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError as e:
        print(f'  JSON decode err for {url}: {e}', flush=True)
        return None


def collect_catalog() -> dict:
    """Walk every sport → every category → every tournament, collecting matches."""
    t0 = time.time()
    print(f'[{datetime.now():%H:%M:%S}] Winamax catalog scrape', flush=True)

    # A single home page load gives us the global sport/category/tournament index.
    index = fetch_state(f'{BASE}/sports/1')
    if not index:
        print('  FAILED to load index — aborting')
        return {}

    sports_d = index.get('sports') or {}
    cats_d = index.get('categories') or {}
    tourns_d = index.get('tournaments') or {}

    out_sports: dict[str, str] = {}
    out_tourns: list[dict] = []

    # Walk each sport of interest
    for sid_int in SPORTS_OF_INTEREST:
        sid = str(sid_int)
        sport = sports_d.get(sid)
        if not sport:
            print(f'  skip sport {sid} (not in index)')
            continue
        sport_name = sport.get('sportName') or f'sport{sid}'
        out_sports[sid] = sport_name
        cat_ids = sport.get('categories') or []
        print(f'  sport {sid} {sport_name!r}: {len(cat_ids)} categories', flush=True)

        for cid in cat_ids:
            cat = cats_d.get(str(cid)) or {}
            cat_name = cat.get('categoryName') or '?'
            for tid in cat.get('tournaments') or []:
                t = tourns_d.get(str(tid)) or {}
                t_name = t.get('tournamentName') or '?'
                main_cnt = int(t.get('mainMatchCount') or 0)
                tourn_url = f'{BASE}/sports/{sid}/{cid}/{tid}'
                matches: list[dict] = []
                # Only fetch match detail if there are actual main matches to bet
                if main_cnt > 0:
                    page = fetch_state(tourn_url)
                    if page:
                        for mid, mobj in (page.get('matches') or {}).items():
                            # Keep only matches in THIS tournament (the page
                            # can surface matches from other tournaments in
                            # "related" sections).
                            if str(mobj.get('tournamentId')) != str(tid):
                                continue
                            # title format: "Home - Away"
                            title = mobj.get('title') or ''
                            parts = [p.strip() for p in title.split(' - ')]
                            if len(parts) != 2:
                                continue
                            matches.append({
                                'match_id': int(mid),
                                'home': parts[0],
                                'away': parts[1],
                            })
                    time.sleep(0.4)  # be polite
                out_tourns.append({
                    'sport_id': sid_int,
                    'sport_name': sport_name,
                    'category_id': cid,
                    'category_name': cat_name,
                    'tournament_id': tid,
                    'tournament_name': t_name,
                    'url': tourn_url,
                    'match_count': main_cnt,
                    'matches': matches,
                })

    elapsed = time.time() - t0
    total_matches = sum(len(t['matches']) for t in out_tourns)
    print(f'[{datetime.now():%H:%M:%S}] Done: {len(out_tourns)} tournaments, '
          f'{total_matches} individual matches ({elapsed:.1f}s)', flush=True)
    return {
        'generated_at': datetime.utcnow().isoformat() + 'Z',
        'sports': out_sports,
        'tournaments': out_tourns,
    }


def main() -> int:
    catalog = collect_catalog()
    if not catalog:
        return 1
    OUT.write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')),
                   encoding='utf-8')
    print(f'  wrote {OUT} ({OUT.stat().st_size / 1024:.1f}KB)', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
