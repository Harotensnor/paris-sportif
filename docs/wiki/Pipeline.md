# Pipeline

[Architecture](Architecture.md) · [Pipeline](Pipeline.md) · [Model](Model.md) · [Data sources](Data-sources.md) · [Deployment](Deployment.md) · [Testing](Testing.md) · [Contributing](Contributing.md) · [FAQ](FAQ.md)

## Objectif

Rafraîchir les événements, cotes, signaux, health checks et rapports sans
bloquer le site si une source annexe répond mal.

## Ordre canonique

`fetch → patch_odds → patch_winamax → patch_winamax_markets →
patch_injuries_soccer → patch_team_stats → patch_lineups_soccer →
patch_clubelo → patch_weather → patch_referees_soccer`

## Garde-fous

- `scripts/check_pipeline_drift.py` aligne `auto_refresh.py` et
  `.github/workflows/refresh.yml`.
- `scripts/check_data_integrity.py` vérifie que `data.js` reste dans une plage
  saine.
- `scripts/check_pipeline_freshness.py` bloque si les données sont trop vieilles.
- `health.json` expose pipeline, data, model, ui et tests.

## Debug rapide

1. Ouvrir la page Profil, section Santé data.
2. Lire `health.json`.
3. Relancer localement seulement le fetcher fautif.
4. Vérifier `pipeline_traces.jsonl`.

## Voir aussi

- [Runbook](../RUNBOOK.md)
- [Data sources](Data-sources.md)
