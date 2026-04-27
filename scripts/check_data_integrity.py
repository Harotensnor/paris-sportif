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


def _parse_events_count(text: str) -> int:
    """Compte les events dans la string data.js. Pattern 'date': [...]"""
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', text, re.DOTALL)
    if not m:
        return -1
    try:
        d = json.loads(m.group(1))
    except json.JSONDecodeError:
        return -1
    total = 0
    for evs in (d.get('days') or {}).values():
        total += len(evs or [])
    return total


def _git_show_previous(path: str) -> str | None:
    """Récupère le contenu de path au commit HEAD~1."""
    try:
        result = subprocess.run(
            ['git', 'show', f'HEAD~1:{path}'],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
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
    cur_n = _parse_events_count(current_text)
    if cur_n < 0:
        print('check_data_integrity: data.js illisible. Skip.')
        return 0

    prev_text = _git_show_previous('data.js')
    if not prev_text:
        print('check_data_integrity: pas de commit précédent. Skip (ok).')
        return 0
    prev_n = _parse_events_count(prev_text)
    if prev_n <= 0:
        print('check_data_integrity: commit précédent illisible. Skip.')
        return 0

    delta_pct = (cur_n - prev_n) / prev_n
    print(f'check_data_integrity: events current={cur_n}, previous={prev_n}, delta={delta_pct:+.1%}')

    if delta_pct < -DROP_THRESHOLD:
        print(f'FAIL: chute de {delta_pct:.1%} (seuil {-DROP_THRESHOLD:.0%}) — '
              'probable scrape catastrophique. Refuse le commit.')
        print('Action côté refresh.yml : `git checkout -- data.js` pour annuler.')
        return 1

    print('OK: data.js dans plage acceptable.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
