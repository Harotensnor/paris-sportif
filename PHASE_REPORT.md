# Phase Report — v35.502

Date: 2026-05-05

## Phase 7 — Couverture marchés étendue

Status: livré (`v36.014` → `v36.024`).

### Livré

- Marchés joueurs foot: buteur, 2+ buts et carton joueur via `football_player_props.json/js`.
- Marchés joueurs basket: points, rebonds, passes et 3-points via `nba_player_props.json/js`.
- Asian handicap quart-point et total asiatique quart-point dans le modèle Poisson étendu.
- Score correct mi-temps / temps plein: matrice complète des 9 combinaisons HT/FT.
- Marchés stats foot: corners, cartons et fautes via `total_corners.json/js`, `total_cards.json/js`, `total_fouls.json/js`.
- Première et dernière équipe à marquer, BTTS deux mi-temps, totaux basket Q1/Q2/Q3/Q4.
- Tennis: total jeux match, jeux par set et nombre de sets.
- MLB/NHL: strikeouts pitcher, HR allowed, totaux NHL et 1ère période via les sidecars existants.
- Same-game builders: combinés même match avec probabilité brute + probabilité corrigée par corrélation.

### Métriques après passe

- `football_player_props.json`: 75 matchs, 592 props.
- `nba_player_props.json`: 17 matchs, 256 props.
- Stats foot: 188 matchs couverts sur corners/cartons/fautes.
- MLB/NHL props: sidecars JS générés et chargés dans `pronostics.html`.
- Same-game builders: 10+ tickets corrélés disponibles sur le snapshot local quand un match foot exact propose plusieurs marchés.

### Validation effectuée

- Syntaxe `app.js`: OK.
- `python scripts/check_pipeline_drift.py`: OK, 0 drift.
- `python scripts/build_health.py`: OK, `health.json` régénéré (`warning` local car snapshot vieux de 90 min).
- Suite Phase 7 Chromium desktop: 9 passed, 0 failed.
- Test ciblé same-game desktop + mobile: 2 passed, 0 failed.

### Points reportés

- Les props MLB/NHL restent dépendantes des sidecars existants; pas de nouvelle source live ajoutée dans cette passe.
- Les probabilités same-game sont heuristiques et conservatrices; elles devront être recalibrées avec `picks_history.jsonl` quand les tickets corrélés auront assez d'historique réglé.

## Phase 6 — Modèle V4 contextuel

Status: livré en couche gardée (`v36.001` → `v36.013`).

### Livré

- Priors bayésiens équipe via `team_priors.json` / `team_priors.js`, blendés dans Poisson quand les deux équipes ont assez d'historique.
- Patterns saison via `season_phase.json`, avec decay de confiance early/cup et exposition dans Crédibilité.
- Contexte compétition Cup / League / Continental, avec badges dans la modale détail.
- Impact stars absentes via `star_players.json`, croisé avec blessures et injecté dans les lambdas foot.
- Decay xG paramétrable par ligue via `xg_decay_params.json`.
- Voyage et densité calendrier via `team_travel.json` et `schedule_density.json`.
- Tendances arbitres via `referee_stats.json`, avec boost home-bias borné.
- Surface tennis, goalies NHL et pitchers MLB via `tennis_elo_surface.json` et `goalie_pitcher_context.json`.
- Effets stade, tenure coach, derbies et stats équipe étendues via sidecars dédiés.
- Benchmark `MODEL_V4_BENCHMARK.md`: V4-A promu comme couche gardée, tous les nudges étant bornés.
- Anomaly guard: les gaps modèle/marché >15pt sont plafonnés à 12pt et visibles sur Santé, au lieu de skipper le pick en silence.
- Test Playwright `tests/model-v4-context.spec.js` couvrant le chargement des sidecars V4 et l'accès prédiction.

### Métriques après passe

- `team_priors.json`: 3730 équipes, dont 1306 football.
- `season_phase.json`: 68 ligues.
- `star_players.json`: 769 stars, 187 équipes.
- `xg_decay_params.json`: 32 ligues football.
- `team_travel.json` / `schedule_density.json`: 278 matchs.
- `referee_stats.json`: 105 arbitres, 36 top-5.
- `tennis_elo_surface.json`: 710 joueurs.
- `goalie_pitcher_context.json`: 49 matchs NHL/MLB.
- `stadium_effects.json`: 244 stades.
- `coach_tenure.json`: 427 équipes.
- `derbies.json`: 53 rivalités.
- `team_stats_extended.json`: 367 équipes.
- `model_anomalies_summary.json`: 215 événements 1N2 scannés, 0 overround outlier au dernier run.

### Validation effectuée

- Syntaxe `app.js`: OK.
- `python -m py_compile` sur les scripts V4 finaux: OK.
- `python scripts/check_pipeline_drift.py`: OK, 0 drift.
- `python scripts/build_health.py`: OK, `health.json` régénéré avec les sources V4.
- `npx playwright test tests/model-v4-context.spec.js --project=chromium-desktop --project=mobile-chromium`: 2 passed, 0 failed.

### Points reportés

- Backtest complet six mois V4 vs V3 en vrai replay historique: reporté jusqu'à ce que suffisamment de picks V4 taggés soient réglés.
- Les effets contextuels sont volontairement bornés; la prochaine passe doit mesurer leur poids par sport avant d'augmenter l'amplitude.
- `health.json` peut rester en `warning` quand le snapshot local vieillit entre deux ticks; la prod doit être jugée après le prochain cron.

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

## Phase 8 — Mobile UX dédiée

Status: livré.

### Livré

- Layout mobile compact des cards dashboard, avec table masquée et cards verticales sous 720px.
- Swipe horizontal entre jours et swipe vertical sur carte pour ouvrir le détail.
- Pull-to-refresh haptique avec seuil 80px, état prêt et toast de confirmation.
- Modale détail en bottom sheet mobile avec poignée, snap 50/90/full et drag-down to close.
- Filtres dashboard sticky puis compacts pendant le scroll long.
- Audit zones tactiles: boutons/filtres/cards/modale/topbar/bottom nav à 48px sur mobile.
- Menu long-press sur pick: favoris, comparer, suivre 1u, ouvrir le détail.
- Partage natif depuis la modale avec deep-link #match/<id>/<onglet>.
- Filtres rapides mobile: Aujourd'hui, Locks, Top edges, Foot only.
- Badges de tier compacts: S, SO, V, B, O.

### Validation effectuée

- Syntaxe app.js: OK.
- Suite Playwright Phase 8 mobile: 9 passed, 0 failed.
- Lighthouse fallback: 8 audits à 100 perf / 100 a11y / 100 SEO.
- Pipeline drift: OK, 0 drift.

### Points reportés

- Gestes avancés type long-press multi-actions sur pages secondaires hors dashboard: à garder pour une passe future si usage réel.
- Haptics dépendant du navigateur: fallback silencieux conservé quand navigator.vibrate est indisponible.

