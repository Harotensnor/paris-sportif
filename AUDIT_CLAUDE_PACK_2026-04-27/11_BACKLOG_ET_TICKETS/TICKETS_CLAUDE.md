# Tickets Claude proposes

Ces tickets sont des propositions de decoupage. Claude peut les fusionner, les ignorer ou les reordonner.

## Ticket 1 - Securiser `team_stats`

Objectif : empecher qu'une equipe de foot recupere des stats NBA/NHL/MLB.

Preuves :

- `QUALITE_DATA_SIGNAL.md`
- `DATA_QUALITY_AUDIT.json`
- `ROOT_CAUSE_BACKEND.md`

Definition of done :

- `team_stats` namespace par sport/league/team.
- `patch_team_stats` ne matche plus par `team_id` seul.
- Garde defensive sur stats football impossibles.
- `verify_data_quality.py` retourne `suspicious_football_stats: 0`.

## Ticket 2 - Clarifier la source de cote actionnable

Objectif : toute reco user/agent doit savoir si sa cote vient de Winamax exact.

Preuves :

- `ROOT_CAUSE_BACKEND.md`
- `TECH_INVENTORY_SUMMARY.json`
- `verify_data_quality_snapshot_output.json`

Definition of done :

- helper unique ou champ clair `odds_source_kind`.
- actionnable strictement `winamax_exact` si c'est la decision produit.
- source visible dans carte/detail.
- plus de reco actionnable avec fallback externe non signale.

## Ticket 3 - Health semantique

Objectif : la page Sante ne doit pas etre verte si un probleme produit/data critique existe.

Definition of done :

- `health.json` contient `quality_checks`.
- Check exact Winamax.
- Check stats football invalides.
- Check meteo low-confidence si signal actif.
- UI Sante affiche warning utile.

## Ticket 4 - Meteo faible confiance

Objectif : ne pas injecter de meteo geocodee au mauvais endroit dans le modele.

Definition of done :

- `weather.source` et/ou `weather.confidence`.
- geocoding par venue/city/country si possible.
- fallback equipe seulement si mapping statique fiable.
- `predictMatch` ignore meteo faible confiance.

## Ticket 5 - Modal detail

Objectif : rendre le detail match plus clair et navigable.

Definition of done :

- Onglets ou sections claires.
- Focus clavier logique.
- Source cote affichee.
- Signaux majeurs lisibles.
- `Esc` et fermeture conservent le focus.

## Ticket 6 - Router SPA

Objectif : page visible, hash, refresh et back button coherents.

Definition of done :

- clic nav met a jour URL.
- hash direct ouvre la bonne page.
- refresh conserve la page.
- retour navigateur fonctionne.

## Ticket 7 - Scoring special statuses

Objectif : proteger le bilan agent.

Definition of done :

- regle claire pour `RETIRED`.
- regle claire pour `WALKOVER`.
- scores null traites sans faux lost/won.
- tests fixtures.

