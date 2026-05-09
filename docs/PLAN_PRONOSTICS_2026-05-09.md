# Plan d'amélioration des pronostics — 2026-05-09

## Diagnostic actuel

### Métriques baseline
- **Backtest fenêtre courante** : n=29, WR 58.6%, ROI +14.5%, Brier 0.224 (5h, trop petit)
- **Backtest cumulé V2** : n=647, WR 53.3%, ROI 0.0%, Brier 0.231 (10 jours, plus fiable)
- **CLV pick-level** : -2.52% (alarmant : on prend des cotes pires que la fermeture)
- **Markets exposés** : 21 (post-v50.5, vs 5 avant)
- **Sports couverts** : foot 174, baseball 32, basket 23, hockey 18

### Signaux par sport (audit 2026-05-09)
| Sport | Signaux dans predictMatch | Couverture data |
|-------|---------------------------|-----------------|
| Football | Marché, xG/Poisson, Domicile, Bilan, Elo, H2H | form 99%, elo 84%, weather 95%, xG 36%, h2h 22% (variable), injuries 0% |
| Basketball | (presque rien) | form 96%, injuries 96%, form_stats 87% — sous-utilisé |
| Baseball | Pitcher partant | injuries 100%, pitchers 94% |
| Hockey | Pace, Goalie | injuries 94%, nhl_stats 89% |

---

## Phase 1 — IMMEDIATE (cette session)

### 1.1 Re-run backtest étendu
- **Action** : `python scripts/backtest_v2.py` sur fenêtre 30 jours (les fixes v50.0/v50.5/v50.6 changent les résultats)
- **Output attendu** : nouveau `backtest_report_v2.json` avec ≥1000 picks settled
- **Effort** : 5-10 min run, automatique via cron 4h backup

### 1.2 Audit "signal leaks"
- **Action** : pour chaque sport, vérifier que predictMatch reçoit tous les signaux disponibles dans data.js
- **Method** : grep/scan signal_unmatched.log + comparer competitor.X dispos vs utilisés dans predictMatch
- **Output** : `docs/SIGNAL_LEAKS_AUDIT.md`

### 1.3 Calibration check par marché
- **Action** : `python scripts/backtest_by_market.py` pour mesurer WR observé vs prédit par marché
- **Output** : Wilson 95% CI sur chaque marché (1n2, ou25, btts, dnb, ht_1n2 actuels)

---

## Phase 2 — Court terme (cette semaine, ~3 jours)

### 2.1 Basketball — gros gap signaux
**Statut actuel** : aucun signal dans predictMatch (juste form de base)

**Signaux à ajouter** :
1. **Pace NBA** : possessions/match → influence Plus/Moins points
2. **Off Rating / Def Rating** : points per 100 possessions (offense/défense)
3. **eFG%** : effective field goal % — meilleur prédicteur que FG%
4. **Home court advantage** : NBA = ~3.5 pts/match historiquement
5. **Recent form weighted** : last 5 weighted 2x, last 10 weighted 1x
6. **Back-to-back fatigue** : team jouant 2e match en 2 nuits = -2 to -3 pts (déjà partiel via Sprint 30)

**Source** : ESPN /teams/{id}/stats endpoint (déjà fetché dans nba_team_stats.json)

**Modification** : extends predictMatch sport='basketball' branch avec ~6 nouveaux components.push

**Impact estimé** : Brier 0.30+ (random) → 0.20-0.22 (good)

### 2.2 Baseball — bullpen + park factors
**Statut actuel** : juste pitcher partant ERA/WHIP

**Signaux à ajouter** :
1. **Park factors** : Coors Field +20% runs, Petco -15% runs (rosters MLB)
2. **Bullpen ERA** : derniers 7 jours ERA bullpen équipe
3. **Lineup vs LHP/RHP** : OPS contre lefty/righty pitcher
4. **Recent run differential** : last 10 games, attaque vs défense
5. **Travel fatigue** : 3+ matchs/7j, +cross-country travel

**Source** : MLB Stats API (déjà fetché partiellement dans mlb_pitchers.json)

**Modification** : 4-5 nouveaux components.push

**Impact** : Brier ~0.24 → 0.20 attendu

### 2.3 Football — wire up under-utilized signals
**Statut** : weather/refs/lineups/injuries SCRAPÉS mais pas tous DANS predictMatch

**Signaux à wire** :
1. **Referee strictness** : `match.referee.cardsPerGame` > 4.5 → reduce home advantage (refs sévères = plus de cartons home, surtout EPL)
2. **Weather** : `weather.precip_mm > 5` → +0.05 P(under 2.5), -0.05 P(over 2.5) (terrains gras = moins de buts)
3. **Lineups confirmed** : si starters confirmés < 80% titulaires habituels → -0.05 reliability
4. **Injuries titulaires** : 3+ titulaires absents → -0.10 prob équipe affectée

**Source** : déjà patché dans `event.referee`, `event.weather`, `event.competitors[].lineup`, `event.injuries`

**Modification** : ~4 new components dans predictMatch foot branch

**Impact** : déjà 0.224 Brier en 30j, attendu 0.21-0.22

### 2.4 Tennis — Surface form
**Statut** : Elo, Surface Elo, Forme L10, H2H tennis

**Signal à ajouter** :
- **Surface form L10** : performances joueur sur la surface SPÉCIFIQUE (clay/hard/grass) → différent de elo surface global
- **Recent injuries / withdrawals** : retiremements consecutifs dans les 4 dernières semaines

**Source** : tennis_ratings.json a player.last10 mais pas par surface

**Effort** : nécessite extension fetch_tennis_sackmann.py

---

## Phase 3 — Moyen terme (2 semaines)

### 3.1 Calibration per-marché (16 nouveaux markets v50.5)
- **Action** : étendre `backtest_by_market.py` pour calibrer corners_ou, cards_ou, exact_score, handicap, basket_handicap, puck_line, etc.
- **Output** : `calibration_per_sport_league_market.json` étendu
- **Frontend** : modal "Marchés alternatifs" affiche calibration tier (validated/cold/learning) per marché

### 3.2 Outsider strategy systematisation
**Backtest actuel** : Outsider-only (tier='out' + edge ≥5pt) = +121% ROI / 356 paris / max DD 3% / Sharpe 0.175 / **CHAMPION**

**Action** :
1. Créer un mode "Outsider only" plus accessible (déjà v43 partial)
2. Identifier les conditions réelles de l'outsider winning
3. Extension : `outsider_extended` = tier 'out' + edge 5pt + segment positif + lineup confirmed

### 3.3 Specialized models
**Idée** : un modèle SÉPARÉ par marché majeur (au lieu d'un seul predictMatch global)
- `predictCorners(match)` — modèle spécifique corners (basé sur attaque/défense, refs, ligue)
- `predictCards(match)` — modèle cartons (refs strictness, derby intensity)
- `predictBTTS(match)` — modèle Both Teams To Score (basé sur GF/GA pure)
- `predictExactScore(match)` — Poisson bivariate déjà existant, mais affiner

### 3.4 CLV investigation
**Symptôme** : -2.52% (on prend des cotes pires que la fermeture)

**Hypothèses à tester** :
1. snapshot_odds.py freeze trop tôt (cote initiale moins favorable)
2. Modèle trop agressif sur outsiders dont la cote baisse (le marché ajuste mieux)
3. Bias : on prend des picks que d'autres bookmakers vont mieux pricer (ils baissent la cote)

**Action** : analyser CLV breakdown par tier/marché/cote_bucket → identifier où le -2.5% se concentre

---

## Phase 4 — Long terme (1+ mois)

### 4.1 Ensemble model
**Concept** : combine 3 modèles en un :
1. **Statistical** (current predictMatch — Poisson/Elo)
2. **LightGBM** (déjà partial via lightgbm_weights.js)
3. **Bayesian priors** (déjà partial via bayesian_priors.json.gz)

**Method** : weighted ensemble avec poids appris via stacking sur historique

**Effort** : 1-2 semaines, gros lift

### 4.2 Live odds drift detection
**Concept** : tracker comment la cote bouge entre snapshot pré-match et closing
- Drop rapide cote home → home soutenu par sharps
- Hausse cote → soft money
- Stagnation → pas d'info

**Action** : `track_odds_drift.py` qui store les snapshots à T-24h, T-12h, T-6h, T-1h, T-0

### 4.3 Specialized markets (long-tail)
- Corner kicks model (par ligue, par compétition)
- Yellow cards model (par referee + match intensity)
- First goal model (par minute / quart d'heure)
- BTTS in both halves (combinaison existante)

---

## Métriques de succès

### Court terme (Phase 1+2)
- [ ] Brier < 0.220 (vs 0.231 baseline)
- [ ] Coverage signaux NBA > 70%
- [ ] Coverage signaux MLB > 80%
- [ ] Football lineups/injuries dans predictMatch

### Moyen terme (Phase 3)
- [ ] Calibration per-marché pour 16 nouveaux marchés
- [ ] CLV positive (>0%, target +1%)
- [ ] Outsider strategy automatisée

### Long terme (Phase 4)
- [ ] Brier < 0.200 (good model)
- [ ] ROI flat backtest > +5% (cumulated 1000+ picks)
- [ ] Live odds drift integration

---

## Quick wins immédiats (à attaquer dans le prochain sprint)

### A — Football injuries dans predictMatch (1h)
v50.4 a fixé soccer_injuries fetcher, seed pushé. Maintenant il faut que predictMatch USE ces données.
Currently: `match.injuries` is parsed but not weighted in foot branch.
Fix : add `if (injuries.home_known >= 3) reliability *= 0.93` etc.

### B — Basketball signals (2-3h)
Add 5 components.push pour basket dans predictMatch — utiliser `nba_team_stats.json` data.
Coverage 0% → ~70% sur events NBA.

### C — Backtest extended re-run (auto, 1 cron tick 4h)
Au prochain HOUR%4=0 cron tick, backtest_v2.py re-run via mon v49 backup invocation.
Should produce updated backtest_report_v2.json with all v50.x fixes applied.

### D — Combinés multi-marchés exposés
v50.8 a fixé combinationCorrelation. Frontend display de combos doit utiliser ces nouveaux marchés.
Vérifier `buildComboVariants` (Sprint 71) gère bien les nouveaux markets.

---

Document à actualiser après chaque sprint pronostics. Métrique finale : ROI flat sur 1000+
picks settled doit être > +3% pour valider la qualité du modèle.
