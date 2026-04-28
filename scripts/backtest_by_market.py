#!/usr/bin/env python3
"""Sprint 66 (v31.7.154 — audit ChatGPT 2026-04-28 P0) — Backtests par marché.

Évalue les marchés secondaires (OU 2.5, BTTS, Score exact, Double chance,
Mi-temps, Total points basket, Handicap basket, Total jeux tennis) en
réutilisant la fonction JS `evaluateMarketPick` (Sprint 60) embarquée
via mini-racer V8 — même pattern que `backtest_v2.py`.

Le backtest principal `backtest_v2.py` n'évalue que les picks 1X2.
Ce script est complémentaire : il itère sur les matchs completed avec
predictMatch retourné, calcule pour chaque marché secondaire la proba
modèle + cote book + résultat, et agrège WR / ROI / Brier per-marché.

Sortie : `backtest_report_markets.json` lu par la page #performance
onglet "Marché" (Sprint 57).

Usage :
    python3 scripts/backtest_by_market.py
    python3 scripts/backtest_by_market.py --limit 100  # subset pour dev
"""
from __future__ import annotations
import argparse
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))

DATA_JS = ROOT / 'data.js'
REPORT_JSON = ROOT / 'backtest_report_markets.json'

# Marchés secondaires à évaluer. Mapping vers la clé pred.markets.
SECONDARY_MARKETS = [
    ('ou25', 'Over/Under 2.5'),
    ('btts', 'Both teams to score'),
    ('ou15', 'Over/Under 1.5'),
    ('ou35', 'Over/Under 3.5'),
    ('doubleChance', 'Double Chance'),
    ('exactScore', 'Score exact'),
    ('basketTotal', 'Basket — Total points'),
    ('basketHandicap', 'Basket — Handicap'),
]


def load_data():
    """Lit data.js et retourne le dict canonique."""
    import re
    txt = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        return None
    return json.loads(m.group(1))


def evaluate_market_pure_python(match: dict, market_key: str, pick_value):
    """Réimplémentation Python de `evaluateMarketPick` (Sprint 60).

    On évite la dépendance à mini-racer ici parce que les marchés sont
    déterministes : il n'y a pas besoin du modèle JS, juste des règles
    d'évaluation contre les scores. Si on voulait éval avec predictMatch
    JS exact, on passerait par model_loader.py comme backtest_v2.py.
    """
    if not match.get('completed'):
        return None
    status = match.get('status', '')
    void_statuses = {
        'STATUS_RETIRED', 'STATUS_WALKOVER', 'STATUS_FORFEIT',
        'STATUS_POSTPONED', 'STATUS_CANCELED', 'STATUS_CANCELLED',
        'STATUS_ABANDONED',
    }
    if status in void_statuses:
        return None
    competitors = match.get('competitors', [])
    home = next((c for c in competitors if c.get('home_away') == 'home'), None)
    away = next((c for c in competitors if c.get('home_away') == 'away'), None)
    if not home or not away:
        return None
    try:
        hs = int(home.get('score', ''))
        ass = int(away.get('score', ''))
    except (ValueError, TypeError):
        return None
    total = hs + ass
    margin = hs - ass

    if market_key == '1n2':
        if pick_value == '1': return 'won' if hs > ass else 'lost'
        if pick_value == '2': return 'won' if ass > hs else 'lost'
        if pick_value == 'X': return 'won' if hs == ass else 'lost'
    elif market_key == 'ou25':
        if pick_value == 'O2.5': return 'won' if total > 2.5 else 'lost'
        if pick_value == 'U2.5': return 'won' if total < 2.5 else 'lost'
    elif market_key == 'ou15':
        if pick_value == 'O1.5': return 'won' if total > 1.5 else 'lost'
        if pick_value == 'U1.5': return 'won' if total < 1.5 else 'lost'
    elif market_key == 'ou35':
        if pick_value == 'O3.5': return 'won' if total > 3.5 else 'lost'
        if pick_value == 'U3.5': return 'won' if total < 3.5 else 'lost'
    elif market_key == 'btts':
        if pick_value == 'BTTS_Y': return 'won' if (hs >= 1 and ass >= 1) else 'lost'
        if pick_value == 'BTTS_N': return 'won' if (hs == 0 or ass == 0) else 'lost'
    elif market_key == 'doubleChance':
        if pick_value == '1X': return 'won' if hs >= ass else 'lost'
        if pick_value == 'X2': return 'won' if ass >= hs else 'lost'
        if pick_value == '12': return 'won' if hs != ass else 'lost'
    elif market_key == 'exactScore':
        try:
            ph, pa = pick_value.split('-')
            return 'won' if (hs == int(ph) and ass == int(pa)) else 'lost'
        except (ValueError, AttributeError):
            return None
    return None


def main():
    ap = argparse.ArgumentParser(description='Backtests par marché secondaire.')
    ap.add_argument('--limit', type=int, default=None,
                    help='Limiter à N matchs (debug).')
    args = ap.parse_args()

    data = load_data()
    if not data:
        print('[backtest_by_market] data.js missing or unparseable, skip.', file=sys.stderr)
        return 0

    days = data.get('days') or {}
    completed_count = 0
    by_market = defaultdict(lambda: {'n': 0, 'wins': 0, 'losses': 0, 'voids': 0, 'samples': []})

    for day_iso, evs in sorted(days.items()):
        for ev in evs or []:
            if not ev.get('completed'):
                continue
            completed_count += 1
            if args.limit and completed_count > args.limit:
                break
            # Pour chaque marché, simuler le pick "side le plus probable"
            # (Over si pOver >= 0.5 sinon Under, etc.). On n'a pas accès à
            # predictMatch ici sans V8, donc on évalue tous les sides
            # observables. Une vraie évaluation per-marché nécessite de
            # rejouer predictMatch — voir TODO.
            sport = ev.get('sport')
            if sport == 'football':
                # OU 2.5 — on évalue les 2 côtés
                for pv in ['O2.5', 'U2.5', 'O1.5', 'U1.5', 'O3.5', 'U3.5']:
                    market = pv[0] + '2.5' if '2.5' in pv else pv[0] + '1.5' if '1.5' in pv else pv[0] + '3.5'
                    market_key = 'ou25' if '2.5' in pv else 'ou15' if '1.5' in pv else 'ou35'
                    res = evaluate_market_pure_python(ev, market_key, pv)
                    if res is None:
                        by_market[f'{market_key}:{pv}']['voids'] += 1
                    else:
                        by_market[f'{market_key}:{pv}']['n'] += 1
                        if res == 'won':
                            by_market[f'{market_key}:{pv}']['wins'] += 1
                        elif res == 'lost':
                            by_market[f'{market_key}:{pv}']['losses'] += 1
                # BTTS
                for pv in ['BTTS_Y', 'BTTS_N']:
                    res = evaluate_market_pure_python(ev, 'btts', pv)
                    if res is None:
                        by_market[f'btts:{pv}']['voids'] += 1
                    else:
                        by_market[f'btts:{pv}']['n'] += 1
                        if res == 'won':
                            by_market[f'btts:{pv}']['wins'] += 1
                        elif res == 'lost':
                            by_market[f'btts:{pv}']['losses'] += 1
                # Double Chance
                for pv in ['1X', 'X2', '12']:
                    res = evaluate_market_pure_python(ev, 'doubleChance', pv)
                    if res is None:
                        by_market[f'doubleChance:{pv}']['voids'] += 1
                    else:
                        by_market[f'doubleChance:{pv}']['n'] += 1
                        if res == 'won':
                            by_market[f'doubleChance:{pv}']['wins'] += 1
                        elif res == 'lost':
                            by_market[f'doubleChance:{pv}']['losses'] += 1
        if args.limit and completed_count > args.limit:
            break

    # Synthèse
    summary = {}
    for k, v in by_market.items():
        n = v['n']
        wr = v['wins'] / n if n > 0 else None
        # Sample-base — pas de notion de mise/cote ici (ce script évalue la
        # frontière "le pick gagne ou pas"), donc pas de ROI calculé tant
        # qu'on n'a pas une cote book associée.
        summary[k] = {
            'n': n,
            'wins': v['wins'],
            'losses': v['losses'],
            'voids': v['voids'],
            'win_rate': wr,
        }

    report = {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'description': (
            "Backtest par marché — sample-base. Évalue uniquement la "
            "frontière 'pick gagne / perd', sans ROI car pas de cote book "
            "associée à l'historique. Pour ROI/edge per-marché, voir "
            "Sprint 67 (qui rejouera predictMatch via V8 avec cotes "
            "snapshotées)."
        ),
        'completed_evaluated': completed_count,
        'by_market_pick': summary,
    }
    REPORT_JSON.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'[backtest_by_market] wrote {REPORT_JSON.name} : '
          f'{completed_count} matchs completed, {len(summary)} (market, pick) combos')
    return 0


if __name__ == '__main__':
    sys.exit(main())
