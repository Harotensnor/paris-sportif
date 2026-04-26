#!/usr/bin/env python3
"""Backtest v2 — évalue la VRAIE fonction `predictMatch` sur l'historique.

Différence clef avec `backtest_baselines.py` (v1) :
- v1 teste des baselines de marché (favori, dog, draw, value).
- v2 appelle `predictMatch` (extrait de pronostics.html via model_loader).

Sources de vérité :
- `pronostics.html` → code du modèle (single source of truth, aucune duplication)
- `data.js` courant → état des matchs (form, rank, standings, h2h, résultats)
- `odds_history.jsonl` → cotes pre-match freezées (via `snapshot_odds.py`)

Sortie :
- `backtest_report_v2.json` : machine-readable, détaillé par sport/ligue/bucket
- `backtest_report_v2.md` : résumé humain avec ROI/WR, Brier, calibration

Caveat (assumé pour cette v1 du backtest v2) :
- On ne rewinde PAS data.js au moment pre-match : le form, rank, standings,
  h2h, météo sont ceux de l'état courant. Pour des matchs très anciens ça
  peut biaiser légèrement (form intègre des matchs post-event). C'est le
  même compromis que fait le dashboard de production quand il recalcule
  le bilan historique avec `odds_history`.
- Pour un rewind strict, itérer git log sur data.js et prendre le snapshot
  antérieur à chaque match. Chantier de suite si la biais se révèle matériel.

Usage :
    python3 scripts/backtest_v2.py               # tous les sports
    python3 scripts/backtest_v2.py --sport football
    python3 scripts/backtest_v2.py --limit 100   # subset pour dev
"""
from __future__ import annotations
import argparse
import json
import math
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))

DATA_JS = ROOT / 'data.js'
ODDS_HISTORY = ROOT / 'odds_history.jsonl'
RESULTS_ARCHIVE = ROOT / 'results_archive.jsonl'
REPORT_JSON = ROOT / 'backtest_report_v2.json'
REPORT_MD = ROOT / 'backtest_report_v2.md'

COTE_BUCKETS = [
    ('heavy_fav',   0.0, 1.50),
    ('fav',         1.50, 2.00),
    ('toss_up',     2.00, 2.80),
    ('dog',         2.80, 4.50),
    ('heavy_dog',   4.50, 100.0),
]


def bucket_for(cote: float) -> str:
    for name, lo, hi in COTE_BUCKETS:
        if lo < cote <= hi or (lo == 0.0 and cote <= hi):
            return name
    return 'heavy_dog'


# ═══ Chargement des sources ══════════════════════════════════════════

def load_pronostics_data() -> dict:
    """Parse data.js sous sa forme `window.PRONOSTICS_DATA = {...};`."""
    txt = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        raise SystemExit("Impossible de parser data.js")
    return json.loads(m.group(1))


def american_to_decimal(ml) -> float | None:
    """Réplique exacte de americanToDecimal() côté JS (pronostics.html:13373)."""
    if ml is None or ml == 0:
        return None
    try:
        ml = float(ml)
    except (TypeError, ValueError):
        return None
    if ml > 0:
        return round(ml / 100.0 + 1.0, 3)
    return round(100.0 / abs(ml) + 1.0, 3)


def load_odds_history() -> dict:
    """Charge odds_history.jsonl et renvoie {match_id: {home, away, draw}} en
    cotes décimales, comme le fait loadOddsHistory() côté JS. On garde la
    capture la plus FRAÎCHE par match (= plus proche pre-match)."""
    if not ODDS_HISTORY.exists():
        return {}
    latest: dict[str, str] = {}  # match_id -> captured_at iso
    out: dict[str, dict] = {}
    with ODDS_HISTORY.open(encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            mid = str(row.get('id') or '')
            if not mid:
                continue
            ts = row.get('captured_at') or ''
            if mid in latest and ts < latest[mid]:
                continue
            home = american_to_decimal(row.get('homeML'))
            away = american_to_decimal(row.get('awayML'))
            draw = american_to_decimal(row.get('drawML'))
            if not home and not away:
                continue
            latest[mid] = ts
            out[mid] = {'home': home, 'away': away, 'draw': draw}
    return out


def load_results_archive() -> list[dict]:
    """Charge results_archive.jsonl (matchs completed archivés au fil des
    ticks par snapshot_results.py). Retourne une liste d'events shapés
    comme dans data.js (champs id/sport/league_*/date/competitors/odds/etc.)
    afin que le backtest puisse les traiter de la même manière. Chaque
    entrée a aussi été déjà filtrée à `completed: true`. La fenêtre est
    bornée par l'ancienneté du fichier (append-only depuis sa création).
    """
    if not RESULTS_ARCHIVE.exists():
        return []
    out = []
    seen = set()  # déduplication par id si jamais le fichier en a doublonné
    with RESULTS_ARCHIVE.open(encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            mid = str(row.get('id') or '')
            if not mid or mid in seen:
                continue
            seen.add(mid)
            # Re-shape pour ressembler à data.js[event] : on ajoute winamax
            # markers que predictMatch peut lire.
            ev = {
                'id': row.get('id'),
                'sport': row.get('sport'),
                'league_code': row.get('league_code'),
                'league_name': row.get('league_name'),
                'date': row.get('date'),
                'name': row.get('name'),
                'competitors': row.get('competitors') or [],
                'completed': True,
                'odds': row.get('odds') or [],
            }
            if row.get('odds_snapshot'):
                ev['odds_snapshot'] = row['odds_snapshot']
            if row.get('closing_odds'):
                ev['closing_odds'] = row['closing_odds']
            if row.get('winamax_markets'):
                ev['winamax'] = {'available': True, 'markets': row['winamax_markets']}
            if row.get('scorers'):
                ev['scorers'] = row['scorers']
            out.append(ev)
    return out


def resolve_outcome(ev: dict) -> str | None:
    """Renvoie 'home' | 'away' | 'draw' ou None si impossible à résoudre."""
    comps = ev.get('competitors') or []
    if len(comps) < 2:
        return None
    home_c = next((c for c in comps if c.get('home_away') == 'home'), None)
    away_c = next((c for c in comps if c.get('home_away') == 'away'), None)
    if not (home_c and away_c):
        return None
    hw = home_c.get('winner')
    aw = away_c.get('winner')
    if hw is True and aw is False:
        return 'home'
    if aw is True and hw is False:
        return 'away'
    if hw is False and aw is False:
        try:
            if int(home_c.get('score', 0)) == int(away_c.get('score', 0)):
                return 'draw'
        except (TypeError, ValueError):
            return None
        return None
    return None


# ═══ Scoring ══════════════════════════════════════════════════════════

def kelly_stake(prob: float, decimal_odds: float, bankroll: float,
                multiplier: float = 0.25, cap_pct: float = 0.10) -> float:
    """Kelly fractionné 0.25× avec cap bankroll 10%. Réplique de
    kellyStake (pronostics.html:2527)."""
    if prob <= 0 or decimal_odds <= 1 or bankroll <= 0:
        return 0.0
    b = decimal_odds - 1.0
    q = 1.0 - prob
    kelly = (b * prob - q) / b
    if kelly <= 0:
        return 0.0
    stake = bankroll * kelly * multiplier
    cap = bankroll * cap_pct
    return min(stake, cap)


def brier_score(pred_prob: float, actual_binary: int) -> float:
    """Erreur quadratique : 0 = parfait, 0.25 = pile/face, 1 = inversé max."""
    return (pred_prob - actual_binary) ** 2


def log_loss(pred_prob: float, actual_binary: int, eps: float = 1e-6) -> float:
    p = max(eps, min(1 - eps, pred_prob))
    return -(actual_binary * math.log(p) + (1 - actual_binary) * math.log(1 - p))


# ═══ Boucle backtest ══════════════════════════════════════════════════

def run_backtest(opts) -> dict:
    from model_loader import ModelLoader  # import paresseux (chargement lent)

    print("[backtest] Chargement de pronostics.html via model_loader...",
          file=sys.stderr)
    loader = ModelLoader()

    print("[backtest] Chargement de data.js + odds_history.jsonl + results_archive.jsonl...",
          file=sys.stderr)
    pron_data = load_pronostics_data()
    odds_hist = load_odds_history()
    archive = load_results_archive()
    print(f"[backtest] odds_history : {len(odds_hist)} entries", file=sys.stderr)
    print(f"[backtest] results_archive : {len(archive)} entries", file=sys.stderr)

    loader.set_data(pron_data, odds_history=odds_hist)

    # Lister les matchs résolus pour lesquels on a des cotes pre-match.
    # Source 1 : data.js (les jours encore dans la fenêtre glissante ESPN)
    # Source 2 : results_archive.jsonl (les jours plus anciens, archivés
    #            au fil des ticks). Les ids déjà vus dans data.js sont
    #            filtrés pour ne pas doublonner.
    candidates = []
    seen_ids: set[str] = set()
    for day, events in (pron_data.get('days') or {}).items():
        for ev in events:
            if not ev.get('completed'):
                continue
            if opts.sport and ev.get('sport') != opts.sport:
                continue
            outcome = resolve_outcome(ev)
            if outcome is None:
                continue
            has_odds = bool(ev.get('odds')) or bool(ev.get('odds_snapshot')) \
                       or str(ev.get('id')) in odds_hist
            if not has_odds:
                continue
            mid = str(ev.get('id') or '')
            if mid:
                seen_ids.add(mid)
            candidates.append((ev, outcome))
    n_from_data = len(candidates)
    # v30 — Étendre avec l'archive pour les matchs antérieurs à la fenêtre data.js
    for ev in archive:
        if opts.sport and ev.get('sport') != opts.sport:
            continue
        mid = str(ev.get('id') or '')
        if not mid or mid in seen_ids:
            continue
        outcome = resolve_outcome(ev)
        if outcome is None:
            continue
        has_odds = bool(ev.get('odds')) or bool(ev.get('odds_snapshot')) \
                   or mid in odds_hist
        if not has_odds:
            continue
        seen_ids.add(mid)
        candidates.append((ev, outcome))
    n_from_archive = len(candidates) - n_from_data
    print(f"[backtest] {len(candidates)} matchs résolus "
          f"({n_from_data} depuis data.js + {n_from_archive} depuis archive) "
          f"avec cotes pre-match", file=sys.stderr)
    if opts.limit and opts.limit > 0:
        candidates = candidates[: opts.limit]
        print(f"[backtest] limite -> {len(candidates)} matchs", file=sys.stderr)

    # Simulation : bankroll = 100u de base, Kelly 0.25× cap 10%, flat 1u en parallèle
    # Deux modes réalisés en parallèle pour comparer.
    results: list[dict] = []
    bankroll_kelly = 100.0
    for i, (ev, outcome) in enumerate(candidates, 1):
        if i % 25 == 0:
            print(f"[backtest] {i}/{len(candidates)}...", file=sys.stderr)
        pred = loader.predict(ev)
        if pred is None:
            continue
        pick = pred.get('pick') or {}
        pick_key = pick.get('key')  # '1' | 'X' | '2'
        pick_prob = pick.get('prob') or 0.0
        odds = pred.get('odds') or {}
        side_key_map = {'1': 'home', 'X': 'draw', '2': 'away'}
        side_key = side_key_map.get(pick_key)
        if not side_key:
            continue
        cote = odds.get(side_key)
        if not cote or cote <= 1:
            continue
        # Proba du pick selon le modèle et proba marché pour Brier/logloss
        # (on évalue la qualité de la proba, pas juste de la décision)
        actual_side = outcome  # 'home' | 'away' | 'draw'
        pick_side = side_key  # 'home' | 'away' | 'draw'
        won = (pick_side == actual_side)

        # Flat 1u
        flat_pnl = (cote - 1.0) if won else -1.0

        # Kelly 0.25× cap 10% bankroll courante
        stake = kelly_stake(pick_prob, cote, bankroll_kelly)
        kelly_pnl = stake * (cote - 1.0) if won else -stake
        bankroll_kelly += kelly_pnl

        # Fiabilité tier (même logique que dashboard)
        reliability = pred.get('reliability', 0.0)
        tier = ('lock' if pred.get('isLock')
                else 'skip' if pred.get('skip')
                else 'lowconf' if pred.get('lowConf')
                else 'standard')

        results.append({
            'id': ev.get('id'),
            'name': ev.get('name'),
            'date': ev.get('date'),
            'sport': ev.get('sport'),
            'league_code': ev.get('league_code'),
            'pick': pick_key,
            'pick_side': pick_side,
            'pick_prob': pick_prob,
            'reliability': reliability,
            'tier': tier,
            'cote': cote,
            'cote_bucket': bucket_for(cote),
            'outcome': outcome,
            'won': won,
            'flat_pnl': flat_pnl,
            'kelly_stake': stake,
            'kelly_pnl': kelly_pnl,
            'brier': brier_score(pick_prob, 1 if won else 0),
            'logloss': log_loss(pick_prob, 1 if won else 0),
            'skip': pred.get('skip'),
        })

    return {
        'results': results,
        'bankroll_final_kelly': round(bankroll_kelly, 2),
    }


# ═══ Aggrégation et rapport ═══════════════════════════════════════════

def summarize(rows: list[dict]) -> dict:
    if not rows:
        return {'n': 0, 'wins': 0, 'losses': 0, 'win_rate': 0.0,
                'flat_roi_pct': 0.0, 'kelly_pnl': 0.0,
                'brier': 0.0, 'logloss': 0.0, 'avg_cote': 0.0,
                'avg_pick_prob': 0.0}
    wins = sum(1 for r in rows if r['won'])
    flat_pnl = sum(r['flat_pnl'] for r in rows)
    kelly_pnl = sum(r['kelly_pnl'] for r in rows)
    return {
        'n': len(rows),
        'wins': wins,
        'losses': len(rows) - wins,
        'win_rate': wins / len(rows),
        'flat_pnl': round(flat_pnl, 2),
        'flat_roi_pct': round(100 * flat_pnl / len(rows), 2),
        'kelly_pnl': round(kelly_pnl, 2),
        'brier': round(mean(r['brier'] for r in rows), 4),
        'logloss': round(mean(r['logloss'] for r in rows), 4),
        'avg_cote': round(mean(r['cote'] for r in rows), 2),
        'avg_pick_prob': round(mean(r['pick_prob'] for r in rows), 3),
    }


def bucket_by(rows: list[dict], key: str) -> dict[str, dict]:
    groups: dict[str, list] = defaultdict(list)
    for r in rows:
        k = str(r.get(key) or 'unknown')
        groups[k].append(r)
    return {k: summarize(v) for k, v in sorted(groups.items())}


def calibration_bins(rows: list[dict], n_bins: int = 10) -> list[dict]:
    """Courbe de calibration : regroupe par proba prédite (déciles), compare
    au WR observé. Modèle parfait = prob_mean == win_rate dans chaque bin."""
    bins: list[list[dict]] = [[] for _ in range(n_bins)]
    for r in rows:
        idx = min(n_bins - 1, max(0, int(r['pick_prob'] * n_bins)))
        bins[idx].append(r)
    out = []
    for i, b in enumerate(bins):
        if not b:
            out.append({'bin': i, 'lo': i / n_bins, 'hi': (i + 1) / n_bins,
                        'n': 0, 'prob_mean': None, 'win_rate': None, 'gap': None})
            continue
        p = mean(r['pick_prob'] for r in b)
        wr = sum(1 for r in b if r['won']) / len(b)
        out.append({
            'bin': i, 'lo': i / n_bins, 'hi': (i + 1) / n_bins,
            'n': len(b), 'prob_mean': round(p, 3), 'win_rate': round(wr, 3),
            'gap': round(wr - p, 3),
        })
    return out


def isotonic_calibration_pairs(rows: list[dict], min_n_per_bucket: int = 8) -> list[dict]:
    """v31.7.14 — Recalibration isotonic via PAV (Pool Adjacent Violators).
    Avant : le PAV tournait dans app.js sur le client (slowdown au boot,
    seul les visiteurs avec backtest deja charge en beneficiaient).
    Maintenant : compute en CI Python, expose les pairs (predicted, actual)
    monotones dans backtest_report_v2.json. Le client utilise direct.

    Algorithme :
      1. Bucket les rows par 10 percentiles de pick_prob
      2. Pour chaque bucket avec ≥min_n_per_bucket samples : (predicted, actual)
      3. Tri ascendant par predicted
      4. PAV : merge les paires non-monotones via moyenne ponderee par n
      5. Renvoie la liste finale {predicted, actual, n}

    Returns : [] si pas assez de data (≥3 buckets fournis), sinon liste
    monotone garantie.
    """
    n_bins = 10
    bins: list[list[dict]] = [[] for _ in range(n_bins)]
    for r in rows:
        idx = min(n_bins - 1, max(0, int(r['pick_prob'] * n_bins)))
        bins[idx].append(r)
    pairs = []
    for b in bins:
        if len(b) < min_n_per_bucket:
            continue
        p = mean(r['pick_prob'] for r in b)
        wr = sum(1 for r in b if r['won']) / len(b)
        pairs.append({'predicted': round(p, 4), 'actual': round(wr, 4), 'n': len(b)})
    if len(pairs) < 3:
        return []  # Pas assez de signal
    # Sort ascending by predicted (devrait l'etre par construction, safety)
    pairs.sort(key=lambda x: x['predicted'])
    # PAV : while any adjacent violation exists, merge via weighted average
    changed = True
    while changed:
        changed = False
        for i in range(len(pairs) - 1):
            if pairs[i]['actual'] > pairs[i + 1]['actual']:
                # Merge bucket i + i+1
                total_n = pairs[i]['n'] + pairs[i + 1]['n']
                merged_actual = (pairs[i]['actual'] * pairs[i]['n'] +
                                 pairs[i + 1]['actual'] * pairs[i + 1]['n']) / total_n
                pairs[i]['actual'] = round(merged_actual, 4)
                pairs[i + 1]['actual'] = round(merged_actual, 4)
                pairs[i]['n'] = total_n
                pairs[i + 1]['n'] = total_n
                changed = True
    return pairs


def render_markdown(report: dict) -> str:
    lines = ['# Backtest ROI — VRAI modèle (v2)', '']
    lines.append(f"Généré : {report['generated_at']}  ")
    lines.append(f"Source modèle : `pronostics.html` via `scripts/model_loader.py` "
                 f"(V8 embarqué, zéro duplication)  ")
    lines.append(f"Univers : {report['n_events']} picks sur "
                 f"{report['date_range']['start']} → {report['date_range']['end']}  ")
    lines.append(f"Bankroll simulée (Kelly 0.25× cap 10%) : "
                 f"**100u → {report['bankroll_final_kelly']}u**")
    lines.append('')
    lines.append('> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans '
                 '`pronostics.html`. Les chiffres ci-dessous reflètent ce que le '
                 'dashboard aurait fait si tu avais parié flat 1u chaque pick. '
                 'La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.')
    lines.append('')

    overall = report['overall']
    emoji = '🟢' if overall['flat_roi_pct'] > 0 else '🔴' if overall['flat_roi_pct'] < 0 else '⚪'
    lines.append(f"## {emoji} Vue d'ensemble")
    lines.append('')
    lines.append(f"- **{overall['n']} picks** · {overall['wins']} gagnés "
                 f"/ {overall['losses']} perdus · WR **{overall['win_rate']*100:.1f}%**")
    lines.append(f"- ROI flat (1u/pick) : **{overall['flat_roi_pct']:+.2f}%** "
                 f"({overall['flat_pnl']:+.2f}u cumulé)")
    lines.append(f"- Kelly 0.25× cap 10% : cumulé **{overall['kelly_pnl']:+.2f}u**")
    lines.append(f"- Cote moyenne : {overall['avg_cote']:.2f} · "
                 f"Pick prob moyenne : {overall['avg_pick_prob']*100:.1f}%")
    lines.append(f"- **Brier** : {overall['brier']} (0 = parfait, 0.25 = pile/face)")
    lines.append(f"- **Log-loss** : {overall['logloss']} (plus bas = mieux calibré)")
    lines.append('')

    # Par tier
    lines.append('## Par tier de fiabilité')
    lines.append('')
    lines.append('| Tier | N | WR | ROI flat | Kelly cumul | Brier |')
    lines.append('|---|---:|---:|---:|---:|---:|')
    for tier in ['lock', 'standard', 'lowconf', 'skip']:
        s = report['by_tier'].get(tier)
        if not s or s['n'] == 0:
            continue
        e = '🟢' if s['flat_roi_pct'] > 0 else '🔴' if s['flat_roi_pct'] < 0 else '⚪'
        lines.append(f"| `{tier}` | {s['n']} | {s['win_rate']*100:.0f}% | "
                     f"{e} {s['flat_roi_pct']:+.1f}% | "
                     f"{s['kelly_pnl']:+.2f}u | {s['brier']} |")
    lines.append('')

    # Par sport
    if report.get('by_sport'):
        lines.append('## Par sport')
        lines.append('')
        lines.append('| Sport | N | WR | ROI flat | Kelly cumul | Brier |')
        lines.append('|---|---:|---:|---:|---:|---:|')
        for sp, s in sorted(report['by_sport'].items(), key=lambda x: -x[1]['n']):
            if s['n'] < 2:
                continue
            e = '🟢' if s['flat_roi_pct'] > 0 else '🔴' if s['flat_roi_pct'] < 0 else '⚪'
            lines.append(f"| {sp} | {s['n']} | {s['win_rate']*100:.0f}% | "
                         f"{e} {s['flat_roi_pct']:+.1f}% | "
                         f"{s['kelly_pnl']:+.2f}u | {s['brier']} |")
        lines.append('')

    # Par cote bucket
    if report.get('by_cote_bucket'):
        lines.append('## Par range de cote')
        lines.append('')
        lines.append('| Bucket | N | WR | ROI flat | Brier |')
        lines.append('|---|---:|---:|---:|---:|')
        for bname, _lo, _hi in COTE_BUCKETS:
            s = report['by_cote_bucket'].get(bname)
            if not s or s['n'] == 0:
                continue
            e = '🟢' if s['flat_roi_pct'] > 0 else '🔴' if s['flat_roi_pct'] < 0 else '⚪'
            lines.append(f"| {bname} | {s['n']} | {s['win_rate']*100:.0f}% | "
                         f"{e} {s['flat_roi_pct']:+.1f}% | {s['brier']} |")
        lines.append('')

    # Calibration
    lines.append('## Calibration (diagramme de fiabilité)')
    lines.append('')
    lines.append('`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime '
                 '; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page '
                 'Santé de pronostics.html.')
    lines.append('')
    lines.append('| Bin | N | Prob moy | WR observé | Gap |')
    lines.append('|---|---:|---:|---:|---:|')
    for b in report['calibration']:
        if b['n'] == 0:
            continue
        gap = b['gap']
        e = '⚪' if abs(gap) < 0.05 else ('🟢' if gap > 0 else '🔴')
        lines.append(f"| [{b['lo']:.1f}–{b['hi']:.1f}] | {b['n']} | "
                     f"{b['prob_mean']:.1%} | {b['win_rate']:.1%} | "
                     f"{e} {gap:+.1%} |")
    lines.append('')

    # Top 3 ligues par volume
    if report.get('by_league'):
        top_leagues = sorted(report['by_league'].items(),
                             key=lambda x: -x[1]['n'])[:10]
        if top_leagues:
            lines.append('## Top ligues (par volume)')
            lines.append('')
            lines.append('| Ligue | N | WR | ROI flat | Brier |')
            lines.append('|---|---:|---:|---:|---:|')
            for lc, s in top_leagues:
                if s['n'] < 2:
                    continue
                e = '🟢' if s['flat_roi_pct'] > 0 else '🔴' if s['flat_roi_pct'] < 0 else '⚪'
                lines.append(f"| `{lc}` | {s['n']} | {s['win_rate']*100:.0f}% | "
                             f"{e} {s['flat_roi_pct']:+.1f}% | {s['brier']} |")
            lines.append('')

    return '\n'.join(lines)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--sport', default=None,
                    help='Filtrer par sport (football, tennis, basketball, hockey)')
    ap.add_argument('--limit', type=int, default=0,
                    help='Limiter le nb de matchs (utile en dev)')
    opts = ap.parse_args()

    bt = run_backtest(opts)
    rows = bt['results']
    if not rows:
        print('Aucun résultat à agréger — vérifier data.js + odds_history.jsonl.')
        return 1

    dates = sorted(r['date'] for r in rows if r.get('date'))
    report = {
        'generated_at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'n_events': len(rows),
        'date_range': {
            'start': dates[0] if dates else None,
            'end': dates[-1] if dates else None,
        },
        'overall': summarize(rows),
        'by_sport': bucket_by(rows, 'sport'),
        'by_league': bucket_by(rows, 'league_code'),
        'by_cote_bucket': bucket_by(rows, 'cote_bucket'),
        'by_tier': bucket_by(rows, 'tier'),
        'calibration': calibration_bins(rows, n_bins=10),
        # v31.7.10 — Multi-binning : 5/10/20 bins servis simultanement pour
        # permettre un select dropdown cote front (granularite ajustable).
        'calibration_5': calibration_bins(rows, n_bins=5),
        'calibration_20': calibration_bins(rows, n_bins=20),
        # v31.7.14 — Recalibration isotonic (PAV) precomputee. Le client lit
        # ces pairs directement, plus besoin de recompute le PAV en JS.
        'isotonic_pairs': isotonic_calibration_pairs(rows),
        'bankroll_final_kelly': bt['bankroll_final_kelly'],
        # On NE publie PAS la liste complète de picks dans le JSON pour éviter
        # que backtest_report_v2.json ne gonfle (déjà 500+ events en archive).
        # Si besoin d'inspection pick-par-pick, relancer avec --limit + print.
    }

    REPORT_JSON.write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    REPORT_MD.write_text(render_markdown(report), encoding='utf-8')

    print(f"[backtest] {len(rows)} picks · WR {report['overall']['win_rate']*100:.1f}% · "
          f"ROI flat {report['overall']['flat_roi_pct']:+.2f}% · "
          f"Brier {report['overall']['brier']} · "
          f"Bankroll Kelly 100u→{report['bankroll_final_kelly']}u",
          file=sys.stderr)
    print(f"[backtest] écrit {REPORT_JSON.name} ({REPORT_JSON.stat().st_size/1024:.1f}KB) "
          f"+ {REPORT_MD.name} ({REPORT_MD.stat().st_size/1024:.1f}KB)",
          file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
