# Model

[Architecture](Architecture.md) · [Pipeline](Pipeline.md) · [Model](Model.md) · [Data sources](Data-sources.md) · [Deployment](Deployment.md) · [Testing](Testing.md) · [Contributing](Contributing.md) · [FAQ](FAQ.md)

## Responsabilité

Transformer les matchs bookables Winamax en picks lisibles, scorés,
dédupliqués et cohérents.

## Couches

- Baseline : Poisson, Dixon-Coles, Elo et forme récente.
- Signaux : météo, lineups, injuries, arbitres, travel, schedule density,
  contexte ligue.
- Calibration : Brier, ROI, CLV, backtest, drift detection.
- Qualité pick : score composite, edge capé, variété marché, cohérence
  same-match.

## Principes

1. Ne jamais afficher de certitude artificielle.
2. Préférer un pick moyen mais explicable à un outlier opaque.
3. Séparer performance modèle et bilan personnel.
4. Garder la fraîcheur data visible.

## Voir aussi

- [API reference](../API_REFERENCE.md)
- [Glossary](../GLOSSARY.md)
