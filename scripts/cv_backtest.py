#!/usr/bin/env python3
"""AUDIT-2026-04-27 (Sprint 31 #32) — Cross-validation backtest temporel.

Au lieu d'un backtest unique sur tout l'archive, fait un rolling-origin
CV : pour chaque jour J du dataset, calcule le ROI sur la fenêtre
[J-30, J-1] (training) et la performance sur le jour J (test). Glisse
ensuite à J+1.

Permet de détecter :
- Overfit temporel (ROI training >> ROI test consistant)
- Périodes où le modèle marche bien vs mal (saisonalité ?)
- Stabilité du WR/Brier sur la durée

Output : `cv_backtest_report.json` avec courbes ROI / WR / Brier
par fenêtre. À visualiser sur la page Crédibilité plus tard.

Lit results_archive.jsonl directement (les rows ont déjà pred + outcome).
Pas besoin de re-tourner predictMatch (qui nécessite mini-racer).
"""
from __future__ import annotations
import json
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from statistics import mean

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / 'results_archive.jsonl'
REPORT = ROOT / 'cv_backtest_report.json'

WINDOW_DAYS = 30  # taille de la fenêtre training rolling
MIN_ROWS_PER_WINDOW = 30


def _load_rows() -> list[dict]:
    if not ARCHIVE.exists():
        return []
    rows = []
    with ARCHIVE.open('r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return rows


def _date_of(row: dict) -> datetime | None:
    d = row.get('date') or row.get('match_date') or ''
    if not d:
        return None
    try:
        # Accept YYYY-MM-DD or full ISO
        if 'T' in d:
            return datetime.fromisoformat(d.replace('Z', '+00:00'))
        return datetime.strptime(d[:10], '%Y-%m-%d').replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return None


def _summarize(rows: list[dict]) -> dict:
    if not rows:
        return {'n': 0}
    wins = sum(1 for r in rows if r.get('won'))
    pnl = sum(r.get('flat_pnl') or 0 for r in rows)
    briers = [r['brier'] for r in rows if 'brier' in r]
    return {
        'n': len(rows),
        'wins': wins,
        'win_rate': round(wins / len(rows), 4),
        'flat_roi_pct': round(100 * pnl / len(rows), 3),
        'avg_brier': round(mean(briers), 4) if briers else None,
    }


def main() -> int:
    rows = _load_rows()
    if len(rows) < MIN_ROWS_PER_WINDOW * 2:
        print(f'FAIL: pas assez de rows pour CV (n={len(rows)}, min {MIN_ROWS_PER_WINDOW * 2}).')
        return 1
    # Group rows by day
    by_day: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        d = _date_of(r)
        if d is None:
            continue
        by_day[d.date().isoformat()].append(r)

    if not by_day:
        print('FAIL: aucune row avec date parseable.')
        return 1

    sorted_days = sorted(by_day.keys())
    if len(sorted_days) < WINDOW_DAYS + 7:
        print(f'FAIL: pas assez de jours distincts pour CV (n={len(sorted_days)}, min {WINDOW_DAYS + 7}).')
        return 1

    cv_rows = []
    for i in range(WINDOW_DAYS, len(sorted_days)):
        # Training window: [i-WINDOW_DAYS, i-1]
        train_days = sorted_days[i - WINDOW_DAYS: i]
        test_day = sorted_days[i]
        train_rows = [r for d in train_days for r in by_day[d]]
        test_rows = by_day[test_day]
        if len(train_rows) < MIN_ROWS_PER_WINDOW:
            continue
        train_summary = _summarize(train_rows)
        test_summary = _summarize(test_rows)
        cv_rows.append({
            'test_day': test_day,
            'train_window_days': WINDOW_DAYS,
            'train': train_summary,
            'test': test_summary,
        })

    # Métriques globales sur la CV
    test_rois = [c['test']['flat_roi_pct'] for c in cv_rows if c['test'].get('n', 0) > 0]
    test_wrs = [c['test']['win_rate'] for c in cv_rows if c['test'].get('n', 0) > 0]
    train_avg_roi = mean([c['train']['flat_roi_pct'] for c in cv_rows]) if cv_rows else 0
    test_avg_roi = mean(test_rois) if test_rois else 0
    overfit_gap = train_avg_roi - test_avg_roi  # > 0 = train mieux que test = overfit

    report = {
        'n_windows': len(cv_rows),
        'window_days': WINDOW_DAYS,
        'train_avg_roi_pct': round(train_avg_roi, 3),
        'test_avg_roi_pct': round(test_avg_roi, 3),
        'overfit_gap_pt': round(overfit_gap, 3),
        'test_roi_std': round(_std(test_rois), 3) if test_rois else None,
        'test_wr_avg': round(mean(test_wrs), 4) if test_wrs else None,
        'cv_windows': cv_rows[-30:],  # top 30 dernières fenêtres pour la viz
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'CV backtest : {len(cv_rows)} fenêtres')
    print(f'  Train avg ROI : {train_avg_roi:+.2f}pt')
    print(f'  Test avg ROI  : {test_avg_roi:+.2f}pt')
    print(f'  Overfit gap   : {overfit_gap:+.2f}pt ' +
          ('(OVERFIT suspect)' if overfit_gap > 3 else '(stable)'))
    return 0


def _std(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    m = mean(values)
    return (sum((v - m) ** 2 for v in values) / (len(values) - 1)) ** 0.5


if __name__ == '__main__':
    sys.exit(main())
