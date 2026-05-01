#!/usr/bin/env python3
"""Analyze model calibration per sport / per league / per cote bucket.

Lit backtest_report_v2.json et identifie les buckets où le Brier score
est le plus mauvais (>0.25) ou le ROI le plus négatif. Ces buckets
sont des candidats pour tuning manuel des poids signaux.

Output : analyze_calibration.md (human-readable).

Usage : python3 scripts/analyze_calibration.py
"""
from __future__ import annotations
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BT_PATH = ROOT / 'backtest_report_v2.json'
OUT = ROOT / 'analyze_calibration.md'


def main() -> int:
    if not BT_PATH.exists():
        print(f'{BT_PATH} not found — run backtest_v2 first', file=sys.stderr)
        return 1

    bt = json.loads(BT_PATH.read_text(encoding='utf-8'))
    overall = bt.get('overall', {})
    by_sport = bt.get('by_sport', {})
    by_league = bt.get('by_league', {})
    by_cote = bt.get('by_cote_bucket', {})

    lines = []
    lines.append('# Calibration analysis')
    lines.append('')
    lines.append(f'_Généré depuis backtest_report_v2.json — {bt.get("generated_at", "?")}_')
    lines.append('')
    lines.append(f'**Sample global** : {overall.get("n", 0)} picks · WR {overall.get("win_rate", 0)*100:.1f}% · ROI flat {overall.get("flat_roi_pct", 0):.2f}% · Brier {overall.get("brier", 0):.3f}')
    lines.append('')

    lines.append('## 🟢 Buckets bien calibrés (top performers)')
    lines.append('')
    sport_rows = sorted(
        [(k, v) for k, v in by_sport.items() if v.get('n', 0) >= 10],
        key=lambda x: -(x[1].get('flat_roi_pct') or 0)
    )[:5]
    if sport_rows:
        lines.append('### Sports rentables (≥10 picks)')
        lines.append('')
        lines.append('| Sport | N | WR | ROI flat | Brier |')
        lines.append('|---|--:|--:|--:|--:|')
        for s, v in sport_rows:
            lines.append(f'| {s} | {v.get("n",0)} | {v.get("win_rate",0)*100:.0f}% | {v.get("flat_roi_pct",0):+.1f}% | {v.get("brier",0):.3f} |')
        lines.append('')

    league_rows = sorted(
        [(k, v) for k, v in by_league.items() if v.get('n', 0) >= 5],
        key=lambda x: -(x[1].get('kelly_pnl') or 0)
    )[:10]
    if league_rows:
        lines.append('### Top 10 ligues par Kelly cumul (≥5 picks)')
        lines.append('')
        lines.append('| Ligue | N | WR | Kelly | Brier |')
        lines.append('|---|--:|--:|--:|--:|')
        for l, v in league_rows:
            lines.append(f'| {l} | {v.get("n",0)} | {v.get("win_rate",0)*100:.0f}% | {v.get("kelly_pnl",0):+.1f}u | {v.get("brier",0):.3f} |')
        lines.append('')

    lines.append('## 🔴 Buckets MAL calibrés (à tuner)')
    lines.append('')
    bad_brier_sports = sorted(
        [(k, v) for k, v in by_sport.items() if v.get('n', 0) >= 10 and v.get('brier', 0) > 0.24],
        key=lambda x: -(x[1].get('brier') or 0)
    )
    if bad_brier_sports:
        lines.append('### Sports avec Brier élevé (modèle peu calibré)')
        lines.append('')
        lines.append('| Sport | N | Brier | Suggestion |')
        lines.append('|---|--:|--:|---|')
        for s, v in bad_brier_sports:
            sugg = 'Réduire poids Poisson' if s == 'football' else \
                   'Augmenter poids Elo' if s == 'tennis' else \
                   'Vérifier signal home_advantage' if s in ('basketball', 'hockey') else \
                   'Investiguer signaux disponibles'
            lines.append(f'| {s} | {v.get("n",0)} | {v.get("brier",0):.3f} | {sugg} |')
        lines.append('')

    bad_roi_leagues = sorted(
        [(k, v) for k, v in by_league.items() if v.get('n', 0) >= 5 and (v.get('flat_roi_pct') or 0) < -10],
        key=lambda x: x[1].get('flat_roi_pct') or 0
    )[:10]
    if bad_roi_leagues:
        lines.append('### Ligues à éviter (ROI flat < -10%, ≥5 picks)')
        lines.append('')
        lines.append('| Ligue | N | WR | ROI flat | Action |')
        lines.append('|---|--:|--:|--:|---|')
        for l, v in bad_roi_leagues:
            lines.append(f'| {l} | {v.get("n",0)} | {v.get("win_rate",0)*100:.0f}% | {v.get("flat_roi_pct",0):+.1f}% | Skip ou raise threshold |')
        lines.append('')

    if by_cote:
        lines.append('## 📊 Performance par bucket de cote')
        lines.append('')
        lines.append('| Bucket | N | WR | ROI flat | Conseil |')
        lines.append('|---|--:|--:|--:|---|')
        ordered = ['heavy_fav', 'fav', 'toss_up', 'dog', 'heavy_dog']
        for b in ordered:
            v = by_cote.get(b)
            if not v: continue
            roi = v.get('flat_roi_pct', 0)
            advice = '✓ Conserver' if roi > 0 else '⚠ Surveiller' if roi > -5 else '🔴 Filtrer'
            lines.append(f'| {b} | {v.get("n",0)} | {v.get("win_rate",0)*100:.0f}% | {roi:+.1f}% | {advice} |')
        lines.append('')

    lines.append('---')
    lines.append('')
    lines.append('_Tuning manuel : modifier les poids dans `app.js` (search "components.push") en s\'inspirant des observations ci-dessus._')

    OUT.write_text('\n'.join(lines), encoding='utf-8')
    print(f'wrote {OUT.name} ({OUT.stat().st_size} bytes)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
