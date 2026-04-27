#!/usr/bin/env python3
"""AUDIT-2026-04-27 (Sprint 7 #2) — Grid search seuils par sport.

Balaie les hyperparamètres clés de predictMatch / agent (isLock,
kelly_frac, lowConf cutoff) et identifie le triple optimal par sport
au sens du flat ROI sur l'archive backtest_v2.

Usage :
  python scripts/tune_thresholds.py
  → produit `tune_thresholds_report.json` avec, pour chaque sport,
    le top 5 combos par ROI flat + IC95 bootstrap.

Note : les seuils du modèle prod restent CODE EN DUR dans app.js
(la logique vit dans predictMatch). Ce script ne push PAS les seuils
optimaux automatiquement — il propose. Théo décide quoi adopter.

Approche pragmatique : on rejoue la fonction de scoring depuis le
backtest_report_v2 (rows déjà calculés avec pick_prob/cote/outcome),
on filtre selon les seuils candidats puis on calcule le ROI résultant.
Pas besoin de re-tourner predictMatch (mini-racer V8) pour chaque
combo — la donnée est déjà dans le rapport.

Limitations : on tune sur des seuils de FILTRAGE (qui exclut quoi).
Les vrais poids du blend (Elo, forme, marché) ne sont pas tunés ici
— ça nécessiterait un backtest complet par combo (trop coûteux).
"""
from __future__ import annotations
import json
import sys
from collections import defaultdict
from pathlib import Path
from statistics import mean

ROOT = Path(__file__).resolve().parent.parent
REPORT = ROOT / 'backtest_report_v2.json'
OUT = ROOT / 'tune_thresholds_report.json'


def _wilson_ci(wins: int, n: int, z: float = 1.96) -> tuple[float, float]:
    if n == 0:
        return 0.0, 0.0
    p = wins / n
    denom = 1.0 + (z * z) / n
    center = (p + (z * z) / (2 * n)) / denom
    half = (z * ((p * (1 - p) / n + (z * z) / (4 * n * n)) ** 0.5)) / denom
    return max(0.0, center - half), min(1.0, center + half)


def _eval_combo(rows: list[dict], lock_cut: float, lowconf_cut: float, edge_min: float) -> dict:
    """Évalue un combo de seuils sur les rows. Retourne stats."""
    selected = [
        r for r in rows
        if (r.get('pick_prob') or 0) >= lowconf_cut
        and (r.get('reliability') or r.get('pick_prob') or 0) >= lowconf_cut
    ]
    # Note : edge_min n'est pas filtré ici parce que rows[].edge n'est pas
    # toujours présent. On peut l'inférer via reliability - 1/cote.
    selected = [
        r for r in selected
        if r.get('cote') and (r.get('pick_prob') or 0) - 1.0 / r['cote'] >= edge_min
    ]
    if not selected:
        return {'n': 0}
    flat_pnl = sum(r.get('flat_pnl') or 0 for r in selected)
    wins = sum(1 for r in selected if r.get('won'))
    n = len(selected)
    locks = [r for r in selected if (r.get('reliability') or r.get('pick_prob') or 0) >= lock_cut]
    n_locks = len(locks)
    lock_wins = sum(1 for r in locks if r.get('won'))
    return {
        'n': n,
        'wins': wins,
        'win_rate': wins / n,
        'flat_roi_pct': round(100 * flat_pnl / n, 2),
        'win_rate_ci': [round(x, 4) for x in _wilson_ci(wins, n)],
        'n_locks': n_locks,
        'lock_win_rate': round(lock_wins / n_locks, 4) if n_locks else None,
        'lock_cut': lock_cut,
        'lowconf_cut': lowconf_cut,
        'edge_min': edge_min,
    }


def main() -> int:
    if not REPORT.exists():
        print(f'WARN: {REPORT} absent. Run scripts/backtest_v2.py first.')
        return 1
    rep = json.loads(REPORT.read_text(encoding='utf-8'))
    # Le rapport ne stocke pas les rows (volontaire pour ne pas gonfler).
    # On a besoin des rows pour le tuning, donc on appelle backtest_v2 in-process.
    # Pour rester simple, on lit results_archive.jsonl directement.
    archive_path = ROOT / 'results_archive.jsonl'
    if not archive_path.exists():
        print(f'WARN: {archive_path} absent. Skip tuning.')
        return 0

    rows_by_sport: dict[str, list[dict]] = defaultdict(list)
    with archive_path.open('r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
            except json.JSONDecodeError:
                continue
            sp = r.get('sport') or 'other'
            rows_by_sport[sp].append(r)

    # Grille à explorer
    LOCK_CUTS = [0.65, 0.70, 0.72, 0.75, 0.78]
    LOWCONF_CUTS = [0.45, 0.50, 0.55]
    EDGE_MINS = [-0.02, 0.0, 0.03, 0.05]

    out = {'sports': {}, 'total_combos': len(LOCK_CUTS) * len(LOWCONF_CUTS) * len(EDGE_MINS)}
    for sport, rows in rows_by_sport.items():
        if len(rows) < 30:
            continue
        results = []
        for lc in LOCK_CUTS:
            for lcc in LOWCONF_CUTS:
                if lcc > lc:  # lowconf >= lock fait pas de sens
                    continue
                for em in EDGE_MINS:
                    s = _eval_combo(rows, lc, lcc, em)
                    if s.get('n', 0) >= 10:
                        results.append(s)
        # Top 5 par flat_roi_pct desc
        results.sort(key=lambda x: -x.get('flat_roi_pct', 0))
        out['sports'][sport] = {
            'n_total': len(rows),
            'top5_by_roi': results[:5],
            'current_default': {  # référence app.js
                'lock_cut': 0.75 if sport in ('tennis', 'basketball', 'hockey', 'baseball') else 0.70,
                'lowconf_cut': 0.50,
                'edge_min': -0.02,
            },
        }

    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'tune_thresholds: rapport ecrit dans {OUT.name}')
    for sp, data in out['sports'].items():
        if data['top5_by_roi']:
            best = data['top5_by_roi'][0]
            cur = data['current_default']
            delta = '(meme que defaut)' if (
                best['lock_cut'] == cur['lock_cut'] and
                best['lowconf_cut'] == cur['lowconf_cut'] and
                best['edge_min'] == cur['edge_min']
            ) else f"(actuel : lock={cur['lock_cut']}, lowconf={cur['lowconf_cut']}, edge={cur['edge_min']})"
            print(f"  {sp}: best lock={best['lock_cut']}, "
                  f"lowconf={best['lowconf_cut']}, edge={best['edge_min']} -> "
                  f"ROI {best['flat_roi_pct']:.2f}% (n={best['n']}) {delta}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
