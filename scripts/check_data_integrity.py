#!/usr/bin/env python3
"""AUDIT-2026-04-27 (Sprint 8 #8) — Auto-rollback data.js si scrape catastrophique.

Vérifie que data.js post-cron n'a pas perdu plus de 50% de ses events
vs le précédent commit. Si oui, rollback git revert HEAD pour
revenir à la dernière version saine — évite la "page Tous vide" à
cause d'un blip ESPN qui dure 5 min.

Tournés EN FIN de refresh.yml, juste avant le commit final :
  - lit data.js current
  - lit data.js du commit précédent (git show HEAD~1:data.js)
  - calcule total events comparison
  - si délta > -50% : print error + exit 1 (= cron skip le commit)

Pas de git revert ici (pas le rôle d'un script Python). Si exit
code = 1, refresh.yml peut décider de skip le push.
"""
from __future__ import annotations
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / 'data.js'

# Seuil : si la nouvelle data a moins de X% des events de la précédente,
# c'est qu'un scrape catastrophique s'est produit. 50% = perte massive.
DROP_THRESHOLD = 0.50


def _parse_stats(text: str) -> dict:
    """Return integrity counters from a data.js string.

    The product promise is Winamax-bookable picks, so the guard compares the
    exact Winamax coverage first. Raw total events can legitimately drop when
    the pipeline removes non-bookable watchlist rows (for example tennis
    Sofascore events without a Winamax exact market).
    """
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', text, re.DOTALL)
    if not m:
        return {'parse_ok': False, 'total': -1, 'winamax_exact': -1, 'winamax_available': -1}
    try:
        d = json.loads(m.group(1))
    except json.JSONDecodeError:
        return {'parse_ok': False, 'total': -1, 'winamax_exact': -1, 'winamax_available': -1}
    total = 0
    winamax_available = 0
    winamax_exact = 0
    for evs in (d.get('days') or {}).values():
        for ev in evs or []:
            total += 1
            wnx = ev.get('winamax') or {}
            markets = wnx.get('markets') or {}
            if wnx.get('available') is True:
                winamax_available += 1
            if wnx.get('match_id') and isinstance(markets.get('1n2'), dict):
                winamax_exact += 1
    return {
        'parse_ok': True,
        'total': total,
        'winamax_available': winamax_available,
        'winamax_exact': winamax_exact,
    }


def _primary_metric(stats: dict) -> tuple[str, int]:
    """Choose the metric that should protect deploy quality."""
    exact = stats.get('winamax_exact') or 0
    if exact > 0:
        return 'winamax_exact', exact
    return 'total', stats.get('total') or -1


def _git_show_previous(path: str) -> str | None:
    """Récupère le contenu de path au commit HEAD~1."""
    try:
        result = subprocess.run(
            ['git', 'show', f'HEAD~1:{path}'],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            timeout=30,
            check=False,
        )
        if result.returncode != 0:
            return None
        return result.stdout
    except (subprocess.SubprocessError, OSError):
        return None


def main() -> int:
    if not DATA_PATH.exists():
        print('check_data_integrity: data.js absent. Skip.')
        return 0
    current_text = DATA_PATH.read_text(encoding='utf-8')
    cur_stats = _parse_stats(current_text)
    if not cur_stats.get('parse_ok'):
        print('check_data_integrity: data.js illisible. Skip.')
        return 0

    prev_text = _git_show_previous('data.js')
    if not prev_text:
        print('check_data_integrity: pas de commit précédent. Skip (ok).')
        return 0
    prev_stats = _parse_stats(prev_text)
    metric, cur_n = _primary_metric(cur_stats)
    prev_metric, prev_n = _primary_metric(prev_stats)
    if prev_n <= 0:
        print('check_data_integrity: commit précédent illisible. Skip.')
        return 0

    delta_pct = (cur_n - prev_n) / prev_n
    print(
        f'check_data_integrity: {metric} current={cur_n}, previous={prev_n}, '
        f'delta={delta_pct:+.1%} '
        f'(raw total {cur_stats["total"]}/{prev_stats["total"]}, '
        f'exact {cur_stats["winamax_exact"]}/{prev_stats["winamax_exact"]})'
    )
    if metric != prev_metric:
        print(f'check_data_integrity: metric switched {prev_metric} -> {metric}')

    if delta_pct < -DROP_THRESHOLD:
        print(f'FAIL: chute de {delta_pct:.1%} (seuil {-DROP_THRESHOLD:.0%}) — '
              'probable scrape catastrophique. Refuse le commit.')
        print('Action côté refresh.yml : `git checkout -- data.js` pour annuler.')
        return 1

    print('OK: data.js dans plage acceptable.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
