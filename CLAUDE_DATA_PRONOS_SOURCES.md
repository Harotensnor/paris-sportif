# Données externes à fournir à Claude pour améliorer les pronos

Objectif : donner à Claude des sources et features qu'il n'a pas "dans sa tête" ou dans le projet actuel, pour améliorer les prédictions sur tous les sports Winamax.

Idée centrale : le meilleur modèle ne doit pas seulement "prédire le vainqueur". Il doit combiner :

1. Probabilité marché sans marge, idéalement consensus multi-books.
2. Signaux sportifs propres au sport.
3. Fraîcheur des infos : blessés, lineups, gardiens, pitchers, météo, repos.
4. Calibration historique par sport / ligue / marché.
5. Closing line value : est-ce que le pick bat la ligne de clôture ?

## Priorité absolue : données de marché et closing line

### The Odds API

URL docs : https://the-odds-api.com/liveapi/guides/v4/

Pourquoi c'est important :

- Donne des cotes multi-bookmakers sur beaucoup de sports.
- Permet de construire une probabilité consensus sans marge.
- API historique payante avec snapshots d'odds depuis 2020, à intervalles 10 min puis 5 min.
- À utiliser pour mesurer la closing line value, le signal le plus utile pour savoir si le modèle trouve vraiment de la value.

Endpoints utiles :

```text
GET https://api.the-odds-api.com/v4/sports/?apiKey=KEY
GET https://api.the-odds-api.com/v4/sports/{sport}/odds/?apiKey=KEY&regions=eu,uk,us&markets=h2h,spreads,totals&oddsFormat=decimal
GET https://api.the-odds-api.com/v4/historical/sports/{sport}/odds?apiKey=KEY&regions=eu&markets=h2h,spreads,totals&date=2026-04-25T12:00:00Z
```

Features à créer :

- `market_consensus_prob_home/draw/away`
- `market_no_vig_prob`
- `winamax_vs_consensus_edge`
- `line_movement_1h/6h/24h`
- `closing_line_value`
- `odds_volatility`
- `book_count`
- `sharp_book_edge` si Pinnacle/Betfair-like disponible dans une autre source.

### SportsDataIO Odds API

URL : https://sportsdata.io/live-odds-api

Pourquoi :

- Source payante mais très adaptée betting.
- Agrège les odds, opening lines, closing lines, player props, futures.
- Peut aussi fournir injuries / lineups selon sport.

À donner à Claude comme alternative payante si The Odds API n'a pas assez de marchés ou si tu veux de la data plus propre.

### Sportradar

Docs : https://docs.sportradar.com/sports-data-api

Pourquoi :

- Très cher mais très complet.
- 80+ sports, 500+ ligues, odds, stats, tracking selon package.
- À garder comme option "pro" si le projet devient vraiment sérieux.

## Football / soccer

### Football-Data.co.uk

URL : https://www.football-data.co.uk/data

Pourquoi :

- Gratuit.
- CSV/Excel avec résultats historiques, stats de match et cotes.
- Mis à jour au moins deux fois par semaine.
- Excellent pour backtests, calibration par ligue, dérive de cotes, rentabilité des stratégies.

Exemples de fichiers :

```text
https://www.football-data.co.uk/mmz4281/2526/E0.csv   # Premier League
https://www.football-data.co.uk/mmz4281/2526/F1.csv   # Ligue 1
https://www.football-data.co.uk/mmz4281/2526/SP1.csv  # Liga
https://www.football-data.co.uk/mmz4281/2526/D1.csv   # Bundesliga
https://www.football-data.co.uk/mmz4281/2526/I1.csv   # Serie A
```

Features :

- Forme rolling 5/10 matchs.
- Home/away split.
- Buts pour/contre rolling.
- Over/Under rolling.
- BTTS rolling.
- Closing odds historiques.
- Calibration par ligue et tranche de cote.

### soccerdata Python

Docs : https://soccerdata.readthedocs.io/

Pourquoi :

- Package Python qui regroupe plusieurs sources : ClubElo, ESPN, FBref, Football-Data, Sofascore, Understat, WhoScored.
- Très utile pour remplacer plein de petits scripts fragiles.

Features :

- ClubElo historique.
- xG/xGA via Understat ou FBref selon disponibilité.
- Lineups.
- Stats équipe/joueurs.
- Match history.

Attention : plusieurs modules font du scraping, donc prévoir cache + throttling.

### Understat

Exemple package/doc : https://github.com/ktconnolly/understat-xg

Pourquoi :

- xG de qualité pour les grands championnats.
- Donne xG/xGA, shots, shot maps.
- Beaucoup plus prédictif que buts bruts.

Features :

- `xg_for_rolling_5/10`
- `xg_against_rolling_5/10`
- `xg_diff`
- `shot_quality_for/against`
- `home_xg_split`, `away_xg_split`
- `finishing_overperformance` = goals - xG
- `defensive_overperformance` = goals_against - xGA

### StatsBomb Open Data

Repo : https://github.com/statsbomb/open-data

Pourquoi :

- Données event-level gratuites de très haute qualité.
- Pas forcément utile pour les matchs du jour, mais excellent pour entraîner des modèles tactiques ou apprendre des poids.

Features :

- Pression / possession / tirs / qualité d'occasions.
- Apprendre des embeddings de styles d'équipes.
- Calibrer des modèles xG/xThreat si tu veux aller très loin.

### Open-Meteo

Docs : https://open-meteo.com/

Pourquoi :

- Déjà utilisé mais aujourd'hui `weather.json` live est vide.
- Important pour football, baseball, golf, F1, tennis outdoor.

Features :

- Pluie, vent, température, humidité.
- Pénalité sur total goals / total runs / tennis serve efficiency / golf scoring.

## Tennis

### Tennis-Data.co.uk

URL : https://www.tennis-data.co.uk/alldata.php

Pourquoi :

- Gratuit.
- Résultats ATP/WTA + betting odds historiques.
- Données 2026 disponibles, data mise à jour en 2026.
- Très utile pour backtester les picks tennis et calibrer le modèle par surface.

Features :

- Surface win rate.
- Odds movement.
- Historique H2H.
- Cote moyenne / max / closing selon bookmaker disponible.
- Calibration ATP/WTA séparée.

### Jeff Sackmann tennis_atp / tennis_wta

ATP : https://github.com/JeffSackmann/tennis_atp

Pourquoi :

- Base historique très connue : rankings, résultats, stats.
- Licence Creative Commons Attribution-NonCommercial-ShareAlike : attribution obligatoire, usage commercial interdit.

Features :

- Elo global.
- Elo par surface.
- Forme récente.
- Fatigue : matchs joués sur 7/14 jours.
- Niveau adversaires récents.
- Upset tendency.

À demander à Claude :

```text
Ajoute un scraper Jeff Sackmann tennis_atp + tennis_wta qui produit tennis_ratings.json avec Elo global, Elo surface, forme 10 matchs, fatigue 14 jours, et delta ranking. Ne l'utilise que pour un usage non-commercial avec attribution.
```

## Basketball / NBA

### nba_api

Repo : https://github.com/swar/nba_api

Pourquoi :

- Client Python pour les APIs NBA.com / stats.nba.com.
- Stats très détaillées : team, player, advanced, pace, offensive/defensive rating, lineups.

Features :

- Offensive rating / defensive rating rolling.
- Pace.
- Net rating.
- Home/away split.
- Back-to-back.
- Rest days.
- Travel distance.
- Player impact absent/present.
- Usage rate des joueurs blessés.

Attention : stats.nba.com peut bloquer certaines IP cloud. Prévoir cache, headers réalistes, fallback ESPN/Balldontlie.

### Balldontlie

Docs : https://docs.balldontlie.io/

Pourquoi :

- API moderne avec OpenAPI spec à donner directement à Claude.
- NBA data 1946-current, standings, games, odds, injuries, player props selon plan.
- Nécessite API key.

OpenAPI à donner à Claude :

```text
https://www.balldontlie.io/openapi/nba.yml
```

Endpoints utiles :

```text
GET https://api.balldontlie.io/v1/player_injuries
GET https://api.balldontlie.io/v2/odds?dates[]=2026-04-26
GET https://api.balldontlie.io/v2/odds/player_props?game_id=...
```

Features :

- Blessures actualisées.
- Odds US multi-vendors.
- Player props : signal indirect sur disponibilité et rôle.

## Hockey / NHL

### MoneyPuck

URL : https://www.moneypuck.com/data.htm

Pourquoi :

- Gratuit avec attribution demandée.
- Données NHL très riches : shots, expected goals, flurry-adjusted xG, goalies, team/player data.
- Données depuis 2007.

Features :

- Team xG for/against rolling.
- Goalie save above expected.
- Confirmed goalie impact.
- Special teams : PP/PK.
- Shot quality.
- Rest/travel.
- Back-to-back goalie fatigue.

À demander à Claude :

```text
Ajoute fetch_moneypuck.py qui télécharge les CSV MoneyPuck récents, calcule par équipe NHL xG%, xGF/60, xGA/60, goalie GSAx rolling 10, puis patch_nhl_xg.py injecte dans data.js.
```

### NHL API

Référence non officielle : https://github.com/Zmalski/NHL-API-Reference

Pourquoi :

- API JSON utilisée par nhle.com.
- Schedules, rosters, boxscores, gamecenter.

Endpoints utiles :

```text
https://api-web.nhle.com/v1/schedule/now
https://api-web.nhle.com/v1/club-schedule-season/{TEAM}/{SEASON}
https://api-web.nhle.com/v1/gamecenter/{GAME_ID}/boxscore
```

Features :

- Lineups / roster.
- Starting goalie si disponible.
- Blessures via roster changes.
- Back-to-back / travel.

## Baseball / MLB

### MLB Stats API

Référence : https://github.com/toddrob99/MLB-StatsAPI/wiki/Endpoints

Pourquoi :

- Schedule, probable pitchers, rosters, boxscores.
- Source très utile pour construire les features jour J.

Endpoints utiles :

```text
https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2026-04-26&hydrate=probablePitcher(note),team
https://statsapi.mlb.com/api/v1/game/{gamePk}/boxscore
https://statsapi.mlb.com/api/v1/teams/{teamId}/roster
```

Features :

- Probable pitchers.
- Pitcher rest.
- Bullpen usage 3 derniers jours.
- Team lineups.
- Handedness splits.
- Park factor.
- Weather wind/temp.

### Baseball Savant / Statcast

Docs CSV : https://baseballsavant.mlb.com/csv-docs

Package : https://github.com/jldbc/pybaseball

Pourquoi :

- Données pitch-by-pitch et batted-ball.
- xwOBA, xBA, barrel rate, hard hit, launch angle, velocity.
- Le meilleur signal public gratuit pour MLB.

Features :

- Starter xERA, xwOBA allowed.
- Batter team xwOBA rolling.
- Barrel rate.
- Bullpen xERA.
- Park/weather adjusted total runs.
- Platoon advantage.

À demander à Claude :

```text
Ajoute fetch_mlb_statcast.py avec pybaseball ou Baseball Savant CSV, cache par date, agrège pitcher/team rolling 14/30 jours, et injecte mlb_features dans data.js.
```

### Retrosheet

URL : https://www.retrosheet.org/

Pourquoi :

- Historique play-by-play MLB.
- Moins important pour le live, très utile pour backtests longs et validation.

## MMA / UFC

### UFCStats

Site : http://ufcstats.com/

Exemple crawler : https://github.com/fanghuiz/ufc-stats-crawler

Pourquoi :

- Fight history, fighter stats, strikes, takedowns, submissions, reach, stance.
- Très utile pour prédire les fights UFC/MMA.

Features :

- Reach advantage.
- Stance matchup.
- Significant strikes landed/absorbed per min.
- Takedown accuracy / defense.
- Submission attempts.
- Age.
- Layoff days.
- Short notice flag.
- Weight class change.
- Finish rate.

Attention : scraping. Mettre cache, cadence lente, attribution, respecter robots/TOS.

## Golf

### DataGolf

URL : https://datagolf.com/api-access

Pourquoi :

- Probablement la meilleure source pour modèles golf.
- Payant Scratch Plus.
- Strokes gained, skill ratings, live odds, matchup odds, historical raw data, opening/closing odds.

Features :

- SG off-the-tee, approach, around green, putting.
- Course fit.
- Tee-time wave weather.
- Recent form.
- Matchup / 3-ball fair odds.
- Closing line value golf.

Endpoints docs cités :

```text
https://feeds.datagolf.com/preds/skill-ratings?display=value&file_format=json&key=KEY
https://feeds.datagolf.com/betting-tools/matchups?tour=pga&market=3_balls&odds_format=decimal&file_format=json&key=KEY
https://feeds.datagolf.com/historical-raw-data/rounds?tour=pga&event_id=...&year=2026&file_format=json&key=KEY
```

## Racing / Formule 1

### OpenF1

Docs : https://openf1.org/docs

Pourquoi :

- Gratuit, open, JSON/CSV.
- Données live et historiques F1 : sessions, laps, stints, pit, weather, positions.

Endpoints utiles :

```text
https://api.openf1.org/v1/sessions?year=2026
https://api.openf1.org/v1/laps?session_key=latest
https://api.openf1.org/v1/weather?session_key=latest
https://api.openf1.org/v1/stints?session_key=latest
```

Features :

- Qualifying pace.
- Practice long-run pace.
- Tyre degradation.
- Pit stop delta.
- Track temperature.
- Rain probability.
- Grid penalties.
- Safety car history by circuit.

### FastF1

Docs : https://docs.fastf1.dev/

Pourquoi :

- Package Python très complet pour timing, telemetry, weather, race results.
- Plus lourd qu'OpenF1, mais puissant pour modèles F1.

## Tous sports : features communes à créer

### 1. Consensus market no-vig

Pour chaque bookmaker :

```text
implied_i = 1 / odd_i
no_vig_prob_i = implied_i / sum(implied_all_outcomes)
```

Puis consensus :

```text
market_prob = median(no_vig_prob_i across books)
market_disagreement = std(no_vig_prob_i)
winamax_edge = winamax_implied_no_vig - market_prob
model_edge = model_prob - market_prob
```

Ne jamais comparer seulement `model_prob` à `1 / winamax_odd` sans regarder le marché global.

### 2. Closing line value

Après match ou juste avant kickoff :

```text
clv = closing_no_vig_prob - bet_no_vig_prob
```

Si tes picks gagnent mais ne battent pas la closing line, la variance peut masquer un mauvais modèle.

### 3. Rest / fatigue / travel

Pour tous les sports US :

- `rest_days_home/away`
- `back_to_back`
- `games_last_7d`
- `travel_distance_km`
- `timezone_shift`
- `home_stand_game_number`
- `road_trip_game_number`

### 4. Injury impact pondéré

Ne pas compter juste le nombre de blessés. Pondérer par importance :

- minutes / usage / salary / ELO player / WAR / BPM / SG contribution.

Feature :

```text
injury_impact_home = sum(player_value * status_weight)
injury_impact_away = sum(player_value * status_weight)
injury_delta = injury_impact_away - injury_impact_home
```

### 5. Calibration par sport / ligue / marché

Créer des calibrateurs séparés :

- football 1N2
- football over/under
- football BTTS
- tennis moneyline
- NBA moneyline / spread / totals
- NHL moneyline / totals
- MLB moneyline / totals
- MMA moneyline

Ne pas mélanger les sports dans une seule courbe de fiabilité.

### 6. Data quality score

Avant de recommander une mise :

```text
data_quality = weighted_score([
  odds_consensus_available,
  fresh_winamax_odds,
  sport_specific_stats_available,
  injury_lineup_available,
  weather_available_if_relevant,
  sample_size_sufficient,
  no_stale_data
])
```

Afficher :

- `Qualité data forte` : assez de signaux.
- `Qualité data moyenne` : mise réduite.
- `Qualité data faible` : skip ou stake divisé.

## Plan d'implémentation à donner à Claude

### Phase 1 : marché et calibration

1. Ajouter source odds multi-book : The Odds API ou SportsDataIO.
2. Construire `market_consensus.json`.
3. Ajouter `patch_market_consensus.py`.
4. Ajouter CLV dans `odds_history.jsonl`.
5. Modifier `_agentBestPick` pour utiliser consensus no-vig.

### Phase 2 : signaux gratuits rapides

1. Football-Data.co.uk pour historique foot + calibration.
2. Tennis-Data + Jeff Sackmann pour tennis.
3. MoneyPuck pour NHL.
4. MLB Stats API + Statcast pour baseball.
5. nba_api ou Balldontlie pour NBA.

### Phase 3 : qualité data et modèle

1. `data_quality_score`.
2. Calibration par sport/marché.
3. Stake multiplier selon data quality.
4. Backtest avec `results_archive.jsonl`.
5. Rapport ROI + CLV + calibration.

## Prompts prêts à coller à Claude

### Prompt court

```text
Je veux améliorer la précision du site Paris-Sportif avec des données externes. Lis CLAUDE_DATA_PRONOS_SOURCES.md. Priorité : intégrer un consensus de cotes multi-bookmakers no-vig, la closing line value, puis des features par sport : Football-Data/Understat pour foot, Jeff Sackmann/Tennis-Data pour tennis, MoneyPuck pour NHL, MLB Stats API + Statcast pour baseball, nba_api/Balldontlie pour basket, UFCStats pour MMA, OpenF1/FastF1 pour racing. Propose puis implémente les fetchers + patchers sans casser le pipeline GitHub Pages.
```

### Prompt précis pour commencer

```text
Commence par Phase 1 : crée une couche market_consensus.

Objectifs :
1. Ajouter scripts/fetch_market_consensus.py configurable par provider.
2. Supporter The Odds API si API_KEY présente, sinon skip propre.
3. Produire market_consensus.json avec match mapping par sport/date/teams.
4. Ajouter scripts/patch_market_consensus.py pour injecter event.market_consensus dans data.js.
5. Ajouter dans pronostics.html : no-vig consensus prob, edge vs Winamax, data_quality_score, et CLV-ready tracking.
6. Tests syntax + smoke.

Ne touche pas au splice PRONOSTICS_DATA et bump sw.js si HTML change.
```

### Prompt football

```text
Ajoute un enrichissement foot :
- Football-Data.co.uk pour historique résultats/cotes par ligue.
- soccerdata/Understat pour xG/xGA rolling quand disponible.
- Features : xg_for_5, xg_against_5, xg_diff_5, shots_for_5, shots_against_5, finishing_overperformance, home_away_split.
- Patch dans event.football_features.
- Utilise ces features dans predictMatch avec poids faible au début et trace les contributions.
```

### Prompt tennis

```text
Ajoute un enrichissement tennis :
- Jeff Sackmann ATP/WTA pour résultats/rankings/stats.
- Tennis-Data.co.uk pour odds historiques.
- Features : surface_elo, global_elo, fatigue_14d, recent_form_10, h2h_surface, ranking_delta, upset_rate.
- Patch dans event.tennis_features.
- Calibrer tennis séparément du reste.
```

### Prompt MLB

```text
Ajoute un enrichissement MLB :
- MLB Stats API pour schedule, probable pitchers, rosters.
- Baseball Savant/Statcast via pybaseball pour xERA/xwOBA/barrel/hard-hit.
- Features : starter_xera, starter_rest, bullpen_usage_3d, team_xwoba_14d, platoon_advantage, park_factor, weather_wind.
- Patch dans event.mlb_features.
```

### Prompt NHL

```text
Ajoute un enrichissement NHL :
- MoneyPuck CSV pour xG, goalies, team/player metrics.
- NHL API pour schedule/rosters/boxscores.
- Features : xGF60, xGA60, xG_pct_rolling, goalie_gsax, rest_days, back_to_back, special_teams_delta.
- Patch dans event.nhl_features.
```

## Sources vérifiées

- The Odds API docs : https://the-odds-api.com/liveapi/guides/v4/
- Football-Data : https://www.football-data.co.uk/data
- Tennis-Data : https://www.tennis-data.co.uk/alldata.php
- Jeff Sackmann ATP : https://github.com/JeffSackmann/tennis_atp
- soccerdata docs : https://soccerdata.readthedocs.io/
- Understat scraper example : https://github.com/ktconnolly/understat-xg
- StatsBomb Open Data : https://github.com/statsbomb/open-data
- nba_api : https://github.com/swar/nba_api
- Balldontlie docs : https://docs.balldontlie.io/
- MoneyPuck data : https://www.moneypuck.com/data.htm
- NHL API reference : https://github.com/Zmalski/NHL-API-Reference
- MLB Stats API reference : https://github.com/toddrob99/MLB-StatsAPI/wiki/Endpoints
- Baseball Savant CSV docs : https://baseballsavant.mlb.com/csv-docs
- pybaseball : https://github.com/jldbc/pybaseball
- UFCStats crawler example : https://github.com/fanghuiz/ufc-stats-crawler
- DataGolf API : https://datagolf.com/api-access
- OpenF1 docs : https://openf1.org/docs
- FastF1 docs : https://docs.fastf1.dev/
- SportsDataIO odds : https://sportsdata.io/live-odds-api
- Sportradar sports data : https://docs.sportradar.com/sports-data-api
