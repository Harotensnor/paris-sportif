# Data sources

[Architecture](Architecture.md) · [Pipeline](Pipeline.md) · [Model](Model.md) · [Data sources](Data-sources.md) · [Deployment](Deployment.md) · [Testing](Testing.md) · [Contributing](Contributing.md) · [FAQ](FAQ.md)

## Sources principales

| Source | Usage | Criticité |
|---|---|---|
| Winamax | Bookability, cotes, marchés | Critique |
| ESPN | Calendrier, scores, events multi-sport | Critique |
| Sofascore | Lineups, injuries, refs | Haute |
| ClubElo | Force équipe foot | Moyenne |
| Open-Meteo | Météo match | Moyenne |
| Sackmann | Tennis historique | Moyenne |
| MLB/NBA/NHL sidecars | Props et contexte US | Moyenne |
| Backtest outputs | Calibration, drift | Haute |
| LocalStorage | Préférences et suivi user | Local only |

## Règle d'or

Une source annexe peut être en warning ; elle ne doit pas rendre le tableau
vide. Les sources critiques doivent produire un message clair si elles tombent.

## Voir aussi

- [Pipeline](Pipeline.md)
- [SCHEMAS](../SCHEMAS.md)
