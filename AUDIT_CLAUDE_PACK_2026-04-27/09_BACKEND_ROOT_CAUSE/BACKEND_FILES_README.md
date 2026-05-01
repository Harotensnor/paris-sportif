# Backend files README

Ce dossier contient :

- `ROOT_CAUSE_BACKEND.md` : hypotheses de cause racine.
- `PIPELINE_MAIN_ANALYSIS.md` : lecture du workflow live.
- `PATCH_BLUEPRINTS_OPTIONNELS.md` : options de patch possibles, non prescriptives.
- `BACKEND_SCRIPT_INVENTORY.json` : inventaire automatique des scripts.
- `scripts_main_snapshot/` : copies des scripts de `main` au moment de l'audit.

## Attention

Ces fichiers sont des snapshots. Avant de patcher, Claude doit pull/verifier `origin/main`.

## Scripts les plus importants a relire

- `scripts__fetch_team_stats.py`
- `scripts__patch_team_stats.py`
- `scripts__snapshot_odds.py`
- `scripts__patch_winamax.py`
- `scripts__patch_winamax_markets.py`
- `scripts__winamax_map.py`
- `scripts__fetch_weather.py`
- `scripts__build_health.py`
- `.github__workflows__refresh.yml`
