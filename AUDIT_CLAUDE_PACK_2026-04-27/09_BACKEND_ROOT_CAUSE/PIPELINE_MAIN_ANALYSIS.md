# Analyse pipeline main

Source :

- `09_BACKEND_ROOT_CAUSE/scripts_main_snapshot/.github__workflows__refresh.yml`

## Structure observee

Le workflow live est plus large que le checkout local historique. Il appelle notamment :

- fetch/patched data live ;
- odds ESPN / TennisExplorer / Russie ;
- snapshots odds et results ;
- Winamax catalog + markets ;
- team stats / team form ;
- ClubElo ;
- weather ;
- referees / injuries / lineups ;
- tennis Sackmann ;
- Football-Data ;
- MLB pitchers ;
- NHL stats ;
- NBA team stats ;
- health ;
- mesures/backtest/pages statiques/feed/OG/finalize.

## Risque `|| true`

La plupart des scripts sont lances avec `|| true`.

Avantage :

- le cron continue meme si une source externe tombe.

Risque :

- un script peut echouer sans bloquer le deploy ;
- le site peut publier un mix de donnees fraiches et anciennes ;
- `health.json` peut rester vert si le fichier existe et n'est pas trop vieux ;
- les erreurs semantiques ne sont pas visibles.

## Ordre cotes

Ordre observe :

1. `fetch_live.py`
2. `patch_odds.py`
3. `fetch_tennis_odds.py`
4. `fetch_rus_odds.py`
5. `snapshot_odds.py`
6. `fetch_winamax_catalog.py`
7. `patch_winamax.py`
8. `patch_winamax_markets.py`

Risque :

`snapshot_odds.py` fige des cotes externes avant que le bloc Winamax exact soit enrichi. Comme le snapshot n'est jamais overwrite, l'externe reste dans `odds_snapshot`.

Question :

Faut-il deplacer `snapshot_odds.py` apres `patch_winamax_markets.py`, ou creer un snapshot Winamax separe ?

## Ordre team stats

`fetch_team_stats.py` tourne en cadence 4h. `patch_team_stats.py` tourne ensuite plus souvent.

Risque :

Si `team_stats.json` contient une collision, elle est reappliquee sur plusieurs ticks.

Question :

Faut-il purger `team_stats.json` apres correction de cle, ou seulement le regenerer ?

## Health

`build_health.py` existe mais controle surtout :

- presence fichier ;
- age fichier ;
- compte d'entites.

Il ne controle pas encore :

- qualite semantique des signaux ;
- coherence sport/team_id ;
- source de cote actionnable ;
- exactitude Winamax.

