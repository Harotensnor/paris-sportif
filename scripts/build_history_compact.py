#!/usr/bin/env python3
"""Build history_compact.json from results_archive.jsonl.

Pourquoi ce script : la page Historique du frontend lit data.js qui ne
contient que ~14 jours rolling. Tout l'historique vérifié vit dans
results_archive.jsonl (1700+ events) mais c'est trop gros pour être
chargé direct côté client (956KB).

Ce script produit un fichier compact (~100-200KB) avec :
- Stats agrégées par jour (W/L/PL/ROI) sur les 90 derniers jours
- Détail des picks pour les 30 derniers jours
- Top 20 plus belles wins / pires losses
- Stats par sport / par tier confiance

Le frontend fetch ce JSON et l'intègre à la page Historique pour
montrer un vrai historique long-terme.

Idempotent. ~1-2s.
"""
from __future__ import annotations
import json
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RESULTS_JSONL = ROOT / 'results_archive.jsonl'
ODDS_JSONL = ROOT / 'odds_history.jsonl'
BACKTEST_MARKETS = ROOT / 'backtest_report_markets.json'
OUT = ROOT / 'history_compact.json'

# Limites
WINDOW_DAYS_STATS = 90       # stats par jour
WINDOW_DAYS_DETAILS = 30     # détails picks
TOP_N_HIGHLIGHTS = 20        # best wins / worst losses


def _load_results() -> list[dict]:
    """Lit results_archive.jsonl (1 event JSON par ligne)."""
    if not RESULTS_JSONL.exists():
        return []
    out = []
    with RESULTS_JSONL.open('r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line: continue
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return out


def _load_odds_snapshot() -> dict[str, dict]:
    """Lit odds_history.jsonl, dédup par event_id (dernière entrée gagne)."""
    if not ODDS_JSONL.exists():
        return {}
    by_id: dict[str, dict] = {}
    with ODDS_JSONL.open('r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line: continue
            try:
                d = json.loads(line)
                eid = str(d.get('event_id') or d.get('id') or '')
                if eid:
                    by_id[eid] = d
            except json.JSONDecodeError:
                continue
    return by_id


def _load_market_backtest() -> dict:
    if not BACKTEST_MARKETS.exists():
        return {}
    try:
        return json.loads(BACKTEST_MARKETS.read_text(encoding='utf-8'))
    except Exception:
        return {}


def _date_key(iso: str | None) -> str:
    """ISO date → 'YYYY-MM-DD' (UTC)."""
    if not iso: return ''
    try:
        d = datetime.fromisoformat(iso.replace('Z', '+00:00'))
        return d.strftime('%Y-%m-%d')
    except Exception:
        return ''


def _market_from_snapshot(snap: dict | None, pick_key: str | None) -> str:
    """Normalise le type de marché stocké dans les snapshots.

    Les anciens odds_history n'ont que le 1N2 implicite. Les prochains
    snapshots multi-marchés peuvent écrire `market`, `market_key` ou `bet_type`.
    """
    if not snap:
        return '1n2'
    raw = (
        snap.get('market')
        or snap.get('market_key')
        or snap.get('bet_type')
        or snap.get('type')
        or ''
    )
    key = str(raw or '').strip().lower()
    if not key:
        return '1n2'
    aliases = {
        'moneyline': '1n2',
        'match_winner': '1n2',
        'winner': '1n2',
        'over_under': 'ou',
        'total': 'ou',
        'totals': 'ou',
        'double chance': 'double_chance',
        'draw no bet': 'dnb',
    }
    key = aliases.get(key, key)
    return key.replace(' ', '_').replace('-', '_')


def _market_label(market: str) -> str:
    labels = {
        '1n2': '1N2 / vainqueur',
        'ou': 'Over/Under',
        'ou15': 'Over/Under 1.5',
        'ou25': 'Over/Under 2.5',
        'ou35': 'Over/Under 3.5',
        'btts': 'BTTS',
        'dnb': 'Draw no bet',
        'double_chance': 'Double chance',
        'handicap': 'Handicap',
        'team_total': 'Team total',
        'exact_scores': 'Score exact',
    }
    return labels.get(market, market.replace('_', ' ').upper())


def _confidence_tier(n: int, roi: float, wr: float) -> str:
    if n < 8:
        return 'learning'
    if n >= 20 and roi > 3 and wr >= 50:
        return 'validated'
    if n >= 12 and roi < -5:
        return 'cooldown'
    return 'neutral'


def _compact_market_backtest(report: dict) -> dict:
    raw = report.get('by_market_pick') or {}
    if not isinstance(raw, dict):
        return {'by_market': [], 'by_market_pick': []}
    by_market: dict[str, dict] = {}
    pick_rows = []
    for key, stats in raw.items():
        if not isinstance(stats, dict):
            continue
        market, _, selection = str(key).partition(':')
        market = market or 'unknown'
        n = int(stats.get('n') or 0)
        wins = int(stats.get('wins') or 0)
        losses = int(stats.get('losses') or 0)
        roi_raw = stats.get('roi')
        roi_pct = None if roi_raw is None else round(float(roi_raw) * 100, 2)
        wr = round(100 * float(stats.get('win_rate') or 0), 1)
        row = {
            'market': market,
            'label': _market_label(market),
            'selection': selection or key,
            'n': n,
            'wins': wins,
            'losses': losses,
            'win_rate': wr,
            'wr_ci_lo': round(100 * float(stats.get('wr_ci_lo') or 0), 1),
            'wr_ci_hi': round(100 * float(stats.get('wr_ci_hi') or 0), 1),
            'with_odds': int(stats.get('with_odds') or 0),
            'roi': roi_pct,
            'profit': round(float(stats.get('profit') or 0), 2),
            'confidence': _confidence_tier(n, roi_pct or 0, wr),
        }
        pick_rows.append(row)
        agg = by_market.setdefault(market, {
            'market': market,
            'label': _market_label(market),
            'n': 0,
            'wins': 0,
            'losses': 0,
            'with_odds': 0,
            'profit': 0.0,
        })
        agg['n'] += n
        agg['wins'] += wins
        agg['losses'] += losses
        agg['with_odds'] += int(stats.get('with_odds') or 0)
        agg['profit'] += float(stats.get('profit') or 0)
    for agg in by_market.values():
        agg['win_rate'] = round(100 * agg['wins'] / agg['n'], 1) if agg['n'] else 0
        agg['roi'] = round(100 * agg['profit'] / agg['with_odds'], 2) if agg['with_odds'] else None
        agg['profit'] = round(agg['profit'], 2)
        agg['confidence'] = _confidence_tier(agg['n'], agg['roi'] or 0, agg['win_rate'])
    return {
        'generated_at': report.get('generated_at'),
        'completed_evaluated': report.get('completed_evaluated'),
        'by_market': sorted(by_market.values(), key=lambda x: (-x['n'], x['market'])),
        'by_market_pick': sorted(pick_rows, key=lambda x: (-x['n'], x['market'], x['selection']))[:160],
    }


def _evaluate_pick(event: dict, snap: dict | None) -> dict | None:
    """Évalue le pick model sur un event résolu.

    Renvoie {result, pick_key, pick_label, odd, pl, sport, league, home_name,
    away_name, date, completed, winner} ou None si invalide.
    """
    if not event.get('completed'):
        return None
    sport = event.get('sport') or ''
    # Pour le pick : utilise le snapshot si dispo, sinon skip
    if not snap:
        return None
    pick_key = snap.get('pick_key') or snap.get('pick')
    odd = snap.get('odd') or snap.get('pick_odd') or snap.get('odd_pick')
    if not pick_key or not (odd and odd > 1):
        return None
    market = _market_from_snapshot(snap, pick_key)
    # Détermine le winner réel
    competitors = event.get('competitors') or []
    home = next((c for c in competitors if c.get('home_away') == 'home'), competitors[0] if competitors else None)
    away = next((c for c in competitors if c.get('home_away') == 'away'), competitors[1] if len(competitors) > 1 else None)
    if not home or not away:
        return None
    h_score = None; a_score = None
    try:
        h_score = int(home.get('score') or '')
        a_score = int(away.get('score') or '')
    except (TypeError, ValueError):
        pass
    if h_score is None or a_score is None:
        return None
    # Compare avec le pick
    if pick_key in ('1', 'home'):
        won = h_score > a_score
    elif pick_key in ('2', 'away'):
        won = a_score > h_score
    elif pick_key in ('X', 'draw', 'N'):
        won = h_score == a_score
    else:
        return None
    pl = (odd - 1) if won else -1
    home_name = home.get('name') or '?'
    away_name = away.get('name') or '?'
    return {
        'event_id': str(event.get('id', '')),
        'date': event.get('date'),
        'sport': sport,
        'league': event.get('league_name') or event.get('league_code', ''),
        'home': home_name,
        'away': away_name,
        'market': market,
        'market_label': _market_label(market),
        'pick_key': pick_key,
        'pick_label': snap.get('pick_label') or snap.get('selection') or pick_key,
        'odd': round(float(odd), 2),
        'prob': snap.get('prob') or snap.get('reliability') or snap.get('model_prob'),
        'ev': snap.get('ev') or snap.get('expected_value'),
        'stake': snap.get('stake') or snap.get('stake_eur') or snap.get('stake_unit'),
        'clv': snap.get('clv') or snap.get('clv_pct'),
        'won': won,
        'pl': round(float(pl), 3),
        'h_score': h_score,
        'a_score': a_score,
    }


def main() -> int:
    print('[build_history_compact] starting…', flush=True)
    results = _load_results()
    print(f'  loaded {len(results)} events from results_archive.jsonl', flush=True)
    odds = _load_odds_snapshot()
    print(f'  loaded {len(odds)} snapshots from odds_history.jsonl', flush=True)
    market_backtest = _compact_market_backtest(_load_market_backtest())
    if market_backtest.get('by_market'):
        print(f'  loaded {len(market_backtest["by_market"])} market backtest groups', flush=True)

    # Évalue chaque event
    picks = []
    for ev in results:
        eid = str(ev.get('id', ''))
        snap = odds.get(eid)
        p = _evaluate_pick(ev, snap)
        if p:
            picks.append(p)
    print(f'  evaluated {len(picks)} picks with snapshot odds', flush=True)

    # Tri par date desc
    picks.sort(key=lambda x: x.get('date') or '', reverse=True)

    # Window cuts
    now_utc = datetime.now(timezone.utc)
    cut_stats = (now_utc - timedelta(days=WINDOW_DAYS_STATS)).strftime('%Y-%m-%d')
    cut_details = (now_utc - timedelta(days=WINDOW_DAYS_DETAILS)).strftime('%Y-%m-%d')

    # Stats par jour
    by_day: dict[str, dict] = {}
    for p in picks:
        dk = _date_key(p.get('date'))
        if not dk or dk < cut_stats: continue
        if dk not in by_day:
            by_day[dk] = {'date': dk, 'n': 0, 'w': 0, 'l': 0, 'pl': 0.0, 'roi': 0.0}
        d = by_day[dk]
        d['n'] += 1
        if p['won']: d['w'] += 1
        else: d['l'] += 1
        d['pl'] += p['pl']
    for d in by_day.values():
        d['roi'] = round(100 * d['pl'] / d['n'], 2) if d['n'] else 0
        d['pl'] = round(d['pl'], 2)

    days_sorted = sorted(by_day.values(), key=lambda x: x['date'], reverse=True)

    # Stats globales window
    win_picks = [p for p in picks if (_date_key(p.get('date')) or '') >= cut_stats]
    n = len(win_picks)
    w = sum(1 for p in win_picks if p['won'])
    l = n - w
    pl = round(sum(p['pl'] for p in win_picks), 2)
    wr = round(100 * w / n, 1) if n else 0
    roi = round(100 * pl / n, 2) if n else 0

    # By sport
    by_sport: dict[str, dict] = {}
    for p in win_picks:
        sp = p['sport'] or 'other'
        if sp not in by_sport:
            by_sport[sp] = {'sport': sp, 'n': 0, 'w': 0, 'pl': 0.0}
        by_sport[sp]['n'] += 1
        if p['won']: by_sport[sp]['w'] += 1
        by_sport[sp]['pl'] += p['pl']
    for s in by_sport.values():
        s['wr'] = round(100 * s['w'] / s['n'], 1) if s['n'] else 0
        s['roi'] = round(100 * s['pl'] / s['n'], 2) if s['n'] else 0
        s['pl'] = round(s['pl'], 2)

    # By market — base de la vue "Historique marchés" long terme.
    by_market: dict[str, dict] = {}
    by_market_sport: dict[str, dict] = {}
    for p in win_picks:
        mk = p.get('market') or '1n2'
        if mk not in by_market:
            by_market[mk] = {
                'market': mk,
                'label': _market_label(mk),
                'n': 0,
                'w': 0,
                'l': 0,
                'pl': 0.0,
                'avg_odd_sum': 0.0,
            }
        d = by_market[mk]
        d['n'] += 1
        if p['won']: d['w'] += 1
        else: d['l'] += 1
        d['pl'] += p['pl']
        d['avg_odd_sum'] += float(p.get('odd') or 0)

        mks = f'{mk}:{p.get("sport") or "other"}'
        if mks not in by_market_sport:
            by_market_sport[mks] = {
                'market': mk,
                'label': _market_label(mk),
                'sport': p.get('sport') or 'other',
                'n': 0,
                'w': 0,
                'l': 0,
                'pl': 0.0,
            }
        sd = by_market_sport[mks]
        sd['n'] += 1
        if p['won']: sd['w'] += 1
        else: sd['l'] += 1
        sd['pl'] += p['pl']

    for d in by_market.values():
        d['wr'] = round(100 * d['w'] / d['n'], 1) if d['n'] else 0
        d['roi'] = round(100 * d['pl'] / d['n'], 2) if d['n'] else 0
        d['avg_odd'] = round(d.pop('avg_odd_sum') / d['n'], 2) if d['n'] else 0
        d['pl'] = round(d['pl'], 2)
        d['confidence'] = _confidence_tier(d['n'], d['roi'], d['wr'])
    for d in by_market_sport.values():
        d['wr'] = round(100 * d['w'] / d['n'], 1) if d['n'] else 0
        d['roi'] = round(100 * d['pl'] / d['n'], 2) if d['n'] else 0
        d['pl'] = round(d['pl'], 2)
        d['confidence'] = _confidence_tier(d['n'], d['roi'], d['wr'])

    # Détail des picks récents (30 derniers jours)
    recent_picks = [p for p in picks if (_date_key(p.get('date')) or '') >= cut_details][:300]

    # Top wins / pires losses
    sorted_by_pl = sorted(picks, key=lambda x: x['pl'], reverse=True)
    top_wins = [p for p in sorted_by_pl if p['won']][:TOP_N_HIGHLIGHTS]
    worst_losses = [p for p in picks if not p['won']]
    worst_losses.sort(key=lambda x: x['odd'], reverse=True)  # plus la cote était haute, plus c'était une perte douloureuse
    worst_losses = worst_losses[:TOP_N_HIGHLIGHTS]

    out = {
        'generated_at': now_utc.replace(microsecond=0).isoformat() + 'Z',
        'window_days_stats': WINDOW_DAYS_STATS,
        'window_days_details': WINDOW_DAYS_DETAILS,
        'overall': {
            'n_picks': n,
            'wins': w,
            'losses': l,
            'win_rate': wr,
            'pl_units': pl,
            'roi_pct': roi,
        },
        'by_day': days_sorted,
        'by_sport': sorted(by_sport.values(), key=lambda x: -x['n']),
        'by_market': sorted(by_market.values(), key=lambda x: (-x['n'], x['market'])),
        'by_market_sport': sorted(by_market_sport.values(), key=lambda x: (-x['n'], x['market'], x['sport'])),
        'market_backtest': market_backtest,
        'recent_picks': recent_picks,
        'top_wins': top_wins,
        'worst_losses': worst_losses,
    }

    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'[build_history_compact] wrote {OUT.name} ({OUT.stat().st_size / 1024:.1f}KB)')
    print(f'  overall: {n} picks, {wr}% WR, {pl}u PL, {roi}% ROI on last {WINDOW_DAYS_STATS} days')
    return 0


if __name__ == '__main__':
    sys.exit(main())
