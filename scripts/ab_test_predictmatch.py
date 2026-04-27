#!/usr/bin/env python3
"""AUDIT-2026-04-27 (Sprint 31 #31) — A/B test framework predictMatch.

Compare 2 versions du modèle predictMatch (current vs candidate)
sur les rows du backtest archive. Output : ROI/Brier/log-loss delta
+ significance test (Wilcoxon signed-rank pour p-value).

Usage :
  # Sauvegarder la version "control" (current)
  python scripts/ab_test_predictmatch.py snapshot

  # Modifier app.js predictMatch (variant candidate)
  # ...edits...

  # Run le test : compare current vs snapshot
  python scripts/ab_test_predictmatch.py compare

Output :
  ab_test_report.json  : metrics par version + delta + p-value
  console : verdict humain "candidate +0.8pt ROI (p=0.04, sig)"

Limitation : utilise model_loader (V8 mini-racer) sur l'app.js
courant pour les 2 backtest, donc l'opérateur doit explicitement
git stash / git checkout pour tester une version snapshot.
Workflow : workspace propre nécessaire.
"""
from __future__ import annotations
import json
import math
import sys
from pathlib import Path
from statistics import mean

ROOT = Path(__file__).resolve().parent.parent
SNAPSHOT = ROOT / '.cache' / 'ab_snapshot.json'
REPORT = ROOT / 'ab_test_report.json'


def _wilcoxon_signed_rank(diffs: list[float]) -> tuple[float, float]:
    """Wilcoxon signed-rank test (one-sample, vs zero).
    Returns (W stat, approx p-value normal-approx).
    Implementation simple, sans scipy."""
    nz = [d for d in diffs if d != 0]
    n = len(nz)
    if n < 8:
        return 0.0, 1.0  # too few samples
    abs_sorted = sorted(enumerate(nz), key=lambda x: abs(x[1]))
    # Rank with tie correction simplified (average ranks)
    ranks = [0.0] * n
    i = 0
    while i < n:
        j = i
        while j + 1 < n and abs(abs_sorted[j + 1][1]) == abs(abs_sorted[i][1]):
            j += 1
        avg_rank = (i + j) / 2 + 1
        for k in range(i, j + 1):
            ranks[abs_sorted[k][0]] = avg_rank
        i = j + 1
    W_pos = sum(r for r, d in zip(ranks, nz) if d > 0)
    W_neg = sum(r for r, d in zip(ranks, nz) if d < 0)
    W = min(W_pos, W_neg)
    # Normal approximation
    mean_W = n * (n + 1) / 4
    sd_W = math.sqrt(n * (n + 1) * (2 * n + 1) / 24)
    if sd_W == 0:
        return W, 1.0
    z = (W - mean_W) / sd_W
    # 2-tailed approx p-value
    p = 2 * (1 - _phi(abs(z)))
    return W, p


def _phi(x: float) -> float:
    """Standard normal CDF, polynomial approximation."""
    a1, a2, a3 = 0.254829592, -0.284496736, 1.421413741
    a4, a5 = -1.453152027, 1.061405429
    p, t = 1 / (1 + 0.3275911 * x), 0
    if x < 0:
        return 1 - _phi(-x)
    t = a5
    t = a4 + p * t
    t = a3 + p * t
    t = a2 + p * t
    t = a1 + p * t
    return 1 - t * p * math.exp(-x * x / 2) / math.sqrt(2 * math.pi)


def _load_archive_rows() -> list[dict]:
    """Charge les rows du backtest archive avec leurs predictions actuelles."""
    archive = ROOT / 'results_archive.jsonl'
    if not archive.exists():
        return []
    out = []
    with archive.open('r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return out


def _summarize(rows: list[dict], label: str) -> dict:
    if not rows:
        return {'label': label, 'n': 0}
    n = len(rows)
    wins = sum(1 for r in rows if r.get('won'))
    flat_pnl = sum(r.get('flat_pnl') or 0 for r in rows)
    briers = [r['brier'] for r in rows if 'brier' in r]
    return {
        'label': label,
        'n': n,
        'wins': wins,
        'win_rate': round(wins / n, 4),
        'flat_pnl': round(flat_pnl, 2),
        'flat_roi_pct': round(100 * flat_pnl / n, 3),
        'avg_brier': round(mean(briers), 4) if briers else None,
    }


def cmd_snapshot() -> int:
    rows = _load_archive_rows()
    if not rows:
        print('FAIL: results_archive.jsonl vide ou absent.')
        return 1
    SNAPSHOT.parent.mkdir(parents=True, exist_ok=True)
    SNAPSHOT.write_text(json.dumps({
        'rows': rows,
        'summary': _summarize(rows, 'control'),
    }, ensure_ascii=False), encoding='utf-8')
    print(f'snapshot: {len(rows)} rows enregistrés dans {SNAPSHOT}')
    print(json.dumps(_summarize(rows, 'control'), indent=2))
    return 0


def cmd_compare() -> int:
    if not SNAPSHOT.exists():
        print(f'FAIL: pas de snapshot. Run `snapshot` first.')
        return 1
    snap = json.loads(SNAPSHOT.read_text(encoding='utf-8'))
    snap_rows = snap.get('rows') or []
    cur_rows = _load_archive_rows()

    # Match by id pour les diffs paires
    snap_by_id = {str(r.get('id') or r.get('match_id') or ''): r for r in snap_rows}
    cur_by_id = {str(r.get('id') or r.get('match_id') or ''): r for r in cur_rows}
    paired_ids = set(snap_by_id) & set(cur_by_id)

    pnl_diffs = []
    brier_diffs = []
    for mid in paired_ids:
        s = snap_by_id[mid]
        c = cur_by_id[mid]
        if 'flat_pnl' in s and 'flat_pnl' in c:
            pnl_diffs.append((c['flat_pnl'] or 0) - (s['flat_pnl'] or 0))
        if 'brier' in s and 'brier' in c:
            brier_diffs.append((c['brier'] or 0) - (s['brier'] or 0))

    snap_summary = snap.get('summary') or _summarize(snap_rows, 'control')
    cur_summary = _summarize(cur_rows, 'candidate')

    W_pnl, p_pnl = _wilcoxon_signed_rank(pnl_diffs)
    W_br, p_br = _wilcoxon_signed_rank(brier_diffs)

    delta_roi = (cur_summary.get('flat_roi_pct') or 0) - (snap_summary.get('flat_roi_pct') or 0)
    delta_brier = (cur_summary.get('avg_brier') or 0) - (snap_summary.get('avg_brier') or 0)

    report = {
        'control': snap_summary,
        'candidate': cur_summary,
        'paired_n': len(paired_ids),
        'delta_flat_roi_pct': round(delta_roi, 3),
        'delta_avg_brier': round(delta_brier, 4),
        'pnl_wilcoxon_p': round(p_pnl, 4),
        'brier_wilcoxon_p': round(p_br, 4),
        'verdict': '',
    }
    sig_pnl = p_pnl < 0.05
    sig_brier = p_br < 0.05
    if sig_pnl and delta_roi > 0:
        report['verdict'] = f'candidate +{delta_roi:.2f}pt ROI (p={p_pnl:.3f}, SIG amélioration)'
    elif sig_pnl and delta_roi < 0:
        report['verdict'] = f'candidate {delta_roi:.2f}pt ROI (p={p_pnl:.3f}, SIG régression — REJETER)'
    else:
        report['verdict'] = f'pas de diff significative (delta {delta_roi:+.2f}pt ROI, p={p_pnl:.3f})'

    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))
    return 0 if (not sig_pnl or delta_roi >= 0) else 1


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 0
    cmd = sys.argv[1]
    if cmd == 'snapshot':
        return cmd_snapshot()
    if cmd == 'compare':
        return cmd_compare()
    print(f'Unknown command: {cmd}. Use snapshot|compare')
    return 1


if __name__ == '__main__':
    sys.exit(main())
