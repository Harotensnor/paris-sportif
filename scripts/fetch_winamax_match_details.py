#!/usr/bin/env python3
"""Fetch detailed Winamax markets per match.

v35 — Terminal Value Winamax:
  - cover all exact Winamax sports seen in data.js, not only football;
  - keep legacy odds keys (ou25, btts, dnb...) for the existing UI;
  - add normalized arrays (ou, handicap, team_total, tennis_games...) so the
    frontend can scan every exact market without guessing bookmaker odds.

Pourquoi ce script : fetch_winamax_markets.py scrape les pages tournament
qui n'exposent que le market principal (1N2). Les autres markets sont
chargés dynamiquement quand on visite la page match individuelle. Ce
script complète en hittant les pages match top-priorité (foot top-5
ligues européennes + Ligue 1/2 + UEFA + ~15 ligues clés).

Cap : per-sport quotas + global cap to stay inside GitHub Actions. Matches
inside 48h are scraped first, then the rest of the 7-day horizon.

Output : merge dans winamax_markets.json (ne touche pas aux 1N2 déjà
captés par fetch_winamax_markets.py, ajoute juste les markets étendus).

Idempotent : un match déjà détaillé < 6h est skippé.
"""
from __future__ import annotations
import json
import re
import sys
import time
import os
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

CACHE_TTL_HOURS = float(os.environ.get('WINAMAX_DETAILS_TTL_HOURS', '4'))
GLOBAL_CAP = int(os.environ.get('WINAMAX_DETAILS_CAP', '180'))
SLEEP_SECONDS = float(os.environ.get('WINAMAX_DETAILS_SLEEP', '0.25'))

SPORT_QUOTAS = {
    'football': 110,
    'tennis': 40,
    'basketball': 35,
    'baseball': 25,
    'hockey': 20,
    'mma': 10,
    'americanfootball': 5,
}

SPORT_PRIORITY = {
    'football': 0,
    'basketball': 1,
    'tennis': 2,
    'baseball': 3,
    'hockey': 4,
    'mma': 5,
    'americanfootball': 6,
}


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


def _odd_value(odds: dict, oid: str) -> float | None:
    odd_val = odds.get(str(oid))
    try:
        return float(odd_val) if not isinstance(odd_val, dict) else float(odd_val.get('odds', 0))
    except (TypeError, ValueError):
        return None


def _parse_decimal(text: str) -> float | None:
    m = re.search(r'([+-]?\d+(?:[,.]\d+)?)', text or '')
    if not m:
        return None
    try:
        return float(m.group(1).replace(',', '.'))
    except ValueError:
        return None


def _selection_side(label: str, home_name: str = '', away_name: str = '') -> str | None:
    l = (label or '').lower()
    if 'match nul' in l or l.strip() in {'nul', 'n'}:
        return 'draw'
    def toks(s: str) -> set[str]:
        s = re.sub(r'[^a-z0-9]+', ' ', (s or '').lower())
        return {x for x in s.split() if len(x) >= 3}
    lt = toks(label)
    ht = toks(home_name)
    at = toks(away_name)
    if ht and (lt & ht) and not (lt & at):
        return 'home'
    if at and (lt & at) and not (lt & ht):
        return 'away'
    return None


def _append_market(markets: dict, key: str, row: dict) -> None:
    if not row or not row.get('odd') or row.get('odd') <= 1:
        return
    row.setdefault('source', 'winamax_detail')
    markets.setdefault(key, []).append(row)


def _add_ou_rows(markets: dict, key: str, title: str, oitems: list[tuple[str, float]]) -> None:
    for label, od in oitems:
        l = label.lower()
        side = None
        if 'plus' in l or 'over' in l or l.startswith('+'):
            side = 'over'
        elif 'moins' in l or 'under' in l or l.startswith('-'):
            side = 'under'
        line = _parse_decimal(label)
        if side and line is not None:
            _append_market(markets, key, {
                'market': key,
                'line': line,
                'side': side,
                'odd': od,
                'label': label,
                'title': title,
            })


def _add_handicap_rows(markets: dict, key: str, title: str, oitems: list[tuple[str, float]], home_name: str, away_name: str) -> None:
    for label, od in oitems:
        line = _parse_decimal(label)
        side = _selection_side(label, home_name, away_name)
        if side in ('home', 'away') and line is not None:
            _append_market(markets, key, {
                'market': key,
                'line': line,
                'side': side,
                'odd': od,
                'label': label,
                'title': title,
            })


def _extract_match_markets(state: dict, match_id: str) -> dict:
    """Extract tous les markets utiles depuis le state d'une page match."""
    bets = state.get('bets') or {}
    matches = state.get('matches') or {}
    outcomes_state = state.get('outcomes') or {}
    odds = state.get('odds') or {}

    markets: dict = {}
    match_obj = matches.get(str(match_id)) or {}
    sport_id = str(match_obj.get('sportId') or match_obj.get('sport_id') or '')
    match_title = match_obj.get('title') or ''
    home_name = ''
    away_name = ''
    if ' - ' in match_title:
        home_name, away_name = [x.strip() for x in match_title.split(' - ', 1)]

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
            od = _odd_value(odds, str(oid))
            if od is not None and od > 0 and label:
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
                for side, (label, od) in zip(('home', 'draw', 'away'), oitems):
                    _append_market(markets, 'match_winner', {
                        'market': '1n2', 'side': side, 'odd': od, 'label': label, 'title': bet.get('betTypeName') or ''
                    })
        elif title in ('vainqueur', 'vainqueur du match') or title == 'résultat final':
            if len(oitems) == 2 and '1n2' not in markets:
                markets['1n2'] = {
                    'home': oitems[0][1], 'away': oitems[1][1],
                    'home_name': oitems[0][0], 'away_name': oitems[1][0],
                }
                for side, (label, od) in zip(('home', 'away'), oitems):
                    _append_market(markets, 'match_winner', {
                        'market': '1n2', 'side': side, 'odd': od, 'label': label, 'title': bet.get('betTypeName') or ''
                    })
        # Mi-temps 1N2
        elif 'mi-temps' in title and 'résultat' in title and 'nombre' not in title:
            if len(oitems) == 3 and 'ht_1n2' not in markets:
                markets['ht_1n2'] = {
                    'home': oitems[0][1], 'draw': oitems[1][1], 'away': oitems[2][1]
                }
                for side, (label, od) in zip(('home', 'draw', 'away'), oitems):
                    _append_market(markets, 'ht_1n2_rows', {
                        'market': 'ht_1n2', 'side': side, 'odd': od, 'label': label, 'title': bet.get('betTypeName') or ''
                    })
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
            for label, od in oitems:
                l = label.lower()
                side = None
                if ('1' in l and 'n' in l) or ('match nul' in l and home_name and home_name.lower().split()[0] in l):
                    side = '1X'
                elif ('n' in l and '2' in l) or ('match nul' in l and away_name and away_name.lower().split()[0] in l):
                    side = 'X2'
                elif '1' in l and '2' in l:
                    side = '12'
                if side:
                    _append_market(markets, 'double_chance', {
                        'market': 'double_chance', 'side': side, 'odd': od, 'label': label, 'title': bet.get('betTypeName') or ''
                    })
        # DNB (Vainqueur remboursé si nul)
        elif 'remboursé si match nul' in title or 'vainqueur (rembours' in title:
            if len(oitems) == 2 and 'dnb' not in markets:
                markets['dnb'] = {'home': oitems[0][1], 'away': oitems[1][1]}
            for label, od in oitems:
                side = _selection_side(label, home_name, away_name)
                if side in ('home', 'away'):
                    _append_market(markets, 'dnb_rows', {
                        'market': 'dnb', 'side': side, 'odd': od, 'label': label, 'title': bet.get('betTypeName') or ''
                    })
        # Total OU multi-lignes (Nombre de buts)
        elif title == 'nombre de buts' or 'nombre total de buts' in title:
            _add_ou_rows(markets, 'ou', bet.get('betTypeName') or '', oitems)
            if sport_id in ('4', '14'):
                _add_ou_rows(markets, 'hockey_total', bet.get('betTypeName') or '', oitems)
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
        elif title.startswith('nombre de buts de '):
            team_label = (bet.get('betTypeName') or '').split(' de ', 1)[-1].strip()
            for label, od in oitems:
                side = 'home' if _selection_side(team_label, home_name, away_name) == 'home' else 'away' if _selection_side(team_label, home_name, away_name) == 'away' else None
                l = label.lower()
                ou_side = 'over' if 'plus' in l or 'over' in l else 'under' if 'moins' in l or 'under' in l else None
                line = _parse_decimal(label)
                if side and ou_side and line is not None:
                    _append_market(markets, 'team_total', {
                        'market': 'team_total', 'team': side, 'side': ou_side,
                        'line': line, 'odd': od, 'label': label, 'title': bet.get('betTypeName') or ''
                    })
        # BTTS
        elif (('les deux équipes' in title or 'les 2 équipes' in title) and 'marquent' in title and 'mi-temps' not in title):
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
            for label, od in oitems:
                l = label.lower().strip()
                side = 'yes' if l.startswith('oui') or l == 'yes' else 'no' if l.startswith('non') or l == 'no' else None
                if side:
                    _append_market(markets, 'btts_rows', {
                        'market': 'btts', 'side': side, 'odd': od, 'label': label, 'title': bet.get('betTypeName') or ''
                    })
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
                    for key, od in scores.items():
                        _append_market(markets, 'exact_score_rows', {
                            'market': 'exact_score', 'score': key, 'side': key, 'odd': od,
                            'label': key, 'title': bet.get('betTypeName') or ''
                        })

        # Result + BTTS combo
        elif 'résultat et les deux' in title and 'marquent' in title:
            for label, od in oitems:
                l = label.lower()
                result = _selection_side(label, home_name, away_name)
                if 'match nul' in l:
                    result = 'draw'
                btts_side = 'yes' if 'oui' in l else 'no' if 'non' in l else None
                if result and btts_side:
                    _append_market(markets, 'result_btts', {
                        'market': 'result_btts', 'result': result, 'btts': btts_side,
                        'side': f'{result}_{btts_side}', 'odd': od, 'label': label,
                        'title': bet.get('betTypeName') or ''
                    })

        # Generic totals by sport
        if title == 'nombre de points':
            _add_ou_rows(markets, 'basket_total', bet.get('betTypeName') or '', oitems)
        elif title.startswith('nombre de points de '):
            _add_ou_rows(markets, 'basket_team_total', bet.get('betTypeName') or '', oitems)
        elif 'écart de buts' in title and 'handicap' in title:
            _add_handicap_rows(
                markets,
                'puck_line' if sport_id in ('4', '14') else 'handicap',
                bet.get('betTypeName') or '',
                oitems,
                home_name,
                away_name,
            )
        elif 'écart de points' in title and 'handicap' in title:
            _add_handicap_rows(markets, 'basket_handicap', bet.get('betTypeName') or '', oitems, home_name, away_name)
        elif title == 'nombre de runs':
            _add_ou_rows(markets, 'baseball_total', bet.get('betTypeName') or '', oitems)
        elif 'écart de runs' in title and 'handicap' in title:
            _add_handicap_rows(markets, 'run_line', bet.get('betTypeName') or '', oitems, home_name, away_name)
        elif title == 'nombre de jeux':
            _add_ou_rows(markets, 'tennis_games', bet.get('betTypeName') or '', oitems)
        elif 'écart de jeux' in title:
            _add_handicap_rows(markets, 'tennis_handicap', bet.get('betTypeName') or '', oitems, home_name, away_name)
        elif title == 'nombre de rounds':
            _add_ou_rows(markets, 'mma_rounds', bet.get('betTypeName') or '', oitems)
        elif 'combat va à son terme' in title:
            for label, od in oitems:
                l = label.lower()
                side = 'yes' if l.startswith('oui') else 'no' if l.startswith('non') else None
                if side:
                    _append_market(markets, 'mma_goes_distance', {
                        'market': 'mma_goes_distance', 'side': side, 'odd': od,
                        'label': label, 'title': bet.get('betTypeName') or ''
                    })

    return markets


def _select_priority_matches(existing_markets: dict, data_js_data: dict) -> list[tuple[str, dict]]:
    """Sélectionne les match_ids prioritaires à scraper.

    Critères :
    - Match exact Winamax dans un sport supporté
    - Cache < 4h → skip
    - Match upcoming (kick-off > now)
    - Horizon 7j, priorité <48h
    """
    now_utc = datetime.now(timezone.utc)
    cutoff = now_utc - timedelta(hours=CACHE_TTL_HOURS)
    hot_horizon = now_utc + timedelta(hours=48)
    horizon = now_utc + timedelta(days=7)

    quotas = dict(SPORT_QUOTAS)
    candidates = []
    for day, evs in (data_js_data.get('days') or {}).items():
        for ev in evs or []:
            sport = ev.get('sport') or ''
            if sport not in SPORT_QUOTAS:
                continue
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
            n_markets = len(existing_odds)
            hot = 0 if start <= hot_horizon else 1
            candidates.append((str(mid), {
                'sport': sport,
                'n_markets': n_markets,
                'start': start,
                'hot': hot,
                'mode': 'exact',
            }))

    seen = set()
    uniq = []
    for mid, meta in candidates:
        if mid in seen:
            continue
        seen.add(mid)
        uniq.append((mid, meta))
    uniq.sort(key=lambda x: (
        x[1]['hot'],
        SPORT_PRIORITY.get(x[1]['sport'], 99),
        x[1]['n_markets'],
        x[1]['start'],
    ))
    selected = []
    for mid, meta in uniq:
        sport = meta['sport']
        if quotas.get(sport, 0) <= 0:
            continue
        selected.append((mid, meta))
        quotas[sport] -= 1
        if len(selected) >= GLOBAL_CAP:
            break
    return selected


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
        time.sleep(SLEEP_SECONDS)

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
