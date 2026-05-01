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


def _date_key(iso: str | None) -> str:
    """ISO date → 'YYYY-MM-DD' (UTC)."""
    if not iso: return ''
    try:
        d = datetime.fromisoformat(iso.replace('Z', '+00:00'))
        return d.strftime('%Y-%m-%d')
    except Exception:
        return ''


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
        'pick_key': pick_key,
        'odd': round(float(odd), 2),
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
