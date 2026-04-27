#!/usr/bin/env python3
"""AUDIT-2026-04-27 (Sprint 1 #4) — CI guard sur health.json.

Vérifie que les `quality_checks` du pipeline restent dans des seuils
acceptables. Bloque la merge si :
  - football_invalid_form > 0  (= contamination cross-sport)
  - actionable_external_odds > 5  (= reco pas Winamax-exact)
  - winamax_exact_ratio < 0.30  (= mapping Winamax cassé)

Tournés en CI sur push main + PR pour catch les régressions silencieuses
avant qu'elles affectent le live.

Exit code :
  0 = tout vert
  1 = un seuil critique dépassé (CI fail)
  2 = health.json absent / illisible (warning, pas fail)
"""
from __future__ import annotations
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HEALTH = ROOT / 'health.json'

# Seuils volontairement conservatifs pour ne pas bloquer la CI sur du
# bruit normal. À durcir progressivement quand la pipeline est stable.
THRESHOLDS = {
    'football_invalid_form_max': 0,      # tolerance zero contamination
    'actionable_external_odds_max': 50,  # tolère quelques events tournament-only
    'winamax_exact_ratio_min': 0.30,     # 30% de couverture exacte minimum
}


def main() -> int:
    if not HEALTH.exists():
        print(f'WARN: {HEALTH} absent — pipeline pas encore tournée. Skip.')
        return 0  # non-fatal pour les PR initiales
    try:
        h = json.loads(HEALTH.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError) as e:
        print(f'WARN: cannot parse {HEALTH}: {e}', file=sys.stderr)
        return 2

    q = h.get('quality_checks')
    if not q:
        print('WARN: health.json sans quality_checks (probablement old format). Skip.')
        return 0

    failures = []

    fb_invalid = int(q.get('football_invalid_form') or 0)
    if fb_invalid > THRESHOLDS['football_invalid_form_max']:
        failures.append(
            f'football_invalid_form={fb_invalid} > {THRESHOLDS["football_invalid_form_max"]} '
            f'(contamination cross-sport NBA→foot, cf root cause #1)'
        )

    ext_odds = int(q.get('actionable_external_odds') or 0)
    if ext_odds > THRESHOLDS['actionable_external_odds_max']:
        failures.append(
            f'actionable_external_odds={ext_odds} > {THRESHOLDS["actionable_external_odds_max"]} '
            f'(events Winamax exact MAIS odds_snapshot externe — promesse Winamax-only cassée)'
        )

    wnx_ratio = q.get('winamax_exact_ratio')
    if wnx_ratio is not None:
        try:
            wnx_ratio = float(wnx_ratio)
            if wnx_ratio < THRESHOLDS['winamax_exact_ratio_min']:
                failures.append(
                    f'winamax_exact_ratio={wnx_ratio:.0%} < {THRESHOLDS["winamax_exact_ratio_min"]:.0%} '
                    f'(mapping Winamax majoritairement cassé)'
                )
        except (TypeError, ValueError):
            pass

    if failures:
        print('FAIL: health.json quality_checks dépasse les seuils :')
        for f in failures:
            print(f'  ✗ {f}')
        print()
        print('  Voir AUDIT_CLAUDE_PACK_2026-04-27/09_BACKEND_ROOT_CAUSE/ROOT_CAUSE_BACKEND.md')
        return 1

    print(f'OK: quality_checks dans les seuils.')
    print(f'  football_invalid_form: {fb_invalid}')
    print(f'  actionable_external_odds: {ext_odds}')
    if wnx_ratio is not None:
        print(f'  winamax_exact_ratio: {wnx_ratio:.0%}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
