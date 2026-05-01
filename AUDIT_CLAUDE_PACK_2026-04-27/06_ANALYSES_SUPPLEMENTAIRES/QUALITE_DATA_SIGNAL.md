# Qualite data et contamination des signaux

Fichier de preuve :

- `06_ANALYSES_SUPPLEMENTAIRES/DATA_QUALITY_AUDIT.json`
- source analysee : `07_SNAPSHOTS_LIVE/data.live.js`

Cette passe est importante car elle touche directement la fiabilite du modele, pas seulement l'affichage.

## P1 potentiel - Contamination inter-sports dans les formes football

L'audit detecte 7 entrees football avec des statistiques de forme impossibles pour du foot. Exemple le plus clair :

Match : `Unión (Santa Fe) at Vélez Sarsfield`

Equipe : `Unión (Santa Fe)` (`team_id = 20`)

`form_stats` :

- `gf5 = 302`
- `ga5 = 328`
- `avg_gf5 = 100.67`
- `avg_ga5 = 109.33`

`last5` contient :

- `Boston Celtics`, 100-108
- `Boston Celtics`, 111-97
- `Boston Celtics`, 91-123

Interpretation : un signal NBA a ete injecte dans une equipe de football. Cause probable a verifier : jointure par `team_id` ESPN non namespacee par sport/league.

## Autres exemples detectes

- `Huracán` recoit des matchs contre `Los Angeles Lakers`.
- `San Lorenzo` recoit des matchs contre `Atlanta Hawks`.
- `Boca Juniors` recoit des matchs contre `Toronto Raptors`.

Events touches dans le snapshot :

- `Unión (Santa Fe) at Vélez Sarsfield`
- `Argentinos Juniors at Huracán`
- `Santos at San Lorenzo`
- `Boca Juniors at Cruzeiro`
- `Boca Juniors at Central Córdoba (Santiago del Estero)`
- `Huracán at Racing Club`
- `Independiente at San Lorenzo`

## Impact modele

Si `predictMatch` utilise `form_stats`, `last5`, buts marques/encaisses ou dynamique recente, ces matchs peuvent recevoir :

- une force offensive/defensive absurde ;
- un edge artificiel ;
- une confiance faussee ;
- une position agent injustifiee ;
- un bilan futur non representatif.

Ce point peut etre plus critique que certains bugs visuels.

## Correctifs possibles a arbitrer

Claude doit choisir la strategie, mais les options probables sont :

- Namespace strict des caches/team stats : `sport + league_code + team_id`.
- Ne jamais patcher `form_stats` football avec des matchs dont `gf` ou `ga` depasse un seuil raisonnable.
- Validation backend : si football `avg_gf5 > 5` ou `avg_ga5 > 5`, supprimer le signal et logger warning.
- Validation frontend defensive : si football stats impossibles, ignorer `form_stats` dans `predictMatch`.
- Ajouter un test fixture avec `Unión (Santa Fe)` / `Boston Celtics`.

## P1/P2 - Cote snapshot externe meme quand Winamax exact existe

L'audit detecte 189 events futurs ou :

- `winamax.match_id` existe ;
- `winamax.markets` existe ;
- mais `odds_snapshot.provider` reste externe (`DraftKings`, `TennisExplorer`, etc.).

Exemples :

- `Levante at Espanyol` : snapshot DraftKings, Winamax match exact disponible.
- `Casa Pia at Gil Vicente` : snapshot DraftKings, Winamax match exact disponible.
- `Elena Rybakina vs Anastasia Potapova` : snapshot TennisExplorer, Winamax match exact disponible.
- `Unión (Santa Fe) at Vélez Sarsfield` : snapshot DraftKings, Winamax match exact disponible.

Impact : meme quand le mapping Winamax exact existe, il faut verifier quelle cote le frontend et le modele utilisent vraiment pour :

- affichage ;
- edge ;
- Kelly/stake ;
- historique odds ;
- evaluation best pick.

Question a trancher : `odds_snapshot` doit-il rester historique externe, ou doit-il etre remplace/surcharge par la cote Winamax exacte quand elle existe ?

## P2 - Meteo parfois geocodee sur mauvais lieu ou nom ambigu

28 mismatches `venue_city` vs `weather.city` ont ete detectes. Certains sont seulement des traductions ou variantes :

- `Firenze` vs `Florence`
- `Genova` vs `Genoa`
- `Roma` vs `Rome`

D'autres semblent beaucoup plus suspects :

- `Cajamarca` -> `Utrecht`
- `Stockholm` -> `Aiken`
- `Tarma` -> `Ada`
- `Glasgow` -> `Rangersdorf`
- `Edinburgh` -> `Hibernian Heights`

Impact : si la meteo devient un signal dans `predictMatch`, elle doit etre nettoyee avant integration. Sinon elle peut ajouter du bruit geographique.

Correctifs possibles :

- Geocoder par `venue + city + country`, pas par nom d'equipe.
- Stocker coordonnees stadium/city verifiees.
- Ajouter seuil de distance si coordonnees connues.
- Ignorer meteo si la ville resolue est trop ambigue.

## P2 - Competitor IDs reutilises entre sports

21 identifiants competitor apparaissent dans plusieurs sports dans le snapshot complet.

Ce n'est pas automatiquement un bug, car ESPN peut reutiliser des IDs selon les sports. Mais c'est un signal de danger si les caches sont indexes uniquement par `id`.

Exemple lie au bug observe :

- `team_id = 20` apparait avec `Unión (Santa Fe)` en football et avec des entites d'autres sports dans les donnees globales.

Conclusion prudente : toute jointure data doit etre namespacee, sinon les collisions sont inevitables.

## Requete concrete pour Claude

Avant de toucher les poids du modele, Claude devrait verifier :

1. Ou `form_stats` et `last5` sont construits.
2. Si le cache/team stats est indexe par `team_id` seul.
3. Si `patch_team_stats.py` ou un fetch ESPN melange les sports.
4. Si `predictMatch` ignore ou utilise ces signaux sur les matchs contamines.
5. Si les cotes Winamax exactes remplacent vraiment les cotes externes dans le calcul actionnable.

