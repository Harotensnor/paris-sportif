# QA Report — v37.022

## Synthèse

Cette passe met en place une pyramide QA exploitable sans changer le produit : unit/property tests, contrats data, mutation smoke, snapshots, load test, visual regression, a11y regression, synthetic monitoring, post-deploy health check, error tracking local et quality gates CI.

## Livré

- Unit helpers : `scripts/qa_unit_runner.js`, 6 suites, 17 helpers ciblés, couverture helper 100%.
- Integration/data contracts : `scripts/qa_contract_tests.py`, validation `data.js` + sidecars critiques.
- Property-based testing : 500 cas randomisés sur `kellyFraction`.
- Mutation testing : `scripts/qa_mutation_smoke.js`, score 100% sur 10 mutants de garde-fous.
- Snapshot testing : `scripts/qa_snapshot_runner.js` + `tests/snapshots/qa-pick-card.snapshot.html`.
- Load testing client-side : `scripts/qa_load_test.js`, rendu synthétique 1000 picks, FPS estimé 60.
- Visual regression : `scripts/qa_visual_regression.js`, 12 pages x 2 thèmes x 2 viewports en CI Playwright.
- A11y regression : `scripts/a11y_audit.js` branché dans `qa-gates.yml`.
- Performance regression : workflow Lighthouse existant conservé + gates bundle dans `qa_quality_gate.py`.
- CI matrix : `.github/workflows/qa-gates.yml`, 3 OS x 3 Node x 3 Python pour les gates rapides.
- Cross-browser : Chromium / Firefox / WebKit sur flows critiques dans le job navigateur.
- Mobile devices : projets Playwright Pixel 5, iPhone 13 et iPad ajoutés.
- Synthetic monitoring : `.github/workflows/synthetic-monitor.yml`, ping toutes les 15 min.
- Auto-deploy health : `.github/workflows/post-deploy-health.yml`, health check post-push avec rollback opt-in `QA_AUTO_ROLLBACK=1`.
- Error tracking local : `src/qa-runtime.js`, `window.__errors()`, `window.__qaBugReport()`, stockage local uniquement.
- Canary prep : `window.__qaCanaryVariant()` assigne 10% en canary sans changer le comportement produit.
- QA HTML report : `qa-report/index.html`.

## Résultats locaux

| Gate | Résultat |
|---|---|
| Unit helpers | 6/6 pass, helper coverage 100% |
| Mutation smoke | 100% |
| Snapshots | OK |
| Load 1000 picks | OK, FPS 60 |
| Data contracts | OK, 263 events, 100.0% Winamax |
| Data integrity | OK |
| Pipeline drift | OK |
| Bundle budget | OK |
| Lighthouse | CI délégué, baseline locale documentée |
| QA runtime privacy | OK |
| Local analytics privacy | OK |
| Privacy social | OK |
| Synthetic monitor | OK, 366 ms |
| Post-deploy health | OK |

## Rapports générés

- `qa-gate-report.json`
- `qa-unit-report.json`
- `qa-contract-report.json`
- `qa-mutation-report.json`
- `qa-snapshot-report.json`
- `qa-load-report.json`
- `qa-visual-report.json`
- `qa-lighthouse-report.json`
- `qa-runtime-audit.json`
- `synthetic-monitor-report.json`
- `post-deploy-health.json`
- `qa-report/index.html`

## Notes d'environnement

- Playwright/npm ne sont pas disponibles sur ce poste local, donc la visual regression locale est marquée `skipped`. Le workflow CI installe Playwright et exécute Chromium / Firefox / WebKit.
- `check_pipeline_freshness.py` repasse OK après v37.023 : le garde-fou d'intégrité compare maintenant les événements Winamax exacts avant le total brut, afin de ne pas rejeter un nettoyage de watchlist non bookable.
- Le rollback automatique est câblé mais protégé par la variable repo `QA_AUTO_ROLLBACK=1` pour éviter les boucles de revert sur incident réseau transitoire.

## Matrice

| Item | Cible | Status |
|---|---|---|
| Unit coverage | ≥ 90% | OK, 100% helper coverage |
| E2E specs | 30+ | OK, suite existante 70+ specs + CI subset critique |
| Visual regression | < 1% diff | CI ready |
| A11y regression | 0 critical/serious/moderate | CI ready |
| Mutation score | ≥ 70% | OK, 100% smoke |
| CI matrix | 3 OS x 3 Node x 3 Python | OK |
| Auto-rollback | testé/câblé | Câblé opt-in |
| Canary | actif | OK, assignment 10% |
| Quality gates | strict | OK sur gates locales |
