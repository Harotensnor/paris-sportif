# Patch blueprints optionnels

Ces blueprints ne sont pas des ordres. Ils donnent a Claude des chemins possibles.

## Blueprint A - Corriger `team_stats` sans gros refactor

But : stopper les collisions inter-sports.

Approche minimale :

1. Dans `fetch_team_stats.py`, remplacer la cle `tid` par une cle composite :

   `key = f"{path}:{lc}:{tid}"`

2. Stocker dans chaque entree :

   - `team_id`
   - `team_name`
   - `league_code`
   - `sport_path`

3. Dans `patch_team_stats.py`, reconstruire la meme cle depuis l'event :

   - `sport`
   - `league_code`
   - `team_id`

   ou stocker `sport_path` equivalent.

4. Ajouter une validation defensive :

   - si event football et `avg_gf5 > 5` ou `avg_ga5 > 5`, ignorer la stat.
   - si event football et un `last5.gf/ga > 15`, ignorer la stat.

5. Ajouter compteur :

   - `patched_competitors`
   - `skipped_invalid_stats`
   - `skipped_key_mismatch`

Validation :

- Regenerer `team_stats.json`.
- Verifier que `Unión (Santa Fe)` n'a plus `Boston Celtics`.
- Verifier que `Boca Juniors` n'a plus `Toronto Raptors`.

## Blueprint B - Priorite Winamax exacte dans le frontend

But : utiliser la cote Winamax exacte pour tout ce qui est actionnable.

Approche possible :

1. Creer un helper unique :

   `getActionableOdds(match, hasDraw)`

2. Ordre pour user/agent :

   - `match.winamax.markets['1n2']` si present ;
   - sinon `null` si regle stricte ;
   - eventuellement fallback externe seulement pour affichage "veille".

3. Garder `getMatchOdds()` pour backtest/historique si besoin, mais ne pas l'utiliser pour picks actionnables sans verifier source.

4. Ajouter dans le retour :

   - `source: 'winamax_exact' | 'external_snapshot' | 'espn_live' | 'history' | 'none'`
   - `bookable: boolean`

Validation :

- Les 6 events du jour sans match_id n'apparaissent plus comme recos actionnables.
- Un match avec Winamax exact mais `odds_snapshot.provider = DraftKings` utilise la cote Winamax.

## Blueprint C - Health semantique

But : eviter le faux vert.

Ajouter dans `build_health.py` ou un script dedie :

- `winamax_exact_events`
- `winamax_tournament_only_events`
- `actionable_external_odds_count`
- `football_invalid_form_stats_count`
- `weather_low_confidence_count`
- `exact_winamax_but_external_snapshot_count`

Warnings possibles :

- `actionable_external_odds_count > 0`
- `football_invalid_form_stats_count > 0`
- `winamax_exact_ratio < seuil`

Validation :

- `health.json` ne doit plus rester vert si `Unión/Boston Celtics` est present.
- `health.json` ne doit plus rester vert si une reco utilise une cote externe.

## Blueprint D - Meteo faible confiance

But : garder la meteo utile sans l'injecter faux.

Approche possible :

1. Dans `fetch_weather.py`, preferer :

   - `event.city + country`
   - puis venue
   - puis mapping statique equipe
   - puis pas de meteo si ambigu

2. Ajouter :

   - `weather.source`
   - `weather.confidence`
   - `weather.query`

3. Dans `predictMatch`, utiliser meteo seulement si `confidence >= high`.

Validation :

- `ADT` ne doit plus pointer vers `Ada`.
- `AIK` ne doit plus pointer vers `Aiken`.

## Blueprint E - Reclasser `winamax.available`

But : ne plus melanger "league dispo" et "match exact".

Approche data :

```json
{
  "winamax": {
    "available": true,
    "availability_kind": "exact_match",
    "match_id": 123,
    "markets": {}
  }
}
```

Kinds possibles :

- `exact_match`
- `tournament_only`
- `sport_or_league_fallback`
- `not_available`

Approche frontend :

- actionnable seulement si `availability_kind === 'exact_match' && markets.1n2`.
- autre cas affiche en observation ou est masque.

