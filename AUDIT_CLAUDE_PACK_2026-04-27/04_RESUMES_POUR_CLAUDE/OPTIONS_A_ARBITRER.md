# Options a arbitrer par Claude

Ce fichier ne dit pas "il faut tout faire". Il liste les options possibles, avec le type de decision a prendre.

## Option A - Securiser la promesse Winamax-only

Question a trancher : le site doit-il masquer totalement les picks sans cote Winamax exacte, ou peut-il les afficher comme "veille non actionnable" ?

Pistes :

- Ajouter un champ `odds_source_kind`.
- Bloquer agent + reco user si source differente de `winamax_exact`.
- Afficher un badge clair si cote externe.
- Ajouter un warning dans Sante.

Gain : confiance produit forte.

Risque : moins de picks visibles si le mapping Winamax exact est incomplet.

## Option B - Corriger seulement le monitoring Sante

Question a trancher : faut-il d'abord rendre le probleme visible avant de changer les recos ?

Pistes :

- Ajouter ratio "match Winamax exact".
- Ajouter "fallback externe utilise".
- Montrer 5 exemples dans Sante.

Gain : faible risque, debug immediat.

Risque : les picks non exacts restent visibles tant que l'etape A n'est pas faite.

## Option C - Refaire la modal detail

Question a trancher : est-ce le bon moment pour traiter la vieille task modal, ou faut-il d'abord securiser les donnees ?

Pistes :

- Onglets `Synthese`, `Signaux`, `Cotes`, `H2H`, `Historique`.
- Navigation clavier.
- Section "pourquoi ce pick".
- Cotes sourcees proprement.

Gain : meilleure confiance utilisateur.

Risque : chantier UI plus long, possible regression si fait trop vite.

## Option D - Stabiliser navigation + mobile

Question a trancher : corriger les incoherences visibles ou attendre refactor ?

Pistes :

- Synchroniser URL/hash avec page courante.
- Clarifier compteurs Locks.
- Corriger drawer mobile vs bottom nav.
- Repositionner pilule live.

Gain : meilleur ressenti utilisateur.

Risque : moins prioritaire si les cotes/reco sont le vrai sujet.

## Option E - Nettoyer PWA/cache/performance

Question a trancher : optimiser maintenant ou apres corrections produit ?

Pistes :

- Dedupliquer `data.js` / `data_today.json`.
- Normaliser service worker assets.
- Ajouter `favicon.ico`.
- Eviter 404 `analytics.config.js`.

Gain : moins de bruit, meilleure robustesse mobile.

Risque : attention au service worker, qui peut facilement creer des versions fantomes.

## Option F - Tests de non-regression

Question a trancher : ajouter des tests avant patchs lourds ?

Pistes :

- Tests `predictMatch`.
- Tests `kellyFraction`.
- Tests `_agentReplay`.
- Tests `_agentBestPick`.
- Tests `evaluateModelPick` avec `RETIRED`, `WALKOVER`, scores null, competitors vides.

Gain : securite avant refactor.

Risque : necessite de sortir/encapsuler du code si app.js reste tres dense.

## Option G - Securiser la qualite data avant les poids modele

Question a trancher : faut-il stopper tout ajustement de poids tant que les signaux entrants peuvent etre contamines ?

Pistes :

- Namespace des caches par `sport + league_code + team_id`.
- Validation des `form_stats` football impossibles.
- Exclusion defensive frontend si `avg_gf5` ou `avg_ga5` impossible.
- Tests fixtures sur Boca/Huracán/San Lorenzo/Unión.
- Audit de `patch_team_stats.py` et des fetch ESPN.

Gain : evite d'optimiser le modele sur des donnees absurdes.

Risque : peut reduire temporairement la quantite de signaux disponibles.
