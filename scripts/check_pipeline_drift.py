#!/usr/bin/env python3
"""check_pipeline_drift.py — Détecte les divergences entre la pipeline
locale (auto_refresh.py) et la pipeline cron (.github/workflows/refresh.yml).

Pourquoi : la règle CLAUDE.md "chaque ajout `scripts/` doit atterrir dans
auto_refresh.py ET refresh.yml" est respectée à la main. Ce script la
mécanise — il liste tous les `scripts/*.py` invoqués par chaque pipeline,
puis affiche les éléments présents dans l'une mais pas dans l'autre.

Sortie :
- Code retour 0 : aucun drift, tout est aligné
- Code retour 1 : drift détecté (à corriger)

Usage :
    python scripts/check_pipeline_drift.py            # check + exit code
    python scripts/check_pipeline_drift.py --report   # markdown rapport
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUTO_REFRESH = ROOT / 'auto_refresh.py'
REFRESH_YML = ROOT / '.github' / 'workflows' / 'refresh.yml'

# Scripts existants dans scripts/ (ground truth)
SCRIPTS_DIR = ROOT / 'scripts'

# Scripts qui ne doivent PAS être dans la pipeline (utilitaires
# manuels, smoke tests, modules importés par d'autres scripts).
EXCLUDED = {
    'model_loader.py',          # module helper importé par backtest_v2.py
    'winamax_map.py',           # module helper importé par 7+ scripts
    '_data_io.py',              # v31.7.8 : module helper partage data.js I/O
    'backtest_v2.py',           # cron hebdo dédié (backtest.yml), pas refresh
    'backtest_baselines.py',    # outil de recherche, pas en prod
    'check_pipeline_drift.py',  # ce script lui-même
    'check_no_conflict_markers.py',  # CI safety net, pas pipeline
}


def list_scripts_dir() -> set[str]:
    """Tous les fichiers .py du dossier scripts/."""
    if not SCRIPTS_DIR.exists():
        return set()
    return {p.name for p in SCRIPTS_DIR.iterdir() if p.suffix == '.py'}


def parse_auto_refresh() -> set[str]:
    """Extrait les scripts référencés dans FETCH_STAGES + PATCH_STAGES."""
    if not AUTO_REFRESH.exists():
        return set()
    text = AUTO_REFRESH.read_text(encoding='utf-8')
    # Pattern : ('script.py', cadence, timeout)
    matches = re.findall(r"\(\s*'([\w_]+\.py)'", text)
    return set(matches)


def parse_refresh_yml() -> set[str]:
    """Extrait les scripts invoqués par 'python3 X.py' dans refresh.yml."""
    if not REFRESH_YML.exists():
        return set()
    text = REFRESH_YML.read_text(encoding='utf-8')
    matches = re.findall(r'python3?\s+([\w_]+\.py)', text)
    return set(matches)


def main() -> int:
    report_mode = '--report' in sys.argv

    on_disk = list_scripts_dir() - EXCLUDED
    in_local = parse_auto_refresh()
    in_prod = parse_refresh_yml()

    only_local = (in_local - in_prod) - EXCLUDED
    only_prod = (in_prod - in_local) - EXCLUDED
    missing_from_disk = (in_local | in_prod) - on_disk - EXCLUDED
    on_disk_unused = on_disk - in_local - in_prod - EXCLUDED

    drift = bool(only_local or only_prod or missing_from_disk)

    if report_mode:
        print('# Pipeline drift report')
        print()
        print(f'- `scripts/*.py` on disk        : **{len(on_disk)}**')
        print(f'- referenced in auto_refresh.py : **{len(in_local)}**')
        print(f'- referenced in refresh.yml     : **{len(in_prod)}**')
        print()
        if only_local:
            print('## Présents en local SEULEMENT (pas dans cron)')
            for s in sorted(only_local):
                print(f'- ❌ `{s}`')
            print()
        if only_prod:
            print('## Présents en cron SEULEMENT (pas en local)')
            for s in sorted(only_prod):
                print(f'- ❌ `{s}`')
            print()
        if missing_from_disk:
            print('## Référencés dans pipeline mais absents du disque')
            for s in sorted(missing_from_disk):
                print(f'- ⚠️ `{s}`')
            print()
        if on_disk_unused:
            print('## Sur disque mais inutilisés (ni cron ni local)')
            print('*Souvent OK : utilitaires, scripts one-shot, modules helpers.*')
            for s in sorted(on_disk_unused):
                print(f'- 💤 `{s}`')
            print()
        if not drift:
            print('## ✅ Aucun drift détecté')
        return 1 if drift else 0

    # Mode CLI standard
    print('[check_pipeline_drift] Vérification…')
    print(f'  scripts/ on disk : {len(on_disk)} fichiers')
    print(f'  auto_refresh.py  : {len(in_local)} référencés')
    print(f'  refresh.yml      : {len(in_prod)} référencés')

    if only_local:
        print()
        print(f'  [DRIFT] {len(only_local)} script(s) en LOCAL mais pas en CRON :')
        for s in sorted(only_local):
            print(f'      - {s}')
    if only_prod:
        print()
        print(f'  [DRIFT] {len(only_prod)} script(s) en CRON mais pas en LOCAL :')
        for s in sorted(only_prod):
            print(f'      - {s}')
    if missing_from_disk:
        print()
        print(f'  [WARN]  {len(missing_from_disk)} script(s) reference(s) mais absent(s) du disque :')
        for s in sorted(missing_from_disk):
            print(f'      - {s}')
    if on_disk_unused:
        print()
        print(f'  [INFO] {len(on_disk_unused)} script(s) sur disque non reference(s) (souvent OK : helpers, modules) :')
        for s in sorted(on_disk_unused):
            print(f'      - {s}')

    if drift:
        print()
        print('  [FAIL] Drift detecte. Synchroniser auto_refresh.py et refresh.yml.')
        return 1
    print()
    print('  [OK]   Pipeline alignee. Aucun drift.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
