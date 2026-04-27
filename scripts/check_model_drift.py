#!/usr/bin/env python3
"""AUDIT-2026-04-27 (Sprint 7 #3) — Model drift detector.

Compare la distribution des `pick_prob` cette semaine vs historical
(toutes les semaines précédentes). Si la divergence dépasse un seuil,
ajoute un warning dans health.json — signal qu'un commit récent a
modifié predictMatch d'une façon qui change matériellement les
probabilités émises (drift).

Métrique : Kolmogorov-Smirnov stat (max distance entre 2 CDF). Plus
robuste que KL-divergence pour 2 distributions empiriques de tailles
différentes. Seuil par défaut KS > 0.15 = drift suspect.

Source : `results_archive.jsonl` (1 ligne par pick réglé) + le
`backtest_report_v2.json` qui agrège.

Tournés en CI sur push main (juste après build_health.py). Pas
bloquant si pas de data, juste un warning.
"""
from __future__ import annotations
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / 'results_archive.jsonl'
HEALTH = ROOT / 'health.json'

DRIFT_THRESHOLD_KS = 0.15  # Distance KS au-delà de laquelle on warning
THIS_WEEK_DAYS = 7
HISTORICAL_DAYS_MIN = 30


def _load_picks() -> list[dict]:
    """Charge results_archive.jsonl et retourne la liste des picks récents."""
    if not ARCHIVE.exists():
        return []
    out = []
    try:
        with ARCHIVE.open('r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    out.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    except OSError:
        return []
    return out


def _ks_statistic(a: list[float], b: list[float]) -> float:
    """Kolmogorov-Smirnov statistic : max distance entre les 2 CDF empiriques.
    Pas de scipy : implémentation naïve mais correcte. n*m operations max."""
    if not a or not b:
        return 0.0
    a_sorted = sorted(a)
    b_sorted = sorted(b)
    n_a = len(a_sorted)
    n_b = len(b_sorted)
    # Combine + dédup pour les points où on évalue les CDFs
    pts = sorted(set(a_sorted) | set(b_sorted))
    max_d = 0.0
    for x in pts:
        # Proportion <= x
        i_a = sum(1 for v in a_sorted if v <= x) / n_a
        i_b = sum(1 for v in b_sorted if v <= x) / n_b
        d = abs(i_a - i_b)
        if d > max_d:
            max_d = d
    return max_d


def _update_health(drift_data: dict) -> None:
    """Append drift_data dans health.json sans toucher au reste."""
    if not HEALTH.exists():
        return
    try:
        h = json.loads(HEALTH.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        return
    h.setdefault('quality_checks', {})['model_drift_ks'] = drift_data.get('ks')
    h['quality_checks']['model_drift_n_recent'] = drift_data.get('n_recent', 0)
    h['quality_checks']['model_drift_n_historical'] = drift_data.get('n_historical', 0)
    if drift_data.get('drift'):
        h.setdefault('warnings', []).append(
            f"model_drift_ks={drift_data['ks']:.3f} > {DRIFT_THRESHOLD_KS} "
            f"(n_recent={drift_data.get('n_recent')}, "
            f"n_historical={drift_data.get('n_historical')}) — "
            f"un commit récent a modifié predictMatch ?"
        )
    HEALTH.write_text(json.dumps(h, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main() -> int:
    picks = _load_picks()
    if not picks:
        print('check_model_drift: results_archive.jsonl absent ou vide. Skip.')
        return 0

    # Filtre par période
    now = datetime.now(timezone.utc)
    recent_cutoff = now - timedelta(days=THIS_WEEK_DAYS)
    historical_cutoff = now - timedelta(days=HISTORICAL_DAYS_MIN + THIS_WEEK_DAYS)

    def _ts(p: dict) -> datetime | None:
        d = p.get('date') or p.get('match_date') or ''
        if not d:
            return None
        try:
            return datetime.fromisoformat(d.replace('Z', '+00:00'))
        except (ValueError, TypeError):
            return None

    recent_probs: list[float] = []
    historical_probs: list[float] = []
    for p in picks:
        prob = p.get('pick_prob') or p.get('prob')
        if prob is None:
            continue
        try:
            prob = float(prob)
        except (TypeError, ValueError):
            continue
        if not (0 <= prob <= 1):
            continue
        ts = _ts(p)
        if ts is None:
            continue
        if ts >= recent_cutoff:
            recent_probs.append(prob)
        elif ts >= historical_cutoff and ts < recent_cutoff:
            historical_probs.append(prob)

    n_recent = len(recent_probs)
    n_hist = len(historical_probs)
    if n_recent < 10 or n_hist < 30:
        print(f'check_model_drift: pas assez de samples (recent={n_recent}, hist={n_hist}). Skip.')
        return 0

    ks = _ks_statistic(recent_probs, historical_probs)
    drift = ks > DRIFT_THRESHOLD_KS
    print(f'check_model_drift: KS={ks:.3f} '
          f'(recent n={n_recent}, hist n={n_hist}) '
          f'{"DRIFT DETECTED" if drift else "stable"}')

    _update_health({
        'ks': round(ks, 3),
        'n_recent': n_recent,
        'n_historical': n_hist,
        'drift': drift,
    })
    return 0


if __name__ == '__main__':
    sys.exit(main())
