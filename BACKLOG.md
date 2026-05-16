# Backlog — post v35.502

## P0 — Desktop Sprint 71 différé (gros chantier 1-2 jours)

**ESM split `desktop/src/engine/runtime/legacy-app.js`** (36 976 lignes, 1.93 MB)

Conséquences du monolithe actuel :
- Éditeurs lents (VS Code freeze 2-3s à l'ouverture)
- Conflits Git fréquents sur 1 seul fichier énorme
- Refactoring impossible sans casser quelque chose
- Boot Electron ~38s (parsing + eval JS)

Plan de découpe ESM (8-10h estimé, à faire en sprint dédié) :
- `core/` : predictMatch, _applyCalibration, _v45PlattBoost, _calibrateProb (~3000 lignes)
- `markets/` : selectBestMarket, buildMarketCandidates, _v35AddCandidate, poissonMarketsExtended (~4000 lignes)
- `calibration/` : calibration_method, prob_calibration loader, isotonic helpers (~1500 lignes)
- `signals/` : trust score, segment validation, signal conflict (~3000 lignes)
- `ui-bridge/` : exports window.X = Y, render hooks (~500 lignes)
- `enrichment/` : web enrichment, news watcher, lineups (~4000 lignes)
- `legacy-misc/` : tout le reste (~21 000 lignes encore à trier)

Conservation : pas de bundler npm, juste ESM natif dans JSDOM avec `vm.SourceTextModule` ou eval module-by-module.

Pré-requis : étendre la **suite de tests** Sprint 70 (safe-assessment, calibration) vers couverture pickGeneration / marketSelection / userBetTracking avant le split (sinon impossible de valider qu'on n'a rien cassé).

## P0

- Pipeline freshness locale: `check_pipeline_freshness.py` échoue sur le snapshot main (92min). Un refresh local rapide remet l'âge à 0min mais `check_data_integrity.py` refuse le résultat car la couverture passe de 1018 à 240 events; investiguer pourquoi `patch_winamax.py` ne conserve que 23% malgré un catalogue Winamax à 771 matchs.
- ~~Affiner `validate_data_quality.py`: ne pas compter les score exacts > 50 comme corruption si le marché est explicitement `exactScore`, ou les classer `long_shot_odd` au lieu de `bad_odd`.~~ ✅ Fait — `classify_odd()` distingue `LONG_SHOT_MARKETS` (exact_score, htft → seuil 1000) et `ELEVATED_MARKETS` (team_total, ht_*, result_btts → seuil 100). Quarantaine 479 → 297 events, 2709 long-shot odds bien réétiquetés (rapport `data_quality_report.json` expose `long_shot_odd_total`/`long_shot_by_market`). Couvert par `tests/test_validate_data_quality.py`.
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
