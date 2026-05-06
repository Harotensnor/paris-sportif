# Backlog — post v35.502

## P0

- Affiner `validate_data_quality.py`: ne pas compter les score exacts > 50 comme corruption si le marché est explicitement `exactScore`, ou les classer `long_shot_odd` au lieu de `bad_odd`.
- Réduire les warnings `health.json`: distinguer alertes actuelles, alertes 7 jours, sources optionnelles et données bloquantes.
- Ajouter un test automatisé qui vérifie que la page Historique affiche au moins 100 picks sur J-1 quand l'archive les contient.

## P1

- Phase 2: calibration sport/marché/cote/ligue avec drift documenté.
- Phase 2: `ensemble_weights.json` avec Poisson, Dixon-Coles, Elo, LightGBM.
- Couverture sports étendue: brancher des fetchers réellement bookables pour handball, volley, e-sports, cyclisme, ski, athlétisme et NFL playoffs avant de générer des picks.
- Couverture sports étendue: transformer la watchlist rugby / tennis Challenger / foot féminin en picks uniquement quand Winamax exact expose les marchés.
- Phase 3: audit a11y avancé sur focus order, labels et navigation clavier.
- Phase 4: budget bundle CI complet (`app.js`, `app.css`, sidecars).
- Phase 5: documentation `docs/PIPELINE.md`, `docs/MODEL.md`, `docs/DATA_SOURCES.md`.

## P2

- Backtest multi-stratégies: flat, Kelly fractionné, value-only, sharp-only.
- Monte Carlo ROI / drawdown.
- Refactor conditionnel d'`app.js` en modules si le budget maintenance l'exige.
- Préparation i18n par extraction progressive des chaînes.
