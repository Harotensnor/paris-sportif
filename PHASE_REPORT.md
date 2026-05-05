# Phase Report — v35.502

Date: 2026-05-05

## Phase 1 — Fondations data

Status: livré en passe large.

### Livré

- Archive append-only `picks_history.jsonl` avec dédup par `match_id|market_key|selection|kickoff_utc`.
- Résumé `picks_history_summary.json` avec KPI globaux, journées, sports, marchés et picks récents.
- Settling local via `scripts/settle_picks.py` et librairie partagée `scripts/picks_history_lib.py`.
- Backfill Git 14 jours via `scripts/build_picks_history.py --backfill-git-days 14`.
- Page Historique branchée sur l'archive persistante, avec affichage rétrospectif J-1/J-7 au lieu de dépendre de la rolling window `data.js`.
- Page Performance clarifiée: "Performance modèle" = pronos générés, "Bilan personnel" = paris suivis manuellement.
- Snapshot enrichi des cotes actives via `scripts/snapshot_pick_odds.py`.
- CLV enrichi dans `clv_history.json` / `clv_summary.json`, avec breakdown sport, marché, cote, ligue.
- Validation qualité non destructive via `scripts/validate_data_quality.py`, `data_quarantine.jsonl` et `data_quality_report.json`.
- Garde-fous UI sur probabilités, cotes, edge, EV, score et diagnostics `__diag()`.
- Pipeline alignée dans `auto_refresh.py` et `.github/workflows/refresh.yml`.
- Check fraîcheur `scripts/check_pipeline_freshness.py`.

### Métriques après passe

- `picks_history.jsonl`: 3441 pronos archivés.
- Picks réglés: 1932, dont 346 won, 739 lost, 847 void.
- Journée 2026-05-04: 101 picks rétrospectifs, 45W / 45L / 6 void / 5 pending.
- Data fraîche: `data.js` généré à 2026-05-05T20:36:30Z, check fraîcheur OK à moins de 30 minutes lors de la validation.
- Winamax: 278/278 events exacts après reseed local.
- Marchés détaillés: 278/278 events.
- Signaux: injuries 159, lineups 97, referee effectif 97, xG 185.
- Pipeline drift: 0 drift entre `auto_refresh.py` et `refresh.yml`.

### Points reportés

- Phase 2 à 5 non traitées dans cette passe: calibration profonde, cross-validation rolling, ensemble weights, régime, heatmap crédibilité, monitoring drift, refactor modules, documentation modèle complète.
- `data_quality_report.json` signale beaucoup de cotes quarantainées car les score exacts Winamax peuvent dépasser 50. Le tableau UI filtre déjà les cotes > 50; un raffinement côté validation est à prévoir pour distinguer "marché volontairement très long" et "cote corrompue".
- `health.json` reste `warning` avec 37 alertes non critiques, malgré donnée fraîche. Il faut séparer encore mieux les alertes historiques/non bloquantes des vraies alertes actionnables.

## Validation effectuée

- Syntaxe `app.js`: OK.
- `python -m py_compile` sur les nouveaux scripts: OK.
- `python scripts/check_pipeline_drift.py`: OK, 90 scripts alignés.
- `python scripts/check_pipeline_freshness.py --max-age-min 30`: OK après reseed local.
- `npx playwright test --project=chromium-desktop`: 208 passed, 10 skipped, 0 failed.
- Bundle budget: `app.js` 1660333 bytes / 1700000, `app.css` 266672 bytes / 360000.
