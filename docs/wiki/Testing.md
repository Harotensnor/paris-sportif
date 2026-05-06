# Testing

[Architecture](Architecture.md) · [Pipeline](Pipeline.md) · [Model](Model.md) · [Data sources](Data-sources.md) · [Deployment](Deployment.md) · [Testing](Testing.md) · [Contributing](Contributing.md) · [FAQ](FAQ.md)

## Tests rapides

- Syntaxe scripts : `node --check`.
- Inline scripts HTML : extraction puis `new Function`.
- Pipeline : `python scripts/check_pipeline_drift.py`.
- Données : `python scripts/check_data_integrity.py`.
- Privacy : `python scripts/audit_privacy_features.py`.

## Tests navigateur

Les specs Playwright couvrent les flows critiques, mobile, a11y et modules
nouveaux. Les specs legacy supprimées ne doivent pas rester en échec permanent.

## Stratégie

Tester le chemin le plus utile pour Théo : tableau plein, filtres, modal,
Profil, Performance, FAQ/onboarding.

## Voir aussi

- [Contributing](Contributing.md)
