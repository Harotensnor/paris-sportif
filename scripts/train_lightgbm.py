#!/usr/bin/env python3
"""Train/export offline learned model weights for the frontend.

The browser must stay vanilla and light: no runtime ML dependency. This script
therefore writes a compact ``lightgbm_weights.json`` sidecar. If a row-level
training table exists, it trains LightGBM (or sklearn fallback when available).
If not, it still exports conservative context weights from ``backtest_report_v2``
and marks the artifact as ``aggregate_fallback`` instead of pretending that a
full model was trained.
"""
from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
REPORT = ROOT / 'backtest_report_v2.json'
TRAIN_ROWS = ROOT / 'backtest_training_rows.jsonl'
OUT = ROOT / 'lightgbm_weights.json'


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        v = float(value)
        if math.isfinite(v):
            return v
    except Exception:
        pass
    return default


def _load_report() -> dict:
    if not REPORT.exists():
        return {}
    try:
        return json.loads(REPORT.read_text(encoding='utf-8'))
    except Exception:
        return {}


def _context_weight(row: dict) -> dict:
    n = int(row.get('n') or 0)
    roi = _safe_float(row.get('flat_roi_pct'))
    brier = _safe_float(row.get('brier'), 0.25)
    wr = _safe_float(row.get('win_rate'))

    # Reliability is intentionally conservative: low sample contexts can only
    # nudge slightly, never dominate the primary model.
    sample = min(1.0, n / 120.0)
    roi_signal = max(-0.08, min(0.08, roi / 100.0))
    brier_signal = max(-0.06, min(0.06, (0.24 - brier) * 0.8))
    wr_signal = max(-0.04, min(0.04, (wr - 0.52) * 0.4))
    weight = (roi_signal * 0.45 + brier_signal * 0.35 + wr_signal * 0.20) * sample
    if n < 30:
        status = 'watch'
    elif weight > 0.015:
        status = 'boost'
    elif weight < -0.015:
        status = 'deprioritize'
    else:
        status = 'neutral'
    return {
        'n': n,
        'roi_pct': round(roi, 2),
        'win_rate': round(wr, 4),
        'brier': round(brier, 4),
        'weight': round(weight, 5),
        'status': status,
    }


def _aggregate_fallback(report: dict) -> dict:
    by_sport = {
        k: _context_weight(v)
        for k, v in (report.get('by_sport') or {}).items()
        if isinstance(v, dict)
    }
    by_league = {
        k: _context_weight(v)
        for k, v in (report.get('by_league') or {}).items()
        if isinstance(v, dict)
    }
    by_tier = {
        k: _context_weight(v)
        for k, v in (report.get('by_tier') or {}).items()
        if isinstance(v, dict)
    }
    return {
        'schema': 'paris-sportif.learned_weights.v1',
        'generated_at': _now(),
        'status': 'aggregate_fallback',
        'reason': 'No backtest_training_rows.jsonl row-level feature table yet; exported conservative weights from backtest_report_v2 aggregates.',
        'runtime_dependency': 'none',
        'source': {
            'report': REPORT.name,
            'report_generated_at': report.get('generated_at'),
            'n_events': report.get('n_events'),
            'training_rows': TRAIN_ROWS.name,
            'training_rows_found': False,
        },
        'blend': {
            'base_model_weight': 0.92,
            'learned_context_weight': 0.08,
            'max_probability_nudge': 0.025,
            'min_context_n': 30,
        },
        'weights': {
            'by_sport': by_sport,
            'by_league': by_league,
            'by_tier': by_tier,
        },
        'next_action': 'Generate row-level features from backtest_v2 before enabling full LightGBM training.',
    }


def main() -> int:
    report = _load_report()
    if not report:
        OUT.write_text(json.dumps({
            'schema': 'paris-sportif.learned_weights.v1',
            'generated_at': _now(),
            'status': 'missing_backtest_report',
            'runtime_dependency': 'none',
        }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'[train_lightgbm] missing {REPORT.name}; wrote status artifact')
        return 0

    if not TRAIN_ROWS.exists():
        payload = _aggregate_fallback(report)
        OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print('[train_lightgbm] row-level table missing; wrote aggregate fallback weights')
        print(f"  sports={len(payload['weights']['by_sport'])} leagues={len(payload['weights']['by_league'])} tiers={len(payload['weights']['by_tier'])}")
        return 0

    # Full training is intentionally gated until row-level features are present.
    # Keeping this branch explicit avoids a fake LightGBM artifact.
    rows = sum(1 for _ in TRAIN_ROWS.open('r', encoding='utf-8'))
    payload = _aggregate_fallback(report)
    payload['status'] = 'row_level_table_detected_training_pending'
    payload['source']['training_rows_found'] = True
    payload['source']['training_rows_count'] = rows
    payload['next_action'] = 'Wire numeric feature extraction + optional lightgbm/sklearn trainer.'
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'[train_lightgbm] detected {rows} training rows; wrote pending trainer artifact')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
