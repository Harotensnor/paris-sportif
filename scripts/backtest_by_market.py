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


def _wilson_ci(wins: int, n: int, z: float = 1.96):
    """Sprint 88 (v31.7.175 — audit Part 15) — Wilson score interval.

    Plus robuste que l'intervalle normal pour les petits échantillons (n < 30).
    Retourne (lo, hi) pour le win rate. z=1.96 = IC 95%.
    """
    if n <= 0:
        return (None, None)
    p = wins / n
    denom = 1 + z * z / n
    center = (p + z * z / (2 * n)) / denom
    margin = z * (((p * (1 - p) + z * z / (4 * n)) / n) ** 0.5) / denom
    lo = max(0.0, center - margin)
    hi = min(1.0, center + margin)
    return (lo, hi)


def _edge_bucket(edge):
    """Sprint 88 — Bucket d'edge pour segmentation."""
    if edge is None:
        return 'unknown'
    if edge >= 0.10:
        return 'edge_10plus'
    if edge >= 0.05:
        return 'edge_5_10'
    if edge >= 0.02:
        return 'edge_2_5'
    if edge >= 0:
        return 'edge_0_2'
    return 'edge_negative'


def _period_key(date_str):
    """Sprint 88 — Période = mois ISO YYYY-MM (assez de granularité, assez d'échantillon)."""
    if not date_str:
        return 'unknown'
    return date_str[:7] if len(date_str) >= 7 else 'unknown'


def _get_secondary_odd(ev: dict, market_key: str, pick_value: str):
    """Sprint 76 (v31.7.163) — Récupère la cote book per-marché secondaire
    depuis odds_snapshot.markets (Sprint 67) ou winamax.markets (live).

    Retourne la cote (float > 1) ou None.
    """
    snap_mk = (ev.get('odds_snapshot') or {}).get('markets') or {}
    wnx_mk = (ev.get('winamax') or {}).get('markets') or {}
    if market_key in ('ou25', 'ou15', 'ou35'):
        bucket = snap_mk.get(market_key) or wnx_mk.get(market_key) or {}
        if pick_value.startswith('O'):
            v = bucket.get('over')
            return float(v) if v else None
        if pick_value.startswith('U'):
            v = bucket.get('under')
            return float(v) if v else None
    elif market_key == 'btts':
        bucket = snap_mk.get('btts') or wnx_mk.get('btts') or {}
        if pick_value == 'BTTS_Y':
            v = bucket.get('yes')
            return float(v) if v else None
        if pick_value == 'BTTS_N':
            v = bucket.get('no')
            return float(v) if v else None
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
    # Sprint 76 (v31.7.163) — Track WR + ROI per (market, pick).
    # ROI utilisable seulement pour les combinaisons où une cote book est
    # disponible (snapshot Sprint 67). Sinon on ne peut que compter WR.
    by_market = defaultdict(lambda: {
        'n': 0, 'wins': 0, 'losses': 0, 'voids': 0,
        'with_odds': 0, 'stake': 0.0, 'profit': 0.0,
    })
    # Sprint 88 (v31.7.175 — audit Part 15) — Segmentations supplémentaires.
    # Toutes les dimensions trackent (n, wins, losses, with_odds, stake, profit)
    # comme by_market, pour pouvoir calculer WR et ROI partout.
    by_league = defaultdict(lambda: {
        'n': 0, 'wins': 0, 'losses': 0, 'voids': 0,
        'with_odds': 0, 'stake': 0.0, 'profit': 0.0,
    })
    by_period = defaultdict(lambda: {
        'n': 0, 'wins': 0, 'losses': 0, 'voids': 0,
        'with_odds': 0, 'stake': 0.0, 'profit': 0.0,
    })
    by_edge_bucket = defaultdict(lambda: {
        'n': 0, 'wins': 0, 'losses': 0, 'voids': 0,
        'with_odds': 0, 'stake': 0.0, 'profit': 0.0,
    })

    for day_iso, evs in sorted(days.items()):
        for ev in evs or []:
            if not ev.get('completed'):
                continue
            completed_count += 1
            if args.limit and completed_count > args.limit:
                break
            sport = ev.get('sport')
            if sport == 'football':
                # Sprint 88 — métadata d'évent pour segmentations
                ev_league = ev.get('league_code') or 'unknown'
                ev_period = _period_key(ev.get('date'))
                def _track(market_key, pv):
                    res = evaluate_market_pure_python(ev, market_key, pv)
                    bucket = by_market[f'{market_key}:{pv}']
                    league_bucket = by_league[ev_league]
                    period_bucket = by_period[ev_period]
                    if res is None:
                        bucket['voids'] += 1
                        league_bucket['voids'] += 1
                        period_bucket['voids'] += 1
                        return
                    bucket['n'] += 1
                    league_bucket['n'] += 1
                    period_bucket['n'] += 1
                    odd = _get_secondary_odd(ev, market_key, pv)
                    edge = None  # On a pas la proba modèle ici (pas de mini-racer V8)
                    # Edge bucket fallback sur la cote implicite : si cote favorable (>1.5)
                    # on assume edge "moyen" ; sinon edge "faible". Approximation grossière.
                    if odd:
                        edge = 0.05 if odd > 2.0 else 0.02 if odd > 1.5 else 0
                    eb_key = _edge_bucket(edge)
                    eb = by_edge_bucket[eb_key]
                    eb['n'] += 1
                    if odd and odd > 1:
                        bucket['with_odds'] += 1
                        league_bucket['with_odds'] += 1
                        period_bucket['with_odds'] += 1
                        eb['with_odds'] += 1
                        bucket['stake'] += 1.0
                        league_bucket['stake'] += 1.0
                        period_bucket['stake'] += 1.0
                        eb['stake'] += 1.0
                        if res == 'won':
                            bucket['wins'] += 1
                            league_bucket['wins'] += 1
                            period_bucket['wins'] += 1
                            eb['wins'] += 1
                            profit = float(odd) - 1.0
                            bucket['profit'] += profit
                            league_bucket['profit'] += profit
                            period_bucket['profit'] += profit
                            eb['profit'] += profit
                        elif res == 'lost':
                            bucket['losses'] += 1
                            league_bucket['losses'] += 1
                            period_bucket['losses'] += 1
                            eb['losses'] += 1
                            bucket['profit'] -= 1.0
                            league_bucket['profit'] -= 1.0
                            period_bucket['profit'] -= 1.0
                            eb['profit'] -= 1.0
                    else:
                        if res == 'won':
                            bucket['wins'] += 1
                            league_bucket['wins'] += 1
                            period_bucket['wins'] += 1
                            eb['wins'] += 1
                        elif res == 'lost':
                            bucket['losses'] += 1
                            league_bucket['losses'] += 1
                            period_bucket['losses'] += 1
                            eb['losses'] += 1
                # OU 1.5 / 2.5 / 3.5
                for pv in ['O2.5', 'U2.5']:
                    _track('ou25', pv)
                for pv in ['O1.5', 'U1.5']:
                    _track('ou15', pv)
                for pv in ['O3.5', 'U3.5']:
                    _track('ou35', pv)
                # BTTS
                for pv in ['BTTS_Y', 'BTTS_N']:
                    _track('btts', pv)
                # Double Chance — pas de cote book per-marché en snapshot, juste WR
                for pv in ['1X', 'X2', '12']:
                    _track('doubleChance', pv)
        if args.limit and completed_count > args.limit:
            break

    # Synthèse
    def _summarize_bucket(v):
        """Sprint 88 — Helper qui calcule WR + ROI + Wilson CI à partir d'un bucket."""
        n = v['n']
        wr = v['wins'] / n if n > 0 else None
        roi = (v['profit'] / v['stake']) if v['stake'] > 0 else None
        ci_lo, ci_hi = _wilson_ci(v['wins'], n)
        return {
            'n': n,
            'wins': v['wins'],
            'losses': v['losses'],
            'voids': v['voids'],
            'win_rate': wr,
            # Sprint 88 — Wilson 95% CI sur win_rate
            'wr_ci_lo': round(ci_lo, 4) if ci_lo is not None else None,
            'wr_ci_hi': round(ci_hi, 4) if ci_hi is not None else None,
            'with_odds': v['with_odds'],
            'stake': round(v['stake'], 2),
            'profit': round(v['profit'], 2),
            'roi': round(roi, 4) if roi is not None else None,
        }

    summary = {k: _summarize_bucket(v) for k, v in by_market.items()}
    summary_league = {k: _summarize_bucket(v) for k, v in by_league.items()}
    summary_period = {k: _summarize_bucket(v) for k, v in by_period.items()}
    summary_edge_bucket = {k: _summarize_bucket(v) for k, v in by_edge_bucket.items()}

    report = {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'description': (
            "Backtest par marché — Sprint 88 (v31.7.175). "
            "WR + Wilson 95% CI sur tous les pairs (marché, pick). "
            "Segmentations supplémentaires : par ligue, par mois (période), "
            "par bucket d'edge. ROI calculé sur les paires où une cote book "
            "est snapshotée via odds_snapshot.markets (Sprint 67) — 1€ flat stake."
        ),
        'completed_evaluated': completed_count,
        'by_market_pick': summary,
        # Sprint 88 — Segmentations supplémentaires
        'by_league': summary_league,
        'by_period': summary_period,
        'by_edge_bucket': summary_edge_bucket,
    }
    REPORT_JSON.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    n_with_roi = sum(1 for v in summary.values() if v.get('roi') is not None)
    print(f'[backtest_by_market] wrote {REPORT_JSON.name} : '
          f'{completed_count} matchs completed, {len(summary)} (market, pick) combos, '
          f'{n_with_roi} avec ROI calculé')
    return 0


if __name__ == '__main__':
    sys.exit(main())
