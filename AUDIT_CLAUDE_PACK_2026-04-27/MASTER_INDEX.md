# Master index du pack

Ce pack est construit pour donner a Claude :

- le contexte ;
- les preuves ;
- les snapshots du live ;
- les causes probables ;
- des options de correction ;
- des scripts de verification.

## Lecture ultra rapide

1. `04_RESUMES_POUR_CLAUDE/PROMPT_A_COLLER_DANS_CLAUDE.md`
2. `04_RESUMES_POUR_CLAUDE/TOP_FINDINGS_A_ARBITRER.md`
3. `09_BACKEND_ROOT_CAUSE/ROOT_CAUSE_BACKEND.md`
4. `06_ANALYSES_SUPPLEMENTAIRES/QUALITE_DATA_SIGNAL.md`
5. `09_BACKEND_ROOT_CAUSE/PATCH_BLUEPRINTS_OPTIONNELS.md`

## Lecture complete

1. `00_LIRE_EN_PREMIER.md`
2. `01_RAPPORT_COMPLET/AUDIT-CODEX-2026-04-27.md`
3. `04_RESUMES_POUR_CLAUDE/RESUME_NEUTRE.md`
4. `04_RESUMES_POUR_CLAUDE/OPTIONS_A_ARBITRER.md`
5. `04_RESUMES_POUR_CLAUDE/QUESTIONS_A_POSER_AVANT_PATCH.md`
6. `06_ANALYSES_SUPPLEMENTAIRES/CARTOGRAPHIE_TECHNIQUE.md`
7. `09_BACKEND_ROOT_CAUSE/PIPELINE_MAIN_ANALYSIS.md`
8. `08_REPROS_ET_TESTS/RECETTE_MANUELLE_CLAUDE.md`
9. `08_REPROS_ET_TESTS/SCENARIOS_A_RETESTER_APRES_PATCH.md`

## Preuves brutes

- `02_PREUVES_BRUTES/` : JSON Playwright/data/perf/accessibilite.
- `03_CAPTURES/` : captures desktop/mobile/tablette.
- `07_SNAPSHOTS_LIVE/` : fichiers live captures pendant l'audit.
- `09_BACKEND_ROOT_CAUSE/scripts_main_snapshot/` : scripts backend de `main`.

## Outils

- `10_OUTILS_RELECTURE_CLAUDE/verify_data_quality.py`
- `10_OUTILS_RELECTURE_CLAUDE/RUNBOOK_EXECUTION_CLAUDE.md`
- `10_OUTILS_RELECTURE_CLAUDE/DECISION_TREE.md`

## Backlog

- `11_BACKLOG_ET_TICKETS/BACKLOG_PRIORISE.csv`
- `11_BACKLOG_ET_TICKETS/TICKETS_CLAUDE.md`
- `11_BACKLOG_ET_TICKETS/HANDOFF_MESSAGE_COURT.md`

## Top signal

Le point le plus important n'est probablement pas visuel : c'est la qualite des donnees.

Priorites a juger :

1. contamination inter-sports `team_stats` ;
2. cotes externes utilisees avant Winamax exact ;
3. faux vert de `health.json` ;
4. meteo geocodee sur lieux ambigus ;
5. seulement ensuite UX/modal/mobile.
