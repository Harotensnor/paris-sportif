# Root cause backend - hypotheses verifiables

Ce dossier contient les scripts recuperes depuis `main` GitHub, pas seulement le checkout local.

Scripts snapshots :

- `09_BACKEND_ROOT_CAUSE/scripts_main_snapshot/`
- Inventaire : `09_BACKEND_ROOT_CAUSE/BACKEND_SCRIPT_INVENTORY.json`

## Root cause 1 - Collision ESPN team_id dans team_stats

Preuve code :

- `scripts__fetch_team_stats.py`
  - ligne 124 : `seen[tid] = (...)`
  - ligne 227 : `out[tid] = {...}`
- `scripts__patch_team_stats.py`
  - ligne 72 : `tid = str(c.get('id') or '')`
  - ligne 73 : `s = teams.get(tid)`

Probleme :

`team_stats.json` est indexe par `team_id` seul. Or l'audit data detecte 21 IDs competitor reutilises entre plusieurs sports. Cela permet a une entree NBA/NHL/MLB de remplacer ou contaminer une equipe de football portant le meme ID.

Symptome confirme :

- `Unión (Santa Fe)` (`team_id = 20`) recoit des matchs contre `Boston Celtics`.
- `Huracán` recoit des matchs contre `Los Angeles Lakers`.
- `San Lorenzo` recoit des matchs contre `Atlanta Hawks`.
- `Boca Juniors` recoit des matchs contre `Toronto Raptors`.

Cause probable :

`load_upcoming_teams()` dedupe avec `if not tid or tid in seen`, donc le premier sport rencontre pour un ID gagne. Ensuite `patch_team_stats.py` applique cette stat a tout competitor qui partage ce `tid`, sans verifier `sport`, `league_code` ou nom d'equipe.

Fix possible :

- Cle cache : `f"{sport}:{league_code}:{team_id}"`.
- Stocker aussi `team_name`.
- Au patch, matcher sur `sport + league_code + team_id`.
- Ajouter garde defensive : football refuse toute `avg_gf5 > 5` ou `avg_ga5 > 5`.
- Logguer un warning et compter les stats rejetees dans `health.json`.

## Root cause 2 - Les cotes Winamax exactes existent mais ne sont pas toujours prioritaires

Preuve code frontend live :

- `app.live.js`, `getMatchOdds()` :
  - ligne 409 : lit d'abord `bestOdds(match.odds, hasDraw)`.
  - ligne 410 : si live ESPN/externe existe, retourne immediatement.
  - ligne 411-420 : sinon lit `odds_snapshot`.
  - ligne 428-437 : seulement ensuite lit `match.winamax.markets['1n2']`.

Preuve backend :

- `scripts__snapshot_odds.py`
  - ligne 103 : si `odds_snapshot` existe deja, ne jamais overwrite.
  - ligne 109 : snapshot depuis `event.odds`.
  - ligne 117 : provider stocke depuis l'odds array.
- Workflow :
  - ligne 47 : `snapshot_odds.py`
  - ligne 96 : `patch_winamax.py`
  - ligne 99 : `patch_winamax_markets.py`

Probleme :

Le snapshot externe peut etre capture avant que les marches Winamax soient patches, puis rester figé. Ensuite le frontend lit odds/live/snapshot avant Winamax. Cela explique pourquoi l'audit trouve 189 events futurs avec `winamax.match_id + winamax.markets`, mais `odds_snapshot.provider` externe.

Nuance :

`_agentBestPick()` essaie de remplacer la cote 1N2 par Winamax quand `wxMk['1n2']` existe. Mais `predictMatch()` et `getMatchOdds()` peuvent deja avoir utilise la cote externe pour construire la prediction, le market implied, la line movement ou l'affichage selon les endroits.

Fix possible :

- Creer un helper unique `getActionableOdds(match)` qui priorise Winamax exact pour tout ce qui est user/agent.
- Garder `odds_snapshot` comme historique externe si utile, mais ne pas l'utiliser pour reco actionnable quand `winamax.markets` existe.
- Ajouter `odds_source_kind` dans les donnees ou calcule cote front.
- Faire apparaitre la source de cote dans la carte et la modal.

## Root cause 3 - `winamax.available` peut venir d'un fallback tournament/slug

Preuve code :

- `scripts__patch_winamax.py`
  - lignes 61-67 : ecrit `available: True`, `url`, `note`, `match_id`, `tournament`.
- `scripts__winamax_map.py`
  - `lookup()` essaie le catalog, puis fallback statique.
  - lignes 598, 602, 608, 613, 617, 622, 626, 634 : retours `available: True` avec URL de sport/league sans necessairement `match_id`.

Probleme :

`available: True` ne veut pas toujours dire "match exact bookable". Ca peut vouloir dire "league/sport plausible sur Winamax".

Fix possible :

- Renommer conceptuellement :
  - `winamax.available` -> `winamax.league_available` ou garder legacy.
  - ajouter `winamax.exact = !!match_id && !!markets`.
- Bloquer les recos actionnables sur `winamax.exact`, pas `available`.

## Root cause 4 - Meteo geocodee par nom d'equipe

Preuve code :

- `scripts__fetch_weather.py`
  - ligne 277 : `resolve_city(team_name, geo_cache)`.
  - ligne 288 : fallback `geocode(team_name, geo_cache)`.
  - ligne 253 : Open-Meteo `name={name}&count=1`.
  - lignes 398-411 : choisit le home team puis resout son nom.

Probleme :

Pour les clubs non presents dans la table statique, le script geocode le nom de l'equipe, pas la ville/venue/country. Open-Meteo renvoie le premier resultat mondial, ce qui cree des erreurs du type :

- `Tarma` / `ADT` -> `Ada`
- `Stockholm` / `AIK` -> `Aiken`
- `Cajamarca` / `UTC` -> `Utrecht`
- `Glasgow` / `Rangers` -> `Rangersdorf`

Fix possible :

- Preferer `event.city + country`.
- Si absent, `venue + city + country`.
- Utiliser nom equipe seulement si mapping statique verifie.
- Stocker un champ `weather.source = static_team | venue_city | geocode_team`.
- Ne pas utiliser la meteo dans `predictMatch` si source geocodee faible.

## Root cause 5 - Health ne controle pas la qualite semantique

Preuve code :

- `scripts__build_health.py` compte age et nombre d'items.
- Il ne verifie pas :
  - ratio Winamax exact ;
  - stats football impossibles ;
  - provider externe malgre Winamax exact ;
  - meteo geocodee sur ville incoherente ;
  - echecs silencieux de scripts en `|| true`.

Workflow :

La majorite des scripts sont lances avec `|| true`. C'est pratique pour garder le cron vivant, mais ca rend indispensable une health semantique qui remonte les degradations.

Fix possible :

- Ajouter `quality_checks` dans `health.json`.
- Exemples :
  - `winamax_exact_ratio`.
  - `actionable_external_odds_count`.
  - `football_form_stats_invalid_count`.
  - `weather_low_confidence_count`.
  - `scripts_failed_recently` si logs disponibles.

## Ordre de priorite suggere a arbitrer

Claude doit decider, mais l'ordre logique de securisation pourrait etre :

1. Stopper contamination `team_stats`.
2. Clarifier source de cote actionnable Winamax.
3. Corriger health semantique.
4. Rendre meteo non bloquante tant qu'elle est ambigue.
5. Reprendre ensuite UX/modal/mobile.

