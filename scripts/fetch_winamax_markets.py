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
import os
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
# v30 — keyword set widened. Earlier code only matched a tiny subset and
# winamax_markets.json was systematically generating 0 OU/BTTS markets despite
# Winamax exposing them on ~all foot tournaments. Specifically:
#  - "Total de buts (3-way)", "Nombre de buts", "Total de buts" all carry
#    plus/moins selections we want.
#  - BTTS shows up as "Les deux équipes vont-elles marquer ?" or
#    "Les deux équipes marquent (Oui/Non)" or just "BTTS".
# We also log unmatched bet titles when WX_MARKETS_DEBUG=1 so future drift
# is fixable from one Action run.
MARKET_KEYWORDS_1N2  = [
    'résultat du match', 'résultat final', 'vainqueur du match',
    'vainqueur', 'winner', '1n2',
]
MARKET_KEYWORDS_OU25 = [
    'plus/moins', 'plus / moins', 'more/less', 'over/under',
    'plus de buts', 'moins de buts',
    'total de buts', 'nombre de buts', 'nombre total de buts',
    'plus de 2', 'moins de 2',
]
MARKET_KEYWORDS_BTTS = [
    'les deux équipes marquent',
    'les deux équipes vont marquer',
    'les deux équipes vont-elles marquer',
    'les 2 équipes marquent',
    'les 2 équipes vont marquer',
    'both teams to score',
    'marqueront', 'btts',
]


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
                # Winamax orders the selections as it pleases — sometimes the
                # match title order, sometimes favorite-first. We can't infer
                # ESPN home/away from the index alone, so we also persist the
                # selection labels (player/team names). patch_winamax_markets
                # then resolves home/away by matching those labels against ESPN.
                if len(oitems) == 3:
                    markets['1n2'] = {
                        'home': oitems[0][1], 'draw': oitems[1][1], 'away': oitems[2][1],
                        'home_name': oitems[0][0], 'away_name': oitems[2][0],
                    }
                elif len(oitems) == 2:
                    markets['1n2'] = {
                        'home': oitems[0][1], 'away': oitems[1][1],
                        'home_name': oitems[0][0], 'away_name': oitems[1][0],
                    }

            # Over/Under 2.5 : titre du bet mentionne buts/total et line 2.5.
            # v30 — match accepts "+2.5", "Plus 2,5", "Over 2.5", "Plus de 2,5",
            # "More 2.5 goals" et "≥3 buts" / "<3 buts" via le code suffix
            # parsing (Winamax marche aussi avec ces formes-là sur certains
            # tournois exotiques).
            if _match_keyword(btitle, MARKET_KEYWORDS_OU25) and 'ou25' not in markets:
                over_val = under_val = None
                for ot, od in oitems:
                    otl = ot.lower()
                    has_25 = ('2,5' in otl or '2.5' in otl)
                    is_over  = ('plus' in otl or 'over' in otl or 'more' in otl
                                or otl.startswith('+') or '≥' in otl or '≥3' in otl)
                    is_under = ('moins' in otl or 'under' in otl or 'less' in otl
                                or otl.startswith('-') or '<' in otl)
                    if has_25 and is_over:  over_val = od
                    elif has_25 and is_under: under_val = od
                if over_val and under_val:
                    markets['ou25'] = {'over': over_val, 'under': under_val, 'line': 2.5}

            # BTTS — 2 selections Yes/No.
            # v30 — accept additional French variants: "Oui"/"Non", "Yes"/"No"
            # and also "1"/"0" (Winamax sometimes uses bare bool labels).
            if _match_keyword(btitle, MARKET_KEYWORDS_BTTS) and 'btts' not in markets:
                yes_val = no_val = None
                for ot, od in oitems:
                    otl = ot.lower().strip()
                    if otl in ('oui', 'yes', '1', 'vrai', 'true') or otl.startswith('oui ') or otl.startswith('yes '):
                        yes_val = od
                    elif otl in ('non', 'no', '0', 'faux', 'false') or otl.startswith('non ') or otl.startswith('no '):
                        no_val = od
                if yes_val and no_val:
                    markets['btts'] = {'yes': yes_val, 'no': no_val}

            # Debug: log unmatched bet titles so future drift can be diagnosed
            # from a single CI run. Set WX_MARKETS_DEBUG=1 in the workflow env
            # to enable.
            if os.environ.get('WX_MARKETS_DEBUG') == '1':
                if (not _match_keyword(btitle, MARKET_KEYWORDS_1N2)
                    and not _match_keyword(btitle, MARKET_KEYWORDS_OU25)
                    and not _match_keyword(btitle, MARKET_KEYWORDS_BTTS)):
                    print(f'  [skip-bet] {btitle!r} ({len(oitems)} sel)', flush=True)

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
        # v31.7.211 — Ne PAS écraser un markets.json existant qui contiendrait
        # les 1N2 du catalog. Sortir cleanly.
        return 0

    # v31.7.211 — BUG FIX : depuis le refactor SPA Winamax (~Q4 2025), les
    # pages tournoi servent un PRELOADED_STATE squelettique sans bet titles
    # ni oddIds peuplés. Ce script extrait donc 0 OU/BTTS sur >99% des
    # tournois. AVANT ce fix il ÉCRASAIT le markets.json (qui contient les
    # 1N2 produits par fetch_winamax_catalog.py) avec un dict vide → l'agent
    # se retrouvait sans cotes 1N2 du tout. MAINTENANT on MERGE : on lit
    # l'existant, on n'écrase une entrée existante que si la nouvelle
    # contient strictement plus de markets (pas juste un 1N2 redondant).
    existing: dict[str, dict] = {}
    if OUT.exists():
        try:
            existing_data = json.loads(OUT.read_text(encoding='utf-8'))
            existing = existing_data.get('matches') or {}
        except Exception as e:
            print(f'  WARN: failed to read existing {OUT.name}: {e}', flush=True)
            existing = {}
    print(f'  preserving {len(existing)} existing matches with markets (from catalog 1N2)', flush=True)

    t0 = time.time()
    print(f'[{datetime.now():%H:%M:%S}] fetch_winamax_markets: {len(tournaments)} tournaments', flush=True)

    extracted_matches: dict[str, dict] = {}
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
            extracted_matches[mid] = mk
        if (i + 1) % 10 == 0:
            print(f'  [{i+1}/{len(tournaments)}] processed, running total: {len(extracted_matches)} matches with markets', flush=True)
        time.sleep(0.4)  # politesse

    elapsed = time.time() - t0
    print(f'[{datetime.now():%H:%M:%S}] Scraped: {len(extracted_matches)} matches with extracted markets ({elapsed:.1f}s)', flush=True)

    # v31.7.211 — Merge strategy : start with existing (catalog 1N2),
    # overlay extracted (which may add ou25/btts to a match's odds dict).
    merged: dict[str, dict] = {}
    n_added_ou25 = n_added_btts = n_kept = 0
    for mid, mk in existing.items():
        merged[mid] = mk
        n_kept += 1
    for mid, ext_mk in extracted_matches.items():
        ext_odds = ext_mk.get('odds') or {}
        if mid in merged:
            # Merge odds dicts : keep existing keys, add new ones.
            cur_odds = merged[mid].setdefault('odds', {})
            for k, v in ext_odds.items():
                if k not in cur_odds:
                    cur_odds[k] = v
                    if k == 'ou25': n_added_ou25 += 1
                    elif k == 'btts': n_added_btts += 1
            merged[mid]['fetched_at'] = ext_mk.get('fetched_at') or merged[mid].get('fetched_at')
        else:
            # Brand new match — but only persist if it actually has odds.
            if ext_odds:
                merged[mid] = ext_mk
                if 'ou25' in ext_odds: n_added_ou25 += 1
                if 'btts' in ext_odds: n_added_btts += 1

    print(f'  merge complete : {len(merged)} total matches '
          f'(+{n_added_ou25} ou25, +{n_added_btts} btts added to existing)', flush=True)

    OUT.write_text(
        json.dumps({
            'generated_at': datetime.utcnow().isoformat() + 'Z',
            'matches': merged,
        }, ensure_ascii=False, separators=(',', ':')),
        encoding='utf-8',
    )
    print(f'  wrote {OUT} ({OUT.stat().st_size / 1024:.1f}KB)', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
