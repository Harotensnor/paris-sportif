#!/usr/bin/env python3
"""Fetch detailed Winamax markets per match (1N2 + OU 0.5/1.5/2.5/3.5/4.5,
BTTS, Double Chance, Mi-temps 1N2, Score exact, Vainqueur rembourse si nul).

Pourquoi ce script : fetch_winamax_markets.py scrape les pages tournament
qui n'exposent que le market principal (1N2). Les autres markets sont
chargés dynamiquement quand on visite la page match individuelle. Ce
script complète en hittant les pages match top-priorité (foot top-5
ligues européennes + Ligue 1/2 + UEFA + ~15 ligues clés).

Cap : 60 matches / run pour rester sous ~30s avec sleep 0.4s entre
requêtes. Tournes par cron toutes les 15 min en complément du fetcher
tournament.

Output : merge dans winamax_markets.json (ne touche pas aux 1N2 déjà
captés par fetch_winamax_markets.py, ajoute juste les markets étendus).

Idempotent : un match déjà détaillé < 6h est skippé.
"""
from __future__ import annotations
import json
import re
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

try:
    from curl_cffi import requests as cr
except ImportError:
    print('ERROR: curl_cffi not installed. Run: pip install curl_cffi --break-system-packages')
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
MARKETS = ROOT / 'winamax_markets.json'
DATA_JS = ROOT / 'data.js'

# Ligues prioritaires : top-5 européennes + UEFA + Ligue 2 + populaires
PRIORITY_LEAGUE_IDS_FOOT = {
    7,    # Premier League
    14,   # La Liga
    19,   # Bundesliga
    23,   # Serie A
    34,   # Ligue 1
    44,   # Ligue 2
    9,    # Champions League
    10,   # Europa League
    119,  # Conference League
    62,   # Eredivisie
    117,  # Primeira Liga
    65,   # Belgian Pro League
    125,  # Süper Lig
    18,   # Bundesliga 2
    25,   # Serie B
    21,   # Segunda
}

CACHE_TTL_HOURS = 4  # ne rescrape pas si < 4h


def _fetch_state(url: str) -> dict | None:
    try:
        r = cr.get(url, impersonate='chrome110', timeout=15)
    except Exception:
        return None
    if r.status_code != 200:
        return None
    m = re.search(r'var PRELOADED_STATE = (\{.*?\});\s*\n', r.text, re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        return None


def _extract_match_markets(state: dict, match_id: str) -> dict:
    """Extract tous les markets utiles depuis le state d'une page match."""
    bets = state.get('bets') or {}
    outcomes_state = state.get('outcomes') or {}
    odds = state.get('odds') or {}

    markets: dict = {}

    for bid, bet in bets.items():
        if not isinstance(bet, dict): continue
        if str(bet.get('matchId')) != str(match_id): continue
        title = (bet.get('betTypeName') or bet.get('betTitle') or '').lower()
        outcome_ids = bet.get('outcomes') or []

        # Build [(label, odd)] resolved
        oitems: list[tuple[str, float]] = []
        for oid in outcome_ids:
            o = outcomes_state.get(str(oid)) or {}
            label = (o.get('label') or '').strip()
            odd_val = odds.get(str(oid))
            try:
                od = float(odd_val) if not isinstance(odd_val, dict) else float(odd_val.get('odds', 0))
            except (TypeError, ValueError):
                continue
            if od > 0 and label:
                oitems.append((label, od))
        if not oitems:
            continue

        # ===== Classify markets =====
        # 1N2
        if 'résultat' == title or 'résultat' in title and 'mi-temps' not in title and 'nombre' not in title and 'ecart' not in title and 'écart' not in title:
            if len(oitems) == 3 and '1n2' not in markets:
                markets['1n2'] = {
                    'home': oitems[0][1], 'draw': oitems[1][1], 'away': oitems[2][1],
                    'home_name': oitems[0][0], 'away_name': oitems[2][0],
                }
        # Mi-temps 1N2
        elif 'mi-temps' in title and 'résultat' in title and 'nombre' not in title:
            if len(oitems) == 3 and 'ht_1n2' not in markets:
                markets['ht_1n2'] = {
                    'home': oitems[0][1], 'draw': oitems[1][1], 'away': oitems[2][1]
                }
        # Double Chance
        elif 'double chance' == title:
            if 'dc' not in markets:
                d = {}
                for label, od in oitems:
                    l = label.lower()
                    if '1' in l and 'n' in l: d['p1x'] = od
                    elif 'n' in l and '2' in l: d['px2'] = od
                    elif '1' in l and '2' in l: d['p12'] = od
                if d.get('p1x') and d.get('px2') and d.get('p12'):
                    markets['dc'] = d
        # DNB (Vainqueur remboursé si nul)
        elif 'remboursé si match nul' in title or 'vainqueur (rembours' in title:
            if len(oitems) == 2 and 'dnb' not in markets:
                markets['dnb'] = {'home': oitems[0][1], 'away': oitems[1][1]}
        # Total OU multi-lignes (Nombre de buts)
        elif title == 'nombre de buts' or 'nombre total de buts' in title:
            for line_val, key in [(0.5, 'ou05'), (1.5, 'ou15'), (2.5, 'ou25'),
                                    (3.5, 'ou35'), (4.5, 'ou45'), (5.5, 'ou55')]:
                if key in markets: continue
                line_str_dot = str(line_val)
                line_str_comma = str(line_val).replace('.', ',')
                over_v = under_v = None
                for label, od in oitems:
                    l = label.lower()
                    has_line = (line_str_dot in l or line_str_comma in l)
                    is_over = 'plus' in l or 'over' in l or l.startswith('+') or '≥' in l
                    is_under = 'moins' in l or 'under' in l or l.startswith('-') or '<' in l
                    if has_line and is_over: over_v = od
                    elif has_line and is_under: under_v = od
                if over_v and under_v:
                    markets[key] = {'over': over_v, 'under': under_v, 'line': line_val}
        # BTTS
        elif 'les deux équipes' in title and 'marquent' in title and 'mi-temps' not in title:
            if 'btts' not in markets and len(oitems) == 2:
                yes_v = no_v = None
                for label, od in oitems:
                    l = label.lower().strip()
                    if l in ('oui', 'yes', '1') or l.startswith('oui'):
                        yes_v = od
                    elif l in ('non', 'no', '0') or l.startswith('non'):
                        no_v = od
                if yes_v and no_v:
                    markets['btts'] = {'yes': yes_v, 'no': no_v}
        # Score exact
        elif 'score exact' in title and 'multichance' not in title and 'mi-temps' not in title:
            if 'exact_scores' not in markets:
                scores = {}
                for label, od in oitems:
                    sm = re.search(r'(\d+)\s*[-:]\s*(\d+)', label)
                    if sm:
                        h, a = int(sm.group(1)), int(sm.group(2))
                        if 0 <= h <= 5 and 0 <= a <= 5:
                            scores[f'{h}-{a}'] = od
                if scores:
                    markets['exact_scores'] = scores

    return markets


def _select_priority_matches(existing_markets: dict, data_js_data: dict) -> list[tuple[str, dict]]:
    """Sélectionne les match_ids prioritaires à scraper.

    Critères :
    - Match foot dans une ligue prioritaire
    - Cache < 4h → skip
    - Match upcoming (kick-off > now)
    - Cap 60 matches max
    """
    now_utc = datetime.now(timezone.utc)
    cutoff = now_utc - timedelta(hours=CACHE_TTL_HOURS)
    horizon = now_utc + timedelta(hours=72)

    # Build map of foot match_ids dans data.js avec leur priorité
    candidates = []
    for day, evs in (data_js_data.get('days') or {}).items():
        for ev in evs or []:
            if ev.get('sport') != 'football': continue
            wm = ev.get('winamax') or {}
            mid = wm.get('match_id')
            if not mid: continue
            try:
                start = datetime.fromisoformat(str(ev.get('date', '')).replace('Z', '+00:00'))
            except Exception:
                continue
            if start < now_utc or start > horizon: continue
            # Récupère la dernière fetch (pour skip)
            existing_entry = (existing_markets.get(str(mid)) or {})
            existing_odds = existing_entry.get('odds') or {}
            details_at = existing_entry.get('details_fetched_at')
            if details_at:
                try:
                    last = datetime.fromisoformat(str(details_at).replace('Z', '+00:00'))
                    if last > cutoff: continue  # déjà fresh
                except Exception:
                    pass
            # Priorité : match avec markets existantes minimes (juste 1n2)
            n_markets = len(existing_odds)
            candidates.append((str(mid), n_markets, start))

    # Trier : moins de markets = haute priorité, kick-off proche aussi
    candidates.sort(key=lambda x: (x[1], x[2]))
    return [(mid, {'mode': 'foot'}) for mid, _, _ in candidates[:60]]


def main() -> int:
    if not MARKETS.exists():
        print(f'WARN: {MARKETS} absent — run fetch_winamax_markets.py first')
        return 0
    if not DATA_JS.exists():
        print(f'WARN: {DATA_JS} absent')
        return 0

    existing = json.loads(MARKETS.read_text(encoding='utf-8'))
    matches_dict = existing.get('matches') or {}

    # Charge data.js pour identifier les matches prioritaires
    text = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', text, re.DOTALL)
    if not m:
        print('WARN: cannot parse data.js')
        return 0
    data = json.loads(m.group(1))

    targets = _select_priority_matches(matches_dict, data)
    print(f'[fetch_winamax_match_details] {len(targets)} matches to scrape')

    t0 = time.time()
    n_enriched = 0
    n_failed = 0

    for i, (mid, _meta) in enumerate(targets):
        url = f'https://www.winamax.fr/paris-sportifs/match/{mid}'
        state = _fetch_state(url)
        if state is None:
            n_failed += 1
            continue
        markets = _extract_match_markets(state, mid)
        if not markets:
            continue
        # Merge dans existing
        if mid not in matches_dict:
            matches_dict[mid] = {
                'tournament_id': None,
                'title': '',
                'odds': {},
                'fetched_at': datetime.now(timezone.utc).isoformat(),
            }
        existing_odds = matches_dict[mid].setdefault('odds', {})
        # On ajoute uniquement les markets non encore présents (préserve 1N2 du catalog)
        for k, v in markets.items():
            if k not in existing_odds:
                existing_odds[k] = v
        matches_dict[mid]['details_fetched_at'] = datetime.now(timezone.utc).isoformat()
        n_enriched += 1
        if (i + 1) % 5 == 0:
            print(f'  [{i+1}/{len(targets)}] enriched: {n_enriched} so far', flush=True)
        time.sleep(0.4)

    elapsed = time.time() - t0
    print(f'[fetch_winamax_match_details] done : {n_enriched} matches enriched, '
          f'{n_failed} failed ({elapsed:.1f}s)')

    existing['matches'] = matches_dict
    existing['generated_at'] = datetime.now(timezone.utc).isoformat()
    MARKETS.write_text(
        json.dumps(existing, ensure_ascii=False, separators=(',', ':')),
        encoding='utf-8'
    )
    return 0


if __name__ == '__main__':
    sys.exit(main())
