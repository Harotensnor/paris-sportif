# Contributing

## Principes

- Protéger le tableau de pronostics avant toute amélioration cosmétique.
- Préserver la fraîcheur data et le cache busting.
- Documenter les décisions longues dans `docs/adr/`.
- Garder les changements par sprint petits et vérifiables.

## Tests recommandés

```powershell
node --check app.js
node --check legacy-app.js
python scripts/check_pipeline_drift.py
python scripts/check_data_integrity.py
python scripts/audit_privacy_features.py
```

## Commits

Format :

`vXX.YYY section — résumé court · diff +A/-B`

## Pull requests

Inclure :

- Objectif utilisateur.
- Fichiers touchés.
- Vérifications faites.
- Risques restants.
