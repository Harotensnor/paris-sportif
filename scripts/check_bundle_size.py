#!/usr/bin/env python3
"""AUDIT-2026-04-27 (Sprint 6 #30) — Bundle size budget CI guard.

Vérifie que les principaux assets ne dépassent pas leur budget de
taille pour éviter la dérive silencieuse. Fail la CI si dépassement.

Tournés en CI sur push main + PR pour catch les commits qui ajoutent
500KB sans s'en rendre compte (typiquement : stagiaire qui inline une
lib externe complète, ou regex fail qui inline tout data.js dans
pronostics.html, etc.).

Budgets (basés sur la taille actuelle + 10% headroom) :
  app.js          : 1100 KB (actuel ~1024 KB)
  app.css         :  200 KB (actuel ~165 KB)
  pronostics.html :  650 KB (actuel ~570 KB, contient le LITE blob)
  sw.js           :   10 KB (actuel ~5 KB)

data.js et health.json sont volontairement exclus (data dynamique,
varie selon le nombre d'events).

Exit code :
  0 = tout dans le budget
  1 = au moins un asset dépasse → fail CI
"""
from __future__ import annotations
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# AUDIT-2026-04-27 (Sprint 23 #21 + Sprint 32 #40) — Budgets globaux + per-page.
# app.js bumpé 1100→1200 après Sprint 13-22 qui ont ajouté beaucoup
# de valeur (design tokens, helpers UI, modal tabs, page Ligue, etc.).
# Le vrai gain serait découpage ESM — backlog. Pour l'instant headroom.
# Sprint 32 #40 ajoute des budgets par-page éditoriale pour catch les
# régressions individuelles sur les pages secondaires.
BUDGETS_KB = {
    # Core SPA
    'app.js':                    1200,
    'app.css':                    230,
    'pronostics.html':            650,
    'sw.js':                       15,
    # Pages éditoriales (régénérées par build_*_page.py — taille stable)
    'index.html':                  35,
    'methodologie.html':           35,
    'academie.html':               40,
    'comment-lire-un-prono.html':  35,
    'legal.html':                  20,
    'static-page.css':             25,
    # Pages générées par scripts (peuvent varier selon data)
    'backtest.html':               80,
    'credibilite.html':            70,
}


def main() -> int:
    failures = []
    warnings = []
    for name, budget in BUDGETS_KB.items():
        path = ROOT / name
        if not path.exists():
            warnings.append(f'{name}: fichier absent')
            continue
        size_kb = path.stat().st_size / 1024
        used_pct = (size_kb / budget) * 100
        msg = f'{name}: {size_kb:.1f} KB / {budget} KB budget ({used_pct:.0f}%)'
        if size_kb > budget:
            failures.append(msg)
        elif used_pct > 90:
            warnings.append(f'{msg} — proche du budget')
        else:
            print(f'  [ok]{msg}')

    if warnings:
        print()
        print('WARNINGS :')
        for w in warnings:
            print(f'  [warn]{w}')

    if failures:
        print()
        print('FAIL: assets au-dessus du budget bundle :')
        for f in failures:
            print(f'  [FAIL]{f}')
        print()
        print('Action : soit optimiser, soit augmenter le budget dans')
        print('  scripts/check_bundle_size.py si la croissance est légitime.')
        return 1

    print()
    print('OK: tous les bundles dans leur budget.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
