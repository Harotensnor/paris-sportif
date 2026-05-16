# Backlog — post v35.502

## Desktop Sprint 80+ — Suite après Sprints 73-79

### Sprint 80 — Compositions visuelles 11vs11 enrichies (D3)
Sprint 60 a posé `buildPitchColumn` (terrain SVG simple). Sprint 80 enrichit :
- Positions précises sur le terrain selon formation (4-3-3, 4-2-3-1, 3-5-2, etc.)
- Star players highlight gold border (lit `star_players.json` quality_score >= 70)
- Indicateur titulaire (gros cercle) vs suppléant probable (petit cercle gris)
- Coach name au-dessus du terrain
- Effort M (3-4h)

### Sprint 81 — Player props inline (D4)
Cross-link `winamax_markets.scorer` ↔ lineups confirmées :
- Card cliquable "Mbappé buteur @2.10 · 47% modèle" sous chaque équipe sur le terrain
- Filtre titulaires seulement (suppléants → masqué)
- Click → ouvre la modal détail buteur dédiée (existante)
- Effort M (3h)

### Sprint 82 — Historique cotes Winamax 72h (D7)
- Indexer `odds_history.jsonl` par `match_id` au boot (Map<id, timestamps[]>)
- Mini-graph SVG dans la modal détail "cotes 72h" : ligne d'évolution
- Annotations : cote ouverte / cote actuelle / closing (si match passé)
- Indicateur ↑↓ % vs cote ouverte
- Effort M (3-4h)

### Sprint 83 — Performance critique (E1+E2+E3)
- **E1 Lazy-load WMK** : afficher dashboard avec data lite d'abord, hydrate `winamax_markets.json` après. Boot 38s → 10s. Effort M (3-4h).
- **E2 JSDOM cache séparé** : invalidation granulaire au lieu de tout refaire si 1 sidecar bouge. Effort M (3h).
- **E3 Pre-computed picks JSON** : pipeline Python pré-calcule `desktop_dashboard.json`. Electron lit juste ce JSON. Boot ~3s. Effort L (1j).

### Sprint 84 — Multi-sport calibration (C2) — BLOQUÉ DATA
**Pré-requis** : étendre `snapshot_odds.py` à capturer cotes per-marché multi-sport. Actuellement `picks_history.jsonl` est 96% football → impossible de calibrer tennis/baseball/hockey/basket par marché (n<30 par segment).

Plan une fois data prête :
- Étendre `build_prob_calibration.py` à grouper par `(sport, market)` (déjà `bins_by_sport`, à enrichir `bins_by_sport_market`).
- Runtime `_calibrateProb` route hiérarchique : `(sport, market)` > `market` > `sport` > global.
- Étendre `_V45_LEAGUE_OFFSETS` par sport (NHL, NBA, MLB avec cotes US converties decimal).

Effort L (1-2j) une fois data dispo.

### Sprint 85 — Sharp money + multi-bookmaker (C4+C5) — BLOQUÉ API KEY
**Pré-requis** : secret GitHub `THE_ODDS_API_KEY` (free tier 500 calls/mois suffisant pour 10 ligues quotidien).

Plan :
- `scripts/fetch_sharp_money.py` : pull cotes Pinnacle via TheOddsAPI, compare vs Winamax.
- Inject `ev.sharp_money = { aligned: bool, drop_pct, source: 'pinnacle' }` dans `data.js`.
- Frontend : badge 🦈 dans cards quand aligned (boost confiance) ou disagree (warn reverse line movement).
- Multi-bookmaker comparison : "Best odd: 2.10 chez Unibet vs 1.95 Winamax (+8%)" sur cards.

Effort M total (6-7h).

### Sprint 86 — Live picks <30min (C7)
- Fetcher live ciblé : refresh `data.js` toutes les 5 min sur matchs avec kickoff < 30 min.
- Frontend : indicateur cote movement (↑↓ %) sur les cards.
- Notif push "Cote en mouvement +8% sur ${match}".
- Effort M (4-5h).

### Sprint 87 — Mode tactique (D8)
Sub-tab "Tactique" dans la modal détail :
- Formation visuelle home vs away (3D-like via CSS transforms ou Canvas).
- Heatmap zones force/faiblesse (lit `team_priors.json` defensive/offensive ratings).
- xG défensif/offensif comparé.
- Effort L (1j).

### Sprint 88 — Sync multi-device (F5)
- Encrypt profil JSON (paris + prefs + favoris) avec passphrase user → push vers Gist privé GitHub via PAT.
- Pull au boot autre PC : prompt passphrase, decrypt, merge.
- Conflict resolution : prendre le plus récent timestamp par bet.
- Effort L (1j).

### Sprint 89 — ESM split legacy-app.js (G1) — BLOQUÉ PRÉ-REQUIS
**Pré-requis** : étendre les tests intégration Sprint 70 vers couverture pickGeneration / marketSelection / userBetTracking AVANT le split (sinon impossible de valider qu'on n'a rien cassé). Effort L (1j G2) + XL (1-2j G1) = sprint dédié 2-3j.

Plan G2 (tests préalables) :
- `desktop/scripts/pick-generation-check.js` : pour N=20 matchs aléatoires, vérifier que `_v37PickPoolRaw` retourne stable pour même data.
- `desktop/scripts/market-selection-check.js` : `selectBestMarket` retourne le même candidate top sur 50 matchs.
- `desktop/scripts/user-bet-tracking-check.js` : `_addUserBet` + `_settleUserBets` cycle complet.

Plan G1 (split) :
- `core/` : predictMatch, _applyCalibration, _v45PlattBoost, _calibrateProb (~3000 lignes)
- `markets/` : selectBestMarket, buildMarketCandidates, _v35AddCandidate, poissonMarketsExtended (~4000 lignes)
- `calibration/` : calibration_method, prob_calibration loader, isotonic (~1500 lignes)
- `signals/` : trust score, segment validation, signal conflict (~3000 lignes)
- `ui-bridge/` : exports window.X = Y, render hooks (~500 lignes)
- `enrichment/` : web enrichment, news watcher, lineups (~4000 lignes)
- `legacy-misc/` : reste (~21 000 lignes encore à trier)

Approche : ESM natif via `vm.SourceTextModule` Node 17+ ou eval module-by-module dans JSDOM.

## P1 — Desktop Sprint 72 différés (plan UX/pronostics maximum)

Items du plan d'amélioration "tout" mais non-faisables en une session :

### Pronostics premium (nécessitent données externes)
- **C2 — Calibration multi-sport per-market** (tennis jeux/sets, baseball NRFI/runline, hockey puckline, basket handicap/total) — exige `picks_history.jsonl` enrichi par sport (actuellement 96% football). Sample n>=30 par marché-sport nécessaire. **Effort L** (1-2j) ; **pré-requis** : étendre `snapshot_odds.py` à capturer cotes per-marché multi-sport.
- **C4 — Sharp money tracking via TheOddsAPI** — TheOddsAPI free tier 500 calls/mois suffisant pour ~10 ligues quotidien. Nécessite secret `THE_ODDS_API_KEY` + fetcher `scripts/fetch_sharp_money.py` qui compare Winamax vs Pinnacle (proxy sharp). **Effort M** (3-4h) ; impact direct sur la confiance des picks.
- **C5 — Multi-bookmaker comparison** — mêmes données TheOddsAPI, affichage "best odd: 2.10 chez Unibet vs 1.95 Winamax (+8%)". User reste Winamax-only mais voit le coût d'opportunité. **Effort M** (3h).
- **C7 — Live picks <30min** — pipeline live continu (refresh ciblé toutes les 5 min sur matchs proches kickoff). Surface cote movement (↑↓ %) sur la card. **Effort M** (4-5h) ; **pré-requis** : fetcher live qui ne touche que les events < 30 min.

### Fiches match
- **D2 — H2H expanded** (10 derniers H2H avec scores cliquables, streak detection). Nécessite `h2h_extended.json` enrichi avec scores. **Effort M** (3h).
- **D3 — Compositions visuelles 11vs11 enrichies** : terrain SVG avec positions, star players highlight. Sprint 60 a posé `buildPitchColumn`, à étendre. **Effort M** (3-4h).
- **D4 — Player props inline** : "Mbappé buteur @2.10 · 47% modèle" sous le terrain. Nécessite cross-link `winamax_markets.scorer` ↔ lineups confirmées. **Effort M** (3h).
- **D6 — Arbitre profile complet** (5 derniers matchs cartons/fautes/penaltys). Nécessite `referees_soccer.json` enrichi avec last_5_matches. Actuellement on a `yellowPerGame` global, à étendre. **Effort S** (2h).
- **D7 — Historique cotes Winamax 72h** (courbe ouverture vs closing). Nécessite `odds_history.jsonl` ré-indexé par match_id avec timestamps. **Effort M** (3h).
- **D8 — Mode tactique** (formation visuelle, heatmap zones force/faiblesse) — chantier original. **Effort L** (1j).
- **D10 — Modal preview au hover** (mini-popover 3 KPIs sans ouvrir la modale). **Effort M** (3h).

### Performance & robustesse
- **E1 — Lazy-load winamax_markets.json post-boot** : dashboard avec data lite d'abord, hydrate markets après. Boot 38s → ~10s. **Effort M** (3-4h).
- **E2 — JSDOM cache séparé** du analysisCache : invalidation granulaire au lieu de tout refaire. **Effort M** (3h).
- **E3 — Pre-computed picks JSON** : pipeline Python pré-calcule `desktop_dashboard.json` qui contient tous les picks ranked. Electron lit juste ce JSON. Boot ~3s. **Effort L** (1j).

### Personnalisation
- **F3 — Notifications custom** ("Notifie-moi si PSG joue + edge >3pt") via règles user-defined. **Effort M** (3h).
- **F5 — Sync multi-device** via Gist privé GitHub. **Effort L** (1j).
- **F7 — Goals & achievements** badges progressifs ("10 paris suivis", "7 jours streak"). **Effort S** (2h).

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
