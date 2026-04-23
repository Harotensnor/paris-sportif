#!/usr/bin/env python3
"""Scrape Winamax tournament pages for match-level multi-market odds.

Runs AFTER ``fetch_winamax_catalog.py``. For each tournament discovered by
the catalog, re-hit the tournament URL, extract ``PRELOADED_STATE`` and
pull out the bets+odds trees for each match. We keep only the markets we
care about : 1N2, Over/Under 2.5 buts, BTTS (Yes/No).

Output : ``winamax_markets.json`` at repo root.

Schema::

    {
      "generated_at": "2026-04-23T21:20:00Z",
      "matches": {
        "<winamax_match_id>": {
          "tournament_id": 12345,
          "home": "Real Madrid",
          "away": "Athletic Bilbao",
          "odds": {
            "1n2":  { "home": 1.65, "draw": 3.80, "away": 4.50 },
            "ou25": { "over": 1.85, "under": 1.95, "line": 2.5 },
            "btts": { "yes": 1.72, "no": 2.05 }
          },
          "fetched_at": "2026-04-23T21:19:55Z"
        }
      }
    }

Resilient : any match/tournament that fails extraction is simply skipped.
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

ROOT     = Path(__file__).resolve().parent.parent
CATALOG  = ROOT / 'winamax_catalog.json'
OUT      = ROOT / 'winamax_markets.json'

# Names we match case-insensitively against Winamax bet titles to classify markets.
MARKET_KEYWORDS_1N2  = ['résultat du match', 'vainqueur du match', 'winner', 'résultat final']
MARKET_KEYWORDS_OU25 = ['plus/moins', 'more/less', 'over/under', 'plus de buts', 'moins de buts']
MARKET_KEYWORDS_BTTS = ['les deux équipes marquent', 'both teams to score', 'marqueront']


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
    except json.JSONDecodeError:
        return None


def _match_keyword(title: str, keywords: list[str]) -> bool:
    t = (title or '').lower()
    return any(k in t for k in keywords)


def extract_markets_from_state(state: dict) -> dict[str, dict]:
    """Walk the PRELOADED_STATE and extract 1N2/OU25/BTTS odds per match.

    Winamax structure (as of 2026-04) :
      state['matches']  : { match_id: { title, tournamentId, mainBetId, betIds: [...] } }
      state['bets']     : { bet_id: { title, oddIds: [...], marketId, typeId, matchId } }
      state['odds']     : { odd_id: { title, odds: 1.65, betId, selectionId } }

    Returns : { str(match_id): { '1n2': {...}, 'ou25': {...}, 'btts': {...} } }
    """
    matches = state.get('matches') or {}
    bets    = state.get('bets')    or {}
    odds    = state.get('odds')    or {}

    out: dict[str, dict] = {}

    for mid, mobj in matches.items():
        if not isinstance(mobj, dict):
            continue
        bet_ids = mobj.get('betIds') or []
        if not bet_ids:
            main_id = mobj.get('mainBetId')
            if main_id:
                bet_ids = [main_id]
        if not bet_ids:
            continue

        markets: dict[str, dict] = {}

        for bid in bet_ids:
            bet = bets.get(str(bid))
            if not isinstance(bet, dict):
                continue
            btitle = bet.get('title') or bet.get('name') or ''
            odd_ids = bet.get('oddIds') or []
            # Build ordered list of (title, decimal_odd)
            oitems: list[tuple[str, float]] = []
            for oid in odd_ids:
                o = odds.get(str(oid))
                if not isinstance(o, dict):
                    continue
                ot = o.get('title') or o.get('label') or ''
                od = o.get('odds')
                try:
                    od = float(od)
                except (TypeError, ValueError):
                    continue
                if od > 0:
                    oitems.append((ot, od))
            if not oitems:
                continue

            # Classify. 1N2 : 3 odds matching home/draw/away titles.
            if _match_keyword(btitle, MARKET_KEYWORDS_1N2) and '1n2' not in markets:
                # Winamax sort est souvent : home, draw, away (foot) ou home, away (2-way)
                if len(oitems) == 3:
                    markets['1n2'] = {'home': oitems[0][1], 'draw': oitems[1][1], 'away': oitems[2][1]}
                elif len(oitems) == 2:
                    markets['1n2'] = {'home': oitems[0][1], 'away': oitems[1][1]}

            # Over/Under 2.5 : titre du bet mentionne buts et line 2.5
            if _match_keyword(btitle, MARKET_KEYWORDS_OU25) and 'ou25' not in markets:
                # Chercher les selections "Plus de 2" ou "2.5" et "Moins de 2" / "2.5"
                over_val = under_val = None
                for ot, od in oitems:
                    otl = ot.lower()
                    if '2,5' in otl or '2.5' in otl or '2,5 buts' in otl:
                        if 'plus' in otl or 'over' in otl or '+' in otl:
                            over_val = od
                        elif 'moins' in otl or 'under' in otl:
                            under_val = od
                if over_val and under_val:
                    markets['ou25'] = {'over': over_val, 'under': under_val, 'line': 2.5}

            # BTTS — 2 selections Yes/No
            if _match_keyword(btitle, MARKET_KEYWORDS_BTTS) and 'btts' not in markets:
                yes_val = no_val = None
                for ot, od in oitems:
                    otl = ot.lower()
                    if 'oui' in otl or 'yes' in otl:
                        yes_val = od
                    elif 'non' in otl or 'no' in otl:
                        no_val = od
                if yes_val and no_val:
                    markets['btts'] = {'yes': yes_val, 'no': no_val}

        if markets:
            out[str(mid)] = {
                'tournament_id': mobj.get('tournamentId'),
                'title': mobj.get('title'),
                'odds': markets,
                'fetched_at': datetime.utcnow().isoformat() + 'Z',
            }

    return out


def main() -> int:
    if not CATALOG.exists():
        print(f'ERROR: {CATALOG} absent. Run fetch_winamax_catalog.py first.')
        return 1
    catalog = json.loads(CATALOG.read_text(encoding='utf-8'))
    tournaments = catalog.get('tournaments') or []
    if not tournaments:
        print('WARN: catalog has no tournaments — nothing to scrape.')
        OUT.write_text(json.dumps({'generated_at': datetime.utcnow().isoformat() + 'Z', 'matches': {}}), encoding='utf-8')
        return 0

    t0 = time.time()
    print(f'[{datetime.now():%H:%M:%S}] fetch_winamax_markets: {len(tournaments)} tournaments', flush=True)

    all_matches: dict[str, dict] = {}
    for i, t in enumerate(tournaments):
        if t.get('match_count', 0) == 0:
            continue
        url = t.get('url')
        if not url:
            continue
        state = fetch_state(url)
        if not state:
            continue
        extracted = extract_markets_from_state(state)
        for mid, mk in extracted.items():
            all_matches[mid] = mk
        if (i + 1) % 10 == 0:
            print(f'  [{i+1}/{len(tournaments)}] processed, running total: {len(all_matches)} matches with markets', flush=True)
        time.sleep(0.4)  # politesse

    elapsed = time.time() - t0
    print(f'[{datetime.now():%H:%M:%S}] Done: {len(all_matches)} matches with markets ({elapsed:.1f}s)', flush=True)

    OUT.write_text(
        json.dumps({
            'generated_at': datetime.utcnow().isoformat() + 'Z',
            'matches': all_matches,
        }, ensure_ascii=False, separators=(',', ':')),
        encoding='utf-8',
    )
    print(f'  wrote {OUT} ({OUT.stat().st_size / 1024:.1f}KB)', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
