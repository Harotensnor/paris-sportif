# Paris-Sportif

> Tableau de pronostics sportifs Winamax-only, modèle multi-signaux, pipeline
> GitHub Pages et documentation pro pour auditer chaque chiffre.

[Live](https://harotensnor.github.io/paris-sportif/) · [Wiki](docs/wiki/Architecture.md) · [Runbook](docs/RUNBOOK.md) · [Glossary](docs/GLOSSARY.md) · [FAQ](docs/FAQ.md)

## Pourquoi ce projet

Paris-Sportif aide Théo à lire les marchés sportifs avec plus de discipline :
score qualité, edge expliqué, historique, backtest, santé data et suivi local.

## Stack rapide

- Frontend statique : `pronostics.html`, `legacy-app.js`, `app.js`, modules `src/`.
- Pipeline Python : fetchers + patchers dans `scripts/`.
- Données : `data.js`, sidecars JSON, `health.json`.
- Déploiement : GitHub Pages + cron GitHub Actions.

## Quickstart

```powershell
python -m http.server 8765
# puis ouvrir http://localhost:8765/pronostics.html
```

## Vérifier avant push

```powershell
python scripts/check_pipeline_drift.py
python scripts/check_data_integrity.py
python scripts/audit_privacy_features.py
```

## Documentation

- [Architecture](docs/wiki/Architecture.md)
- [Pipeline](docs/wiki/Pipeline.md)
- [Model](docs/wiki/Model.md)
- [Data sources](docs/wiki/Data-sources.md)
- [Deployment](docs/wiki/Deployment.md)
- [Testing](docs/wiki/Testing.md)
- [Contributing](CONTRIBUTING.md)
- [ADRs](docs/adr/)

## Responsabilité

18+ uniquement. Les probabilités ne garantissent jamais un résultat. Les
données personnelles et sociales ajoutées au site restent locales au navigateur.
