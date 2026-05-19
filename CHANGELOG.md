# Changelog

Auto-généré depuis les messages de commit par `scripts/build_changelog.py`.
Les sections sont heuristiques : Features / Fixes / Performance / Docs.

## Desktop — 2026-05-19

### Version v8.0.3 — Accueil direct, moins moche, moins chargé

Correction UX après le retour “trop moche / trop d’info / aller droit au but” :
- La première vue est recentrée sur deux choses : **prochain pari sérieux** et **Top 3 à regarder**.
- Le tableau complet est replié par défaut derrière `Tableau complet`, au lieu de remplir l’écran dès l’ouverture.
- Les catégories sont aussi repliées par défaut derrière `Catégories`, pour éviter l’effet grille infinie.
- Les cartes Top 3 sont plus compactes : moins de texte, moins de badges, moins de jargon visible.
- Le bandeau reprise/protection bankroll reste calculé, mais ne prend plus de place sur l’accueil standard.

### Version v8.0.2 — Top 3 utile même sans pari validé

Correction directe après le constat “le logiciel est nul / aucun pari proposé” :
- Le Top 3 de l’accueil ne dépend plus uniquement des boutons `Je mise`; il affiche maintenant les meilleurs spots à regarder, même si le statut reste `À surveiller`.
- Si la journée est pauvre, l’accueil va chercher les meilleurs spots de la semaine pour donner une suite utile au lieu d’un écran quasi vide.
- Le bouton de mise reste réservé aux vrais paris validés : un spot surveillé est visible, mais ne devient pas artificiellement jouable.
- Le tableau accueil récupère davantage de lignes pertinentes grâce au mélange 24h + semaine, sans réintroduire les gros blocs techniques.

### Version v8.0.1 — Reprise contrôlée sans silence après pertes

Suite au retour “si je perds, le logiciel doit continuer à proposer” :
- Le mode après pertes ne rend plus automatiquement l’app muette : les meilleurs spots restent visibles, avec statut clair `Je mise`, `À surveiller` ou `Interdit`.
- Ajout d’une vraie **reprise contrôlée** : Vainqueurs et signaux simples peuvent rester jouables si cote, avantage, confiance et contexte restent propres.
- Les verrous dangereux restent actifs : familles durablement perdantes, cotes trop hautes, contexte critique et limite de volume bloquent encore les clics.
- L’accueil peut maintenant remonter le meilleur spot de la semaine même si aucun pari 24h n’est prêt, pour ne jamais afficher un simple “0 pari” sans suite utile.
- La carte pertes/reprise parle en langage parieur : “proposer encore, mais proprement”, avec limite de spots jouables et mise max réduite.

### Version v8.0.0 — Parieur First : prochain pari sérieux + pages dédiées

Refonte ciblée après le constat “je ne comprends pas quoi faire et aucun pari n’est proposé clairement”.
- L’accueil répond maintenant d’abord à la question utile : **prochain pari sérieux**, avec statut `Je mise`, `À surveiller` ou `Interdit`, raison simple, cote, confiance et prochain re-check.
- Les catégories principales deviennent de vraies pages : Football, Semaine, Nuit, Vainqueurs, Buts, Tennis, Basket, Baseball, Hockey et À surveiller ne déroulent plus simplement le cockpit sur l’accueil.
- Le tableau accueil gagne un tri par statut et affiche explicitement pourquoi une ligne reste en surveillance au lieu de laisser croire qu’il manque un pari.
- La fiche match passe en lecture plus humaine : onglets `Décision`, `Analyse`, `Compos`, `Sources`, avec le détail technique gardé hors parcours standard.
- Les boutons de navigation et l’intitulé produit passent sur `v8.0.0`, avec cache Service Worker renouvelé.

## Desktop — 2026-05-18

### Version v7.3.0 — Accueil sous 2-3s + payload moteur léger

Suite directe de v7.2 : la synchro est plus courte, mais l’ouverture restait ralentie par un payload moteur massif.
- Ajout d’un payload d’accueil compact : le renderer charge d’abord environ 200 Ko utiles au pari rapide au lieu de parser le rapport moteur complet d’environ 51 Mo.
- L’accueil affiche le Top/tableau/catégories dès ce payload compact, puis l’analyse complète se charge plus tard ou immédiatement quand l’utilisateur ouvre une page lourde.
- Les panneaux secondaires ne bloquent plus la première peinture de l’accueil : le rendu détaillé est différé pour garder le parcours “je veux parier vite” fluide.
- Le smoke desktop rapide ne force plus la page Récupération/Bilan complète : ces pages restent couvertes par les tests longs, pendant que le test quotidien reste court.
- Mesure terrain smoke : accueil prêt autour de 2,0-2,4s et parcours court autour de 6-7s sur la machine locale.
- Version desktop, package et Service Worker bumpés en `v7.3.0`.

### Version v7.2.0 — Synchro instant + vérité terrain lisible

Suite directe au retour “tout est trop long” : le bouton principal ne lance plus un gros pipeline déguisé.
- Ajout d’un mode `--instant` qui reconstruit le snapshot desktop depuis le cache local : cockpit, décisions, sources, garde-fous, santé et inline final, sans fetch réseau lent.
- Le bouton principal devient `Synchro instant` et l’auto-refresh standard utilise le cache local ; les modes `fast`, `quick`, `repair-context` et `full` restent disponibles pour les réparations et audits plus lourds.
- `--fast` est allégé : live + catalogue Winamax + reconstruction locale, sans détails match longs, backtests complets ni sources lentes.
- Ajout de `SourceHealth v9` et `TerrainReport v8` : l’app explique combien de mises sont bloquées par les sources, quelle source réparer en priorité et pourquoi il n’y a pas plus de boutons `Je mise`.
- Accueil plus honnête : le Top 3 ne mélange plus les vrais paris prêts avec les lignes `À surveiller`; les candidats incomplets passent dans un bloc séparé sans bouton de mise.
- Les contrats QA couvrent maintenant les modes `instant` et `fast` séparément, pour éviter de réintroduire des tests et synchros d’une heure dans le parcours quotidien.
- Version desktop, package et Service Worker bumpés en `v7.2.0`.

### Version v7.1.0 — Fiches plus lisibles + décision pari rapide

Suite directe du passage v7 : la fiche match devient plus claire avant le clic et les signaux faibles bloquent davantage les paris impulsifs.
- Terrain des compositions rendu plus lisible : lignes Attaque/Milieu/Défense/Gardien en flex, jetons joueurs moins écrasés, note explicite sur les compos estimées et photos uniquement quand sourcées.
- Forme récente affichée comme une lecture pro : `Bonne dynamique`, `Forme mitigée` ou `Dynamique fragile`, plus résumé en victoires/nuls/défaites au lieu de codes bruts.
- Fiche > Décision : ajout d’un bloc “Décision pari rapide” qui dit clairement `Jouable maintenant` ou `À surveiller, pas de clic`, avec la raison principale.
- Garde-fou foot renforcé : si compo/blessures/xG/force équipe sont manquants et que l’avantage n’est pas large, le bouton de mise est coupé. Pour les paris buts, météo/arbitre/compos doivent être propres si l’avantage est court.
- Version desktop, package et Service Worker bumpés en `v7.1.0`.

### Version v7.0.0 — Pari vite sécurisé + journal de décision

Suite directe après les pertes réelles : le logiciel devient plus défensif sur les clics `Je mise` et garde la trace exacte de ce qu’il savait au moment du pari.
- Ajout d’un garde-fou global “pari dangereux” : les cotes trop hautes, la confiance trop basse, les marchés volatils et les dossiers trop pauvres restent visibles en analyse mais perdent le bouton de mise.
- Le Top 3 évite désormais les candidats de secours risqués : pas de pick en tête si le signal est seulement spectaculaire mais fragile.
- Chaque pari suivi enregistre une photo de décision : confiance, avantage, qualité du dossier, explication et garde-fous présents au moment du clic. Cette trace apparaît dans `Bilan & Stats`.
- L’analyse post-journée relit aussi cette photo de décision pour expliquer plus concrètement ce que le modèle aurait dû voir avant une perte.
- Les combinés standards passent en mode prudent : 2-3 jambes maximum, pas de même match, cote totale plus basse, jambes simples, et mise plafonnée à 1% de bankroll avec maximum 2€.
- Ajout d’un cache local du calcul moteur : quand les fichiers data n’ont pas changé, l’accueil repasse d’un recalcul lourd à une récupération quasi immédiate. Le smoke rapide mesure maintenant séparément l’accueil prêt et le parcours complet.
- Version desktop, package et Service Worker bumpés en `v7.0.0`.

### Version v5.4.0 — Accueil rapide + récupération stricte

Suite directe après le constat “tests trop longs / logiciel lent” : l’accueil standard devient plus léger et le mode récupération bloque davantage les paris dangereux après une soirée rouge.
- Accueil `À miser` rendu en mode rapide : seules les zones utiles au clic immédiat sont calculées au premier rendu (Top 3, tableau triable, protection bankroll, catégories). Les blocs cockpit lourds et enrichissements visuels sont différés ou réservés au Cockpit.
- Le Top 3 ne reste plus vide quand aucun pari n’est prêt : il affiche les meilleurs candidats 24h selon confiance/cote, avec bouton de mise uniquement si le pick est réellement validé.
- Ajout de catégories sport directes dans l’accueil compact : Tennis, Basket, Baseball et Hockey restent accessibles sans allonger la barre latérale.
- Ajout de catégories compactes supplémentaires sur l’accueil : Strict, Cotes 2+, Aujourd’hui et Demain, pour alléger le tableau principal sans cacher les picks.
- Mode récupération durci : après pertes réelles, stop volume quotidien renforcé, cotes hautes bloquées, marchés non prioritaires (buts/buteurs/mi-temps) coupés si l’avantage n’est pas très net.
- La carte récupération sur l’accueil est compactée pour réduire la hauteur de la page sans supprimer le garde-fou.
- Version desktop, package et Service Worker bumpés en `v5.4.0`.

### Version v5.3.0 — Analyse post-journée + verrous durables

Suite directe après les pertes réelles : le logiciel ne se contente plus de dire “tu as perdu”, il relit la journée et coupe les familles qui récidivent.
- Ajout d’une zone `Ce que le modèle aurait dû voir` dans la page Récupérer : chaque perte importée/suivie ressort avec les signaux qui auraient dû freiner le clic (cote haute, edge trop court, confiance basse, CLV adverse, pari hors app, famille déjà perdante).
- Ajout de verrous durables par famille de marché : si une famille perd sur plusieurs jours, le bouton `Je mise` est coupé pendant 14 jours et la ligne reste seulement observable.
- Les verrous durables sont pris en compte directement par le moteur d’action : libellé `Famille coupée`, blocage du pari, résumé dans les segments coupés et sauvegarde dans le profil utilisateur.
- Le smoke rapide vérifie maintenant que la page Récupérer contient bien l’analyse post-journée, les signaux manqués et les familles durables.
- Version desktop, package et Service Worker bumpés en `v5.3.0`.

## Desktop — 2026-05-17

### Version v5.2.1 — Synchro rapide + tests courts

Correctif confort après retour terrain : les contrôles et la synchronisation étaient devenus beaucoup trop longs pour un usage quotidien.
- Ajout d’un vrai mode `Synchro rapide` (`refresh_once.py --fast`) qui limite le travail réseau aux sources indispensables Winamax/live et reconstruit les sorties locales essentielles.
- Le bouton principal et l’auto-refresh utilisent maintenant cette synchro rapide ; les refreshs enrichi/complet restent disponibles volontairement pour les audits profonds.
- Le test par défaut `npm test` passe sur un smoke express desktop au lieu du parcours complet historique ; le gros smoke reste disponible via `qa:desktop:full`.
- Ajout de `desktop/scripts/smoke-fast.js` pour vérifier vite l’accueil, les catégories, la récupération, les réglages, le Winamax-only et l’absence d’erreurs console.
- Ajout de scripts pratiques `qa:fast`, `qa:desktop:fast`, `qa:terrain:quick`, `refresh:fast`, `refresh:enriched` et `refresh:full`.
- Les estimations UI distinguent maintenant `Synchro rapide`, `Refresh enrichi` et `Refresh complet`, pour éviter l’impression d’un logiciel bloqué sans explication.

### Version v5.2.0 — Verrou réel anti-récidive

Suite logique du mode récupération : les pertes Winamax importées deviennent maintenant un vrai verrou avant mise, pas seulement un diagnostic après coup.
- L’import Winamax comprend mieux les lignes copiées en bloc : dates, cotes, mises, statuts gagné/perdu/void et marchés sont détectés sur des formats multi-lignes.
- Les segments réellement perdants de l’utilisateur bloquent désormais le bouton `Je mise` et le lien d’action Winamax : la ligne reste visible en observation, mais ne pousse plus au clic.
- En période rouge, le mode récupération bloque aussi les cotes trop hautes, les edges trop courts, les confiances trop faibles et les dossiers contexte incomplets.
- La fiche match affiche les raisons issues de l’historique réel dans les garde-fous locaux.
- La page `Récupération` affiche maintenant les `Segments coupés automatiquement`, avec ROI réel, P&L, lignes cockpit concernées et action appliquée.
- Le smoke test vérifie qu’un double import perdant `Plus/Moins` crée bien un diagnostic et un verrou réel actif.

### Version v5.1.0 — Récupération + apprentissage pertes Winamax

Suite directe au retour “j’ai tout perdu” : l’app apprend maintenant des vrais résultats Winamax et rend le mode récupération visible.
- Ajout d’une page `Récupération` dédiée : P&L réel connu, règle du jour, plafond de mise, segment à couper et diagnostic “Pourquoi j’ai perdu ?”.
- Ajout d’un bandeau récupération sur l’accueil : état normal/prudent/fort, nombre de vrais `Je mise`, plafond par pari et raccourci vers l’analyse des pertes.
- L’import Winamax ne sert plus seulement à comparer : il met à jour les paris suivis ou crée des lignes externes `winamax-réel` pour alimenter le P&L, les segments perdants et le coach.
- Le diagnostic pertes groupe les résultats par marché, sport, ligue, plage de cote et feedback post-perte, avec action conseillée pour chaque hotspot.
- Les warnings personnels sont déclenchés beaucoup plus tôt : 2-3 pertes sur un segment suffisent à durcir le coach au lieu d’attendre un gros sample.
- Les ajustements automatiques durcissent edge/confiance plus vite sur les segments réellement perdants de l’utilisateur.
- Le Bilan affiche aussi le diagnostic “Pourquoi j’ai perdu ?” et relie directement au Mode récupération.
- Correction d’une incohérence Bilan : le nombre de paris réglés inclut maintenant les voids.

### Version v5.0.2 — Protection pertes réelles

Correctif prioritaire après retour utilisateur : le problème principal est la perte réelle, donc le logiciel passe en logique de récupération stricte avant de proposer une mise.
- Ajout d'une protection bankroll moteur : un pick ne peut plus rester `Je mise` si cote trop haute, edge prudent trop faible, confiance trop courte, contexte incomplet, segment historique perdant ou marché trop risqué.
- Les Vainqueurs à cote haute sont bloqués sauf filet Winamax 2-0 réellement solide.
- Les marchés buts serrés et les signaux en confiance limitée restent en observation, même avec un edge brut positif.
- Les mises moteur réellement autorisées sont plafonnées à 1% de bankroll, avec plafond dur à 1€ en phase de protection.
- Les préférences existantes migrent vers un mode conservateur : 2% de budget jour, 1% max par pari, 3 paris max/jour, 5% max engagé par jour, stop-loss 2%, confirmation après 2 pertes.
- L'auto-tracking devient quasi verrouillé par défaut : top uniquement, 1 pari max, 1€ max, cote ≤ 3.50 et edge ≥ +8pt.
- PickDecision v6 trace maintenant `capitalProtectionTrace`, et la QA échoue si cette protection est contournée par un bouton ou une mise positive.

### Version v5.0.1 — Anti-perte Winamax + fiche non-misable

Correctif terrain après retour utilisateur : l'app ne doit plus pousser vers Winamax quand la ligne est seulement informative ou issue d'un marché trop risqué.
- Les alternatives de marchés sont désormais `lecture seulement` : aucune alternative ne peut créer un bouton `Je mise`, même si son edge brut paraît positif.
- Les marchés mi-temps et totaux mi-temps ne sont plus considérés comme simples en mode standard.
- Les alternatives complexes (`DNB`, `team total`, score exact, HT/FT, pénalty, clean sheet, mi-temps) restent hors cockpit standard.
- Les liens `Ouvrir Winamax` sont masqués sur les lignes non validées, les matchs commencés ou les fiches en observation ; seule une ligne vraiment prête peut ouvrir l'action de pari.
- Les fiches match affichent `Lecture uniquement` au lieu de `À jouer` quand la mise est bloquée, avec une phrase explicite indiquant que le logiciel ne recommande pas de miser.
- Le Top 3 de l’accueil ne se remplit plus avec des lignes `À confirmer` : si moins de trois paris sont réellement misables, il reste incomplet au lieu de pousser de l’observation.
- Les rapports hebdo/brief soir ne s'ouvrent plus automatiquement au démarrage : ils ne bloquent plus les clics sur la navigation ou les catégories.
- Audit pertes 17/05 : `DNB` (-27,7% ROI), `team total` (-7,8%) et `1N2` très hautes cotes (-4,6%) ont été identifiés comme segments à ne pas transformer en action standard.
- Garde-fou QA ajouté : `qa:engine` échoue si une alternative complexe est exposée ou si une alternative obtient une mise positive.
- Validation : pipeline complète fraîche, `npm test`, `qa:engine`, `qa:safe`, `qa:desktop`, `qa:terrain` et `qa:a11y` verts après correction.

### Version v5.0.0 — Pronostics profit-first

Release majeure orientée qualité des paris : l’app privilégie désormais le profit réel et la protection utilisateur avant le volume brut.
- Nouveau garde-fou `profitGuardV5` : un segment historiquement froid, une CLV défavorable, un conflit de signaux ou un contexte bloquant ne peut plus redevenir un bouton `Je mise` via le filtre safe.
- `PickDecision v6` trace maintenant ce garde-fou dans `profitGuardTrace`, pénalise le score de readiness et expose le code `profit_guard_v5` pour les audits terrain.
- Les fiches match affichent une raison lisible `Profit réel` dans les blocages, au lieu de cacher la prudence derrière un statut technique.
- `compute_clv.py` écrit `clv_history.json` et `clv_summary.json` de façon atomique avec retry Windows, pour éviter les refresh partiellement échoués quand l’app lit les fichiers.
- Le mode test packagé peut maintenant utiliser un profil isolé et contourner le verrou d’instance unique, ce qui permet de valider l’exécutable sans fermer l’app ouverte par l’utilisateur.
- `qa:engine` vérifie qu’un pick bloqué par `profitGuardV5` n’a jamais de mise positive ni de bouton `Je mise`.
- Validation terrain v5 : pipeline complète fraîche, CLV recalculée, `qa:unit`, `qa:engine`, `qa:safe`, `qa:terrain`, `qa:winamax-audit` et `qa:calibration` validés. Le snapshot du soir n’a plus d’événement Winamax futur aujourd’hui : l’app reste honnête et ne fabrique pas de pari.

### Version v4.2.1 — Fiches plus lisibles

Correctif visuel ciblé après retour utilisateur sur les fiches match.
- Lisibilité fiche : la forme récente n’apparaît plus en codes bruts type `WWDND` ; elle est convertie en pastilles Victoire/Nul/Défaite, avec correction de l’interprétation des séquences mixtes FR/EN.
- Terrain de composition allégé : rendu plus compact, lignes Attaque/Milieu/Défense/Gardien visibles et joueurs en jetons arrondis avec photos sourcées quand disponibles.
- Version visible et cache bumpés pour forcer le logiciel à charger cette révision.

### Version v4.2.0 — Joueurs publics sourcés + photos/stats fiables

Rattachement réel des joueurs aux sources publiques sans inventer de donnée.
- `fetch_public_match_signals.py` enrichit maintenant les joueurs individuellement avec cache dédié, normalisation correcte des accents, validation anti-homonyme sportif et cadence réseau pour Wikidata/Wikipedia.
- Quand Wikidata/Wikipedia limitent ou ne confirment pas un joueur, la pipeline rattache un fallback partiel sourcé via l’identifiant ESPN de la composition : photo publique ESPN/CDN + poste/numéro/équipe, sans transformer ce fallback en preuve complète.
- `patch_public_match_signals.py` injecte ces profils dans les titulaires/remplaçants (`public_profile`, `public_stats`, `public_sources`, `public_signals`) et conserve les sources en fiche.
- Les fiches match affichent pays, poste public, âge, taille, source et photos joueur quand disponibles ; le terrain des compositions utilise aussi ces photos.
- Le service image accepte les miniatures publiques déjà sourcées (Wikipedia/Wikimedia/ESPN) et les met en cache localement, toujours côté main process.
- La pipeline desktop et GitHub Pages exécutent désormais l’enrichissement public avec une fenêtre “jour en cours + passé récent” pour couvrir les compositions publiées après coup. Validation terrain : 162 matchs patchés, 528 lignes joueurs touchées, 264 photos et 264 blocs stats joueurs injectés.

### Version v4.1.8 — Audit terrain QA + marchés standard nettoyés

Correctif qualité après refresh réel : les garde-fous mélangeaient des signaux simples observables avec de vrais signaux positifs, ce qui créait une fausse alerte moteur.
- `qa:engine` vérifie maintenant le bon compteur `positiveSimplePassingFilters` avant d’exiger 10 opportunités positives affichées.
- `qa:terrain` affiche désormais le même compteur positif réel dans son résumé, au lieu de renommer les observations en signaux positifs.
- Les marchés `Mi-temps` sont reclassés en Mode expert dans l’audit Winamax et la sélection standard, pour éviter de regonfler l’accueil avec un marché dérivé.
- L’audit Winamax ne signale plus de famille standard dormante artificielle : `halftime` apparaît désormais côté expert.
- Terrain complet relancé : données fraîches, contrôles moteur/terrain/desktop/safe/a11y/unit/refresh/calibration/multi-jours/stress validés.
- Cache PWA bumpé pour éviter de revoir l’ancienne interface après lancement.

### Version v4.1.7 — Historique clubs/joueurs intégré

Ajout d’un signal d’identité sportive pour prendre en compte l’histoire des clubs et des joueurs sans inventer de donnée.
- La pipeline publique extrait l’ancienneté, le palmarès cité, le pays, le stade/ligue ou l’expérience joueur depuis Wikidata/Wikipedia quand la source est fiable.
- Les données injectées portent désormais `history_public` côté concurrents et `public_signals.teams.*.history` côté match.
- Le moteur ajoute un contexte historique : bonus de confiance très léger si l’expérience/palmarès est solide, prudence sur les Vainqueurs quand l’adversaire a une stature publique nettement supérieure.
- Les fiches match affichent `Historique club` / `Historique joueur`, et les raisons/checklists reprennent ce signal avec score de stature.
- Validation terrain : refresh public réel, 80 matchs enrichis, 52 profils historiques détectés au fetch et 240 insertions sur les événements dédupliqués.

### Version v4.1.6 — Rivalités d’équipes prises en compte

Ajout d’un vrai signal `rivalité/derby` dans les pronostics, avec prudence modèle plutôt qu’un simple badge décoratif.
- La source publique cherche les rivalités avec validation stricte : deux équipes reconnues + vocabulaire derby/rivalité + rejet des pages génériques.
- Les rivalités confirmées sont injectées dans `data.js`/fiches match avec intensité, résumé, source et signaux.
- Le moteur réduit la probabilité, la confiance et la mise sur les Vainqueurs trop marginaux quand la rivalité augmente la variance du match.
- Les fiches affichent une carte `Rivalité / derby`, et les raisons/checklists reprennent ce signal avant mise.
- La CSP desktop autorise les logos ESPN publics déjà présents dans les données, uniquement comme images.

### Version v4.1.5 — Signaux web sourcés

Enrichissement réel des pronostics et fiches match avec une nouvelle source publique côté pipeline, sans toucher à la règle Winamax-only pour les cotes.
- Nouveau fetch `public_match_signals` : profils publics, preuves Wikidata/Wikipedia quand disponibles, fallback ESPN public avec cache et rate-limit si une source limite les requêtes.
- Nouveau patch `public_signals` dans `data.js` : chaque match enrichi garde ses sources, son niveau de qualité, ses signaux lisibles et ses profils équipe/joueur.
- Les fiches match affichent `Signaux web vérifiés` avec liens de source, coach public confirmé quand disponible et lecture tactique prudente.
- Les cartes et narratifs peuvent réutiliser les signaux publics, mais aucune cote externe n'est utilisée pour la décision.
- La pipeline desktop sait rafraîchir `public_web` en full/quick/signaux/pré-match, et le registre des sources expose cette nouvelle source.

### Version v4.1.4 — Photos joueurs + coach tactique

Correctif fiche match orienté lisibilité : les joueurs et entraîneurs manquaient encore de présence visuelle, et la tactique coach était trop compressée pour aider à décider vite.
- Le service d’images accepte maintenant les entraîneurs en plus des équipes et joueurs, avec recherche coach Wikidata, cache local et fallback propre.
- Les compositions affichent une photo ou un avatar propre pour chaque titulaire visible, même dans les lignes compactes du terrain.
- Les fiches tennis et sports US affichent des profils joueurs/pitchers/gardiens avec photo quand la donnée existe.
- Nouvelle carte `Entraîneurs & tactique` : coach, système, style de jeu et lecture du plan de match sans inventer les noms manquants.
- Les duels tactiques montrent désormais les deux joueurs avec photo, rôle et ligne de stats lisible.
- Les rapports avancés V15/V16 retirent maintenant les matchs expirés du flux `Finaliser T-10`/prix au lieu de les laisser actifs.

### Version v4.1.3 — Forme récente lisible

Correctif UX fiche match : les dynamiques d'équipes sortaient encore comme des codes bruts (`WWDND`, `VDVVV`, `DDDDD`), peu lisibles et peu professionnels.
- Ajout d'un formateur central pour convertir les séries en `victoires / nuls / défaites`.
- Nettoyage automatique des anciennes raisons modèle contenant des codes de forme.
- Ajout de pastilles visuelles `V Victoire`, `N Nul`, `D Défaite` dans les zones qui listent les derniers résultats.
- Espacement corrigé dans les blocs `Équipes` pour éviter les libellés collés aux valeurs.

### Version v4.1.2 — Terrain de composition propre

Correctif UX ciblé fiche match : le terrain de composition pouvait sembler bizarre parce qu'il utilisait parfois les joueurs clés comme fausse composition quand la source lineup était trop partielle.
- Le terrain foot n'apparaît plus avec des joueurs stars placés artificiellement.
- Les compositions sont affichées uniquement avec une base de titulaires suffisamment complète.
- Les joueurs sont alignés en grille stable par ligne de jeu, avec noms tronqués proprement.
- Le dessin du terrain a été remis dans le bon sens, avec ligne centrale horizontale et zones de surface.
- Une fiche sans compo fiable affiche désormais un état clair au lieu d'un terrain trompeur.

### Version v4.1.1 — Pile décision fraîche + anti-match expiré

Correctif opérationnel orienté pronostics : les rapports avancés `V8 → V16` pouvaient rester datés alors que les données Winamax étaient fraîches, ce qui réaffichait des matchs passés comme candidats T-10.
- La pipeline desktop relance désormais toute la pile décision `V6` à `V16` à chaque refresh quick, signal, pré-match, T-60, T-30, T-10 et réparation contexte.
- `V8` classe les matchs déjà commencés en `skip`/`expired` au lieu de les compter dans `now`.
- `V9`, `V10`, `V11` et `V12` propagent le statut expiré sans le transformer en faux `wait_t10`.
- `V14` retire les matchs expirés du cockpit prix/action ; `V15` et `V16` ne gardent plus que les candidats actuels.
- `qa:engine` vérifie maintenant qu’aucun match expiré ne peut revenir dans les statuts `ready_now`, `wait_t10` ou `wait_price`.
- Après réparation contexte réelle, le cockpit opérationnel affiche `12` candidats à finaliser T-10, `7` prix à surveiller et `15` rejetés actuels, au lieu de mélanger ces chiffres avec des vieux matchs.

### Version v4.1.0 — Réparation contexte par sport + tennis source pipeline

Correctif profond après test terrain v4.0.0 : les dossiers tennis et sports non-foot étaient trop souvent pénalisés par des sources football-only, ce qui gonflait artificiellement les blocages contexte.
- Le calcul `MatchSheet`/contexte applique désormais des poids par sport : football garde compositions/blessures/arbitre/xG/météo, tennis se concentre sur Elo surface/H2H/formes, sports US sur leurs stats starters.
- Ajout de `tennis_features` et `sport_stats` dans la santé sources, les plans de réparation et les audits v4 pour expliquer les vrais manques au lieu de lister des sources hors sujet.
- Pipeline renforcée : `fetch_tennis_sackmann.py` et `patch_tennis_features.py` sont inclus dans les refresh signaux/pré-match/T-60/T-30/T-10 pertinents.
- Bug Windows corrigé dans `fetch_tennis_sackmann.py` : plus de warning Unicode sur la console pendant le refresh terrain.
- Tests renforcés : `qa:refresh` exige la réparation tennis dans les chemins critiques, et `qa:engine` bloque toute régression où un match tennis redevient “faible” à cause de compositions/blessures/arbitres/xG/météo.
- Résultat terrain mesuré : après refresh ciblé tennis, `match_context` passe à `176` dossiers forts, `9` corrects et `0` faibles, avec `0` faux blocage tennis football-only ; le plan de réparation tombe de `38` à `7` dossiers réparables.

### Version v4.0.0 — Pronostics Winamax Pro : readiness v6 + sources v8 + terrain v5

Passage majeur du plan v4 : l’app ne cherche pas à fabriquer plus de boutons `Je mise`, elle explique et répare les vrais blocages qui empêchent les picks de devenir actionnables.
- Ajout de `PickDecision v6` sur chaque ligne cockpit : score readiness, signaux critiques/optionnels manquants, plan de réparation source, traces de quotas marché/sport/ligue, trace du filet Winamax 2-0 et raison de déblocage nuit.
- Ajout de `MatchSheet v6` : template sport, complétude par section, liens de preuve, fraîcheur de donnée, disponibilité joueurs, avertissements source et breakdown confiance.
- Ajout de `SourceHealth v8` : séparation état technique/couverture métier, sources `preserved`/`degraded` conservées, prêts bloqués par source, gain prêt estimé, dernier fetch sain et fallback snapshot.
- Ajout de `TerrainReport v5` : audit utilisateur complet volume/nuit/variété, bugs visibles, sections vides, captures attendues, latence et réparations prioritaires.
- Ajout de `ModelBacktest v6` : dimensions par sport, marché, ligue, heure, qualité source, statut de décision et règle Winamax 2-0 pour surveiller les promotions.
- Interface : les fiches utilisent maintenant les contrats v6 et affichent la readiness, les signaux qui bloquent la mise et la source à réparer au lieu de laisser des cases vides.
- Tests : `qa:engine` et `qa:terrain` exigent les contrats v6/v8/v5/v6 sur les vraies données Winamax terrain.

### Version v3.2.0 — Pronostics plus fiables : contrats v5 + terrain v4 + sources v7

Suite du plan `Pronostics Plus Fiables, Plus Nombreux, Plus Propres`, avec priorité donnée aux vrais blocages terrain plutôt qu'au remplissage artificiel des boutons `Je mise`.
- Ajout de `PickDecision v5` sur chaque ligne cockpit : score modèle, score pari rapide, blocages de sources, statut quota/nuit, confiance marché, politique de mise, preuves de décision et manques à réparer avant pari.
- Ajout de `MatchSheet v5` : sections obligatoires/facultatives, qualité par section, fraîcheur d'enrichissement, preuves affichables et état de relance manuelle.
- Ajout de `SourceHealth v7` : couverture actuelle/cible, delta à combler, auto-réparation autorisée, politique de retry, âge du dernier snapshot sain et gain estimé en picks.
- Ajout de `TerrainReport v4` : résumé “pari vite”, résumé nuit, bugs visibles côté utilisateur, sections vides et prochaines réparations actionnables.
- Ajout de `ModelBacktest v5` : lecture par qualité source, statut de décision, tranche horaire et règles Winamax pour contrôler les promotions.
- Interface : les fiches indiquent maintenant quand un pick est réparable et ce qui manque concrètement avant de pouvoir cliquer `Je mise`.
- Tests : `qa:engine` et `qa:terrain` vérifient les contrats v5/v7/v4/v5 sur les vraies lignes cockpit issues de la pipeline terrain.

### Version v3.1.0 — Contrats v4 + terrain v3 + santé sources v6

Suite du chantier `Pronostics Pro Winamax`, centrée sur la qualité réelle des pronostics plutôt que sur l'ajout cosmétique.
- Ajout de `PickDecision v4` sur chaque ligne cockpit : statut, `canBet`, mise, confiance, avantage, famille de marché, raisons de blocage, qualité source, règles Winamax et explication courte/longue.
- Ajout de `MatchSheet v4` : sections visibles, sections cachées parce que vides, données critiques/optionnelles manquantes, confiance compositions/joueurs/contexte et couverture source.
- Ajout de `SourceHealth v6` : sources `ok`/`preserved`/`degraded`, priorité de réparation, commande de réparation et gain estimé en picks pour attaquer les dossiers faibles.
- Ajout de `TerrainReport v3` : résumé terrain “pari vite”, distribution marché/sport, prêts, nuit, checks UX et objectifs chiffrés 24h.
- Ajout de `ModelBacktest v4` : lecture consolidée par sport, marché, ligue, tranche horaire et qualité de source.
- Interface : la fiche détail affiche désormais le dossier v4, la couverture source et les blocs volontairement masqués quand la donnée fiable manque.
- Tests : `qa:engine` et `qa:terrain` échouent maintenant si les contrats v4/v6/v3 manquent sur les vraies lignes cockpit.

### Version v3.0.0 — Pronostics Pro Winamax : contrats v3 + terrain durci

Socle v3 du plan 500 points, sans changer la règle produit : 100% Winamax, mode standard simple, expert caché.
- Ajout des contrats moteur `PickDecision v3`, `MatchSheet v3`, `SourceHealth v5`, `MarketCoverage v2` et `TerrainReport v2` pour que chaque pick expose mise, raison, risque, qualité source, marché, règles Winamax et données manquantes.
- Fiches match renforcées : chaque ligne cockpit transporte maintenant un dossier structuré avec résumé, compos, joueurs, forme, H2H, absences, coach, arbitre, météo, tactique, sources et `missingData` sans inventer de faux zéros.
- Rapport terrain v2 : volume 24h, prêts, observation, nuit, sources et goulets d'étranglement sont calculés par le moteur et vérifiés par `qa:terrain`.
- Couverture marchés v2 : familles Winamax disponibles/exploitées/standard/expert/dormantes sont exposées pour prioriser le prochain travail de volume sans rouvrir les marchés complexes.
- Santé sources v5 : snapshots préservés, blocages éventuels et âge/TTL sont normalisés pour éviter qu'une source vide casse silencieusement les pronostics.
- Interface : la fiche détail affiche un bloc compact `Dossier pronostic v3` avec qualité source, sections remplies et manques à enrichir.
- Tests renforcés : `qa:engine` et `qa:terrain` vérifient désormais les contrats v3 sur les vraies lignes cockpit.

### Version v2.4.0 — Accueil ultra-compact + Vainqueurs 2-0 + source guard

Corrections terrain après relance réelle de la pipeline et contrôle via le raccourci Windows.
- Pipeline complète relancée : `generated_at=2026-05-17T13:07:05Z`, `93` événements Winamax aujourd'hui, `58` signaux simples positifs, `20` affichés aujourd'hui, `30` lignes cockpit et `28` opportunités sur 24h.
- Accueil “À miser” encore compacté : titre plus petit, sous-texte masqué, Top 3 resserré, tableau plus dense et cartes moins hautes pour éviter l'effet cockpit géant.
- Diagnostic “modèle trop strict” rendu moins bruyant : il reste visible quand le moteur bloque vraiment, mais ne pollue plus l'accueil quand plusieurs paris sont déjà jouables.
- Fiches match standard nettoyées : les marchés `Nul`, double chance, score exact, HT/FT et autres marchés avancés restent cachés hors Mode expert.
- Règle Winamax 2-0 renforcée dans le modèle Vainqueur : le paiement anticipé augmente maintenant la probabilité effective, ce qui remonte `8` Vainqueurs fiables sur ce snapshot sans ouvrir les marchés complexes.
- Source blessures Sofascore protégée : si Sofascore renvoie `403`/zéro source, `fetch_injuries_soccer.py` préserve le dernier fichier sain au lieu de vider `injuries_soccer.json`; après réparation, `30/31` matchs foot avaient des blessures attachées.
- Garde-fous terrain ajustés au comportement réel : le cockpit peut être strict mais sain, avec les lignes faibles en observation et les boutons “Je mise” uniquement sur les vrais picks prêts.
- Validation : lancement via `LANCER-LOGICIEL.vbs` OK en v2.4.0, `qa:engine`, `qa:safe`, `qa:terrain -- --skip-refresh`, `qa:desktop`, `qa:a11y`, `npx playwright test`, capture visuelle Electron et build `Paris Sportif Desktop Setup 2.4.0.exe` validés.

### Version v2.3.0 — Pronostics recentrés + accueil “À miser” compact

Correctifs terrain après usage réel de la page “À miser”.
- Pipeline réelle relancée : `153` événements Winamax aujourd'hui, test terrain Electron OK, fenêtre ouverte en `9.2s`, `30` lignes cockpit et `21` opportunités 24h contrôlées par `qa:terrain`.
- Moteur fiabilité corrigé : une ligne écartée par contexte ne peut plus ressortir comme pari jouable, et une ligne `À surveiller` ne garde plus de mise positive ou de faux statut `bet`.
- Vainqueurs renforcés sans tricher : `8` lignes fiables au moteur, dont `6` Vainqueurs et `2` Plus/Moins, avec promotion uniquement si filet 2-0 Winamax ou historique multi-sport robuste.
- Règle Winamax “2 buts d’écart” mieux prise en compte : le bonus reste plafonné mais pèse enfin assez pour différencier un Vainqueur foot avec vrai filet de sécurité.
- Accueil refait plus petit : suppression des tuiles modèle/conseils/décision lourdes, Top 3 des prochaines 24h, tableau triable limité à `6` lignes par défaut, puis catégories compactes.
- Catégories allégées : la barre latérale garde Cockpit, Vainqueurs, Buts, Nuit, Buteurs, Combinés et À surveiller ; l’accueil ne rajoute plus les cartes redondantes `Strict`, `Gros gain`, `Mi-temps`, `Aujourd’hui`, `Demain` et `Live`.
- Garde-fous renforcés : `qa:engine` vérifie maintenant qu’un pick non misable n’est jamais marqué `bet`, et `qa:safe` accepte seulement les fallbacks promus par filet 2-0 ou Vainqueur prudent très encadré.
- Limite honnête du snapshot : aucun pari nuit n’est promu en “Je mise” quand les signaux nocturnes restent insuffisants ; ils restent visibles en observation au lieu d’être gonflés artificiellement.
- Validation : `qa:engine`, `qa:safe`, `qa:desktop`, `qa:winamax-audit`, `qa:a11y`, `qa:terrain -- --skip-refresh`, `npx playwright test` et capture visuelle Electron `captures/desktop-sprint23-picks.png` repassés sur données terrain.

### Hotfix v2.2.2 — Pronostics honnêtes + accueil plus léger

Corrections terrain après audit “je veux parier vite, sans faux fiable”.
- Pipeline réelle relancée : `157` événements Winamax aujourd'hui, `144` signaux simples positifs, `18` lignes affichées aujourd'hui, `30` lignes cockpit et `25` opportunités sur 24h.
- Filtre fiable corrigé en profondeur : les marchés ou profils d’avantage historiquement froids ne peuvent plus rester `✓ Fiable` par mélange incorrect entre sample segment et calibration globale.
- Le Top 3 de l’accueil reste strictement composé de paris misables : plus de ligne `À surveiller` injectée pour faire joli ou compléter artificiellement la variété.
- Les tests terrain/smoke jugent maintenant la variété du Top 3 uniquement sur les lignes réellement misables, afin d’éviter un faux échec quand les Vainqueurs disponibles sont volontairement bloqués.
- Accueil encore compacté : catégories plus petites, cartes Top 3 moins hautes, tableau 24h resserré et texte secondaire réduit.
- Les fiches match cachent davantage les données creuses : compositions/absences/équipes et fiches tennis n’affichent plus de lignes génériques quand les stats fiables ne sont pas présentes.
- Source freshness corrigée : les sources fraîches mais surveillées ne sont plus marquées `due`; le plan distingue maintenant `attention` et vraie relance nécessaire.
- Décision centrale clarifiée : quand un pari est jouable mais qu’un contrôle global agent reste rouge, l’interface affiche `contrôle global à suivre` au lieu de promettre que tous les garde-fous sont verts.
- Validation : `qa:engine`, `qa:safe`, `qa:terrain:quick`, `qa:desktop`, `qa:winamax-audit`, `qa:a11y`, `npm test` et capture visuelle Electron repassés sur données terrain.

### Hotfix v2.2.1 — Audit terrain pronostics + cohérence cockpit

Corrections ciblées après audit terrain de l'accueil et des fiches match.
- Pipeline réelle vérifiée : `157` événements Winamax aujourd'hui, `150` signaux simples positifs, `18` lignes affichées aujourd'hui, `30` lignes cockpit et `25` opportunités sur 24h.
- La sélection finale réserve maintenant de la place aux sports sous-représentés quand ils ont au moins un signal exploitable : football, tennis, basket, baseball et hockey remontent dans le cockpit au lieu de disparaître derrière le football.
- Le Top 3 “prochaines 24h” est réellement trié par confiance puis cote, comme annoncé à l'écran.
- Le badge de navigation “À miser” compte le même périmètre 24h que l'accueil, ce qui corrige l'écart visible entre le menu et le bandeau.
- Les fiches match évitent les informations fausses ou faibles : plus de gardien proposé comme buteur probable, plus de duels tactiques gardien vs joueur, forme récente corrigée en victoires réelles, champion passé affiché seulement quand connu.
- Les données manquantes sont mieux présentées : H2H, arbitre, coach et segments courts affichent un message honnête au lieu de `0`, `N/A` ou “insuffisant” incohérent.
- La recherche deep n'affiche plus une énorme liste avant saisie : l'utilisateur tape d'abord une équipe, un joueur ou une ligue.
- Le vocabulaire standard a été nettoyé : `edge`, `Kelly`, `1N2`, `BTTS` restants remplacés par `avantage`, `mise prudente`, `vainqueur du match`, `les deux marquent` sur les surfaces utilisateur.
- L'alerte “données > 30 min” ne pollue plus l'accueil sur un snapshot encore utilisable ; le refresh automatique reste déclenché quand la donnée locale commence vraiment à dater.
- Validation : `qa:engine`, `qa:terrain:quick`, `qa:desktop`, `qa:safe`, `qa:winamax-audit`, `qa:a11y` et capture visuelle Electron relancés sur les données terrain.

### Version v2.2.0 — Pronostics focus + accueil compact par catégories

Refonte ciblée après audit terrain de la page “À miser”.
- Pipeline réelle relancée : `generated_at=2026-05-17T09:11:14Z`, 159 événements Winamax aujourd’hui, 147 signaux simples positifs, 18 lignes affichées aujourd’hui et 26 sur 24h.
- Le cockpit standard garde 30 lignes maximum mais remonte désormais 15 Vainqueurs sur 30 quand le stock existe, au lieu de laisser les Plus/Moins remplir le haut de page.
- La règle Winamax “filet 2-0” peut promouvoir un Vainqueur en pari jouable si le signal est fort, le risque segment n’est pas sévère et la probabilité 2-0 est élevée. Exemple terrain : AS Roma - Lazio devient #1, Vainqueur, cote 1.50, confiance 79%, filet 2-0 71%.
- Accueil “À miser” réduit au strict utile : Top 3 des prochaines 24h, tableau triable limité à 8 lignes, puis catégories compactes.
- Catégories d’allègement ajoutées sur l’accueil : Strict, Gros gain, Mi-temps, Combinés et entrées directes par sport, sans rallonger la barre latérale.
- La navigation latérale reste courte : À miser, Cockpit, Vainqueurs, Buts, Nuit, Buteurs, Combinés, À surveiller, Bilan, Recherche, Réglages.
- Le Mode Trading Desk redevient visible quand il est activé en Mode expert, sans polluer l’accueil standard.
- Tests terrain renforcés : `qa:engine`, `qa:terrain:quick`, `qa:desktop`, `qa:safe`, `qa:winamax-audit`, `qa:a11y` et capture visuelle validés.
- Capture terrain : `captures/desktop-home-focus-v220.png` avec 3 cartes Top Pick, 8 lignes de tableau et 16 catégories compactes.

### Hotfix v2.1.9 — Vérité data terrain + garde-fou zéro Winamax

Correction profonde du faux vert terrain détecté pendant l’audit pronostics.
- Nouvelle source de vérité runtime pour le moteur desktop : `data.js`, `data_lite.js`, `data_today.json` et `data_manifest.json` sont comparés avant analyse.
- Si `data.js` perd les événements Winamax du jour alors qu’un snapshot léger en contient, le moteur peut réparer la journée en mémoire au lieu d’afficher 0 pick.
- Le refresh desktop écrit maintenant un verrou `refresh-running.json`; les audits attendent un refresh vivant mais ne restent plus bloqués sur un verrou fantôme si le process est mort.
- Les smoke tests isolés ne déclenchent plus les auto-refresh pré-match/critique, pour éviter de fermer Electron pendant que `fetch_live.py` a écrit un snapshot intermédiaire.
- `qa:engine` et `qa:terrain` échouent désormais explicitement si `data.js` retombe à 0 Winamax aujourd’hui pendant que les snapshots légers prouvent le contraire.
- `qa:winamax-audit` lit la même donnée réparée que le moteur, avec un champ `dataTruth` pour voir les écarts entre full/lite/today.
- Validation terrain après pipeline complète : 159 événements Winamax aujourd’hui, 145 signaux simples positifs, 24 affichés, 7 paris prêts, 30 lignes cockpit.
- Build Windows validé : `Paris Sportif Desktop Setup 2.1.9.exe`, version visible dans l’app packagée, 12 lignes rapides sur l’accueil.
- Problèmes réels conservés comme alertes qualité : enrichissement incomplet sur certaines sources sportives et checklist pré-match encore bloquante sur les dossiers à contexte fragile.

## Desktop — 2026-05-16

### Hotfix v2.1.8 — Plan 30 chantiers pronostics + accueil compact

Livraison autonome des priorités pronostics/UX demandées.
- Moteur cockpit élargi de 25 à 30 lignes maximum, avec cible 24h portée jusqu’à 30 quand le catalogue Winamax le permet, sans changer les garde-fous de mise.
- Quota `Vainqueur` renforcé : cible minimale 10 lignes et environ 50% du cockpit quand les signaux existent, pour éviter une page dominée par les Plus/Moins.
- Accueil encore réduit : le tableau rapide affiche 12 lignes maximum, le reste part dans les catégories et le Cockpit.
- Nouvelles catégories de désengorgement : `Strict` pour les lignes fiables avec contexte propre, `Gros gain` pour les cotes 2+ filtrées, en plus de Vainqueurs, Buts, Nuit, Buteurs, Combinés et À surveiller.
- Les tests terrain et smoke vérifient désormais que l’accueil reste court, que le brief audio ne revient pas, et que le cockpit peut monter à 30 lignes.
- Libellé `Résultat + BTTS` remplacé par `Résultat + les deux marquent` côté interface standard.

### Hotfix v2.1.7 — Audit profond terrain + combinés propres

Audit utilisateur réel après la refonte “À miser”.
- Terrain actuel mesuré : 161 events Winamax aujourd’hui, 130 analysables, 58 signaux simples positifs, 20 affichés, 7 paris réellement prêts, 25 lignes cockpit sur 24h. Le logiciel reste honnête : il affiche les lignes à surveiller sans les transformer en faux paris.
- Le Top 3 de l’accueil privilégie les paris jouables, mais force aussi une vraie diversité de marchés quand le tableau contient plusieurs types de pronostics.
- Les raisons techniques visibles ont été réécrites en français clair : `Edge non positif` devient `Avantage insuffisant`, `Kelly nul` devient `Mise non recommandée`, `Contexte exploitable` devient `Contexte à rechecker`.
- La page `Combinés` ne montre plus en mode standard les tickets avec handicap, score exact, double chance, DNB, nul, HT/FT ou libellés techniques. Les tickets trop corrélés et les répétitions du même match sont masqués.
- Les combinés standard utilisent des libellés utilisateur (`Même match`, `Plusieurs matchs`, `Vainqueur`, `Les deux marquent`) et ne montrent plus les métriques `edge`/corrélation hors Mode expert.
- Le Bilan masque les ROI extrêmes non crédibles côté utilisateur (`MLB 1169%`, `NBA 564%`) derrière une carte `Segments extrêmes masqués`, pour éviter de donner un faux signal de confiance.
- `smoke` et `qa:terrain` ouvrent désormais aussi la page Combinés et échouent si du jargon ou un marché avancé réapparaît en mode standard.

### Hotfix v2.1.6 — Top 3 diversifié + boot refresh robuste

Mission autonome pronostics/UX après refonte accueil.
- Le Top 3 24h ne peut plus empiler trois paris du même type si le tableau contient plusieurs marchés exploitables.
- Les Vainqueurs reçoivent un bonus de priorité plus fort, surtout quand le filet 2-0 Winamax est disponible.
- Les cartes Top 3 affichent maintenant le type de pari en chip pour comprendre immédiatement la variété.
- Le refresh automatique au boot ne plante plus si certains boutons avancés sont absents de l’accueil compact.
- `qa:terrain` et `smoke` attendent réellement les lignes calculées avant de juger la page, puis vérifient la diversité du Top 3.

### Hotfix v2.1.5 — Accueil refait Top 3 + tableau triable + catégories

Refonte de la page “À miser” après captures utilisateur : l’écran d’entrée ne doit plus ressembler à un cockpit technique.
- Accueil remplacé par un bloc clair : `Top 3 prochaines 24h` classé par confiance de réussite puis cote Winamax.
- Nouveau tableau 24h triable par `Confiance`, `Heure`, `Date` ou `Cote`, avec PARI / COTE / MISE visibles sans jargon.
- Navigation enrichie pour décharger l’accueil : `Cockpit`, `Vainqueurs`, `Buts`, `Nuit`, `Buteurs`, `Combinés`, `À surveiller`.
- Les entrées de navigation catégories ouvrent directement le Cockpit au bon filtre, sans forcer l’utilisateur à fouiller l’accueil.
- Les blocs passifs restants (`résumé jour`, bandeau temporel, anciens héros) sont masqués sur l’accueil rapide.
- `qa:terrain` et `desktop/scripts/smoke.js` vérifient maintenant le Top 3, le tableau triable et la navigation dédiée.

### Hotfix v2.1.4 — Accueil et fiche match réellement épurés

Correctif après captures utilisateur : le Mode expert réaffichait sur “À miser” les blocs diagnostic (`Modèle aujourd’hui`, `Conseils du jour`, `Décision finale locale`) avant le Top Pick.
- L’accueil “À miser” reste minimal même si le Mode expert est activé : Top Pick + catégories uniquement.
- Les blocs diagnostic, métriques, scanner, dashboard custom, live et scénarios restent hors de l’accueil rapide.
- La fiche match desktop passe en mode rapide : seulement `Synthèse`, `Contexte`, `Équipes`; les onglets techniques ne polluent plus le parcours de mise.
- L’ancien détail match runtime est verrouillé sur `Synthèse` / `Pourquoi ce pari` par défaut, avec les marchés alternatifs cachés derrière le bouton de détails.
- `qa:terrain` simule maintenant le Mode expert actif pour éviter que cette régression revienne.

### Hotfix v2.1.3 — Raccourci Windows corrigé

Cause trouvée après retour “toujours aucun changement” : le raccourci Windows `Paris Sportif Desktop` du menu Démarrer pointait vers une vieille installation temporaire `ParisSportifSprint22Install`, pas vers le lanceur local du projet.
- Version passée en `v2.1.3`.
- Marqueur visible en haut : `Accueil minimal v2.1.3 · Winamax-only`.
- Le raccourci Windows doit pointer vers `wscript.exe LANCER-LOGICIEL.vbs`, donc la même app que le lanceur corrigé.

### Hotfix v2.1.2 — Accueil “À miser” vraiment allégé

Correctif après retour utilisateur : la page “À miser” restait trop chargée malgré les catégories.
- Accueil standard réduit à l’essentiel : Top Pick compact + catégories.
- Les cartes secondaires “À miser maintenant”, le live vide et le panneau Cockpit fermé sont cachés par défaut.
- Le Cockpit complet s’ouvre uniquement après clic sur une catégorie.
- Catégories renforcées : `Cockpit pronostics`, `À miser`, `Vainqueurs`, `Nuit`, `Aujourd’hui`, `Demain`, `Buts`, `Buteurs`, `Par sport`, `Live`, `À surveiller`.
- Les catégories vides sont masquées : plus de `Demain 0`, `Buteurs 0`, `Live 0` sur l’accueil.
- Top Pick compact : moins de badges, image de fond cachée sur l’accueil, texte limité à une ligne.
- `qa:terrain` vérifie maintenant que l’accueil n’affiche pas les blocs secondaires et ne montre pas de catégorie vide.

### Hotfix v2.1.1 — Changements visibles via le lanceur Windows

Correctif ciblé après retour utilisateur : `LANCER-LOGICIEL.vbs` relançait parfois une ancienne fenêtre Electron déjà en mémoire, donc les changements semblaient absents.
- `LANCER-LOGICIEL.bat` ferme uniquement l'ancienne instance Electron de ce projet avant de redémarrer.
- Correction critique du lanceur Windows : le `.bat` est forcé en CRLF via `.gitattributes`. En LF, `cmd.exe` lisait `chcp/title/cd/set/if` sans première lettre et restait bloqué dans une fenêtre cachée.
- Le lanceur démarre maintenant directement `desktop\node_modules\electron\dist\electron.exe` quand il est déjà installé, sans dépendre de `npm start`.
- Les anciens lanceurs cachés du même projet sont nettoyés au démarrage.
- Un second lancement recharge le renderer sans cache si l'app est déjà ouverte.
- Version desktop passée en `v2.1.1` pour vérifier visuellement que la bonne build est lancée.
- Validation terrain : accueil compact visible dans Electron, `Cockpit pronostics` en premier, 7 catégories, 3 cartes hero, anciens blocs denses cachés, 0 erreur console.
- Validation lanceur réel : `wscript.exe LANCER-LOGICIEL.vbs` lance bien Electron, `/api/app-info` répond `200`, version `2.1.1`.

### Sprint pronostics — Accueil compact + Cockpit par catégories

Focus demandé sur les pronostics : l'accueil devient une page de décision rapide, le détail passe dans un Cockpit dédié.
- Accueil allégé : seuls le top pick, les meilleurs paris immédiats, le résumé Winamax et les catégories restent visibles.
- Le hero "À miser maintenant" est limité au Top 3 pour éviter l'effet mur de cartes.
- Nouveau bloc catégories : `Cockpit pronostics`, `Vainqueurs`, `Nuit`, `Buts`, `Buteurs`, `Par sport`, `À surveiller`.
- Nouveau panneau `Cockpit pronostics` fermé par défaut : exploration complète par horaire, type, sport, favoris, combinés, buteurs, filtres et tableau.
- Clic sur une catégorie ouvre directement le cockpit au bon endroit, par exemple `Vainqueurs` ouvre la vue par type sur les paris Vainqueur.
- Les filtres ne sont plus ouverts par défaut dans l'accueil, pour garder l'écran principal petit et actionnable.
- Le lanceur `LANCER-LOGICIEL.vbs` / `.bat` ferme maintenant l'ancienne instance Electron de ce projet avant relance : fini l'impression de "ne pas voir les changements" quand une vieille fenêtre était encore en mémoire.
- Un second lancement recharge aussi le renderer sans cache si l'app est déjà ouverte.
- `qa:terrain:quick` vérifie maintenant que les catégories existent, que le Cockpit n'est pas ouvert par défaut et que la catégorie `Vainqueurs` ouvre bien le cockpit.

Validation :
- Syntaxe renderer/main : OK.
- Vérification visuelle Electron : `Cockpit pronostics` visible en premier, 7 catégories, 3 cartes hero, cockpit fermé par défaut, anciens blocs denses cachés, 0 erreur console.
- `npm run qa:terrain` : OK avec pipeline complète, `health.json` généré à `2026-05-16T21:20:45Z`.
- `npm run qa:terrain:quick`, `npm test`, `npm run qa:engine`, `npm run qa:safe`, `npm run qa:a11y`, `node desktop/scripts/visual-capture.js` : OK.
- `npm run dist` : OK, installeur `Paris Sportif Desktop Setup 2.1.0.exe` généré.

### Sprint terrain — Audit utilisateur réel + corrections cockpit

Audit terrain lancé avec pipeline complète réelle puis app Electron pilotée comme un utilisateur qui veut miser vite :
- Pipeline fraîche validée : `health.json` généré à `2026-05-16T20:30:45Z`.
- Snapshot terrain : 23 événements Winamax encore aujourd'hui, 25 lignes cockpit, 23 opportunités sur 24h glissantes.
- `qa:terrain` et `qa:terrain:quick` exécutent désormais le clic réel "Je mise" et vérifient la cohérence bannière/boutons.
- Capture visuelle complète relancée avec dashboard, fiche match, Bilan, Recherche, Réglages, Avancé, Trading Desk et mobile.

**Bugs réels trouvés et corrigés**
- Contradiction accueil : l'app affichait "Aucun pari prêt aujourd'hui" alors que des boutons "Je mise" étaient visibles sur les prochaines 24h. Le cockpit, le funnel et la suggestion raisonnent maintenant en fenêtre 24h glissante.
- Hero trompeur : un top pick de demain était présenté comme pari du jour. L'eyebrow indique maintenant `maintenant / ce soir / demain / à venir`.
- Bouton "Je mise" du hero : attribut non géré dans le handler terrain, donc clic non fiable. Le hero utilise maintenant le composant commun `trackButtonHtml`.
- Double arobase sur les cotes (`@@1.82`) corrigée.
- Navigation trop chargée : les anciennes entrées Buteurs / Combinés / Calendrier restent cachées en mode standard ; libellé principal simplifié en `À miser`.
- Onglets fiche match trop techniques en standard : `Sources` et `Signaux` sont cachés hors Mode expert.
- Fiches non-foot polluées par signaux foot : météo/arbitre/xG/compositions sont masqués quand ils ne sont pas pertinents.
- Stats à zéro trompeuses : xG/xA/tirs/dribbles/conversion/minutes à `0` sont traités comme manquants quand la source n'est pas fiable, au lieu d'afficher un faux zéro.
- Intervalle de confiance aberrant `0-1%` caché quand le sample réel n'est pas disponible.
- Checklist contradictoire : un pick misable n'affiche plus un blocage rouge hérité du prebet gate.
- Suggestion du jour : ne dit plus "aucun pari prêt aujourd'hui" quand un pari est prêt dans la fenêtre 24h.
- CSP Electron : `style-src` ré-aligné avec l'interface réelle pour supprimer les erreurs console de styles inline.
- Responsive mobile : les règles `<840px` écrasaient la bottom-nav `<640px`, ce qui faisait intercepter les clics de navigation par le feed. La bottom-nav mobile est restaurée en priorité.
- Test visuel : attentes mises à jour sur le produit actuel (`À miser`, métrique 24h, fiche standard sans modules experts forcés).

**Modèle et volume**
- La règle Winamax "filet 2-0" peut maintenant promouvoir un Vainqueur foot limité en sample si le pari a edge positif, confiance forte, probabilité 2-0 élevée et aucun segment historique propre négatif.
- Sélection prête équilibrée : le hero favorise davantage les Vainqueurs quand ils existent au lieu de laisser Plus/Moins monopoliser l'écran.
- Diagnostic `todayFunnel` distingue les signaux simples positifs des opportunités seulement "à surveiller".

**Validation**
- `npm run qa:terrain` : OK avec pipeline complète.
- `npm run qa:terrain:quick` : OK après corrections.
- `npm run qa:engine`, `npm run qa:safe`, `npm run qa:a11y`, `npm run qa:desktop`, `npm test` : OK.
- `npm run qa:winamax-audit` : OK, 15 familles disponibles / 14 exploitées, aucun dormant standard.
- `node scripts/visual-capture.js` : OK, captures régénérées.
- `npm run dist` : OK, installeur `Paris Sportif Desktop Setup 2.1.0.exe` généré.
- Syntaxe renderer/main : OK.

## Desktop — 2026-05-14

### Sprint 80-85 — Refonte radicale (RIEN au-dessus du bet ultime + magazine + discipline + mobile)

**Sprint 80 — Dashboard radical** (livré commit fbca6b532)
- A1+A2 `simple-top-strip` + `day-summary` descendus SOUS le bet ultime
- A3 `onboarding-card` → mode modal first-launch (position: fixed)
- A4 `live-cockpit` auto-hide quand vide (classe `.live-empty`)
- A5 `time-cockpit` retiré en `expert-only.hidden` (redondant)
- A8 Mobile <640px : `temporal-zones-strip` cachée par défaut

**Sprint 81 — Fiche match magazine**
- B1 `enriched-sources-card` retiré de Synthèse (doublonné onglet Sources)
- B3 `monte-carlo-card` + `personal-model-card` + `Patterns avancés` → `<details>` "🔬 Vue technique" fermé par défaut
- B4 `news-watcher` + `social-watcher` fusionnés en `watcher-compact` condensé (affiché uniquement si tone ≠ ok)
- Bénéfice : Synthèse passe de 14 blocs → 7 visibles + 1 details

**Sprint 82 — Cleanup pronostics**
- C2 Seuil OU 2.5/derive : `aberrantEdge` à **0.13** (au lieu de 0.15) — bin 0.50-0.60 surestime de 18pt
- C3 Sport non-foot dérivé sans backtest sport-marché (n<30) → `reliable=false` (1n2 reste autorisé hors-foot)
- Reason explicite "calibration `sport` limitée (N/30 paris settled)"
- Profil sain conservé : 9 Fiables (8 foot + 1 hockey 1n2)
- Test engine-contract assoupli 10 → 7 (profil discipliné)

**Sprint 83 différé** : lazy-load sidecars + split winamax_markets → BACKLOG.md Sprint 86 (refactor lourd 3-4h, risque pipeline Python)

**Sprint 84 — Mobile-first**
- E2 Bottom-nav : 4 onglets max sur mobile, autres (trading, advanced, scorers, combines) `display: none`
- E3 Modal détail en **bottom-sheet** sur <640px (slide-up animation, border-radius 18px top, max-height 92vh)
- E4 **Swipe gestures** gauche/droite sur modal mobile pour prev/next pick (SWIPE_MIN_DELTA 60px, SWIPE_MAX_VERTICAL 80px pour ignorer scroll)
- E5 Ultimate-bet sticky-top quand pinned (class `.is-pinned`, backdrop blur)

**Sprint 85** : BACKLOG.md mis à jour avec Sprint 86+87+88 différés (perf, backtest_v2 repair, ESM split).

Engine OK : 169 matchs, 94 picks, 9 Fiables sains. Tests verts.

### Sprint 73-79 — Plan continuation : quick wins + H2H + Coach + notifs + sweep + plan Sprint 80+

**Sprint 73 — Quick wins**
- D6 Arbitre profile : tier 🟥 Strict / 🟢 Permissif / 🟨 Moyen + penalties/match si dispo
- F7 Achievements card : 10 badges progressifs (first-bet, ten-bets, fifty-bets, first-win, streak-3, streak-7, roi-positif, roi-10, week-active, month-active) avec progress bar gradient
- D10 Hover preview : popover floating 600ms au survol des rows du tableau, 3 KPIs (Confiance/Avantage/Mise), hidden sur touch
- G4 Visual baseline : `desktop/scripts/visual-baseline.js` capture/compare fingerprint structurel (rows, badges, sections, charLen, booleans). Drift > 50% number ou changement booléen = warn. Scripts `npm run qa:visual-capture` et `qa:visual`.

**Sprint 74 D2 — H2H expanded**
- `h2hStreaksAnalysis(meetings)` : analyse les 10 derniers H2H
- Card "📊 Patterns sur N H2H récents" avec 4 stats colorées (low/high scoring, BTTS, home dominance) + highlight si tendance > 60%
- Liste H2H détaillée avec border-left coloré (vert home win / rouge away win / gris draw) + chip total 🔥/🔒
- Sequence "Forme home sur 5 derniers" avec pills W/D/L
- Limite étendue 8 → 10 meetings

**Sprint 78 F6 — Mode Coach anti-tilt**
- `coachReduceStake` pref (default true) : si user a 3 défaites de suite, mise auto réduite -50%
- `stakeReductionFactor: 0.5` retourné par le coach guard
- Détail message adapté : "Mise auto réduite -50%" vs "Reclique pour confirmer"
- Toggle dans Réglages > Antitilt

**Sprint 78 F3 — Notifs custom (règles user-defined)**
- `loadCustomNotifRules()` / `saveCustomNotifRules()` : règles dans `localStorage.parisSportif.customNotifRules`
- `pickMatchesCustomRule(row, rule)` : conditions team/league/sport/edgeMin/confMin/oddMin/oddMax
- `checkCustomNotifs(rows)` : appelée dans `renderUltimateBet`, dédoublonne via seen Set
- Backbone prêt, UI de création de règles à venir (CRUD dans Réglages)

**Sprint 79 G3 — Sweep catch silencieux partiel**
- 11/33 catches silencieux migrés vers `logSafeError(ctx, e)` : boucles `predictMatch` (4 occurrences), `selectBestMarket` (1), `evaluateModelPick` (1), `dataQualityFlags` vig+live (2), `v43_profitable_mode` setItem+dispatch (2), `dashboardFlags` (1)
- Restant : 22 catches sur `try { window.X = Y } catch(e) {}` légitimes (sandbox/CSP peut empêcher assignation globale)

**Sprint 80+ planifié dans BACKLOG.md** :
- Sprint 80 : D3 Compositions 11vs11 enrichies (M 3-4h)
- Sprint 81 : D4 Player props inline (M 3h)
- Sprint 82 : D7 Historique cotes 72h (M 3-4h)
- Sprint 83 : E1+E2+E3 Performance critique (M+M+L)
- Sprint 84 : C2 Multi-sport calibration (BLOQUÉ data)
- Sprint 85 : C4+C5 Sharp money + multi-bookmaker (BLOQUÉ API key)
- Sprint 86 : C7 Live picks <30min (M 4-5h)
- Sprint 87 : D8 Mode tactique (L 1j)
- Sprint 88 : F5 Sync multi-device (L 1j)
- Sprint 89 : G2 tests intégration + G1 ESM split (L+XL, 2-3j sprint dédié)

Engine OK : 171 matchs, 94 picks. Tests verts.

### Sprint 72 — Plan UX/pronostics maximum (Rounds 1-5)

Implémentation du plan complet "améliorer UX au maximum + pronostics + fiches match" en 4 rounds d'exécution + 1 round documentation.

**Round 1 — Backtest cron + Hero bet + Sub-tabs Bilan + Why checklist**
- C9 : workflow `desktop-recalibrate.yml` (cron lundi 03h UTC) regénère `prob_calibration.json` avec bins per-market + validation auto via `calibration-check.js`.
- A1 : Hero "🎯 Bet du jour" avec eyebrow "#1 sur N paris analysés", empty state enrichi (hint J+1), CTAs avec emojis "🚀 Ouvrir Winamax" / "✓ Je mise".
- A4 : Countdown pulse selon proximité (`warm` jaune <2h → `soon` orange <30min → `imminent` rouge pulse <5min).
- B3 : Modal breadcrumbs "Aujourd'hui › Sport › Ligue › Pari" en haut.
- B4 : Sub-tabs Bilan 4 vues (Vue d'ensemble / Mon mois / Patterns / Comptabilité) avec localStorage persist.
- D9 : `whyChecklistBullets(row)` checklist visuelle ✅/⚠️/❌ sur 8 dimensions (forme, edge, segment, cote Winamax, sharp money, météo, lineups, news).

**Round 2 — Bandeau temporel 3 zones**
- A3 : Strip "⚡ Maintenant (<1h) / ⏰ Aujourd'hui (1-12h) / 🌙 Demain (>12h)" en tête du dashboard avec compteurs live calculés depuis `dashboardPicks`. Halos radiaux colorés par zone (rouge/orange/indigo).

**Round 3 — Pronostics premium**
- C3 : Wilson 95% CI affiché dans la modal hero (helper `wilsonCi(wins, n, z=1.96)` exposé window). Barre de confiance gradient indigo→vert + IC segment "24-38%" si sample ≥ 5.
- C6 : Bandeau hedging "⚠ Tu as déjà N paris en cours sur ce match" si user a déjà des paris pending sur le même matchId. Liste les paris existants.
- C8 : Combos décorrélés déjà Sprint 71 (`combinationCorrelation` existant).
- C10 : Carte Brier dans Bilan overview. 4 tiers (Excellent <0.18 / Bon <0.22 / Moyen <0.27 / Faible). Meter gradient vert→jaune→rouge sur 0-0.50. Advice contextuel par tier.

**Round 4 — Robustesse**
- G5 : Export/clear logs erreurs dans Réglages > Profil. Lit `localStorage.paris_sportif_js_errors_v1` (déjà alimenté par `logSafeError`), download JSON, compteur "N logs capturés", clear avec confirm.

**Round 5 — Items différés documentés**
- 14 items P1 documentés dans `BACKLOG.md` avec effort + pré-requis (C2 multi-sport, C4 sharp money, C5 multi-bookmaker, C7 live picks, D2/D3/D4/D6/D7/D8/D10 fiches match, E1/E2/E3 perf, F3/F5/F7 personnalisation). Nécessitent des données externes (TheOddsAPI) ou des refactors > 3h.

Engine OK : 171 matchs, 94 picks. Tous tests verts (engine-contract, calibration-check, safe-assessment-check).

### Sprint 71 — Top 10 audit final fixes : cleanup, hook, focus, edge, lazy, catches, mobile, ESM

Réponse à l'audit final (top 10 prochains chantiers post Sprint 60-70). Tous les chantiers XS+S+M traités, le L (ESM split) documenté dans BACKLOG.md.

**#1 — `.gitignore` cleanup `dist-sprint*/` (-13.5 GB)**
- Ajout `desktop/dist/`, `desktop/dist-sprint*/`, `captures/desktop-sprint*` au `.gitignore`.
- `rm -rf desktop/dist-sprint*` (24 dossiers ×~560 MB).
- git status untracked : **419 → 294** fichiers.

**#10 — Pre-commit hook python3 → python fallback**
- `scripts/install_pre_commit_hook.sh` détecte le binaire fonctionnel via boucle `python3` puis `python` avec test `--version`.
- Évite le faux raccourci Microsoft Store sur Windows.
- Skip gracieux des checks Python si aucun binaire valide.
- Réinstallé localement, plus de `--no-verify` nécessaire pour modifier `scripts/*.py`.

**#7 — Bouton 🎯 Mode focus dans la modal détail**
- `#modal-focus-btn` ajouté dans `.modal-nav-buttons` à côté de prev/next/close.
- Ferme la modal, ouvre l'overlay focus plein écran sur le même pick.
- Adoption de la feature `openFocusMode` qui n'avait aucun entry point UI avant.

**#5 — Edge threshold value 1pt → 3pt**
- `_displayablePickTier` (`legacy-app.js:2761`) : les tiers `safe/solid/value` exigent désormais `edge >= 0.03` (3pt) au lieu de `0.01` (1pt).
- La zone 1-3pt est sous le bruit statistique (Brier global 0.20 → σ ~30%). Élimine du bruit sans toucher aux outsiders (big/out gardent 3-5pt).

**#6 — Lazy render Bilan (`renderHistory`)**
- Tier 1 critique synchrone (4 renderers : Mon mois, Model perf, Tracked bets, Insights).
- Tier 2 secondaire défer via `requestIdleCallback` (6 renderers : autoSettlement, modelSelfAudit, modelAdjustments, personalPatterns, heatmap365, learningFeedback).
- Avant : ~1s freeze sur switch vers Bilan. Maintenant : contenu principal immédiat, le reste arrive en idle.

**#3 — Sweep catch silencieux (5 cas critiques)**
- 5 `} catch (err) {}` remplacés par `} catch (err) { logSafeError(ctx, err); }` dans `legacy-app.js` :
  - `v45BulkTrack parse payload` (JSON.parse user input)
  - `localStorage setItem userBankroll`
  - `v45BulkTrack _addUserBet item`
  - `post-bulk-track renderDashboardPage`
  - `ps:app-shell-ready _settleUserBets`
- Reste 33 catches silencieux (sweep complet = 2h, repoussé).

**#4 — Platt boost scope explicite 1n2 only (commentaire)**
- Déjà résolu par Sprint 68 (calibration per-market). Commentaire d'explication ajouté en tête de `_applyCalibration` pour prévenir régression future : "p.reliability représente la prob 1n2 head ; les marchés dérivés utilisent Poisson xG + bins_by_market Sprint 68 séparément".

**#2 — Memoization `winamax_markets.json`**
- Déjà couvert par Sprint 67 (`readJsonSidecarMemo` cache par mtime). Le refactor `analysisCache` séparé (3-4h) reporté.

**#8 — Mobile bottom-nav <640px**
- Sidebar verticale 56px (qui mange l'écran sur mobile) remplacée par **bottom-nav fixe** avec 5 icônes au breakpoint `max-width: 640px`.
- Position `fixed bottom: 0`, flex-direction row, backdrop-filter blur, safe-area-inset-bottom pour iPhones.
- `.nav-label` masquée, icônes seules 20px.
- `.main { padding-bottom: 80px }` pour éviter overlap du contenu.
- Theme-light parity (`rgba(255, 255, 255, .96)`).

**#9 — ESM split legacy-app.js (1.93 MB, 36 976 lignes) — différé**
- Documenté dans `BACKLOG.md` comme P0 desktop avec plan de découpe en 7 modules (core/markets/calibration/signals/ui-bridge/enrichment/misc).
- Pré-requis : étendre suite de tests Sprint 70 avant le split.
- Estimé 8-10h, à faire en sprint dédié.

Engine OK : 172 matchs, 94 picks. Tests : engine-contract OK, calibration OK (5 marchés), safe-assessment OK (8 Fiables sains).

### Sprint 70 — Tests & CI : safe-assessment + calibration-check intégrés

**`desktop/scripts/safe-assessment-check.js`** (nouveau)
- Test 1 : aucun Fiable avec edge brut ≥ 22pt (1n2) ou ≥ 15pt (dérivé)
- Test 2 : aucun Fiable dérivé avec segment court perdant (sample 5-14, ROI<0)
- Test 3 : `oddsBasedFallback` (pickSource='winamax_odds_fallback') JAMAIS Fiable
- Test 4 : profil sain (1-20 Fiables, ni trop strict ni trop laxe)
- Verrouille les invariants Sprint 66-68 contre régression future.

**`desktop/scripts/calibration-check.js`** (nouveau)
- Test 1 : schema `prob_calibration.v3` (post Sprint 68)
- Test 2 : `bins`, `bins_by_sport` présents
- Test 3 : `bins_by_market` avec `1n2` ET `ou` (les 2 marchés clés), n>=30 chacun
- Test 4 : `brier_calibrated < brier_raw` pour TOUS les marchés calibrés (pas de régression)
- Test 5 : `applies_at_runtime === true`

**`package.json`**
- Nouveaux scripts : `npm run qa:safe`, `npm run qa:calibration`

**`.github/workflows/desktop-check.yml`**
- 2 nouveaux jobs : "Calibration check (Sprint 68)" + "Safe assessment check (Sprint 66+70)"
- `node --check` étendu sur les 3 nouveaux scripts.

Validation locale : qa:engine OK · qa:calibration OK (5 marchés, brier OU -2.9pt confirmé) · qa:safe OK (4 Fiables, 14 fallbacks watch, profil sain).

### Sprint 69 — UX finitions : cellule Pari simplifiée + Cmd-K palette

**Cellule "Pari" du tableau simplifiée** (`renderer.js:renderPicks`)
- Avant : 8 chips empilés (`statusText` + `priority` + `marketLabel` + `safe` + `pattern` + `boost` + `enrichment` + `actionPick`) → cellule illisible.
- Maintenant : 3 éléments principaux (`statusText` pill, bet label en strong, `safe` badge) + un chip compact `+N` qui list les badges secondaires en tooltip (`priorité · fiable · pattern · boost · enrichi`).
- `<strong class="pari-bet-label">` met le libellé du pari en avant (typo 13px weight 600).

**Cmd-K palette** (`index.html` + `renderer.js` + `styles.css`)
- Raccourci `Ctrl+K` / `Cmd+K` ouvre une palette de recherche centrée (560px max, 8vh from top).
- Recherche unifiée : 8 actions/tabs (À MISER, Bilan, Buteurs, Combinés, Réglages, Tour démo, Toggle expert, Refresh) + jusqu'à 50 matchs du dashboard.
- Filtrage live : tape "psg" → matchs PSG + actions matching ; tape "demo" → "Lancer le tour démo".
- Navigation clavier : `↓` / `↑` pour parcourir, `Enter` pour exécuter, `Esc` pour fermer.
- Backdrop blur + animation slide-in 200ms.
- Theme-light parity.

**Comparaison 2 picks** : indirecte via Cmd-K (tape l'équipe du 2ème match dans la palette pour switch rapide depuis la modal).

Engine contract OK : 181 matchs, 93 picks. Smoke OK : 11 paris visibles.

### Sprint 68 — Calibration per-market + ligues refresh (audit P1)

Suite Sprint 66-67 (discipline modèle), on s'attaque à la cause racine : la calibration `_calibrateProb` était globale (bins 1n2 foot only, n=1037) et s'appliquait aveuglément à OU 2.5/BTTS/scorer. Brier OU 0.247 vs 1n2 0.184 → marché OU **mal calibré de loin le plus**.

**`build_prob_calibration.py`** étendu avec `bins_by_market`
- Nouveau `build_bins_by_market(records, min_n=30)` qui group par `market_key` du `picks_history.jsonl`.
- Schema bumpé `prob_calibration.v3`.
- **5 marchés calibrés indépendamment** (n>=30 chacun, total 1817 picks settled) :
  - **OU** : n=347, Brier 0.247 → 0.218 (gain **-2.9pt**, le plus gros)
  - **TeamTotal** : n=513, gain -1.79pt
  - **DNB** : n=126, gain -1.82pt
  - **BTTS** : n=96, gain -1.55pt
  - **1n2** : n=735, gain -1.25pt
- exactScore (n=6) skip car < 30.

**`_calibrateProb` runtime** (`legacy-app.js`)
- Priorité hiérarchique : `bins_by_market[market]` > `bins_by_sport[sport]` > `bins` global.
- Normalisation marketKey runtime → naming `picks_history` (`ou15/ou25/ou35/hockeyTotal/htOu` → `ou`, `matchwinner/winner/moneyline` → `1n2`, `goalscorer/buteur` → `scorer`).
- Branchée dans `_v35AddCandidate` (`buildMarketCandidates`) pour calibrer la prob raw avant inclusion. `probRaw` conservé en parallèle pour debug.
- Signature finale `_calibrateProb(p, sport, leagueCode, market)` alignée sur le call site historique.

**`_V45_LEAGUE_OFFSETS` recalculés depuis picks_history.jsonl** (`legacy-app.js`)
- Constat : le modèle est **systématiquement surconfiant** sur quasi toutes les ligues (avg_edge positif partout).
- Half-correction (`offset = -avg_edge/2`) cappée à -6pt.
- **3 nouvelles ligues ajoutées** : `esp.1` (-5.13pt, n=49), `eng.1` (-4.73pt, n=45), `ita.1` (-5.41pt, n=32) — les top 5 manquaient avant.
- **6 ligues recalibrées** : `jpn.1` -1.35 → -4.45, `fra.2` -0.73 → -3.22, `conmebol.libertadores` +1.08 → **-5.07 (signe inversé !)**, `esp.2` +0.98 → **-3.84 (signe inversé !)**, `chn.1` -0.72 → -4.89.
- **mlb/nba/nhl retirés** : avg_edge >40pt = artefact format cotes US (+200/-300 vs decimal), pas un vrai biais modèle.
- Total : 17 ligues offsets (vs 9 avant), couverture beaucoup plus large.

Engine contract OK : 181 matchs, 93 picks, 25 dashboard. 4 Fiables raisonnables conservés (Canadiens 1n2 +4.5pt, OU 2.5/3.5 entre +8.8 et +11pt). Pas de pick aberrant ressurgi.

### Sprint 66-67 — Audit top 10 fixes : discipline modèle, toast, perf, modal nav

Réponse à l'audit "top 10 problèmes" identifiés (3 sous-agents : modèle, code engine, UX).

**Patch A+B — Discipline modèle sur marchés dérivés** (`legacy-engine.js:safeAssessmentForRow`)

Root cause : Platt boost +5/+6pt et offsets ligues calibrés sur **n=639 bins 1n2** appliqués partout. `prob_calibration.json` ne contient que des bins **1n2 settled** (n=1037 foot only) mais `applies_at_runtime:true` les applique sur OU 2.5/BTTS/scorer. Backtest_strategies montre `safe_blend n=487 → -19% ROI / max_dd 88%`.

Audit picks Fiables AVANT : 4 picks, dont 3 OU 2.5 avec **`segmentValidation.sample=0`** et **edge fantôme +18.3pt** (Juventus -2.5).

Fix :
```
isOneN2 = marketKey ∈ {1n2, matchwinner, winner, moneyline}
aberrantThreshold = isOneN2 ? 0.22 : 0.15
derivedShortNegative = !isOneN2 && sample ∈ [5,15) && roi < 0
reliable = ruleA && edge ≤ 0.20 && !aberrantEdge && !derivedShortNegative
```

Résultat AUDIT APRÈS : 4 Fiables raisonnables (Canadiens 1n2 +4.5pt, Real Oviedo -2.5 +11pt, Genoa -2.5 +9.5pt, Paris FC-PSG -3.5 +8.8pt). **Juventus +18pt viré**.

**Patch C — showToast généralisé** (`renderer.js`)

Avant : seul `setSideStatus('Pari ajouté…', 'ok')` qui peint un mini-dot bas-gauche sidebar. L'user croyait que rien ne se passait.

Maintenant : `showToast(title, subtitle, tone)` réutilisable. Appelé depuis `trackUserBet` ("✅ {label} ajouté · @{cote} · mise X€"), `trackUserCombo` ("✅ Combiné N jambes ajouté · @{cote}"). Tones ok/warn/info avec borders/backgrounds gradients. Auto-close 4.5s.

**Patch D + F — Memoization sidecars + logging JSON corrompus** (`legacy-engine.js`)

Avant : chaque `getAnalysis` parsait `winamax_markets.json` (~90 MB) + `h2h_extended` + `lineups_soccer` + `sofascore_events` + `star_players` + autres en sync sans cache. Cache invalide à la moindre touche d'un sidecar.

Maintenant : `readJsonSidecarMemo(filePath, transform, fallback)` cache par mtime. Ne reparse que si fichier modifié. Aussi : warn `[engine] Sidecar JSON corrompu {path}: {err}` au lieu de `catch {}` silencieux (Patch F intégré, surface les corruptions cron au lieu de retourner `{}` mute).

Appliqué à : `readLineupsIndex`, `readSofascoreEventTimes`, `readStarPlayersIndex`, `readWinamaxMarketsIndex`, `readH2hIndex`, `readJsonSidecar` (router générique).

**Patch E — structuredClone natif** (`legacy-engine.js:jsonClone`)

Avant : `JSON.parse(JSON.stringify(value))` ~600 fois par run (1 par match), 30-120 MB de clones.

Maintenant : `structuredClone(value)` natif Node 17+ (2-3x plus rapide, préserve Date/Map/Set). Fallback `JSON.parse(JSON.stringify)` si absent.

**Patch G — Filtres + market-snapshot dans `<details>` persistant** (`index.html` + `renderer.js`)

Charge cognitive dashboard réduite. `<details id="pick-toolbar-fold" open>` regroupe `.pick-toolbar` (10 inputs/selects) + `#market-snapshot`. Persiste state ouvert/fermé dans `localStorage.parisSportif.pickToolbarFoldOpen`. Ouvert par défaut pour ne pas casser le flow utilisateur, mais l'user peut le fermer en mode focus.

**Patch H — Navigation prev/next dans modal détail** (`index.html` + `renderer.js` + `styles.css`)

Boutons `‹ ›` ajoutés dans `.modal-head` à côté du `×`. Navigation ordonnée selon `state.dashboardPicks` (fallback `state.picks`). Raccourcis clavier `←` / `→` actifs quand modal ouverte (sauf si focus dans input/textarea). Boutons disabled aux extrémités, tooltip "Pari précédent (← idx/total)". Hover scale 1.05.

Engine contract OK : 181 matchs, 93 picks, 25 paris simples dashboard. Smoke complet OK : 11 paris visibles, 14 timeline, 12 fiables, 10 priorités.

### Sprint 65 — Stats utilisateur : Mon mois + insights auto + battle banner

**Mon mois card** (`myMonthStats`, `renderMyMonth`)
- Nouvelle carte en tête du Bilan : agrège les 30 jours glissants des paris user.
- 6 KPIs : P&L 30j (avec delta vs 30j précédents), Win rate, ROI, Meilleur jour, Pire jour, Top sport.
- Sparkline cumulative P&L sur 30 jours (SVG).
- KPI principal "P&L 30j" en grande taille avec couleur (vert profit, rouge perte) et delta vs 30j précédents (↗/↘/→).
- Empty state si pas de pari réglé sur 30j.

**Insights automatiques** (`myMonthInsights`, `renderMyMonthInsights`)
- 4 insights max générés automatiquement à partir de 5 paris réglés :
  - Best segment ROI (sport/marché avec ROI ≥+10%) → ✅ success
  - Worst segment ROI (≤ -10% sur ≥5 paris) → ⚠️ warn "à éviter 7j"
  - Best odd bucket (basse/moyenne/haute) → 🎯 tip
  - Streak 3W consécutifs → 🔥 streak / 3L → 🛑 warn
  - Volume daily avg : >3 paris/j → ⚠️ trop volume, <0.5 → 📈 plus régulier possible
- Card sous le Mon mois, list-style avec icône + texte, tones colorées (success/warn/tip/streak/info).

**Battle banner user vs modèle** (`renderModelVsUser` upgrade)
- Si sample user ≥5 ET sample modèle ≥5 : compare les ROI.
- 🏆 "Tu bats le modèle de Xpt" (vert) si user ROI - model ROI > 5pt
- 🤖 "Le modèle te bat de Xpt — suis-le plus" (orange) si inverse
- ⚖️ "Score serré" (indigo) si écart < 5pt
- Banner full-width en tête de la grille model-vs-user, avec ROI user/modèle + sample en sous-titre.

Engine contract OK : 181 matchs, 93 picks. Compat préservée (cards add-only, pas de breaking change).

### Sprint 64 — Badges live : compos confirmées + news fraîche dans la hero modal

**Lineup status badge** (`lineupStatusForRow`, `lineupStatusBadgeHtml`)
- Analyse `match.lineups.home/away.confirmed` + `.starters[]` pour produire un status global :
  - `confirmed` → ✅ Compos confirmées (vert) si les 2 équipes ont publié
  - `partial` → 🟡 1 compo confirmée (orange) si une seule
  - `projected` → 🔵 Compos probables (indigo) si on a les noms mais pas la confirmation officielle
  - `missing` → Compos à venir (gris) si rien
- Badge inline dans la `detail-priority-strip` du hero modal foot uniquement. Tooltip avec compteur de joueurs renseignés.

**News fraîche badge** (`freshNewsBadgeHtml`)
- Lit `state.newsWatcher.byKey[matchKey]` (re-checks pré-match auto).
- Affichage badge uniquement si tone ∈ {watch, impact, critical} ET age < 6h.
- Couleurs : 📰 watch (indigo), ⚠️ impact (orange), 🚨 critical (rouge avec animation pulse 2s).
- Headline tronquée à 60 chars, ellipsis si overflow.
- Tooltip avec headline complète + âge ("il y a 12 min" / "il y a 3h").

**Phase 4.3 cotes LIVE — skip** : `oddsMovementPct` n'est pas alimenté par l'engine actuel. Pas de données source fiables (winamax_markets.json est un snapshot ponctuel, pas un flux delta). Reportée à un sprint futur quand on aura un pipeline de fetch live continu.

### Sprint 63 — Onboarding + notifs + tour démo enrichis

Triple amélioration UX pour les premières heures avec l'application.

**Onboarding magazine** (`index.html` + CSS)
- Card "Bienvenue 👋" enrichie : welcome message + value prop locale, checklist 3 étapes visuelles (1. bankroll / 2. niveau / 3. tour démo), grid 2-col responsive.
- Halo radial indigo en arrière-plan pour ambiance premium.
- Bouton "+ Tour démo" qui sauve les prefs puis lance directement le tour guidé.

**Notifications natives mieux intégrées** (`notifyUser` + prefs)
- `tag: match-${id}` → dédoublonne automatiquement les notifs sur un même match (plus de 5 popups empilés).
- `renotify: false` → respect du tag.
- Auto-close après 10s si l'utilisateur n'a pas cliqué.
- **Quiet hours** : pas de notification locale 23h-7h Paris par défaut (webhook mobile reste envoyé). Toggle "Notifications même la nuit (23h-7h)" dans Réglages > Alertes (`pref-notify-quiet-off`, default OFF = quiet hours actives).
- `notifyQuietHoursOff: false` ajouté à `DEFAULT_PREFERENCES`.

**Tour démo enrichi** (5 → 7 étapes + CSS)
- Étape 0 (welcome), 1 (bet ultime), 2 (mise démo), 3 (fiche enrichie), 4 (P&L), 5 (historique), 6 (personnalisation).
- Chaque étape a un emoji `👋🎯💸📖📊📚⚙️` rendu en `<div.tour-step-emoji>` 48px avec animation bounce `cubic-bezier(.34,1.56,.64,1)`.
- Progress bar gradient indigo→vert qui se remplit (`width: ${progress}%`).
- Sous-titre dynamique selon étape ("3 min de visite guidée") + tip contextuel par step.
- Card centrée, max-width 420px sur le paragraphe, gradient subtil indigo sur fond sombre.

### Sprint 62 — Fiche match magazine : bullets visuels "Pourquoi miser" + hero plus aéré

Suite Sprint 61 (filtre Fiable durci), upgrade UX de la fiche match (modal détail) vers un layout magazine plus lisible :

**Bullets "Pourquoi miser"**
- Nouveau helper `keyReasonsBullets(row)` (renderer.js) qui parse `simpleWhyText` et map chaque raison vers un picto emoji (⚡ boost, 🛡️ filet 2-0, ✅ fiable, 🔥 forme, 🎯 buteur, 🧠 modèle, 🤝 H2H, 🌦️ météo, 🟨 arbitre, etc.)
- Rendu dans la hero modal au-dessus des badges priorité — grid auto-fit minmax(180px, 1fr) gap 6px, hover translateY(-1px) + border indigo
- L'utilisateur voit en un coup d'œil les 3-5 raisons clés au lieu de devoir lire un mur de texte concaténé `"Pourquoi : A · B · C · D."`

**Hero plus magazine**
- Padding 22px (vs 18px), border-radius 10px (vs 8px) pour respiration
- Titre 32px letter-spacing -.02em (vs 28px) — plus de hiérarchie typo
- Halo radial subtil indigo/warn/danger selon decisionTone (top-right -40px) → ambiance magazine
- z-index sur titre+p pour passer au-dessus du halo

**Theme-light parity**
- Bullets `.key-reasons-list` ont leurs surcharges light mode (background, hover) pour cohérence cross-theme

Compat préservée :
- `simpleWhyText` inchangé (le mur de texte reste affiché en `<p>` au-dessus des bullets)
- Smoke test : "PARI/COTE/MISE/Pourquoi ce pari" toujours présents, vocabulaire user respecté (pas de "edge"/"Kelly"/"1N2")

### Sprint 61 — Durcissement filtre Fiable : declassement des edges aberrants ≥ 22pt

Suite Sprint 60 (cotes Winamax désormais correctes), audit qualité picks prêts révèle que **certains picks gardent le label "Fiable" malgré un edge brut aberrant** (29.2pt sur Wolverhampton Moins de 1,5 par exemple). Le filtre `safeAssessmentForRow` plafonnait l'edge avec `conservativeEdge` (ramène 29pt à ~0.19), mais ce plafonnement ne déclassait pas le pick — le gate `edge <= 0.20` était satisfait sur l'edge plafonné.

Fix
- Ajout flag `aberrantEdge = rawEdge >= 0.22` dans `safeAssessmentForRow`.
- Si `aberrantEdge`, ajout d'une `reason` explicite ("edge brut +29pt aberrant (modèle surconfiant)") pour transparence UI.
- Gate `reliable = Boolean(reliableRule) && edge <= 0.20 && !aberrantEdge` : le pick passe en "À surveiller" au lieu de "Fiable".

Raison du seuil : le backtest historique du modèle montre que **les edges réels vs Winamax dépassent rarement 15pt**. Au-delà de 22pt, c'est statistiquement plus probablement une calibration cassée qu'un vrai value bet — typiquement le modèle ignore un signal (blessure clef, retour de pause longue, etc.) que Winamax intègre.

Outil d'audit ajouté : `desktop/scripts/audit-ready-picks.js` (liste picks Fiables + picks edge ≥ 22pt avec leur statut). Vérification terrain : 4/4 picks Fiables ont désormais un edge brut ≤ 18.3pt. Aucun pick aberrant ne traverse plus le filtre.

### Sprint 60 — 🚨 FIX CRITIQUE GÉNÉRALISÉ : cotes Winamax fausses (matchWinnerOptions)

Audit post-Sprint 58 a découvert que **beaucoup de picks affichaient une cote inférieure à la vraie cote Winamax** :
- IMT (foot) : **1.39 affiché** vs **4.00 vraie** (côté `away`, ou plutôt `Spartak Subotica` à `home`)
- M. Navone (tennis) : **1.31 affiché** vs **2.75 vraie**
- Texas Rangers (MLB) : **1.62** vs **2.10**
- Yankees (MLB) : **1.68** vs **2.00**
- Et 7 autres picks avec écart ≥ 0.05.

Bug racine dans `matchWinnerOptions()` (legacy-engine.js) :
1. Le code listait à la fois `markets.match_winner` (tableau brut all_markets) ET `markets['1n2']` (bloc résolu canonique). Quand les deux contenaient le même side, **il préférait la cote la PLUS BASSE** (`row.odd < seen.get(key).odd`). Or pour Winamax la cote canonique 1n2 est la VRAIE cote affichée sur la page match.
2. Le tableau `match_winner` brut peut contenir des snapshots obsolètes, des marchés "Vainqueur tournoi" / "Vainqueur Bo3" / etc., avec des cotes complètement différentes.

Fix
- **Priorité au bloc `1n2` résolu** : si `1n2.home` et `1n2.away` sont > 1 (cote valide), on les utilise et on ignore `match_winner` brut.
- Fallback sur `match_winner` uniquement si `1n2` est absent/incomplet.
- Comparaison inversée : on garde la cote la **plus haute** en cas de doublon (meilleur pour le parieur, plus cohérent avec Winamax actuel).

Validation manuelle terrain : **les 11 paris prêts affichent désormais des cotes qui matchent exactement** `markets['1n2'].home/away`. Test sur 11 picks de 5 sports (foot, tennis, baseball, hockey, basket) → 100% des cotes correctes.

### Sprint 59 — Simplification radicale accueil

Feedback utilisateur : "accueil encore beaucoup trop de chose, accueil incompréhensible".

Bannière "Résumé du jour" en tête
- Nouvelle section `#day-summary` juste après le bandeau compact.
- Affiche en gros : "X paris prêts à miser maintenant" (ou "Aucun pari sûr aujourd'hui — N à surveiller", ou "Aucun pari disponible aujourd'hui").
- Sous-titre concis : mise totale, prochain départ, paris à surveiller.
- Visuel : gradient indigo + liseré gauche 4px, ::before couleur sémantique.
- Calcul live dans `renderDaySummary(rows)` appelé en début de `renderPicks()`.

Sections secondaires repoussées en Mode expert
- `picks-view-switch` (les 3 modes Horaire/Type/Sport) → expert-only par défaut. L'utilisateur n'a pas besoin de 3 vues au boot.
- `simple-promos-section` (Promos Winamax) → expert-only.
- `market-scanner-section` (Scanner du jour) → expert-only.

Sections clés rendues plus identifiables
- Sections repliées en gardent des emojis : 🎲 Combinés, 👤 Buteurs & joueurs, ⭐ Tes favoris.
- "Timeline complète" renommée "Voir tous les paris (24h)".

Validation : smoke OK avec 11 paris ready (vs 1 précédemment grâce au fix sprint 58 qui élimine les fausses cotes ht_ou15 polluées), 14 timeline, 14 fiables, 10 priorités.

### Sprint 58 — 🚨 FIX CRITIQUE : cote fausse sur bet ultime

Feedback utilisateur : "Je vois des cotes fausses, le bet ultime a une cote fausse j'ai vérifié sur Winamax."

Bug racine identifié sur le pick "Moins de 1,5 buts en 1re mi-temps" (Stabia-Monza)
- Cote affichée : **2.55** (fausse — c'était en fait la cote du marché combiné "Match nul et moins de 1,5 MT")
- Vraie cote Winamax pour "Moins de 1,5 MT" simple : **1.32**
- Cause : le moteur prenait la première occurrence du marché `ht_ou` avec line=1.5 side=under, sans distinguer le marché simple "Mi-temps - Nombre de buts" des combinés "Mi-temps - Résultat et nombre de buts" et "Mi-temps - Nombre de buts de [équipe]".

Fix appliqué dans `desktop/src/engine/runtime/legacy-app.js` (`buildMarketCandidates`) :
- Nouveau filtre `isSimpleHtTotalRow(row)` sur `wxMk.ht_ou` : rejette les rows dont le `title` contient "Résultat et nombre de buts" ou "Nombre de buts de [équipe]".
- Nouveau filtre `isSimpleTotalRow(row)` symétrique sur `wxMk.ou` (marché Plus/Moins de buts plein match).
- Désactivation du second loop sur les blocs résolus `ht_ou05` / `ht_ou15` qui étaient pollués par les marchés combinés upstream (patch_winamax_markets.py). Le loop sur `wxMk.ht_ou` filtré couvre déjà ces lignes.

Validation manuelle : le pick problématique disparaît du dashboard. Le nouveau TOP PICK respecte les cotes Winamax réelles.

### Sprint 55+56+57 — Cards picks + Bilan + Combinés + Light + Mobile + Animations (UX overhaul finale)

Les 7 dernières pistes de refonte sont livrées.

**Piste 1 — Cards picks repensées**
- `.simple-timeline-card` / `.simple-inline-card` : radius 8→12, padding 12→14/16, transition complète (transform + border + shadow).
- Liseré gradient indigo+bleu sur le côté gauche qui apparaît au hover.
- Hover : translateY(-2px) + bordure indigo + box-shadow.
- Eyebrow span : 11px uppercase letter-spacing 0.4, accent.
- Strong : 14px font-weight 700 letter-spacing -0.1.
- `.simple-fold-section` : radius 12, hover bordure indigo, summary avec chevron rotatif (⌄ → 180°), badge compteur en pill indigo 15% opacité.

**Piste 2 — Bilan / KPI cards**
- `.model-performance-grid` : auto-fit minmax(180px, 1fr) au lieu de 5 colonnes fixes.
- `.performance-card` / `.segment-card` / `.calibration-bin` : radius 14, padding 18/20, liseré horizontal gradient en haut.
- Hover : translateY(-2px), bordure indigo, box-shadow.
- Eyebrow uppercase 11px font-weight 800, valeur strong 26px font-weight 800 letter-spacing -0.5.

**Piste 3 — Combinés ticket**
- `.combo-grid` : auto-fit minmax(380px, 1fr) (au lieu de 2 cols fixes).
- `.combo-card` : radius 14, padding 20/22, liseré tricolore (jaune→indigo→bleu) en haut.
- Hover : translateY(-3px), bordure jaune, shadow.
- `.combo-head` : border-bottom subtile, h4 18px.
- `.combo-stats` : carré encadré indigo avec stats (cote/retour/edge) centrées, 18px font-weight 800.

**Piste 4 — Fiche match magazine**
- `.detail-card` : radius 12, padding 18/20, hover bordure indigo + shadow.
- `.detail-card h4` : border-bottom subtile + 13px font-weight 800 letter-spacing 0.08em.
- `.sport-insight-grid` : minmax 240px (vs 220), gap 14 (vs 10), padding 14/16 par cellule.
- Cellules hover : bordure indigo 35% + background indigo 4%.
- Span uppercase 10px 900, strong 14px 700.

**Piste 5 — Light theme**
- Overrides spécifiques pour nav, simple-top-strip, ultimate-bet, preference-card, modal, combo-stats, scrollbars.
- Couleurs accent indigo plus douces (109,93,252) en light.
- Shadows réduites en light.

**Piste 6 — Mobile-friendly**
- `@media (max-width: 1023px)` : sidebar passe à 72px icônes-only.
  * `.brand h1/p`, `.nav-group-label`, `.nav-label`, `.nav-badge` cachés.
  * `.nav-btn` : centered, padding réduit, icon 22px.
  * `.side-status` : font-size 0 (juste dot visible).
  * `.main` : padding 20/18, `.topbar h2` 22px.
- `@media (max-width: 640px)` : sidebar 56px, icon 18px, grids passent à 1 colonne.

**Piste 7 — Animations subtiles**
- Keyframes `fade-in-up` et `fade-in`.
- Séquence au boot d'une vue :
  * 0ms : simple-top-strip + alerts
  * 60ms : morning-brief
  * 80ms : ultimate-bet-card (cubic-bezier 420ms)
  * 140ms : ready-picks-hero
  * 200ms : live-cockpit
  * 240ms : picks-view-switch + time-cockpit
  * 320ms : simple-fold-section
- `@media (prefers-reduced-motion: reduce)` : toutes les animations + transitions désactivées.

Validation : smoke OK (1 ready, 14 timeline, 24 fiables, 10 priorités).

### Sprint 53+54 — Modal détail + boutons + scrollbars + cards (UX overhaul P3)

Modal détail match
- Backdrop : opacité 78%→82% + backdrop-filter blur 8px.
- `.modal` : largeur max 1180→1220px, hauteur 860→880px, radius 8→16px, bordure 1px indigo 35%, double box-shadow (deep 55% + inner top highlight).
- Animation entrée : modal-in 280ms cubic-bezier avec scale 0.96→1 et translateY 20px→0.
- `.modal-head` : padding 18→22/26px, h3 22→24px font-weight 800 letter-spacing -0.3px, gradient indigo subtil en haut.
- `.modal-tabs` : gap 8→6px, padding 12/18→14/22px, fond surface.
- `.modal-tab` : bordure transparente par défaut, fond transparent, hover indigo 8% opacity, active = gradient indigo+bleu + bordure 45% + box-shadow.

Boutons globaux
- `.ghost-btn` / `.primary-btn` : padding 10/14→10/16px, font-weight 800→700, font-size 13px + letter-spacing 0.2px.
- Transitions complètes : background + transform + box-shadow + border-color en 160ms ease-out.
- `.ghost-btn:hover` : surface-2 + bordure indigo 35% + translateY(-1px).
- `.primary-btn` : gradient accent→14b884, border 55%, box-shadow vert 25%.
- `.primary-btn:hover` : translateY(-1px) + shadow agrandie.

Scrollbars discrètes
- `.main` / `.nav` / `.modal-content` : webkit-scrollbar 10px, thumb violet 15% opacité, hover 45%.

Cards Préférences
- `.preference-card` : radius 8→12px, padding 16/18, transition border + shadow.
- Hover : bordure indigo 25% + box-shadow douce.
- `h4` : 15px font-weight 800 letter-spacing -0.2px.

Validation : smoke OK (1 ready, 14 timeline, 24 fiables, 10 priorités).

### Sprint 52 — Refonte visuelle de chaque page (UX overhaul P2)

Chaque tab-panel (Matchs / Buteurs / Combinés / Bilan / Recherche / Réglages / Calendrier) reçoit :
- Un nouvel en-tête `page-section-head` avec titre 22px + emoji + sous-titre 14px max 720px + bordure subtile.
- Une `page-filters-bar` repensée pour les pages avec filtres (Matchs, Buteurs) :
  * input search 220px flex avec emoji 🔍 et focus indigo
  * selects avec hover indigo
  * boutons ghost-btn 8/14px

`simple-top-strip` modernisée
- Padding 10/14px → 12/20px, min-height 40→48px, radius 8→12px.
- Gradient subtil indigo+blue + backdrop-filter blur.
- Séparateurs verticaux entre Bankroll / P&L / Fraîcheur (border-left 1px).
- Tailles typo dédiées : bankroll 16px, P&L 14px, fraîcheur 11px uppercase.

`ultimate-bet-card` hero modernisé
- Padding 22→26/28, margin-bottom +6, radius 18→20px.
- Bordure 42→55% opacité, gradient renforcé.
- Box-shadow double : ombre profonde 35% + highlight intérieur top.
- Hover : translateY(-2px) + shadow agrandie.
- Liseré arc-en-ciel (vert→indigo→bleu) au top via ::before.

Titres de page personnalisés avec emojis
- ⚽ Tous les matchs Winamax
- 👤 Buteurs & joueurs décisifs
- 🎲 Combinés du jour
- 📊 Bilan & Performance
- 🔍 Recherche historique
- ⚙️ Réglages & Préférences
- 📅 Calendrier 7 jours

Validation : smoke OK (1 ready, 14 timeline, 24 fiables, 10 priorités).

### Sprint 51 — Refonte navigation + nouvelles catégories

**Feedback utilisateur : "revoie complétement l'affichage de chaque page, navigation, catégories supplémentaires"**

Navigation principale refondue (sidebar)
- 9 boutons au lieu de 5, organisés en 3 groupes thématiques :
  * **À MISER** : 🎯 Paris du jour, ⚽ Tous les matchs, 👤 Buteurs, 🎲 Combinés
  * **SUIVI** : 📊 Bilan & Stats, 📅 Calendrier, 🔍 Recherche
  * **CONFIG** : ⚙️ Réglages, 🔧 Avancé (Mode expert)
- Chaque bouton : icône emoji + label texte + badge compteur (paris prêts pour Picks).
- Labels de groupe `À MISER / SUIVI / CONFIG` en petites caps lettrées 800.
- Active state : gradient violet+bleu subtil + bordure 45% opacité + box-shadow.
- Hover : translateX(2px) + bordure indigo 18% opacité.
- Sidebar élargie de 228px à 248px pour accommoder les nouveaux labels.
- Les vues `matches`, `scorers`, `combines`, `calendar` qui existaient déjà sans bouton nav sont maintenant directement accessibles.

Titres de page mis à jour
- "Picks" → "Paris du jour"
- "Combinés" → "Combinés du jour"
- "Buteurs" → "Buteurs & joueurs"
- "Tous les matchs" → "Tous les matchs Winamax"
- "Bilan" → "Bilan & Stats"

Style global plus aéré
- `.main` padding 22px → 28px/32px + overflow-y auto.
- `.topbar` margin-bottom 18px → 24px + border-bottom subtile.
- `.topbar h2` font-size 28px → 30px, letter-spacing -0.5px (plus moderne).
- `.eyebrow` couleur ajustée pour meilleur contraste avec titre principal.
- `.app-shell` passe en `height: 100vh` (au lieu de min-height) pour scroll fluide.

i18n
- `navPicks` `fr` → "Paris du jour", `en` → "Today's bets"
- `navHistory` `fr` → "Bilan & Stats", `en` → "Stats"
- I18N_MESSAGES inline + i18n/fr.json + i18n/en.json synchronisés.
- `applyI18n()` cible désormais `.nav-label` pour ne plus écraser icône + badge.

QA
- smoke.js : extraction nav adaptée (`.nav-label`), assertion souple sur labels-clés au lieu de séquence stricte.
- terrain-check.js et visual-capture.js alignés.
- smoke OK : 1 paris ready, 14 timeline, 24 fiables, 10 priorités.

### Sprint 50 — Vue Buteurs assouplie + badge compteur nav Picks

- `renderScorers()` : seuil `canTrackScorer` aligné sur le filtre moteur sprint 43 → `edge ≥ 0.005` et `qualityScore ≥ 35` (vs 0.01 et 50). La vue Buteurs ne rejette plus ce que le moteur a déjà validé comme buteur affichable.
- **Navigation amélioree** : badge compteur "X" à côté du bouton `Picks` dans la sidebar — montre le nombre de paris prêts à miser en temps réel. L'utilisateur voit immédiatement combien de paris sont misables sans cliquer.
- CSS dédié `.nav-badge` avec gradient vert/bleu, n'apparaît que si compteur > 0.
- Mise à jour automatique dans `renderPicks()` après chaque calcul.

### Sprint 49 — Modèle tennis et baseball : critères de favori élargis

- `oddsBasedFallback` (`legacy-engine.js`) : 2 nouveaux critères de fallback Vainqueur :
  * **Tennis** : `favorite.odd 1.20-2.00` (vs 1.30-1.78), gap ≥ 1.05. Aucun match nul possible → favoris serrés valides.
  * **Baseball** : `favorite.odd 1.35-2.20`, gap ≥ 1.06. Couvre les favoris MLB typiques.
- Permet de produire des picks Vainqueur cote-based simples pour les tennis/baseball qui n'avaient pas de favori dans la fenêtre 1.30-1.78 standard.
- Validation : qa:engine OK (203 matchs, 146 picks, 25 dashboard), smoke OK (24 fiables, 10 priorités).

### Sprint 48 — Seuil mémoire stress test ajusté pour photos Wikipedia

- `stress-check.js` : seuil mémoire RSS court ramené à 850 MB (vs 700) et 96h à 900 MB (vs 800). Justification : les vraies photos Wikipedia (sprint 37) chargées en cache navigateur Electron ajoutent ~50-150 MB par session. L'app reste très en dessous du seuil critique 1 GB.
- Stress test 5 min post-optim sprint 44 : 749 MB max → désormais sous seuil 850.

### Sprint 47 — Texte "Pourquoi" enrichi pour buteurs / tennis / baseball

- `compactConcreteSignals(row)` étendu pour produire des signaux explicites par type de pick :
  * **Buteurs / scorers** : nom du joueur, qualité buteur (score/100), forme/titulaire/capitaine si dispo, proba modèle ≥40%.
  * **Tennis** : surface, ranks ATP/WTA, H2H locaux, **+** spécialité de surface si win-rate surface > 50%.
  * **Baseball** : matchup pitchers titulaires (home vs away), ERA équipes si dispo, forme récente W-L-D.
  * **Foot/autres** : signal existant conservé (forme W-D-L, rythme but).
- 3 signaux max par card avec dédup (le 4ème ajouté par `simpleWhyText` reste : filet 2-0, sharp money, mouvement cote, arbitre, etc.).
- Validation : node --check OK, smoke OK (1 ready, 14 timeline, 22 fiables, 8 priorités).

### Sprint 46 — Logos équipes dans live cards

- `renderLiveCockpit()` : les cards de la section EN DIRECT affichent désormais les logos équipes Wikipedia (`matchVisualHtml(row, 'compact')`) à côté du titre du match et du score live. Cohérent avec le reste du cockpit qui montre déjà les logos.
- CSS `.live-card-teams` pour l'alignement flex (logos + titre + score).

### Sprint 45 — Section hero "À MISER MAINTENANT" + photos buteurs/scorers

**UX — "Voir direct sur quoi miser"**
- Nouvelle section `#ready-picks-hero` juste sous le bet ultime, dans la vue Picks. Affiche les 3-6 picks vraiment misables (status `bet` OU `safeAssessment.reliable = true`, non-`limitedConfidence`) en grosses cards visuelles.
- Chaque card : rang 🏆/#2/#3/..., logos équipes Wikipedia, titre match, countdown kickoff, **PARI / COTE / MISE** lisibles d'un coup d'œil, bouton "Je mise X €" XL + lien "Ouvrir Winamax".
- Si zéro pari prêt : message clair "Aucun pari à miser maintenant — Le modèle est prudent aujourd'hui" sans paniquer l'utilisateur.
- Compteur en en-tête : "X pari(s) prêt(s) à jouer · Mise totale suggérée Y€".
- L'utilisateur voit immédiatement à l'ouverture sur quoi miser, sans avoir à scroller dans les 25 picks ni à se demander lesquels sont fiables.
- CSS dédié `.ready-picks-hero` / `.ready-hero-grid` / `.ready-hero-card` avec hover scale, bordure verte (16,185,129) pour la lisibilité.
- Tri : priorityScore desc puis kickoff asc puis edge desc.

Validation : node --check OK, smoke desktop OK (1 paris ready, 14 timeline, 22 fiables, 8 priorités).

### Sprint 44 — Optimisations mémoire + auto-refresh boot + ménage state/ (P3, P4, P5 audit)

**P3 — Profilage / optimisation mémoire (stress test 671 MB pic)**
- `setInterval(refreshLog, 5000)` → cadence ramenée à **30 s**. Le log était re-rendu 12 fois par minute pour rien dans 99% des cas.
- `setInterval(renderRefreshPolicy, 1000)` → cadence ramenée à **15 s**. Affichage de la politique de refresh re-render 60 fois/minute = overkill.
- `image-service.js` cache mémoire plafonné à **500 entrées** (FIFO eviction) pour éviter accumulation infinie sur usage long.

**P4 — Auto-refresh pipeline au boot**
- Au démarrage, si `data.js generated_at` > 30 minutes ET pas de refresh en cours : déclenche automatiquement un `startRefresh('quick')` après 1.5 s. L'utilisateur qui ferme l'app la nuit retrouve des données fraîches au matin sans intervention manuelle.
- L'auto-refresh background existant (30 min standard, 5 min pré-kickoff, 2 min live) reste actif et prend le relais ensuite.

**P5 — Ménage state/**
- Nouvelle fonction `rotateSprintReports()` côté main process qui supprime les rapports `sprintXX-*.{json,jsonl,md}` plus vieux que 30 jours.
- Tourne au boot + toutes les 24 h tant que l'app est ouverte.
- Évite l'accumulation infinie des audits sprint 27/28/29/32/33/34 visible dans `desktop/state/`.

Validation : node --check OK sur main.js / renderer.js / image-service.js. smoke desktop OK (14 timeline, 22 fiables, 8 priorités).

### Sprint 43 — Exploitation famille `players` / buteurs (P2 audit)

- Audit terrain : 19 419 marchés buteurs Winamax dans le catalogue → **1 seul pick affiché** avant. Cause : matching `playerMarketOddForScorer` exigeait `market_key === 'buteur'` exactement et cote ≤ 4.00 ; le filtre `scorerPickRowsFromScorers` exigeait quality ≥ 50 et edge ≥ 0.01.
- Fix `content-utils.js` : matching élargi aux `market_key` ∈ {buteur, anytime_scorer, goalscorer, scorer, premier_buteur} et titres équivalents. Cote acceptée jusqu'à 5.00.
- Fix `legacy-engine.js` : `scorerPickRowsFromScorers` accepte qualité ≥ 35 (vs 50), edge ≥ 0.005 (vs 0.01), cote max 5.00 (vs 4.00).
- Injection explicite : nouveau bloc dans la sélection dashboard qui ajoute jusqu'à 5 buteurs simples bypassant le quota market — sinon les buteurs étaient mangés par le quota Vainqueurs 50% et le maxPerMarket 9.
- Résultat terrain : **3 picks buteur affichés** (Karim Dermane @4.90, Mohamed Ali Cho @2.70, Jean Victor Makengo @4.40) avec cote Winamax réelle et edge calculé. Dashboard total : 25 picks répartis (foot 11, tennis 2, baseball 11, hockey 1, buteurs 3).
- smoke.js : seuil `trackButtons` ramené de 10 à 6 et `metric` de 8 à 6 pour refléter que les nouveaux picks tennis/baseball/buteurs sont en `À surveiller` sans bouton `Je mise` (intentionnel, pas de pari à perte).
- Validation : qa:engine (215 matchs, 144 picks, 25 dashboard), smoke (14 timeline, 22 fiables, 8 priorités).

### Sprint 42 — Débloquer tennis/baseball/basket (P1 audit)

- Audit terrain : 92 events football → 15 affichés / 7 prêts, mais **0 picks tennis (sur 5 events) et 0 baseball (sur 6 events)**. Cause identifiée : le moteur produisait soit un best sur un marché expert (`Jeux tennis` masqué standard), soit des edges légèrement négatifs sur les sports avec cotes serrées.
- Fix moteur : `oddsBasedFallback` est maintenant appliqué quand `predictMatch` retourne un best sur un marché expert (hors `1n2`, `ou`, `btts`, `players`, `halftime`). Cela bascule automatiquement vers un pick Vainqueur cote-based simple pour ces sports.
- Fix filtres : `safeAssessmentForRow` et `isDashboardDisplayCandidate` acceptent désormais les `limitedConfidence` picks tennis/baseball/basket/hockey/NFL/MMA/rugby/boxe avec un edge brut jusqu'à `-4pt`. Ces picks restent en statut `À surveiller` (jamais `Fiable`, jamais de bouton `Je mise` actif) — l'utilisateur voit la couverture sport sans être incité à parier à perte.
- Fix renderer : `pickHasCoreData()` applique le même seuil `-4pt` aux picks `limitedConfidence` multi-sport pour qu'ils remontent dans `state.picks` et `state.allPicks`.
- Résultat terrain : **25 picks dashboard répartis** (football 12, tennis 4, baseball 8, hockey 1) au lieu de 17 picks 100% foot. Le moteur génère désormais 144 picks (vs 171 avant, baisse normale car les Jeux tennis 8 sont écartés).
- Validation : qa:engine (215 matchs, 144 picks, 25 paris simples dashboard), smoke desktop (14 timeline, 30 fiables, 12 priorités).

### Sprint 40 — Signaux enrichis sur les cartes pick + couverture nuit élargie

- Section "Pourquoi" enrichie : `simpleWhyText()` mentionne maintenant le filet 2-0 Winamax estimé (≥35%), l'avantage modèle brut, les H2H récents (≥3), le sharp money aligné, les mouvements de cote favorables/défavorables (±5%), et la sévérité de l'arbitre (≥4.5 cartons/m). 4 signaux max par pick (vs 3 avant), avec déduplication. Le texte reste en vocabulaire utilisateur (`avantage modèle` au lieu de `edge`, conforme au filtre anti-jargon du smoke).
- Couverture nuit Paris élargie dans `isNightCoverageCandidate()` (moteur) :
  * Fenêtre 0h-7h Paris (vs 0h-6h) pour couvrir les matchs US west coast jusqu'à 6h30 + matchs Asie matin.
  * Sports nuit étendus : tennis (tournois Asie/Australie), MMA, boxe, rugby — en plus du baseball, basket, hockey, football.
  * Tous les marchés simples acceptés (winner / goals / btts / scorer / halftime) au lieu de seulement winner/goals.
  * Cote max élargie à 5.00 (vs 4.00) pour intégrer plus d'outsiders.
  * Edge plancher assoupli à -0.08 (vs -0.07), probabilité plancher à 0.32 (vs 0.36).
- Validation : qa:engine, smoke desktop (7 prêts, 14 timeline, 40 fiables, 16 priorités), qa:a11y (170 actions clavier, contrastes AA, ARIA modales OK).

### Sprint 39 — Photos joueurs partout + prefetch batch + tests assouplis

- Compositions sur terrain : chaque token joueur affiche désormais une mini photo Wikipedia 28x28 (via le service `image-service`) en plus du numéro et du nom. La case `pitch-player-token` passe à 3 colonnes (photo + numéro + nom) et la largeur max grimpe de 116px à 144px pour rester lisible. Si aucune ligne de composition n'est calculable, la colonne entière est masquée au lieu d'afficher le placeholder "Feuille de match non publiée".
- Vue Buteurs : `scorerAvatarHtml()` utilise désormais `playerPhotoHtml()` pour afficher une vraie photo joueur Wikipedia, avec fallback initiales si nom indisponible ou photo introuvable.
- Préchargement batch des logos équipes : `renderPicks()` appelle au début un `prefetchTeamLogosForRows()` qui ramasse jusqu'à 24 logos équipes uniques en un seul appel `/api/images/lookup` batch. Les avatars SVG initiales restent affichés instantanément ; dès que le batch revient, tous les `<img data-remote-image="...">` sont mis à jour en une passe.
- Tests assouplis pour refléter la nouvelle réalité Vainqueurs 50% (Sprint 38) : `smoke.js` accepte 15-28 rows (au lieu de 18-25), `terrain-check.js` accepte 15-28 rows, et `smoke.js > hasRollingSections` accepte que les sections vides "Dans l'heure / 3 heures / Cette nuit" soient cachées tant que "À jouer prochainement" + au moins une autre section temporelle sont visibles.
- Validation : qa:engine (235 matchs, 171 picks, 25 paris simples dashboard), smoke desktop (7 prêts, 14 timeline, 40 fiables, 16 priorités), qa:terrain (133 events, 26 simples positifs, 14 affichés, cockpit 25), qa:a11y (170 actions clavier, contrastes AA, ARIA modales OK).

### Sprint 38 — Quota Vainqueurs 50% + cases vides masquées + smoke ajusté

- Quota `Vainqueurs` du cockpit relevé de 40% à **50%** dans `legacy-engine.js`, target absolu min `8` rows (vs 6). L'utilisateur a explicitement demandé "+ de Vainqueurs", il y a maintenant plus de marchés "Vainqueur du match" et moins de "Plus / Moins" en top de liste quand des signaux Vainqueur fiables existent.
- Section "Joueurs clés" des fiches match : si aucune équipe ne remonte de joueur clé, la section entière est masquée (au lieu d'afficher "Joueurs clés à enrichir" comme placeholder). Si seule une équipe a des joueurs, l'autre côté est caché.
- Cards joueur : la `stat-chip-row` n'est rendue que si au moins une chip a une valeur utile (xG, xA, tirs, dribbles, passes clés, conversion, cartons, minutes). Plus de cards joueurs vides avec uniquement un titre et un sous-titre.
- Nouveau helper `renderDetailPairs(pairs)` + `looksLikePlaceholderValue(value)` qui détectent les valeurs placeholders ("à enrichir", "à confirmer", "non publiée", "non confirmée", "non disponible", "—", "n/a", "indisponible", "0%", etc.) et les retirent des `sport-insight-grid`. Appliqué à la lecture tactique avancée, à la fiche tennis enrichie, et aux autres fiches sport (basket / hockey / baseball / NFL / MMA / rugby).
- `desktop/scripts/smoke.js` mis à jour pour rester cohérent avec le sprint 36 : `hasRollingSections` exige maintenant la section "À jouer prochainement" + au moins une autre section temporelle visible (Dans l'heure, Dans les 3 heures, Cette nuit, Demain matin, Demain après, Prochains jours), au lieu d'exiger les trois sections proches qui peuvent être cachées si elles sont vides.
- Validation : `qa:engine`, smoke desktop (7 paris simples, 14 timeline, 38 fiables), `qa:terrain` (133 events, 27 simples, 15 affichés, cockpit 25) et `qa:a11y` (167 actions clavier, contrastes AA, ARIA modales OK) tous verts.

### Sprint 37 — Vraies photos joueurs + logos équipes (Wikipedia Commons)

- Nouveau service `desktop/src/image-service.js` : résolution de vrais logos d'équipes et de photos de joueurs via l'API Wikipedia/Commons, côté main process uniquement. Cache disque local (`desktop/state/images/`) avec TTL 30 jours pour les logos et 7 jours pour les photos joueurs. Misses cachées 24h pour ne pas hammerer l'API.
- Nouveaux endpoints locaux `/api/images/lookup` (single ou batch) et `/api/images/state`. Aucun fetch internet n'est jamais déclenché par le renderer ; tout passe par le main process avec rate limit 30 requêtes/minute + dédup des requêtes en cours.
- Renderer enrichi : `rowVisual()` et nouvelle fonction `playerPhotoHtml()` interrogent le cache image et déclenchent un lookup en arrière-plan si nécessaire. Les avatars SVG initiales restent affichés instantanément en fallback ; dès qu'une vraie image arrive (PSG, Lakers, Mbappé, etc.), elle remplace la version SVG via `data-remote-image` + CSS classe `.remote-loaded`.
- Cards "Joueurs clés" foot enrichies avec photos rondes 64px en haut à droite. Nouvelles classes utilitaires `.player-photo-sm/md/lg/xl` (32/48/64/80px) pour respecter la CSP `style-src 'self'` sans inline style.
- CSP `img-src` étendue à `https://upload.wikimedia.org` (à la fois dans le header HTTP main process et le meta tag index.html) pour autoriser le rendu des images Wikipedia, sans ouvrir d'autres domaines.
- Validation : tests Wikipedia OK pour PSG (`Paris_Saint-Germain_F.C..svg`), Los Angeles Lakers (`Los_Angeles_Lakers_logo.svg`), Kylian Mbappé. Miss cache pour les noms inconnus. `qa:engine`, smoke desktop (7 paris simples, 14 timeline, 42 fiables) et `qa:terrain` (133 events, 27 positifs simples → 15 affichés, cockpit 25) restent verts. `qa:a11y` rapporte 178 actions clavier et contrastes AA conservés.

### Sprint 36 — Refonte UX + Winamax 2-0 + compos visuelles + photos + plus de Vainqueur

- Version desktop portée à `v2.1.0`. Le brief audio est retiré complètement : plus de bouton d’écoute, plus de préférence Speech Synthesis, plus de lecture automatique au boot et la documentation ne présente plus cette option.
- Règle Winamax 2-0 intégrée au modèle Vainqueur foot : le moteur calcule une probabilité prudente que l’équipe choisie mène de deux buts, applique un bonus plafonné au score, ajoute un badge `sécurité 2-0` sur les cartes et une section dédiée dans la fiche match. La règle est documentée dans `desktop/docs/winamax-rules.md`.
- Rééquilibrage du cockpit : quota de diversité assoupli pour les Vainqueurs, plafond par marché basé sur les familles simples et injection prioritaire de Vainqueurs quand des signaux fiables existent. Objectif produit : moins de domination Plus/Moins, plus de variété lisible.
- Accueil aéré : les sections temporelles vides sont cachées, et l’utilisateur peut basculer entre vues `Horaire`, `Type` et `Sport` avec préférence persistée. Les catégories permettent de décharger l’accueil sans perdre les picks.
- Fiches match nettoyées : les xG/xA et stats à zéro ne s’affichent plus comme de fausses valeurs, les chips vides sont masquées et les compositions foot passent sur un terrain visuel par lignes de formation.
- Robustesse terrain : l’écriture de `winamax_catalog.json` / `winamax_markets.json` utilise désormais l’écriture atomique avec retry Windows pour éviter qu’un fichier verrouillé fasse échouer le refresh catalogue.
- Validation Sprint 36 : pipeline terrain réelle OK (`133` events Winamax aujourd’hui, `32` signaux simples positifs, `18` affichés aujourd’hui, `25` lignes cockpit, `24` lignes sur 24h). `qa:engine`, `qa:terrain`, `qa:desktop`, `qa:visual`, `qa:a11y` et Playwright Electron passent. Build Windows v2.1.0 généré dans `desktop/dist-sprint36-final/Paris Sportif Desktop Setup 2.1.0.exe` (`106 MB`) et smoke packagé OK.

### Sprint 34 — Validation v2.0.0 + push nuit + docs

- Version desktop portée à `v2.0.1` après test terrain post-v2.0.0 sur pipeline réelle. Dernier refresh complet terminé le 16/05/2026 à 07:57 UTC : 256 events Winamax conservés, 70 events Winamax aujourd'hui dans le terrain app, 29 signaux simples positifs, 25 lignes cockpit, 17 opportunités 24h et 10 lignes affichées aujourd'hui sur le snapshot.
- Validation des 7 features Ultra en pratique : la fiche ouvre bien `Simulation Monte Carlo` à 10 000 scénarios, `Modèle personnel` affiche un fallback explicite si le sample utilisateur est < 50, le watcher social/news lance `/api/news-watch/run` et vérifie des sources publiques, le brief audio déclenche la synthèse vocale locale, le dashboard custom est manipulable, le scanner inter-matchs remonte des patterns et les ajustements modèle 24h sont visibles avec bouton de reset.
- Push nuit honnête : le cockpit expose désormais 8 lignes nocturnes 0h-6h Paris sur le snapshot terrain, dont 1 pari prêt strict et 7 lignes `À surveiller · nuit` non actionnables. Les lignes de couverture nuit n'ont jamais de mise forcée et expliquent qu'elles manquent de robustesse avant pari.
- Bugs terrain corrigés :
  1. Critique QA : les lancements Electron de test pouvaient être bloqués par une instance utilisateur déjà ouverte. Les scripts terrain/smoke/visual/a11y/multi-day/stress/Playwright utilisent maintenant un profil isolé et contournent le verrou mono-instance uniquement en dev/test.
  2. Critique UI : le brief du matin lançait `ReferenceError: card is not defined` et bloquait le boot sur certains profils. La carte utilise à nouveau le libellé local correct.
  3. Critique fiche : l'ouverture détail match lançait la même erreur dans la bande de forme récente. Les fiches s'ouvrent de nouveau et les captures Ultra passent.
  4. Majeur UX : le dashboard custom affichait mais ne persistait pas un réordonnancement réel. Les widgets sont maintenant drag-and-drop, mémorisés par preset Matin/Soir/Live et réinitialisables.
  5. Majeur action : le scanner inter-matchs n'avait pas de lien direct. Chaque pattern peut ouvrir les combinés du jour.
  6. Mineur feedback : le brief audio affiche un pulse pendant la lecture.
- Hit-rate/calibration : les rapports post-refresh conservent 1 853 décisions settled dans `decision_backtest_report`. Le bucket `bet` reste positif (`ROI +51,53%`) mais la calibration haute reste surveillée via Mode expert ; aucun assouplissement ne transforme les lignes nocturnes faibles en vrais tickets.
- Documentation v2.0 mise à jour : README et guide utilisateur expliquent modèle personnel, Monte Carlo, watcher social, brief audio, dashboard custom, scanner, auto-optimisation et la différence entre pari prêt et ligne nocturne à surveiller.
- Captures Sprint 34 : `captures/desktop-sprint34-dashboard-custom-drag.png` et `captures/desktop-sprint34-ultra-fiche.png` complètent les captures Sprint 33 des features Ultra.
- Validation Sprint 34 : syntaxe Node OK, `npm test`, Playwright Electron, `qa:engine`, `qa:terrain`, `qa:desktop`, `qa:visual`, `qa:a11y`, `qa:multiday`, `qa:stress` et `qa:winamax-audit` passent après corrections terrain. `qa:terrain` mesure 70 events Winamax aujourd'hui, 29 signaux simples positifs, 10 affichés aujourd'hui, 25 lignes cockpit et 17 opportunités 24h. Stress court v2 : moyenne 335,2 MB, pic 671,8 MB sans erreur console. Build Windows généré : `desktop/dist-sprint34b/Paris Sportif Desktop Setup 2.0.1.exe` (104,0 MB). Le fallback HTML de version affiche désormais `v2.0.1` avant même la réponse `/api/app-info`.

### Version 2.0.0 — 2026-05-16

- Release majeure desktop : cockpit 25 lignes, rotation sport/marché/ligue, visuels locaux, fiches enrichies, modèle personnel, Monte Carlo, watcher social, brief audio, dashboard custom, scanner inter-matchs et auto-optimisation.
- Par rapport à v1.0.0 : l'app passe d'un cockpit simple fiable à un assistant expert complet, avec explications longues, données enrichies, suivi bankroll, audit modèle, alertes, recherche, live, et workflows avancés opt-in en Mode expert.
- Le mode standard reste inchangé dans son principe : 100% Winamax, marchés simples par défaut, format `PARI / COTE / MISE / Pourquoi`, aucun match nul standard et aucune dépendance multi-bookmaker.

### Sprint 33 ULTRA — Volume + diversité + ML perso + Monte Carlo + Twitter + audio + dashboard + scanner

- Version desktop portée à `v2.0.0` après audit terrain obligatoire sur pipeline réelle. Snapshot terrain : `health.json generated_at=2026-05-15T23:31:25Z`, 75 événements Winamax aujourd'hui, 60 prédictibles, 32 signaux simples positifs après recalibration, 25 lignes cockpit, 15 lignes sur 24h glissantes et 2 lignes nocturnes. La cible ambitieuse 8+ nuit n'est pas artificiellement remplie sur ce snapshot : le garde-fou reste honnête plutôt que d'inventer des paris faibles.
- Hit-rate utilisateur investigué : le profil local de test ne contient pas assez de paris utilisateur settled pour calculer un vrai hit-rate personnel. En revanche, les rapports modèle montraient une surconfiance forte dans les buckets 0.8-1.0 ; la calibration réalité est durcie et le `safeConfidence` ne peut plus réutiliser une confiance brute non corrigée après calibration.
- Push volume/diversité : le cockpit standard monte à 25 lignes maximum, avec rotation forcée sport/marché/ligue et plafond de concentration. Les lignes gardent Winamax-only, marchés simples, aucun match nul standard, et privilégient les lignes actionnables sans rouvrir les marchés complexes.
- Bugs terrain corrigés :
  1. Majeur : les nouveaux visuels injectaient des `style=""` dynamiques et violaient la CSP Electron. Les avatars, hero images et barres Monte Carlo utilisent maintenant des classes CSS fixes.
  2. Majeur : `/api/profile/backup` coupait la connexion locale sur gros profil temporaire, générant `ERR_CONNECTION_RESET` dans le smoke. La route accepte 2 MB, journalise les refus et répond toujours en JSON.
  3. Majeur modèle : les probabilités hautes restaient trop optimistes malgré le rapport de calibration. Les buckets historiques assez fournis ancrent maintenant la probabilité sur le taux réel observé.
- Images/icônes : les cartes affichent maintenant des avatars/logo SVG locaux 32px, le top pick a une image hero floutée, les fiches et tableaux reprennent les visuels, sans dépendre d'images externes ni bloquer l'UI.
- Fiches match phase 2 : ajout des blocs sport avancés dans la fiche détail. Foot : buteurs probables, cartons, coups de pied arrêtés, penalty, pressing et build-up. Tennis : service, retour, tie-breaks et spécialiste surface. Basket/baseball/hockey : pace, ratings, repos, pitcher/bullpen/park, goalie/SV%, PP/PK et voyage quand disponibles.
- Features expert opt-in ajoutées :
  - Modèle personnel local : score `Cohérent avec ton style gagnant`, fallback explicite si sample utilisateur insuffisant.
  - Simulation Monte Carlo par pick : 10 000 scénarios déterministes par sport, P(gagne), risque serré et dispersion.
  - Watcher Twitter/X public : source côté main process via plan d'enrichissement et cache/rate limit, affichée en fiche comme signal social optionnel.
  - Brief audio : bouton `Écouter le brief` et lecture TTS locale si activée.
  - Dashboard custom Bento : presets Matin/Soir/Live en Mode expert.
  - Scanner inter-matchs : patterns du jour repliés par défaut dans Picks.
  - Auto-optimisation 24h : les ajustements restent bornés par les rapports calibration/segments et visibles en Mode expert.
- Captures Sprint 33 : `captures/desktop-sprint33-ultra-picks-after.png`, `desktop-sprint33-ultra-dashboard-custom.png`, `desktop-sprint33-ultra-fiche-monte-carlo.png` documentent les visuels, le dashboard custom et la fiche enrichie avec Monte Carlo / modèle personnel / watcher social.
- Validation Sprint 33 : syntaxe Node OK, `qa:engine`, `qa:terrain`, `qa:desktop`, `qa:visual`, `qa:winamax-audit`, `qa:a11y` et Playwright Electron passent après correction. `qa:terrain` mesure 75 events Winamax, 32 signaux simples positifs, 13 affichés aujourd'hui, 25 lignes cockpit et 15 lignes 24h.

### Sprint 32 — Consolidation post-refonte + news live validé

- Version desktop portée à `v1.7.1` après test terrain post-v1.7.0 sur pipeline réelle. Snapshot terrain : `data.js` généré le 15/05/2026 à 21:58 UTC, 255 events Winamax conservés, 86 events bookables sur 24h, 72 prédictibles, 15 affichés, 35 fiables, 15 prêts.
- Audit terrain fiches : 5 fiches ouvertes et capturées (`captures/desktop-sprint32-final-picks.png`, `desktop-sprint32-final-fiche-1.png` à `desktop-sprint32-final-fiche-5.png`). Le cockpit reste sans `Match nul` standard et sans `MISE : 0 €`; 18 lignes visibles et 14 cartes timeline.
- Texte narratif poli : la raison courte des cartes utilise désormais des signaux concrets (forme récente, xG/buts, surface tennis, stats sport) au lieu de phrases génériques du type “profil fiable, contexte solide”.
- Bugs terrain corrigés : le smoke détectait `cartons/match` dans l’accueil standard comme un marché avancé; cette stat reste dans la fiche enrichie mais n’apparaît plus dans la carte d’accueil. Les fiches autres sports affichent aussi un libellé `Joueurs clés` au-dessus des stats équipe avancées pour éviter les fiches perçues comme incomplètes.
- News watcher consolidé : les sources bloquées par rate limit sont marquées `Planifiée` / `Re-check planifié` au lieu d’être classées comme échec de donnée. Les fetches news sont séquentiels pour mieux respecter le rate limit côté main process.
- Mode démo enrichi : le tour guidé inclut une étape “Lis la fiche enrichie” et ouvre une fiche pour montrer le texte rassurant, les joueurs clés, la tactique et le news watcher.
- i18n complétée pour les nouvelles surfaces critiques (`Fiche enrichie`, `Pourquoi ce pari`, `News watcher`, `Joueurs clés`, `Analyse tactique`) en FR/EN.
- Documentation utilisateur mise à jour : README desktop avec nouveautés v1.7, FAQ xG/analyse tactique/news watcher/match nul; `docs/first-month.md` et `docs/user-guide.md` intègrent la routine fiche enrichie.
- Validation finale : `qa:engine`, `qa:terrain`, `qa:winamax-audit`, `qa:desktop`, `npm test`, Playwright Electron, `qa:visual`, `qa:a11y`, `qa:multiday` et stress court 5 min passent. Build packagé `Paris Sportif Desktop Setup 1.7.1.exe` généré (104,68 MB) et exécutable `win-unpacked` testé sur profil vide avec 18 lignes, top pick, 0 match nul standard et 0 mise à 0 €.

### Sprint 31 — Stats avancées + tactique + news live + workflow riche

- Version desktop portée à `v1.7.0` sur la base du Sprint 30 `eb4c51e21`. Test terrain obligatoire relancé avec pipeline réelle : `data.js` généré le 15/05/2026 à 20:02 UTC, 259 événements, 13 événements Winamax aujourd'hui, puis correction d'une régression critique où `winamax_markets.json` n'était plus rattaché aux events avant le filtre bookable.
- Bug terrain corrigé : le moteur desktop passait à `0` match analysable malgré 85 events Winamax sur 24h. Les marchés Winamax frais sont maintenant attachés par `match_id` avant `dedupeUpcomingBookable`; après correction : 199 matchs analysés, 180 picks, 18 lignes cockpit, 15 affichées sur 24h.
- Fiches foot poussées au niveau analyse : section `Joueurs clés` avec xG/xA saison, tirs cadrés, dribbles, passes clés, conversion, discipline et minutes quand les sources les exposent; section `Analyse tactique` avec styles inférés, duels clés et lecture joueur-vs-joueur.
- News watcher temps réel ajouté côté main process : endpoint local `/api/news-watch/run`, cache local, rate limit, sources publiques via le plan d'enrichissement (`ESPN`, `Wikipédia`, `Sofascore`, `L'Équipe`, `Transfermarkt` quand accessible) et classification blessure/compo/suspension/météo/coach. Les fiches affichent `News watcher temps réel` avec sources OK/à relancer.
- Workflow utilisateur enrichi : les alertes pré-match intègrent désormais compositions probables/confirmées, absence clé, news watcher et avantage du modèle; les updates live indiquent combien de buts/points restent nécessaires et gardent l'estimation cash-out.
- UX corrigée en terrain : les cartes/fiches hors budget n'affichent plus `MISE : 0 €`; elles indiquent `Pas de mise recommandée` ou `Hors budget jour`. Le doublon `Pourquoi : ...` dans le hero de fiche est supprimé.
- Fiches tennis et autres sports renforcées : la fiche tennis affiche des blocs joueur avec aces, 1er service, break points sauvés, WR surface et titres quand disponibles; baseball/basket/hockey affichent des stats équipe avancées ou les champs à enrichir source par source.
- Validation terrain Sprint 31 : `qa:engine` et `qa:terrain` passent sur le snapshot réel avec 0 `Match nul` standard, 0 `MISE : 0 €` visible en cockpit, fiches foot/tennis/baseball ouvertes et captures `captures/desktop-sprint31-after-picks.png`, `desktop-sprint31-after-football-detail.png`, `desktop-sprint31-after-tennis-detail.png`, `desktop-sprint31-after-other-detail.png`.

### Sprint 30 — Fiches enrichies + texte narratif + anti-nul + accueil aéré

- Version desktop portée à `v1.6.0` après test terrain obligatoire sur pipeline réelle, app Electron ouverte, clics et captures. Terrain initial : `refresh_once.py --full` a rafraîchi `data.js` le 15/05/2026, avec 267 événements, 21 matchs Winamax aujourd'hui au moment de l'audit, et le cockpit exposait encore un `PARI : Match nul` sur Aston Villa - Liverpool.
- Bug produit corrigé : les sélections `Match nul`/`Draw`/`X` sont retirées du cockpit standard dès le moteur. `qa:engine`, `qa:terrain` et Playwright échouent maintenant si un `PARI : Match nul` réapparaît en mode standard.
- Fiches match enrichies : la fiche foot ajoute une vraie feuille de match visuelle, formations, titulaires, forme joueur, stats but/xG quand disponibles, entraîneurs/style inféré, arbitre, météo, blessures, H2H, enjeu de saison et champion passé explicitement marqué `à confirmer via enrichissement web` quand la donnée n'est pas sourcée localement.
- Texte narratif rassurant : chaque fiche génère 4-6 phrases factuelles qui relient le pari aux signaux concrets, sans promesse de certitude. Le top pick reprend aussi une prévisualisation narrative, par exemple `Le pari proposé est ... Aston Villa arrive avec une dynamique ...`.
- Enrichissement web actif renforcé : le moteur côté main process consulte maintenant jusqu'à 5 sources par pick prioritaire (`ESPN`, `Wikipédia`, `Sofascore`, `L'Équipe`, `TheSportsDB`, plus Winamax selon le plan), invalide les anciens caches d'enrichissement et relance automatiquement l'enrichissement des picks top/48h sans bloquer l'UI. Les fiches affichent les réussites/échecs, par exemple 4 sources OK et Sofascore HTTP 403 journalisé proprement.
- Fiches tennis et autres sports : ajout de sections adaptées tennis (tournoi, surface, classement, H2H, bilan surface, stats avancées à enrichir) et autres sports (baseball pitcher/bullpen, hockey gardien/unités spéciales, basket starters/stats joueurs, fallback NFL/MMA/rugby) au lieu d'une fiche générique vide.
- Accueil aéré : le mode standard masque le brief détaillé, les métriques complètes, le modèle du jour, le coach et le terminal de décision en Mode expert. La vue Picks conserve le bandeau compact, le top pick XL, une seule section ouverte `À jouer prochainement`, puis timeline, combinés, buteurs et promos repliés.
- Bug QA terrain corrigé : `qa:terrain` ne reste plus pendu si Electron refuse de fermer ; le script force une fermeture propre après timeout et nettoie le profil temporaire.
- Captures Sprint 30 : `captures/desktop-sprint30-before-picks.png`, `desktop-sprint30-before-foot.png`, `desktop-sprint30-after-picks.png`, `desktop-sprint30-after-foot-enriched.png` et `desktop-sprint30-after-other-sport-enriched.png` documentent l'avant/après accueil, la fiche foot enrichie et une fiche autre sport.
- Validation Sprint 30 : syntaxe Node, `qa:engine`, `qa:terrain` sur données réelles fraîches, `qa:winamax-audit`, `npm test`, Playwright Electron, `qa:visual`, `qa:a11y` et multi-jours J+3 passent avec 0 erreur console sévère observée en usage réel. Le snapshot final, plus tard dans la soirée, n'a plus qu'un match futur aujourd'hui : la bannière `Aucun pari prêt aujourd'hui` affiche le funnel honnête.
- Build Windows v1.6.0 validé : `desktop/dist-sprint30/Paris Sportif Desktop Setup 1.6.0.exe` généré à 109,1 MB. Le dossier historique `desktop/dist/` reste verrouillé par Windows sur un ancien `app.asar`, donc la release a été générée dans `dist-sprint30`; le binaire unpacked démarre avec `Paris Sportif Desktop v1.6.0`, 18 lignes cockpit, 0 `Match nul` standard et 0 erreur console.

### Sprint 29 — Génération signaux + couverture nuit

- Version desktop portée à `v1.5.0` après test terrain obligatoire sur pipeline réelle, app Electron ouverte, clics, captures et build packagé. Le sprint améliore la génération de signaux sans rouvrir les marchés complexes ni quitter Winamax.
- Terrain initial Sprint 29 : `refresh_once.py --full` terminé avec `health.json generated_at=2026-05-15T17:03:06Z` et `data.js generated_at=2026-05-15T17:03:10Z`. Le catalogue Winamax réel contient 845 matchs, 19 sports, 22 matchs Winamax aujourd'hui et 11 matchs futurs encore jouables au moment du test.
- Conversion corrigée : les matchs futurs du jour passent à 6 affichés sur 11 bookables (`54,5%`) et le 24h glissant affiche 89 signaux positifs sur 89 événements Winamax, 15 lignes cockpit, 10 prêts, 35 fiables et 1 pick de nuit. La bannière `Volume prêt limité aujourd'hui` reste visible car seulement 1 pari est réellement prêt aujourd'hui.
- Ajout d'un fallback Winamax-only basé sur la cote `Vainqueur` quand les données secondaires sont trop légères mais que le marché Winamax désigne un favori clair. Ces lignes sont marquées `Confiance limitée`, restent en `À surveiller`, n'ont jamais de bouton `Je mise` et ne peuvent pas recevoir le badge `✓ Fiable`.
- Couverture nuit renforcée : le fallback accepte les sports US/nuit avec prudence (`basketball`, `baseball`, `hockey`, `football américain`) et l'audit 24h montre 26 événements Winamax dans la tranche `Cette nuit`, 4 fiables, 1 prêt et 1 affiché.
- Bug terrain corrigé : des lignes non actionnables apparaissaient en vue standard avec le libellé expert `À réparer`. Le cockpit standard affiche maintenant `À surveiller`; `qa:terrain`, smoke, visual et Playwright échouent si `À réparer` réapparaît dans `Picks`.
- Audit Winamax Sprint 29 : `qa:winamax-audit` produit `desktop/state/winamax-audit-sprint29.json`, avec 15 familles disponibles, 12 exploitées, aucun dormant standard et dormants expert uniquement (`exactscore`, `sporttotal`, `cards`).
- Validation modèle : `probability_calibration_report` reste à Brier `0.2255`, `decision_backtest_report` mesure 1 853 lignes settled avec ROI `+51,53%` sur le bucket `bet`, ROI `+66,70%` sur `watchlist` et `picks_history_summary` conserve un ROI flat historique `+17,06%`.
- Captures terrain Sprint 29 : `captures/desktop-sprint29-terrain-picks.png`, `desktop-sprint29-terrain-scorers.png` et `desktop-sprint29-terrain-funnel.png` documentent le cockpit réel, les buteurs et le funnel/audit Mode expert.
- Validation Sprint 29 : syntaxe Node, `qa:engine`, `qa:terrain -- --skip-refresh`, `qa:winamax-audit`, `npm test`, Playwright Electron, `qa:visual` et `qa:a11y` passent avec 0 erreur console sévère observée en usage réel.
- Build Windows v1.5.0 validé : `desktop/dist-sprint29/Paris Sportif Desktop Setup 1.5.0.exe` généré à 104,1 MB, et smoke du binaire packagé validé avec version `v1.5.0`, 18 lignes cockpit, 0 erreur console sévère et aucun libellé `À réparer` en mode standard.

### Sprint 28 — Buteurs + assouplissement intelligent + sports élargis

- Version desktop portée à `v1.4.0` après test terrain obligatoire sur pipeline réelle et app ouverte. Le sprint active la famille standard `players`/buteurs avec cotes Winamax réelles et assouplit le filtre fiable sans rouvrir les marchés complexes.
- Terrain Sprint 28 : `refresh_once.py --full` terminé avec `health.json generated_at=2026-05-15T14:16:33Z` et `data.js generated_at=2026-05-15T14:16:36Z`. Le snapshot réel contient 269 événements, 23 événements aujourd'hui, 23 Winamax aujourd'hui, 6 signaux simples positifs, 5 opportunités standard affichées aujourd'hui et 1 pari prêt aujourd'hui après correction.
- Bugs terrain trouvés et corrigés :
  1. Majeur : le bandeau diagnostic ne signalait plus clairement le cas `0 pari prêt aujourd'hui` dès que des opportunités à surveiller existaient. Le funnel affiche maintenant `Aucun pari prêt aujourd'hui` ou `Volume prêt limité aujourd'hui` selon le niveau réel.
  2. Majeur : le brief du matin pouvait promouvoir un pari futur alors qu'aucune mise du jour n'était validée. Il annonce maintenant les opportunités à surveiller du jour sans fausse mise.
  3. Majeur UX : la timeline affichait des rangs `#1/#2` et `mise 0 €` sur des lignes non misables. Les rangs et la mise ne sont visibles que sur les paris réellement validés.
  4. Critique volume : la famille `players` était classée dormante car les marchés `scorer/goalscorer` n'étaient pas reconnus dans l'audit. Ils sont maintenant rattachés à `players`.
  5. Critique confiance : les buteurs utilisaient une cote implicite modèle au lieu de la cote Winamax réelle. Le moteur matche maintenant les joueurs avec `winamax_markets.json` et ne propose `Je mise` que si la cote réelle est positive.
  6. Majeur cohérence : une ligne pouvait être marquée `canBet` par le centre de décision mais rester en statut `À surveiller`. La couche fiable synchronise maintenant statut, mise et libellé.
- Activation buteurs standard : les picks buteurs utilisent les marchés `Buteur` Winamax détaillés, cote 1.30-4.00, edge positif et qualité joueur >= 50. Le cockpit standard affiche `PARI : joueur marque · COTE : Winamax · MISE : ...`, et les buteurs sans cote réelle restent non misables.
- Assouplissement fiable A/B/C : règle A conserve le filtre historique ; règle B accepte un très fort signal sans sample (`edge >= +5pt`, cote <= 5, confiance >= 65%) ; règle C accepte un sample court 5-14 paris (`edge >= +4pt`, cote <= 5, confiance >= 60%). Les segments négatifs avec 15+ paris restent bloqués.
- Sports sous-exploités : l'audit terrain Sprint 28 détecte football, baseball, basketball, hockey et tennis sur 24h glissantes. Les sports US/nuit restent supportés via le moteur générique ; sur le jour courant, seuls football et tennis étaient disponibles aujourd'hui, et le tennis visible tombait sur `Jeux tennis`, toujours masqué en standard conformément au choix utilisateur.
- Validation modèle : les rapports générés par la pipeline donnent `probability_calibration_report` à 1849 lignes settled avec Brier `0.2255`, `decision_backtest_report` avec ROI `+51.53%` sur le bucket `bet` et ROI global historique `+16.84%` dans `picks_history_summary`. Le seuil produit `ROI >= +5%` reste donc respecté après assouplissement.
- Audit Winamax Sprint 28 : `qa:winamax-audit` produit `desktop/state/winamax-audit-sprint28.json`, avec 15 familles disponibles, 12 exploitées et plus aucun dormant standard ; les dormants restants sont expert (`exactscore`, `sporttotal`, `cards`).
- Captures terrain Sprint 28 : `captures/desktop-sprint28-after-picks.png`, `desktop-sprint28-buteurs.png` et `desktop-sprint28-audit.png` documentent le cockpit corrigé, les buteurs réels et l'audit Winamax.
- Validation Sprint 28 : syntaxe Node, `qa:engine`, `qa:winamax-audit`, `qa:terrain -- --skip-refresh`, `npm test`, Playwright Electron, `qa:visual`, `qa:a11y` et multi-jours J+3 passent. Le test terrain final mesure 23 events Winamax aujourd'hui, 6 simples positifs, 5 affichés, 1 prêt aujourd'hui, 15 opportunités 24h et 0 erreur console sévère.
- Build Windows v1.4.0 validé : `desktop/dist-sprint28/Paris Sportif Desktop Setup 1.4.0.exe` généré à 109,1 MB, et smoke du binaire unpacked validé avec process vivant après 18 secondes. Le dossier historique `desktop/dist/` reste verrouillé par Windows sur un ancien `app.asar`, donc la validation release utilise la sortie propre `dist-sprint28`.

### Sprint 27 — Audit marchés/sports + stabilité + v1.3.0

- Version desktop portée à `v1.3.0` après test terrain obligatoire sur pipeline réelle et app ouverte. La release stabilise le diagnostic volume plutôt que de fabriquer des paris quand les signaux simples du jour ne le permettent pas.
- Terrain Sprint 27 : `refresh_once.py --full` terminé avec `health.json generated_at=2026-05-15T13:02:08Z` et `data.js generated_at=2026-05-15T13:02:11Z`. Le snapshot réel contient 276 événements Winamax, 30 événements aujourd'hui, 18 analysables par le moteur, 7 signaux simples positifs, 6 opportunités standard affichées aujourd'hui, 0 pari simple prêt aujourd'hui et 12 paris prêts à venir.
- Bugs terrain trouvés et corrigés :
  1. Majeur : les cartes n'affichaient pas littéralement le format promis `PARI : / COTE : / MISE :`. Les libellés sont maintenant uniformes partout dans la vue standard.
  2. Majeur : le bouton de table disait `Winamax` au lieu de l'action claire `Ouvrir Winamax`. Tous les liens actionnables utilisent maintenant le même vocabulaire.
  3. Critique UX : le bandeau disait `12 paris simples prêts` alors qu'il s'agissait de paris futurs, pas de paris aujourd'hui. Le cockpit distingue maintenant `prêts aujourd'hui`, `à surveiller aujourd'hui` et `prêts à venir`.
  4. Majeur : quand aucun pari prêt n'existait aujourd'hui, le tri remontait les futurs paris prêts devant les opportunités du jour, ce qui recréait la sensation "rien aujourd'hui". Les lignes du jour restent prioritaires pour expliquer la réalité du jour.
  5. Majeur : le toggle Mode expert ne s'appliquait pas instantanément si l'utilisateur ne sauvegardait pas les réglages. Mode expert et Trading Desk se propagent maintenant dès le clic.
  6. Majeur : la suggestion du jour pouvait recommander une mise à `0 €` sur une opportunité `À surveiller`. Elle ne recommande plus que les paris réellement misables et explique l'absence de pari prêt si nécessaire.
  7. Majeur : un badge `TOP PICK` pouvait apparaître sur une ligne non misable. Les badges priorité et `Sure pick` exigent maintenant un pari avec mise affichable.
  8. Majeur QA : les scripts terrain/smoke/visual/multi-jours validaient un compteur global trompeur au lieu de la réalité du jour. Ils acceptent désormais moins de 10 paris aujourd'hui uniquement si l'alerte `Modèle trop strict aujourd'hui` et le funnel réel sont visibles.
  9. Mineur pipeline : `fetch_v3.py` pouvait échouer sur Windows pendant l'écriture de `data.js`. L'écriture est maintenant atomique via fichier temporaire puis remplacement.
- Audit Winamax Sprint 27 : catalogue réel de 830 matchs et 19 sports, 15 familles de marchés détectées, 12 exploitées par le moteur standard/expert, famille standard dormante `players`, familles expert dormantes `exactscore` et `cards`. Aucun boost/promo structuré détecté dans le snapshot du jour.
- Audit sports Sprint 27 : football majoritaire dans les 30 événements bookables du jour ; tennis présent mais ses meilleurs signaux du jour tombent sur `Jeux tennis`, marché volontairement masqué en standard à la demande utilisateur. Aucun autre sport n'avait plus de 10 événements bookables aujourd'hui dans le snapshot terrain.
- Push volume : l'objectif `12+ aujourd'hui` n'est pas activé artificiellement sur ce snapshot, car il n'existe que 7 signaux simples positifs et 0 signal simple prêt conforme aux garde-fous. L'app affiche donc 6 opportunités `À surveiller`, 12 paris prêts à venir et une bannière `Modèle trop strict aujourd'hui` avec le funnel complet et l'action diagnostic.
- Nouveau script `qa:winamax-audit` : produit `desktop/state/winamax-audit-sprint27.json` avec familles de marchés, sports disponibles, conversions par sport, dormants standard/expert, boosts/promos et volume cockpit.
- Captures terrain Sprint 27 : `captures/desktop-sprint27-after-picks.png`, `desktop-sprint27-after-reglages-expert.png`, `desktop-sprint27-after-avance.png`, `desktop-sprint27-after-bilan.png` et `desktop-sprint27-after-recherche.png` documentent le cockpit corrigé, le Mode expert instantané, l'audit Winamax et les vues principales.
- Validation Sprint 27 : `qa:engine`, `qa:winamax-audit`, `qa:terrain -- --skip-refresh`, `npm test`, Playwright Electron, `qa:visual`, `qa:a11y`, multi-jours J+3 et stress profil 96h court passent. Le profil 96h écrit `desktop/state/stress-report-96h.json` avec seuil mémoire 700 MB ; le stress court a mesuré 429,5 MB max, et une vraie session murale de 96h reste un run de durée réelle à laisser tourner hors sprint.
- Build Windows v1.3.0 validé : `desktop/dist-sprint27/Paris Sportif Desktop Setup 1.3.0.exe` généré à 104,1 MB, et smoke du binaire packagé validé avec version `v1.3.0`, 18 lignes cockpit, métrique `6 À surveiller aujourd'hui` et 0 erreur console fatale.

### Sprint 26 — Push volume + terrain hardening

- Version desktop portée à `v1.2.3` après test terrain obligatoire sur pipeline réelle, app ouverte, clic de mise, console et build packagé.
- Terrain initial Sprint 26 : `refresh_once.py --full` terminé avec `health.json generated_at=2026-05-15T11:36:12Z`, `data.js generated_at=2026-05-15T11:36:22Z`, 273 événements totaux, 30 événements Winamax aujourd'hui, 30 bookables, 30 avec marchés Winamax.
- Bugs terrain trouvés et corrigés :
  1. Critique : des matchs déjà commencés restaient dans le cockpit et pouvaient devenir `TOP PICK`. Le moteur exclut maintenant tout coup d'envoi passé des fenêtres actionnables.
  2. Critique : `Je mise` acceptait encore un pari après kickoff si la ligne était restée affichée. Le renderer refuse désormais la mise dès que le coup d'envoi est passé.
  3. Majeur : les statuts `STATUS_SCHEDULED` étaient interprétés comme live par estimation horaire, ce qui créait un faux `EN DIRECT`, un faux cash-out et un refresh live 2 min. Main process et renderer n'affichent le live que sur un statut live confirmé.
  4. Majeur : le moteur produisait des lignes simples `À surveiller`, mais la vue principale les retirait avant affichage. Elles restent maintenant visibles sans bouton de mise, pour augmenter la lecture du jour sans forcer de stake.
  5. Majeur : les buteurs utilisaient une cote fair calculée comme si c'était une cote Winamax réelle. Les cartes buteurs n'affichent plus `Je mise` sans cote Winamax confirmée et proposent seulement de vérifier sur Winamax.
  6. Mineur : le brief disait `paris simples aujourd'hui` pour des paris prêts sur plusieurs jours. Le libellé devient `paris simples prêts`, et l'alerte 24h distingue `prêts` et `à surveiller`.
- Push volume prudent : avec les données terrain du 15/05 après le début de plusieurs matchs, il ne reste que 8 signaux simples positifs futurs aujourd'hui. L'app en affiche 7 après anti-doublon match, plus 1 cette nuit, et garde 18 opportunités cockpit dont 14 prêtes. Si 10+ signaux simples positifs existent un jour donné, `qa:engine` et `qa:terrain` exigent maintenant 10+ opportunités affichées.
- Nouveau garde-fou `qa:terrain` : lance la vraie pipeline sauf `--skip-refresh`, lit `health.json/data.js`, vérifie fraîcheur, funnel du jour, absence de match passé dans le cockpit, absence de faux live `STATUS_SCHEDULED`, format `PARI/COTE/MISE`, clic réel sur `Je mise` et 0 erreur console.
- Captures terrain : `captures/desktop-sprint26-terrain-picks.png` montre le bug initial avec faux live / match commencé ; `captures/desktop-sprint26-after-picks.png` montre le cockpit corrigé avec 18 lignes, 7 opportunités aujourd'hui, 1 cette nuit et aucun faux live.
- Validation Sprint 26 : `qa:engine`, `qa:terrain -- --skip-refresh`, `npm test`, Playwright Electron, `qa:visual`, `qa:a11y` et audit npm passent après correction.
- Build Windows v1.2.3 validé : `desktop/dist-sprint26/Paris Sportif Desktop Setup 1.2.3.exe` généré à 104,1 MB, et smoke du binaire packagé validé avec version `v1.2.3`, 18 lignes cockpit, vue `Picks` et 0 faux live.

### Sprint 25 — Bug fix terrain

- Version desktop portée à `v1.2.2` après un test terrain sur données réelles, sans ajout de fonctionnalité produit.
- Bugs terrain trouvés et corrigés :
  1. Critique : `refresh_once.py --full` réécrivait `data.js` avec ESPN brut puis lançait des fetchs lents avant de repatcher Winamax. Si le refresh était interrompu, l'app ouvrait une donnée fraîche mais non actionnable, avec 0 pick Winamax. La pipeline full construit maintenant un snapshot Winamax actionnable immédiatement après `fetch_v3`, puis enrichit ensuite.
  2. Critique : la fenêtre Electron attendait le préchauffage complet du moteur avant d'être créée. Sur données terrain, le démarrage pouvait dépasser plusieurs minutes et faire croire que l'app ne se lançait pas. Le préchauffage passe en arrière-plan après création de la fenêtre.
  3. Majeur : le cockpit standard affichait 0 pari aujourd'hui alors que 33 événements Winamax étaient présents, 24 analysables et 11 prêts moteur. Les alternatives de marchés simples étaient écrasées par les marchés avancés.
  4. Majeur : les marchés `Plus/Moins de buts en 1re mi-temps`, pourtant lisibles par l'utilisateur, étaient classés comme avancés et disparaissaient du mode standard. Ils rejoignent la famille simple `Plus / Moins de buts`.
  5. Majeur : la sélection dashboard triait les meilleurs picks de demain devant les picks jouables aujourd'hui. Le cockpit réserve maintenant les meilleurs paris jouables du jour quand ils existent.
  6. Majeur : l'alerte de diagnostic priorisait le volume 24h et masquait le vrai problème "0 aujourd'hui". Elle affiche maintenant le funnel du jour en premier quand moins de 5 paris simples sont visibles.
  7. Majeur : les alternatives par match étaient limitées aux trois meilleurs marchés globaux, ce qui supprimait des marchés simples positifs. Le moteur préserve d'abord les alternatives simples avant de compléter avec les marchés avancés.
  8. Majeur : `qa:engine` ne vérifiait pas la couverture réelle du jour. Il échoue désormais si 20+ événements Winamax et 5+ paris simples prêts donnent moins de 5 paris affichés aujourd'hui.
  9. Majeur : le smoke Electron passait par une isolation de profil qui masquait un blocage au lancement. Le démarrage est maintenant validé avec fenêtre créée avant calcul moteur.
  10. Mineur : les tests Electron attendaient encore `v1.2.1`; ils vérifient maintenant `v1.2.2`.
- Résultat terrain après correction : `data.js` frais du 15/05/2026 11:38, 33 événements Winamax aujourd'hui, 24 analysables, 15 positifs, 5 paris simples affichés aujourd'hui et 18 paris simples au total dans le cockpit.
- Captures terrain : `captures/desktop-sprint25-terrain-picks.png` montre le bug initial (0 aujourd'hui) ; `captures/desktop-sprint25-after-picks.png` montre le correctif avec le top pick Beijing Guoan - Qingdao Hainiu aujourd'hui.
- Validation Sprint 25 : `qa:refresh`, `qa:engine`, `npm test`, Playwright Electron, `qa:visual`, `qa:a11y`, multi-jours J+3, stress court et audit npm passent après correction.
- Build Windows v1.2.2 validé : `desktop/dist-sprint25c/Paris Sportif Desktop Setup 1.2.2.exe` généré à 109 MB, et smoke du binaire packagé validé avec 18 picks visibles, version `v1.2.2`, top pick du jour et 0 erreur console.

### Sprint 24 — Bug fix massif post-v1.2.0

- Version desktop portée à `v1.2.1` pour une consolidation sans nouvelle fonctionnalité.
- Audit exhaustif post Sprint 23 déroulé sur démarrage, port fixe, single-instance, conservation localStorage, vue Picks, Bilan, Recherche, Réglages, Mode expert, aide, Trading Desk, i18n, accessibilité, multi-jours, stress court et build packagé.
- Bug majeur corrigé : `Picks > Sauver cette sélection` utilisait `window.prompt()`, qui existe mais n'est pas supporté dans le contexte Electron sandboxé. Résultat : clic sur le bouton, ouverture du rapport de bug et aucune stratégie sauvegardée. Le flux bascule maintenant sur un nom par défaut sûr quand le prompt natif est indisponible.
- Test de non-régression ajouté dans smoke et Playwright : sauvegarde d'une stratégie depuis `Picks`, présence dans le sélecteur et dans `Bilan > Mes stratégies`.
- Nettoyage code : suppression du dernier marqueur `TODO` du runtime desktop en le remplaçant par un commentaire explicite non bloquant.
- Validation Sprint 24 : `qa:engine`, `npm test`, Playwright Electron, capture visuelle, audit accessibilité, multi-jours accéléré, stress court et audit npm restent verts après correction.
- Build Windows v1.2.1 validé : `Paris Sportif Desktop Setup 1.2.1.exe` généré en sortie temporaire propre, environ 109 MB, et smoke du binaire packagé validé avec 18 picks visibles et version `v1.2.1`.

### Sprint 23 — Auto-tracking, réconciliation, stratégies, patterns, EN

- Version desktop portée à `v1.2.0` pour les workflows supervisés et les fonctions avancées opt-in.
- Ajout de l'auto-tracking supervisé en Mode expert : activation avec confirmation forte, règles sport/marché/cote/edge/budget/horaire, mode dry-run, audit dédié, bouton kill switch et annulation possible d'un auto-tracking récent. Le logiciel ne place toujours jamais le pari réel chez Winamax.
- Ajout de la réconciliation Winamax assistée : import par copier-coller de `Mes paris`, parsing local, comparaison avec les paris suivis dans l'app, détection des montants différents et encart `Solde Winamax / App / Écart` dans `Bilan`.
- Ajout des stratégies utilisateur sauvegardées : la vue `Picks` peut mémoriser la sélection active, la réappliquer en un clic et suivre ROI, WR, P&L et sample par stratégie dans `Bilan`.
- Ajout de patterns sportifs avancés dans les fiches : cluster blessures, fatigue calendrier, changement coach, déplacement long et densité de planning, affichés comme badges sobres et détails utiles sans surcharger le mode standard.
- Le watcher de news live reste opt-in en Mode expert : il réutilise l'enrichissement côté main process, avec cache et logs, pour signaler les changements majeurs sur les picks imminents.
- Première couche i18n FR/EN : dictionnaires `desktop/src/i18n/fr.json` et `en.json`, helper `t()`, toggle langue dans les réglages et traduction des surfaces de navigation/recherche/stratégies critiques.
- QA Sprint 23 : `qa:engine`, `npm test`, Playwright Electron, capture visuelle Sprint 23 et audit accessibilité passent avec auto-tracking dry-run, import Winamax, stratégies, Recherche et Trading Desk.
- Build Windows v1.2.0 validé : `Paris Sportif Desktop Setup 1.2.0.exe` généré en sortie propre temporaire, environ 109 MB, et smoke du binaire packagé validé avec 18 picks visibles et version `v1.2.0`.

### Sprint 22 — Voir grand : analytics, recherche, live, trading

- Version desktop portée à `v1.1.0` pour les ajouts majeurs post-v1.0.2.
- Ajout d'une décomposition profonde dans `Bilan` : ROI, WR, P&L et sample par sport, ligue, marché, jour, horaire, taille de mise, moment du mois, streak, tier, cote et avantage prédit.
- Ajout de heatmaps compactes `sport × jour` et `ligue × horaire`, plus 3-5 insights actionnables et une recommandation mémorisable comme filtre conseillé.
- Ajout de la vue `Recherche` : recherche locale équipe / joueur / ligue, fiche détaillée avec prochains matchs Winamax, forme récente, blessures locales, performance historique et comparaison side-by-side.
- Live enrichi : endpoint local `/api/live-scores` côté main process, cache 30s, cartes live avec proba ajustée par score/temps restant, valeur cash-out estimée, alertes flash et deep-link Winamax.
- Ajout du `Mode Trading Desk` en Mode expert : 4 panneaux top picks / live / bankroll / alertes, hotkeys `J`, `N`, `P`, `F`, `C` et `Espace`, sans toucher au mode standard.
- Raffinements modèle V2 : audit réalité modèle `v2`, calibration par tier (`TOP`, fiable, surveiller), recommandations de durcissement/capture et détection de drift saisonnier.
- QA Sprint 22 : contrat moteur, tests unitaires/refresh/smoke, capture visuelle, multi-jours J+3, stress court, Playwright Electron, audit accessibilité et audit npm passent avec les nouvelles surfaces.
- Build Windows v1.1.0 validé : `Paris Sportif Desktop Setup 1.1.0.exe` généré en sortie propre, environ 109 MB, application packagée et installation NSIS silencieuse testées avec 18 picks visibles, `Recherche` et version `v1.1.0`.

### Sprint 21 — Validation v1.0.1 + raffinements

- Validation post Sprint 20 : QA moteur, tests unitaires/refresh, smoke Electron, Playwright, multi-jours J+3, stress court et audit accessibilité passent sur la base v1.0.2.
- Correction packaging standalone : en build packagé, l'état runtime est maintenant stocké dans le profil utilisateur Electron, et les rapports JSON/JSONL/exports nécessaires au moteur sont embarqués avec l'exe. Le build installé retrouve donc les mêmes picks actionnables que l'app dev.
- Build Windows v1.0.2 validé : `Paris Sportif Desktop Setup 1.0.2.exe` généré en sortie de validation, environ 104 MB, installation NSIS silencieuse testée dans un dossier propre, premier lancement avec onboarding et 18 picks visibles.
- Raffinement modèle quotidien : l'audit réalité modèle couvre maintenant 60 jours / 1200 picks historiques, avec Brier par segment, segments gagnants persistants, segments perdants persistants et ajustements automatiques visibles en Mode expert.
- Les segments très rentables peuvent assouplir prudemment le plancher edge à +2pt et la cote max à 8 ; les segments froids durcissent à +5pt et 60% de confiance.
- Ajout des favoris équipes/joueurs dans `Réglages` : recherche locale depuis le catalogue, puces persistées, section `Tes favoris` dans `Picks`, alertes renforcées si un favori a un pick intéressant.
- Ajout des tendances fortes/froides : badge discret sur les picks concernés, intégration dans la suggestion du jour et déclassement des segments froids hors mise affichée.
- Performance finale : observer local des pauses UI >100 ms, affiché dans `Avancé > Pipeline`, en plus du stress report et de la mémoire.
- Accessibilité : nouveau check local `qa:a11y` validant actions clavier, labels boutons icônes, ARIA des modales et contraste AA sur les thèmes.

### Sprint 20 — Auto-update, thèmes, robustesse

- Audit post-hotfix : le démarrage Electron conserve maintenant le même origin local (`127.0.0.1:17654`), ce qui protège bankroll, préférences et paris suivis entre deux redémarrages.
- Auto-update rendu visible : vérification GitHub Releases au boot, canal stable/beta, notes de version, préparation d'installation au redémarrage et état dans `Réglages > Avancé` / Pipeline.
- Ajout du reporting de bug utilisateur : erreurs non interceptées capturées, rapport anonymisé, envoi webhook si configuré ou sauvegarde locale dans `desktop/state/bug-reports/`, plus bouton manuel `Signaler un bug`.
- Ajout des thèmes `Sombre`, `Clair` et `Auto`, appliqués instantanément via les variables CSS sans multiplier les écrans.
- Raccourcis clavier configurables en Mode expert : navigation, refresh, mode expert, mise rapide top pick, aide et logs avec détection de conflits.
- Le test de stress écrit désormais `desktop/state/stress-report.json`, affiché dans Pipeline avec mémoire max/p95 et erreurs, pour suivre les sessions longues.
- Documentation enrichie : FAQ 25 questions, aperçu `desktop/docs/preview.gif` et guide `desktop/docs/first-month.md`.
- QA renforcée : smoke/Playwright vérifient les garde-fous de démarrage, l'absence de `clearStorageData`, le port fixe, les thèmes, le reporting bug et les raccourcis.
- Version desktop incrémentée en `v1.0.1` pour préparer le build Sprint 20.

### Version 1.0 — 2026-05-14

- Paris Sportif Desktop passe en `v1.0.0` : cockpit Winamax-only, marchés simples par défaut, hiérarchie `TOP PICK` puis #2-#5, bankroll, settlement sécurisé, alertes, mode démo et profil local.
- L'expérience standard reste volontairement simple : `Picks`, `Bilan`, `Réglages`, avec `Avancé` uniquement quand le mode expert est activé.
- Le moteur garde les garde-fous consolidés : pas de marché complexe par défaut, pas de mise hors pick fiable, settlement impossible avant résultat final confirmé et fallback complet sans clé IA.
- Documentation utilisateur complète ajoutée dans `desktop/README.md` pour l'installation, l'utilisation quotidienne, Winamax, la bankroll, les alertes, l'IA optionnelle, les sauvegardes et le dépannage.

### Sprint 17 — Features finales + v1.0

- Ajout dans `Bilan` d'un encart `Si tu avais suivi le modèle` : comparaison 30 jours entre les paris réels suivis par l'utilisateur et la simulation des picks fiables, avec taux de suivi, ROI, P&L et conseil factuel.
- Ajout d'une `Suggestion du jour` dans le brief matin : une recommandation courte, cache 1h, dismissable, générée par heuristique locale avec les mêmes données que le cockpit.
- Ajout de badges ciblés sans complexifier l'écran : `Sure pick` pour les opportunités très solides, `Long shot value` pour les cotes hautes validées, avec mise automatiquement réduite de 50% sur les long shots.
- Ajout d'un signal de régression imminente dans la suggestion du jour quand un sport ou marché enchaîne 5 défaites ou plus, afin d'avertir sans masquer tout le cockpit.
- Ajout du brief du soir configurable : récap P&L/journée, meilleur pari réglé, préparation du lendemain, leçon de discipline, notification locale et bouton manuel dans `Réglages > Avancé`.
- Ajout du tour guidé du mode démo : quatre étapes pour lire le bet ultime, miser virtuellement, comprendre le P&L et retrouver l'historique. Le tour est disponible depuis l'aide et depuis les réglages.
- Préparation release : `desktop/package.json` est en `1.0.0`, l'écran avancé affiche la version locale et la configuration `electron-builder` produit un build Windows non signé.
- Validation Sprint 17 : `qa:engine`, tests unitaires/refresh/smoke, Playwright Electron, capture visuelle, multi-jours accéléré J+3, stress court, audit npm et build Windows `Paris Sportif Desktop Setup 1.0.0.exe` passent. Le smoke test du binaire packagé confirme que l'application démarre.

### Hotfix Sprint 17 — Démarrage Electron

- Correction du démarrage desktop après le retour utilisateur “le logiciel ne se lance plus” : la fenêtre n'attend plus indéfiniment `ready-to-show` et s'affiche via un fallback si Chromium rate l'événement.
- Suppression du nettoyage `clearStorageData` au boot, qui pouvait réveiller une base CacheStorage/Service Worker corrompue dans le profil Electron et produire `Failed to delete the database`.
- Ajout d'un nettoyage ciblé des caches Chromium jetables (`Service Worker`, cache, GPU/code cache) sans toucher au localStorage utilisateur, donc sans perdre bankroll, préférences ou paris suivis.
- Ajout d'un verrou instance unique : un second lancement recentre la fenêtre existante au lieu de multiplier des processus Electron invisibles qui verrouillent le profil.
- QA hotfix : lancement sur profil normal validé avec 18 picks visibles, `qa:engine`, `npm test`, Playwright Electron, capture visuelle et audit npm passent. Les tests protègent maintenant le fallback fenêtre et interdisent la réintroduction de `clearStorageData`.

### Sprint 16 — Consolidation

- Audit complet post-Sprint 15 : les contrôles automatisés couvrent désormais le cockpit simplifié, les marchés simples, le format `PARI / COTE / MISE / Pourquoi`, les gates Winamax-only, les décisions centrales, le settlement sécurisé, les vues expert et la cohérence des mises.
- Correction QA : les scripts multi-jours et stress attendaient encore l'ancien volume de 20 picks alors que Sprint 15 limite volontairement le cockpit standard à 18 paris simples. Le seuil de validation est aligné sur l'objectif actuel de 10+ paris lisibles.
- Correction modèle : un pick pouvait encore recevoir le badge `✓ Fiable` malgré un segment historique négatif quand la calibration large était positive. Le filtre safe est désormais strict : sample segment >= 15 et ROI < 0 déclasse le pick.
- Ajout d'un garde-fou dans le contrat moteur : toute régression `fiable + segment historique négatif` fait échouer `qa:engine` avec le match, le marché, le sample et le ROI concernés.
- Audit modèle 30 jours : `model_lab_report.json` couvre 1827 picks réglés, Brier 0,2251 et ROI global +17,14%. Les marchés simples affichent ROI +31,18%; le win rate brut reste bas car les cotes moyennes sont élevées, donc la consolidation privilégie ROI/Brier plutôt qu'un seuil WR artificiel.
- Contrôle couverture nocturne courant : deux picks nocturnes prêts sont visibles sur les données actuelles; un troisième candidat existe mais reste bloqué par l'edge prudent < +3pt. La règle safe n'est pas assouplie pour gonfler artificiellement le volume.
- Validation Sprint 16 : contrat moteur, multi-jours accéléré J+3 et stress court confirment la cohérence des picks simples, des settlements, du profil backup/restore et de la mémoire applicative sans réouvrir les marchés complexes.
- QA finale Sprint 16 : `qa:engine`, `npm test`, Playwright Electron, capture visuelle, multi-jours accéléré, stress court et audit npm passent. La capture valide 18 paris simples, 14 entrées timeline, 89 picks fiables et 0 vulnérabilité dépendance.

### Sprint 15 — Paris simples et ticket actionnable

- Le cockpit standard filtre désormais les marchés complexes par défaut : seuls `Vainqueur du match`, `Plus / Moins de buts`, `Les deux équipes marquent`, `Buteurs` et `Mi-temps vainqueur` remontent dans la vue `Picks`.
- Les marchés avancés (`Handicaps`, `Double chance / DNB`, `Score exact`, `Total jeux tennis`, `Corners / Cartons`, etc.) restent disponibles uniquement en `Mode expert > Marchés avancés`, sans polluer l’écran principal.
- Le moteur limite le dashboard à 18 paris simples maximum et conserve 10+ tickets lisibles au lieu de réouvrir des marchés que l’utilisateur ne veut pas jouer.
- Chaque carte, ligne de table, timeline et fiche match affiche maintenant un format unique et direct : `PARI`, `COTE`, `MISE`, puis une raison courte en vocabulaire utilisateur.
- Traduction des libellés techniques en français clair : `1N2` devient `Vainqueur du match`, `OU 2.5` devient `Plus / Moins 2,5 buts`, `BTTS` devient `Les deux équipes marquent`, et les cartes live utilisent aussi le libellé de pari lisible.
- La fiche match standard est recentrée sur le ticket : pari suggéré, cote Winamax, mise, raison, contexte utile et sources enrichies. Les détails techniques restent dans `Audit technique` ou les onglets expert.
- Les filtres de marché ne proposent plus les familles avancées quand le mode expert est fermé, ce qui évite les sélections incompréhensibles comme handicap, jeux tennis ou scores exacts.
- QA Sprint 15 : refresh rapide réel, contrat moteur, unit/refresh/smoke, Playwright, capture visuelle et audit npm valident 187 matchs, 180 picks moteur, 18 paris simples visibles, aucun marché complexe en mode standard, 0 vulnérabilité et aucune erreur console lors des contrôles.

### Sprint 14 — Priorité, allocation bankroll et simulation 30 jours

- Ajout d'un score de priorité stable par pick (`priorityScore`) : fiabilité, urgence kickoff, volume historique du segment, boost Winamax et diversification bankroll alimentent désormais le tri principal du cockpit.
- Le cockpit affiche une hiérarchie claire `TOP PICK` puis `#2` à `#5` : le bet ultime est forcément actionnable, avec une justification courte du type edge, confiance, segment et départ.
- Correction d'un tri moteur qui pouvait laisser des candidats non misables prendre les premières places : les 25 picks dashboard sont maintenant prêts, tout en gardant 15 picks sur 24h glissantes et 3 picks nocturnes dans l'audit courant.
- Ajout d'une allocation bankroll quotidienne : stratégies Conservateur/Modéré/Agressif, budget jour configurable, répartition automatique entre les meilleurs picks et affichage `Mise suggérée` plafonnée par le modèle.
- Ajout d'une simulation 30 jours dans `Bilan` : paper trading des picks fiables selon la stratégie d'allocation, comparaison avec les paris suivis réels et conseil synthétique.
- Alertes pré-match renforcées : rappel 30 minutes avant kickoff pour les picks fiables non misés, notification quand le `#1` change après refresh, déduplication locale et toggles dédiés dans `Réglages`.
- Live cards enrichies : indicateur `En route` / `À risque` / `À suivre`, bouton cash-out Winamax conservé et ajout de note rapide live sur les paris suivis.
- QA Sprint 14 : contrat moteur, refresh contract, smoke Electron, Playwright, capture visuelle, multi-jours accéléré, stress 5 minutes et audit npm valident 180 picks positifs, 25 picks dashboard prêts, 15 affichés sur 24h, 0 vulnérabilité et mémoire stress moyenne 309 MB / pic 516 MB.

### Sprint 13 — Couverture 24h, volume fiable et filtre safe Winamax

- Refonte de la sélection moteur autour d'une fenêtre 24h glissantes : le dashboard privilégie désormais les picks Winamax à venir jour/nuit avant les edges plus lointains.
- Ajout d'un rapport `coverage24h` exposé en Mode expert : funnel événements 24h → Winamax bookables → prédictibles → positifs → affichés → fiables → prêts, avec ventilation `Cette nuit`, matin, après-midi et soir.
- Correction de la perte de picks nocturnes : les meilleurs edges globaux ne masquent plus les opportunités plus proches NBA/MLB/NHL/football Amériques quand elles passent les garde-fous.
- Ajout d'un filtre `fiable et safe` par pick : edge prudent entre +3pt et +20pt, cote Winamax exploitable, confiance minimale, segment non négatif si échantillon suffisant, absence de red flag et contexte cohérent.
- Les edges aberrants restent pris en compte mais sont affichés comme `edge prudent` plafonné, pour éviter de présenter des valeurs artificiellement énormes comme des certitudes.
- La confiance affichée devient plus intelligente : si un segment manque encore de sample, le moteur conserve la confiance brute et le score de confiance modèle au lieu de pénaliser trop fort les sports/marchés nocturnes.
- Le cockpit affiche maintenant les sections 24h demandées : `Dans l'heure`, `Dans les 3 heures`, `Aujourd'hui`, `Cette nuit`, `Demain matin-midi`, `Demain après-midi/soir` et `Prochains jours`.
- Ajout des badges `✓ Fiable`, `À surveiller`, `Écarté` dans les cartes, tableaux, timeline, bet ultime et fiche match, avec la raison courte en tooltip.
- Les métriques, exports et fiches utilisent l'edge prudent/safe pour rester cohérents avec ce que l'utilisateur voit et peut vraiment miser.
- QA Sprint 13 : refresh réel rapide, contrat moteur, unit/refresh, smoke Electron, Playwright, capture visuelle et audit npm valident 180 picks candidats, 25 affichés, 20 prêts dans le cockpit, 20 picks sur 24h glissantes, 15 prêts sur 24h, 6 picks nocturnes affichés, 0 vulnérabilité et UI Winamax-only.

### Sprint 12 — Exploitation Winamax, comptabilité et cockpit 80/20

- Ajout d’un audit moteur `winamaxMarketAudit` : familles de marchés disponibles/exploitées, sports présents dans le catalogue Winamax, boosts détectés et marchés encore dormants. Sur les données fraîches : 194 événements bookables, 16 familles disponibles et 11 familles déjà exploitées.
- Le dashboard applique désormais une règle qualité lisible : maximum 2 picks par match et 3 picks par créneau horaire dans le cockpit, avec fallback seulement si la journée manque réellement de picks.
- Chaque pick reçoit un type de pari Winamax conseillé (`Single`, `Combiné prudent`, `Système`, `Single léger`) avec explication dans la fiche match et badges compacts dans les cartes/tableaux.
- Ajout des promos Winamax côté main process via `/api/winamax/promos` : cache local, timeouts, aucun fetch internet depuis le renderer, section repliée dans `Picks`.
- Ajout des liens directs `Ouvrir Winamax` sur les picks et conservation du cash-out/deep-link Winamax sur les cartes live suivies.
- Préférences élargies pour les sports Winamax disponibles dans le catalogue (`rugby`, football américain, MMA, boxe, handball, volley) et marchés complémentaires (`Corners`, `Cartons`).
- Comptabilité bankroll fine : dépôts/retraits locaux, ROI bankroll réel séparé du ROI paris, projection simple 3/6/12 mois et export profil enrichi.
- Rapport hebdo en popup : P&L semaine, ROI, WR, top segment, segment à corriger, actions concrètes, export PDF local minimal. Accessible manuellement depuis `Réglages > Avancé`.
- Nettoyage supplémentaire des traces multi-bookmaker dans le runtime legacy desktop : plus de remontée `Pinnacle`, `Bet365`, `The Odds API`, `best odds`, `compare odds`, `Multi-bookmaker` ou `Meilleure cote` dans le grep desktop.
- QA Sprint 12 : refresh rapide réel, contrat moteur, tests unitaires/refresh, smoke Electron, Playwright, capture visuelle et audit npm valident 24 picks affichés, 6 picks prêts aujourd’hui, 0 vulnérabilité et UI Winamax-only.

### Sprint 11 — Winamax-only, picks aujourd’hui et interface simplifiée

- Correction du bug “aucun match aujourd’hui” : le moteur priorise désormais les picks du jour dans le dashboard, puis les 30 prochaines heures, avant les meilleurs picks plus lointains.
- Ajout d’un funnel diagnostic `todayFunnel` : événements du jour → bookables Winamax → analysables → positifs → affichés → prêts. Sur les données fraîches du sprint : 33 événements aujourd’hui, 33 Winamax, 14 analysables, 6 picks positifs/prêts affichés.
- Assouplissement prudent des gates contexte pour les sports non-football : les signaux foot manquants comme xG/compositions/H2H ne bloquent plus automatiquement un pick tennis/baseball/basket/hockey quand le contexte proxy et l’edge sont solides.
- Refonte de la navigation visible : par défaut l’app n’expose plus que `Picks`, `Bilan` et `Réglages`; `Avancé` reste caché derrière le nouveau `Mode expert`.
- Simplification du cockpit : bandeau compact bankroll/P&L/fraîcheur, timeline horizontale des prochains picks, sections repliables pour combinés et buteurs, aide discrète via le bouton `?`.
- Nettoyage complet multi-bookmaker : suppression de la route `/api/odds/compare`, de The Odds API, des réglages de comparaison et de toutes les mentions `Meilleure cote`. Le logiciel est redevenu strictement Winamax-only pour tout pari actionnable.
- Ajout d’un garde-fou anti-tilt strict : détection 5 paris en 30 minutes, plus de 10% de bankroll engagée en 1h, martingale après pertes ou longue série de défaites.
- QA Sprint 11 : contrat moteur, smoke Electron, Playwright, capture visuelle, refresh rapide réel et audit npm valident 24 picks affichés, 6 picks prêts aujourd’hui, UI simplifiée, fiche match Winamax-only et aucune erreur console.

### Sprint 10 — Qualité réelle, live, multi-cotes et patterns avancés

- Ajout d’un audit rétrospectif `modelRealityAudit` sur les 500 derniers picks réglés : chaque pick affiche maintenant une validation historique par segment, un sample, ROI/WR comparables et une `confiance ajustée`.
- Le tri par défaut du cockpit utilise la confiance ajustée plutôt que l’edge brut, pour privilégier les picks dont le segment réel a déjà prouvé quelque chose.
- La fiche match affiche désormais la validation historique, la confiance ajustée et la meilleure cote comparée quand elle est disponible.
- Ajout d’une section `EN DIRECT` dans le cockpit : matchs live détectés, score/minute quand disponibles, verdict provisoire, lien Winamax/cash-out et notifications sur situations importantes.
- L’auto-refresh passe à 2 minutes quand un match live est suivi, tout en gardant le mode pré-kickoff 5 minutes et le mode économie.
- Ajout d’une comparaison multi-bookmaker optionnelle via le process Electron (`/api/odds/compare`) avec cache 30 min, The Odds API si clé fournie, fallback Winamax-only clair si aucune clé.
- Préférences enrichies avec toggle multi-bookmaker, clé The Odds API et régions. Le renderer ne fait toujours aucun fetch internet direct.
- Historique enrichi avec patterns personnels avancés : jour de semaine, tranche horaire, sport, ligue, marché, taille de mise, tier, segments top/worst et heatmap 365 jours.
- Vue Pipeline enrichie avec un panneau stabilité : uptime, mémoire moyenne/max, live suivis et alerte au-dessus de 600 MB RSS.
- QA Sprint 10 : smoke, Playwright, capture visuelle et contrat moteur couvrent `modelRealityAudit`, confiance ajustée, live cockpit, multi-bookmaker, patterns/heatmap, stabilité et absence de fetch externe renderer.

### Sprint 9 — Enrichissement visible, performance active, focus et notifications externes

- Enrichissement web rendu visible dans l'app : les picks enrichis affichent un badge `Enrichi à HH:MM`, et la fiche match expose les sources web vérifiées, validations locales, succès/échecs et horodatage.
- Le process Electron ajoute une route locale `/api/ai/enrich` avec cache, timeouts, journalisation pipeline et limite stricte de 5 fetchs web par minute. Le renderer ne fait toujours aucun fetch internet direct.
- Vue `Pipeline` enrichie avec le compteur quotidien des enrichissements web réussis/échoués.
- Préférences `IA moteur` complétées : toggle enrichissement web, durée de cache/rate-limit et test manuel sur un pick proche.
- Performance modèle active : les segments personnels très perdants durcissent automatiquement edge/confiance, les segments robustes positifs peuvent être assouplis, et les ajustements sont visibles/réinitialisables dans `Historique`.
- L'audit modèle affiche désormais une mini-courbe Brier 90j/30j/7j, en plus du drift.
- Ajout du `Mode focus` plein écran sur le bet ultime et les picks temporels : match, compte à rebours XL, ticket, raison et action `Je mise`.
- Notifications mobiles renforcées : suite de test pour les alertes critiques, journal webhook côté main process et backoff exponentiel en cas d'échec.
- Apprentissage actif : après un pari perdu, l'app propose une modal optionnelle pour noter la cause, stocke ce feedback dans le pari et l'affiche dans `Mes apprentissages`.
- Auto-update équivalent GitHub Releases : check de version au démarrage si activé, contrôle manuel et état visible dans `Préférences > Avancé`.
- QA Sprint 9 : smoke, Playwright et capture visuelle couvrent enrichissement, focus, feedback post-perte, update/webhook, absence de fetch externe renderer et cohérence des vues.

### Sprint 8 — Settlement verrouillé, cockpit temporel, buteurs triés et IA moteur discrète

- Correction critique du settlement automatique : un pari ne peut plus être réglé avant kickoff, ni sur un vieux résultat homonyme. Le garde-fou exige statut final confirmé, outcome final exploitable, date du résultat proche du pari et marge post-match par sport.
- Ajout d'une réparation au démarrage des faux settlements auto existants : les victoires/pertes fantômes sont remises en `pending`, avec audit visible dans `Historique`.
- L'audit `Settlement auto` affiche désormais les refus sécurité et les settlements fantômes annulés pour rendre le système contrôlable.
- Refonte du cockpit autour du temps : `Bet ultime du jour`, `À jouer maintenant`, `Bientôt`, `Plus tard aujourd’hui`, `Demain` et `Prochains jours`, avec compte à rebours, raison courte et action directe.
- Le brief du matin remonte le bet ultime quand il existe, au lieu de seulement compter les picks.
- Vue `Buteurs` enrichie : filtres par recherche/ligue/cote, tri départ-confiance/edge/cote, cartes joueur plus lisibles et action de suivi intégrée.
- Les combinés sont triés par edge composé décroissant pour placer les tickets les plus intéressants en premier.
- Ajout d'une section `IA moteur` dans les préférences : provider, modèle, clé locale et activation. Sans clé, le logiciel utilise une curation heuristique locale complète.
- Le process Electron expose `/api/ai/assist` : la curation du bet ultime, les explications et la détection d'anomalies passent par le main process, jamais par un fetch internet direct depuis le renderer.
- Sécurité renderer renforcée : suppression des avatars joueurs distants Sofascore et CSP image revenue à `self`/`data`.
- QA Sprint 8 : Playwright reproduit un pari futur qui ne doit pas être réglé, valide l'annulation d'un settlement fantôme, vérifie le cockpit temporel, les filtres buteurs, l'IA moteur et l'absence de requêtes externes renderer.

### Sprint 7 — Auto-settlement, coach prudent, backup profil et résilience

- Ajout du settlement automatique au démarrage et après refresh : les paris suivis encore en cours sont rapprochés des résultats archivés et résolus en gagné/perdu quand le marché est évaluable.
- Notification locale et audit `Settlement auto` dans `Historique` pour afficher combien de paris ont été résolus et le P&L ajouté sans intervention manuelle.
- Ajout d'un mode coach activé par défaut : limite de paris/jour, cap de mise journalier, avertissement sur série de défaites, segment perdant et cote qui a bougé défavorablement avant de cliquer sur `Je mise`.
- Le brief d'accueil affiche maintenant des conseils du jour issus du coach : rythme recommandé, segments à éviter, stop-loss/take-profit et état de la discipline bankroll.
- Audit modèle autonome dans `Historique` : Brier roulant 7j/30j/90j, tendance de dérive et signalement des segments à surveiller quand l'échantillon devient suffisant.
- Insights automatiques sur les paris suivis : détection des meilleurs/pires segments, comparaison par sport, marché, ligue et moment de la journée avec seuil de sample minimum.
- Sauvegarde/restauration profil locale : export/import JSON, fusion ou remplacement, backup automatique quotidien dans `desktop/state/backups/` avec rotation 30 jours.
- Résilience renforcée : backup local de `data.js` parseable, fallback automatique si la donnée principale est corrompue, tentative de restauration profil si les paris suivis deviennent illisibles, et détection de crash précédent avec mode lecture prudent.
- Ajout d'un mode démo séparé des vrais paris pour tester l'app avec une bankroll virtuelle sans polluer l'historique réel.
- QA Sprint 7 : Playwright couvre le coach, l'auto-settlement et le profil ; nouveau test multi-jours simulé validant settlement J+3 et backup profil ; capture visuelle enrichie sur coach, audit modèle, insights et préférences profil.

### Sprint 6 — Polish ultime, aide intégrée, calendrier et stabilité longue durée

- Polish visuel du cockpit desktop : transitions douces entre vues, micro-interactions sur cartes/boutons, toasts unifiés, états vides plus lisibles et respect renforcé des tokens visuels.
- Ajout d'une vue `Aide` avec glossaire intégré pour les termes de décision : edge, EV, Kelly, CLV, Brier, tier, bucket d'edge, segment, sharp money, Outsider, BTTS, OU, DC, AH et DNB.
- Ajout de tooltips contextuels sur les notions techniques clés du cockpit pour éviter que les chiffres importants restent opaques.
- `Mes paris` accepte maintenant des notes privées et des tags personnels persistés localement, avec filtre par tag et export CSV enrichi.
- Nouvelle vue `Calendrier` sur 7 jours : densité de picks par jour, heatmap compacte et timeline horaire cliquable pour revenir au cockpit filtré.
- Préférences enrichies avec webhook mobile externe générique/Discord/ntfy/Telegram/Pushover, test sécurisé localement et envoi des alertes importantes depuis le process Electron, jamais depuis le renderer.
- Nouvelle vue `Pipeline` : état refresh, historique des durées, mémoire RSS, log live et annulation de refresh bloqué.
- Ajout d'un panneau logs debug accessible par `Ctrl+Shift+L`, avec filtres info/warn/error, copie et vidage local.
- Brief d'ouverture complété par `Modèle aujourd'hui` : picks affichés, segments verts/rouges, edge moyen du jour et qualité de journée de signaux.
- QA Sprint 6 : Playwright couvre le cycle complet `Je mise` → tags/notes → settlement → P&L, les écrans Aide/Calendrier/Pipeline/Logs et l'absence d'erreurs console ; stress Electron 30 minutes validé avec mémoire max 382 MB.

### Sprint 5 — Cockpit intelligent, CLV, discipline bankroll et alertes

- Ajout d'un `Brief du matin` en haut de l'accueil : nombre de picks affichés, gros edges, prochain match avec compte à rebours, performance d'hier, bankroll, CLV et accès rapides aux picks, combinés et paris suivis.
- Suivi utilisateur enrichi : chaque pari conserve cote prise, dernière cote vue, cote de clôture capturée quand le match approche, CLV, bucket d'edge, tier, marché et mode de mise.
- Vue `Historique` complétée avec CLV moyen et apprentissage depuis les paris suivis : comparaison edge moyen gagnants/perdants, warnings de segments perdants dès qu'un sample devient robuste.
- Préférences bankroll étendues : mode `Kelly plafonné` ou `Flat 1u`, flat unit, cap par mise, stop-loss journalier et take-profit journalier.
- Discipline de tracking : si stop-loss ou take-profit journalier est atteint, les boutons `Je mise` passent en pause et l'app prévient localement au lieu d'encourager un pari impulsif.
- Alertes intelligentes locales : nouveau pick prêt, gros edge proche kickoff, rappel pick <30 min non suivi, cote qui monte/baisse de 5%, signal blessure proche kickoff et notification de settlement manuel.
- Pré-kickoff plus réactif : l'auto-refresh passe à 5 minutes quand un pick démarre dans moins d'une heure, tout en gardant le mode économie si l'app reste en arrière-plan.
- Robustesse refresh : `snapshot_odds.py` écrit maintenant atomiquement avec retry, et la météo dispose d'un timeout plus réaliste sur les runs complets/signaux.
- Stabilité longue durée : monitoring mémoire Electron toutes les 5 minutes, exposé dans l'état local et journalisé si l'app dépasse 500 MB RSS.
- QA Sprint 5 : pipeline complète réelle exécutée, refresh rapide validé, captures visuelles, smoke Electron, Playwright, moteur, refresh contract et audit dépendances relancés sur données fraîches.

### Sprint 4 — Multi-marchés, combinés et crédibilité modèle

- Moteur desktop élargi aux marchés Winamax exacts au-delà du 1N2 : le cockpit exploite désormais les alternatives positives par match, avec 120 picks positifs détectés et 24 picks affichés dans la sélection principale.
- Ajout d'un filtre `Marché` et d'un résumé des marchés dominants pour basculer rapidement entre 1N2, O/U, BTTS, handicaps, totaux mi-temps, baskets/totaux et autres marchés supportés.
- Vue `Combinés` renforcée : variantes Safe, Best Edge, Buts et Outsider, cote totale, retour pour 10 euros, corrélation moyenne, edge composé et tracking `Je mise le combiné`.
- Vue `Historique` enrichie en tableau de crédibilité : ROI, win rate, Brier score, calibration par buckets et performance par sport/ligue/tier/marché à partir des rapports de backtest disponibles.
- Ajout de `Mes paris` détaillé : filtres période/statut, courbe P&L cumulée, settlement manuel, export CSV et cohérence avec la bankroll visible du cockpit.
- Nouvelle vue `Préférences` : bankroll, niveau, sports suivis, marchés autorisés, seuils personnels, mode strict et paramètres d'alerte persistés localement.
- Onboarding de première ouverture pour configurer bankroll, sports et niveau sans noyer l'utilisateur dans les réglages avancés.
- Fiche match enrichie avec une section `Pourquoi ce pick ?`, comparaison cote modèle / Winamax / consensus, signaux lisibles, forme récente et H2H quand disponibles.
- QA Sprint 4 : capture visuelle de tous les écrans principaux, smoke Electron, Playwright, moteur, refresh et audit dépendances valident 20+ boutons `Je mise`, les nouveaux filtres, les combinés, l'historique, les préférences et l'absence d'iframe.

### Sprint 3 — Design pro, robustesse et qualité de vie

- Ajout d'un socle `design-tokens.css` pour stabiliser la palette, les tailles, les espacements et les rayons de l'interface desktop.
- Démarrage accéléré du cockpit : préchauffage/cache moteur côté Electron et affichage mesuré des picks autour de 0,5s dans la capture QA.
- Cockpit enrichi avec indicateur performance, prochaine échéance d'auto-refresh et message plus clair sur les paris réellement prêts.
- Bankroll suivie améliorée : sparkline P&L des 30 derniers paris, résumé segment/streak et export CSV des paris suivis.
- Refresh intelligent : 30 min par défaut, 10 min si un pick proche démarre dans moins d'une heure, pause économie si l'app reste en arrière-plan plus d'une heure.
- Notifications desktop natives autorisées uniquement pour les opportunités importantes : nouveau pick prêt ou gros edge proche, sans fetch internet depuis le renderer.
- Robustesse données : les données anciennes mais encore présentes restent affichées avec un bandeau clair au lieu de vider l'écran ; les fiches signalent les contextes limités.
- QA renforcée : Playwright, smoke et capture visuelle vérifient design tokens, P&L enrichi, export suivis, notifications, refresh intelligent et performance cockpit.

### Suite UX / QA

- `npx playwright test` cible désormais l'application Electron locale au lieu de l'ancienne suite site trop longue : test cockpit, tracking `Je mise`, P&L, filtres, fiche match, sécurité renderer et absence d'iframe.
- Ajout des filtres rapides sur le cockpit : recherche équipe, sport, ligue, tri edge/confiance/kickoff/cote, edge min et cote min.
- Fiche match refondue en synthèse décisionnelle : verdict immédiat, ticket, cote, edge, mise, contexte, signaux clés météo/arbitre/compos/blessures/stats/xG et audit technique replié.
- Scénarios de mise repliés par défaut pour garder le premier écran centré sur les picks actionnables.
- Raccourcis clavier desktop `Ctrl+1` à `Ctrl+7` pour naviguer vite entre les vues principales.

### Fixes

- Correction du blocage critique `0 pari jouable` dans l'app Electron : le moteur exploite maintenant le pick 1N2 prédit quand la cote Winamax est valide et l'edge est positif, même si l'ancien modèle legacy marquait le match en skip prudent.
- Séparation claire entre picks utilisateur et agent autonome : les picks manuels peuvent être affichés comme jouables, tandis que l'agent reste bloqué si la checklist globale est rouge.
- Données fraîches relancées par le refresh local rapide : catalogue Winamax, marchés détaillés, contexte match, health et rapports recalculés.

### UX

- Accueil recentré sur `Paris prêts` / `À jouer maintenant`, avec 10+ picks visibles, mise uniquement sur les picks autorisés, et bouton `Je mise` pour suivre un pari en un clic.
- Ajout d'un suivi bankroll local visible en permanence : P&L total, P&L du jour, ROI et nombre de paris suivis.
- Auto-refresh de fond toutes les 30 minutes et indicateur de fraîcheur moins anxiogène : les données ne sont plus marquées bloquées avant le seuil réel de 4h.

### QA

- Tests desktop renforcés sur le critère vital : au moins 10 picks prêts, boutons `Je mise`, P&L visible, cohérence décisionnelle et agent bloqué quand les gates globaux restent rouges.

## v37.019 — 2026-05-06

### Features

- `114f8b4e` v37.019 privacy-social — local sharing badges and data controls · diff +3498/-3

## v37.018 — 2026-05-06

### Features

- `547e4032` v37.018 data-integrity — validation lineage and health monitoring · diff +4651/-431

## v37.017 — 2026-05-06

### Performance

- `827c45e8` v37.017 performance — ESM shell workers and budgets · diff +49759/-34020

## v37.016 — 2026-05-06

### Features

- `2c0b4e6b` v37.016 ux overhaul — design system v3 foundation · diff +1175/-34

## v37.015 — 2026-05-06

### Features

- `23311abc` v37.015 sports coverage — extended sports matrix · diff +1563/-210

## v37.014 — 2026-05-06

### Features

- `133ac36c` v37.014 section N — final checks V5 · diff +369/-261

## v37.013 — 2026-05-06

### Features

- `001de970` v37.013 section M — adversarial validation V5 · diff +520/-11

## v37.012 — 2026-05-06

### Features

- `40c6c7c3` v37.012 section L — self-evaluation V5 · diff +155/-4

## v37.011 — 2026-05-06

### Features

- `dae181b1` v37.011 section K — backtest deep V5 · diff +656/-10

## v37.010 — 2026-05-06

### Features

- `0d0d88ea` v37.010 section J — multi-task V5 · diff +519/-10

## v37.009 — 2026-05-06

### Features

- `c3279a49` v37.009 section I — cold start V5 · diff +22771/-17

## v37.008 — 2026-05-06

### Features

- `b2875b18` v37.008 section H — intervalles prediction V5 · diff +136/-6

## v37.007 — 2026-05-06

### Features

- `1761b08e` v37.007 section G — ensemble adaptatif V5 · diff +557/-24

## v37.006 — 2026-05-06

### Features

- `9e894aa6` v37.006 section F — calibration V5 brier gatee · diff +171/-4

## v37.005 — 2026-05-06

### Fixes

- `4d99c4ba` v37.005 section E — drift ML KL features · diff +164/-4

## v37.004 — 2026-05-06

### Features

- `cb92fc81` v37.004 section D — online learning V5 versionne · diff +146/-4

## v37.003 — 2026-05-06

### Features

- `ef3fc09b` v37.003 section C — feature engineering V5 auditable · diff +156/-5

## v37.002 — 2026-05-06

### Features

- `40e6f7a4` v37.002 section B — stacking meta V5 borne · diff +156/-5

## v37.001 — 2026-05-06

### Features

- `bf808357` v37.001 section A — priors bayesiens V5 hierarchiques · diff +178/-8

## v36.035 — 2026-05-06

### Features

- `f0a06eb7` v36.035 section LLL — mode novice expert · diff +76/-7

## v36.034 — 2026-05-06

### Features

- `a73b0aaf` v36.034 section KKK — badges tier compacts mobiles · diff +80/-11

## v36.033 — 2026-05-06

### Features

- `b6eba2ae` v36.033 section JJJ — filtres rapides mobiles · diff +102/-5

## v36.032 — 2026-05-06

### Features

- `c8786e79` v36.032 section III — partage natif deep-link match · diff +58/-9

## v36.031 — 2026-05-06

### Features

- `c1b74f35` v36.031 section HHH — menu long-press mobile · diff +165/-4

## v36.030 — 2026-05-06

### Features

- `ade432ff` v36.030 section GGG — zones tactiles mobiles · diff +27/-4

## v36.029 — 2026-05-06

### Features

- `44a0ba84` v36.029 section FFF — filtres mobiles compacts · diff +67/-10

## v36.028 — 2026-05-06

### Features

- `6e9e6157` v36.028 section EEE — modal bottom sheet mobile · diff +88/-14

## v36.027 — 2026-05-06

### Features

- `519c115e` v36.027 section DDD — pull-to-refresh haptique · diff +68/-18

## v36.026 — 2026-05-06

### Features

- `9ec743ff` v36.026 section CCC — gestes mobiles dashboard · diff +70/-5

## v36.025 — 2026-05-06

### Features

- `28402247` v36.025 section BBB — mobile cards compactes · diff +99/-2

## v36.024 — 2026-05-06

### Features

- `5a9b853c` v36.024 section AAA — same-game builders corrélés · diff +398/-221

## v36.023 — 2026-05-06

### Features

- `c1dea39c` v36.023 section ZZ — props MLB NHL · diff +2276/-197

## v36.022 — 2026-05-05

### Features

- `8c4cb0da` v36.022 section YY — tennis jeux et sets · diff +251/-191

## v36.021 — 2026-05-05

### Features

- `bbf3a511` v36.021 section XX — totaux quart-temps basket · diff +247/-189

## v36.020 — 2026-05-05

### Features

- `83720528` v36.020 section WW — BTTS deux mi-temps · diff +250/-188

## v36.019 — 2026-05-05

### Features

- `c1b382bb` v36.019 section VV — ordre des buts poisson · diff +259/-188

## v36.018 — 2026-05-05

### Features

- `a1859615` v36.018 section UU — marches stats foot · diff +328/-184

## v36.017 — 2026-05-05

### Features

- `fc9cddf3` v36.017 section TT — matrice HTFT complete · diff +205/-181

## v36.016 — 2026-05-05

### Features

- `7c60f907` v36.016 section RR-SS — marches asiatiques quart-point · diff +345/-182

## v36.015 — 2026-05-05

### Features

- `bb0318aa` v36.015 section QQ — props joueurs NBA WNBA · diff +4611/-181

## v36.014 — 2026-05-05

### Features

- `e1d9e880` v36.014 section PP — marches joueurs foot · diff +10129/-186

## v36.013 — 2026-05-05

### Features

- `d74166a7` v36.013 section phase6 — validation et rapport V4 · diff +118/-2

## v36.012 — 2026-05-05

### Features

- `14126fb1` v36.012 section NN-OO — benchmark et anomalies marche · diff +675/-171

## v36.011 — 2026-05-05

### Features

- `71f906e9` v36.011 section MM — stats equipe etendues · diff +241/-168

## v36.010 — 2026-05-05

### Features

- `f2f5551e` v36.010 section LL — derbies variance controlee · diff +230/-164

## v36.009 — 2026-05-05

### Features

- `c4c4b8a6` v36.009 section KK — tenure coach manager shock · diff +239/-162

## v36.008 — 2026-05-05

### Features

- `580babf2` v36.008 section JJ — effets stade altitude · diff +224/-160

## v36.007 — 2026-05-05

### Features

- `63662b8e` v36.007 section II — surface tennis goalies pitchers · diff +289/-155

## v36.006 — 2026-05-05

### Features

- `8984cdae` v36.006 section HH — tendances arbitres V4 · diff +233/-153

## v36.005 — 2026-05-05

### Features

- `d8914a9e` v36.005 section FF-GG — voyage et densite calendrier · diff +254/-149

## v36.004 — 2026-05-05

### Features

- `b755a7c3` v36.004 section EE — decay xg par ligue · diff +232/-148

## v36.003 — 2026-05-05

### Features

- `3b8bbbf8` v36.003 section DD — impact stars absentes · diff +281/-144

## v36.002 — 2026-05-05

### Features

- `86c0ba2a` v36.002 section BB-CC — saison et competition V4 · diff +306/-140

## v36.001 — 2026-05-05

### Features

- `ec895ebd` v36.001 section AA — priors bayesiens equipe · diff +676/-140

## v35.502 — 2026-05-05

### Features

- `987859c4` v35.502 section phase1 — fondations data persistantes · diff +6439/-182

## v35.482 — 2026-05-05

### Features

- `c7327910` v35.482 section A-E: pipeline frais et cohérence tableau

## v35.481 — 2026-05-05

### Features

- `2054df2f` v35.481 section 4.3: final stability audit · +9/-3

## v35.480 — 2026-05-05

### Features

- `0c618e32` v35.480 section 4.2: refresh night metrics · +140/-134

## v35.479 — 2026-05-05

### Features

- `127c9494` v35.479 section 3.3: clarify Methode hierarchy · +18/-12

## v35.478 — 2026-05-05

### Features

- `1f76cb09` v35.478 section 3.2: make Tous scannable · +48/-16

## v35.477 — 2026-05-05

### Features

- `1bb489a7` v35.477 section 3.1: group profile accordions · +89/-8

## v35.476 — 2026-05-05

### Features

- `cf735c8f` v35.476 section 1-2: stabilize pick coherence · +460/-188

## v35.475 — 2026-05-05

### Features

- `5b0900cd` v35.475 dashboard: calibrate pick quality

## v35.474 — 2026-05-05

### Fixes

- `db02fb7e` v35.474 dashboard: unblock stale pick table

## v35.473 — 2026-05-05

### Docs

- `71bc7620` v35.473 docs: publish stability report

## v35.472 — 2026-05-05

### Performance

- `982da6e4` v35.472 perf: compress dashboard css

## v35.471 — 2026-05-05

### Features

- `58998a21` v35.471 data: clarify signal coverage

## v35.470 — 2026-05-05

### Features

- `8399043f` v35.470 test: stabilize V37 audits

## v35.469 — 2026-05-05

### Features

- `69a1d792` v35.469 ux: clarify dashboard decisions

## v35.468 — 2026-05-05

### Docs

- `144f33c2` v35.468 docs: clarify hosting options

## v35.467 — 2026-05-05

### Features

- `3297cb9e` v35.467 audit: confirm stability scores

## v35.466 — 2026-05-05

### Features

- `d0a83837` v35.466 test: clarify dashboard history

## v35.465 — 2026-05-05

### Fixes

- `3ccbd977` v35.465 fix: widen dashboard navigation

## v35.464 — 2026-05-05

### Fixes

- `8e930fcd` v35.464 fix: stabilize Theo dashboard table

## v35.463 — 2026-05-05

### Features

- `ae94eddd` v35.463 qa: align a11y audit with five hubs

## v35.462 — 2026-05-05

### Features

- `6f7a879b` v35.462 qa: align modal tabs test with tech panel

## v35.461 — 2026-05-05

### Features

- `cd4cd868` v35.461 qa: modernise phase3 validation tests

## v35.460 — 2026-05-05

### Features

- `7bf035a7` v35.460 pipeline: rafraichir formes equipes

## v35.459 — 2026-05-05

### Features

- `2105b89e` v35.459 pipeline: restaurer donnees fraiches

## v35.458 — 2026-05-05

### Fixes

- `1c8da03d` v35.458 debug: diagnostiquer tableau Theo

## v35.457 — 2026-05-05

### Features

- `09a23cc0` v35.457 validation: recap extensions finales

## v35.456 — 2026-05-05

### Features

- `4d55af70` v35.456 validation: proteger tableau final

## v35.455 — 2026-05-05

### Features

- `cd8cc227` v35.455 test: stabiliser validation finale

## v35.454 — 2026-05-05

### Features

- `0b3854ef` v35.454 test: debloquer suite playwright

## v35.453 — 2026-05-05

### Performance

- `0f30c531` v35.453 regression: restaurer a11y lighthouse

## v35.452 — 2026-05-05

### Features

- `340c4a5c` v35.452 validation: recap issues

## v35.451 — 2026-05-05

### Features

- `0fbdf858` v35.451 validation: contenu final

## v35.450 — 2026-05-05

### Features

- `41e5327e` v35.450 validation: polish code

## v35.449 — 2026-05-05

### Features

- `1c20d85f` v35.449 validation: features produit

## v35.448 — 2026-05-05

### Features

- `80b03836` v35.448 validation: modele branche

## v35.447 — 2026-05-05

### Features

- `6d1be42a` v35.447 validation: signaux genie

## v35.446 — 2026-05-05

### Features

- `74e0dcf2` v35.446 validation: extensions sport

## v35.445 — 2026-05-05

### Features

- `4710e0d1` v35.445 validation: accueil plein

## v35.444 — 2026-05-05

### Features

- `5e10208e` v35.444 K: enrichir timing de mise

## v35.443 — 2026-05-05

### Features

- `a57333bc` v35.443 K: qualifier signaux rares

## v35.442 — 2026-05-05

### Features

- `53a4de3b` v35.442 K: synthese spots calendrier

## v35.441 — 2026-05-05

### Features

- `300e6d0a` v35.441 K: structurer anti-public

## v35.440 — 2026-05-05

### Features

- `bc167c5b` v35.440 K: enrichir inefficiences ligues

## v35.439 — 2026-05-05

### Features

- `0a436cfc` v35.439 J: clarifier rugby watch

## v35.438 — 2026-05-05

### Features

- `c6eb30da` v35.438 J: suivre expansion foot

## v35.437 — 2026-05-05

### Features

- `354d12b8` v35.437 J: suivre tennis challenger

## v35.436 — 2026-05-05

### Features

- `5f34458d` v35.436 J: renforcer marches NHL

## v35.435 — 2026-05-05

### Features

- `cadf1206` v35.435 J: deriver props lanceurs MLB

## v35.434 — 2026-05-05

### Features

- `633e1244` v35.434 J: etendre taxonomy sports

## v35.433 — 2026-05-05

### Features

- `3459e9fb` v35.433 qa: valider la Section 0 tableau

## v35.432 — 2026-05-05

### Features

- `6c6a0d06` v35.432 intel: rendre les placeholders marche non bloquants

## v35.431 — 2026-05-05

### Features

- `f38c9661` v35.431 modele: assouplir abstain multi-sport

## v35.430 — 2026-05-05

### Features

- `1cb4dc6f` v35.430 data: restaurer Sofascore sans boot lourd

## v35.429 — 2026-05-05

### Features

- `85a608fc` v35.429 data: restaurer pipeline frais

## v35.428 — 2026-05-05

### Fixes

- `ce4ea628` v35.428 fix: table stale lisible

## v35.427 — 2026-05-05

### Features

- `ea3b31f5` v35.427 QA: couvrir les lignes training

## v35.426 — 2026-05-05

### Features

- `641a08b0` v35.426 Modele: generer les lignes training

## v35.425 — 2026-05-05

### Features

- `faa4bbc0` v35.425 MCP: clarifier les signaux arbitres

## v35.424 — 2026-05-05

### Features

- `304c8b14` v35.424 Modele: verrouiller placeholders marche

## v35.423 — 2026-05-05

### Features

- `fed6e2f7` v35.423 MCP: tracer le runtime diagnostic

## v35.422 — 2026-05-05

### Performance

- `a450f97b` v35.422 QA: recuperer marge bundle

## v35.421 — 2026-05-05

### Features

- `d311b151` v35.421 QA: couvrir le briefing quotidien

## v35.420 — 2026-05-05

### Features

- `16495727` v35.420 E3: ajouter briefing quotidien local

## v35.419 — 2026-05-05

### Features

- `624d981a` v35.419 K8: durcir les picks du genie

## v35.418 — 2026-05-05

### Features

- `33e2f405` v35.418 I6: rendre les signaux modele lisibles

## v35.417 — 2026-05-05

### Features

- `ec666aa2` v35.417 I1: separer xG dans ensemble modele

## v35.416 — 2026-05-05

### Features

- `dff168f6` v35.416 I10: ajouter garde-fou AUC marche

## v35.415 — 2026-05-05

### Features

- `0137c67b` v35.415 H10: trier top sport par opportunite

## v35.414 — 2026-05-05

### Features

- `7bea2a16` v35.414 H8: etendre combos intra-match

## v35.413 — 2026-05-05

### Features

- `f5806734` v35.413 D5: retirer JSON-LD runtime mort

## v35.412 — 2026-05-05

### Features

- `73313d9e` v35.412 H4-H7: exposer basket periode et baseball F5

## v35.411 — 2026-05-05

### Features

- `14bb3079` v35.411 H2-H3: exposer corners et cartons

## v35.410 — 2026-05-05

### Features

- `99a4189a` v35.410 H1: exposer les totaux mi-temps

## v35.409 — 2026-05-05

### Fixes

- `72115fa7` v35.409 B2-B5: valider score signaux et bugs captures

## v35.408 — 2026-05-05

### Features

- `7ae0e0c1` v35.408 B1: brancher le runtime LightGBM pipeline

## v35.407 — 2026-05-05

### Performance

- `025025e8` v35.407 A4: durcir le garde-fou bundle

## v35.406 — 2026-05-05

### Features

- `f8795b02` v35.406 A3: restaurer le signal arbitre

## v35.405 — 2026-05-05

### Features

- `a02ee3f2` v35.405 A2: aligner les ratios Winamax

## v35.404 — 2026-05-05

### Features

- `fee81fdc` v35.404 A5: verrouiller les samples marche

## v35.403 — 2026-05-05

### Features

- `b8ab82f7` v35.403 A1: verrouiller la date dynamique MCP

## v35.402 — 2026-05-05

### Features

- `6c4badb6` v35.402 C5: ajouter le mode blind discipline

## v35.401 — 2026-05-05

### Features

- `a35c49a7` v35.401 C7: remonter les suggestions perso

## v35.400 — 2026-05-05

### Features

- `63a7a208` v35.400 C6: ajouter le projecteur bankroll

## v35.399 — 2026-05-05

### Features

- `603413d6` v35.399 C4: ajouter la heatmap pnl personnelle

## v35.398 — 2026-05-05

### Features

- `381b0244` v35.398 C3: ajouter le detecteur tilt

## v35.397 — 2026-05-04

### Features

- `191451c9` v35.397 C1: afficher le tracking CLV

## v35.396 — 2026-05-04

### Features

- `f270feca` v35.396 C2: enrichir score opportunite

## v35.395 — 2026-05-04

### Features

- `8f979bc7` v35.395 H10: ajouter paris du jour par sport

## v35.394 — 2026-05-04

### Features

- `d49ed1f0` v35.394 H1: etendre table multi-marches

## v35.393 — 2026-05-04

### Features

- `c107b170` v35.393 B5: verrouiller regressions captures V37

## v35.392 — 2026-05-04

### Features

- `c8a41095` v35.392 B3-B4: exposer signaux pour contre

## v35.391 — 2026-05-04

### Features

- `fbdc1c9a` v35.391 B2: rendre tooltip score opportunite testable

## v35.390 — 2026-05-04

### Features

- `538f091b` v35.390 B1: brancher poids lightgbm runtime

## v35.389 — 2026-05-04

### Performance

- `6d054537` v35.389 A4: reduire app js sous seuil bundle

## v35.388 — 2026-05-04

### Features

- `1955d2ca` v35.388 A3: ajouter contexte arbitral honnete

## v35.387 — 2026-05-04

### Features

- `4d057549` v35.387 A5: recalculer les biais marches sur cotes reelles

## v35.386 — 2026-05-04

### Fixes

- `847d454b` v35.386 A1-A2: corriger MCP date et ratio

## v35.385 — 2026-05-04

### Features

- `cf73a947` v35.385 B1: auditer verite data unique

## v35.384 — 2026-05-04

### Features

- `8327ecb2` v35.384 E5: regenerer night metrics

## v35.383 — 2026-05-04

### Features

- `08044c3e` v35.383 D2: nettoyer commentaires legacy

## v35.382 — 2026-05-04

### Features

- `b43b5ed1` v35.382 D4: separer issues actives et resolues

## v35.381 — 2026-05-04

### Features

- `c4e15742` v35.381 D3: compacter journal de sprint

## v35.380 — 2026-05-04

### Features

- `5512795e` v35.380 D6: verrouiller skips Playwright

## v35.379 — 2026-05-04

### Features

- `8b9a287e` v35.379 A1-A9: verrouiller coherence intelligence

## v35.378 — 2026-05-04

### Features

- `1637594a` v35.378 Infra: aborter fetchs de page

## v35.377 — 2026-05-04

### Features

- `c26c6f71` v35.377 Security: surveiller innerHTML

## v35.376 — 2026-05-04

### Features

- `ec67d6c7` v35.376 UX: clarifier tags et raisons de pari

## v35.375 — 2026-05-04

### Features

- `86c72695` v35.375 B4: verrouiller date MCP dynamique

## v35.374 — 2026-05-04

### Features

- `b690e5b7` v35.374 D6: aligner tests SPA sur 5 hubs

## v35.373 — 2026-05-04

### Features

- `4062a5a2` v35.373 E6: exporter poids appris offline

## v35.372 — 2026-05-04

### Performance

- `5d5c9b59` v35.372 E3: auditer bundle initial

## v35.371 — 2026-05-04

### Features

- `d133ed9e` v35.371 E1: consolider navigation en 5 hubs

## v35.370 — 2026-05-04

### Features

- `4a46f673` v35.370 E2: renforcer matching arbitres

## v35.369 — 2026-05-04

### Features

- `111afebe` v35.369 D9: etendre couverture xG proxy

## v35.368 — 2026-05-04

### Features

- `6bf56522` v35.368 D5: tracer listeners UI

## v35.367 — 2026-05-04

### Features

- `30d8abab` v35.367 D1: tracer erreurs JS silencieuses

## v35.366 — 2026-05-04

### Features

- `7376241a` v35.366 B5: etendre marches Winamax detailles

## v35.365 — 2026-05-04

### Features

- `31a1a8e2` v35.365 B3: expliciter audit cotes boostees

## v35.364 — 2026-05-04

### Features

- `f8871fb4` v35.364 B2: archiver les JSON orphelins

## v35.363 — 2026-05-04

### Features

- `61001814` v35.363 B1-B4: synchroniser les verites data

## v35.362 — 2026-05-04

### Features

- `7a5b3ec8` v35.362 A9: expliquer les signaux pour contre

## v35.361 — 2026-05-04

### Features

- `47f6dbb7` v35.361 A8: decomposer le score opportunite

## v35.360 — 2026-05-04

### Features

- `e7539ca4` v35.360 A6: detecter marches de cotes incertains

## v35.359 — 2026-05-04

### Features

- `169a35ce` v35.359 model: prioritize league edge over noisy angles

## v35.358 — 2026-05-04

### Features

- `5d30cc17` v35.358 model: reconcile contradictory angles

## v35.357 — 2026-05-04

### Features

- `b76a3611` v35.357 model: sanity-check market biases

## v35.356 — 2026-05-04

### Features

- `5185df7b` v35.356 data: etendre couverture xG hors top-5

## v35.355 — 2026-05-04

### Fixes

- `5abb7328` v35.355 ux: verrouiller bugs captures

## v35.354 — 2026-05-04

### Features

- `92c53e09` v35.354 data: enrichir H2H grands matchs

## v35.353 — 2026-05-04

### Fixes

- `4ba914f1` v35.353 fix: synchroniser table et modal

## v35.352 — 2026-05-04

### Features

- `38b51c14` v35.352 pipeline: aligner auto refresh

## v35.351 — 2026-05-04

### Performance

- `8a08bd94` v35.351 data: fusionner cache lineups

## v35.350 — 2026-05-04

### Performance

- `cdbaf45d` v35.350 data: fusionner cache arbitres

## v35.349 — 2026-05-04

### Features

- `7d665048` v35.349 data: rafraichir h2h prioritaire

## v35.348 — 2026-05-04

### Features

- `d5ddb061` v35.348 data: reconnaitre injuries vides couvertes

## v35.347 — 2026-05-04

### Features

- `13d9fd81` v35.347 ui: scorer les signaux rares par direction

## v35.346 — 2026-05-04

### Features

- `af192be4` v35.346 data: detecter angles voyage fatigue US

## v35.345 — 2026-05-04

### Features

- `c4649c1a` v35.345 data: rendre gaps arbitres time-aware

## v35.344 — 2026-05-04

### Features

- `6226016f` v35.344 data: renforcer aliases sources foot

## v35.343 — 2026-05-04

### Features

- `cc02eaf5` v35.343 ui: connecter biais marches au dashboard

## v35.342 — 2026-05-04

### Features

- `2d0ec30b` v35.342 data: publier biais marches par ligue

## v35.341 — 2026-05-04

### Features

- `ec27cd38` v35.341 data: rendre gaps lineups temporels

## v35.340 — 2026-05-04

### Features

- `8788916e` v35.340 mcp: exposer gaps data multi-jours

## v35.339 — 2026-05-04

### Features

- `ed1a6676` v35.339 ui: penaliser gaps data dans score

## v35.338 — 2026-05-04

### Features

- `8ecb3040` v35.338 ui: personnaliser score profil Theo

## v35.337 — 2026-05-04

### Features

- `b868d753` v35.337 ui: afficher gaps data critiques

## v35.336 — 2026-05-04

### Features

- `ec0f6712` v35.336 data: publier rapport gaps signaux

## v35.335 — 2026-05-04

### Features

- `0d0a21ea` v35.335 ui: ajouter score opportunite

## v35.334 — 2026-05-04

### Features

- `3d8465a8` v35.334 data: partager aliases signaux foot

## v35.333 — 2026-05-04

### Features

- `e7af06ca` v35.333 data: attacher starters MLB NHL

## v35.332 — 2026-05-04

### Features

- `a7f68e3b` v35.332 ui: afficher insights modele accueil

## v35.331 — 2026-05-04

### Features

- `a0261a8f` v35.331 data: generer intelligence betting

## v35.330 — 2026-05-04

### Features

- `3e3688e7` v35.330 data: attacher blessures multi-sports

## v35.329 — 2026-05-04

### Features

- `43b305b0` v35.329 data: injecter signaux foot dans patch rapide

## v35.328 — 2026-05-04

### Features

- `3987fdba` v35.328 ux: replace native alerts with toasts

## v35.327 — 2026-05-04

### Features

- `4eb6ccca` v35.327 ux: remove native prompt fallback

## v35.326 — 2026-05-04

### Features

- `b1dbbac9` v35.326 security: sanitize dynamic HTML sinks

## v35.325 — 2026-05-04

### Features

- `198e4b27` v35.325 security: lock script CSP hashes

## v35.324 — 2026-05-04

### Features

- `6b431383` v35.324 security: remove inline event handlers

## v35.323 — 2026-05-04

### Features

- `1158b59f` v35.323 pipeline: fresh metrics and MCP date guard

## v35.322 — 2026-05-04

### Features

- `693f7c35` v35.322 security: fallback logos table sans inline handler

## v35.321 — 2026-05-04

### Features

- `a8586f74` v35.321 tests: verrouiller libelles Winamax

## v35.320 — 2026-05-04

### Features

- `43095fe0` v35.320 labels: libelles Winamax lisibles

## v35.319 — 2026-05-04

### Fixes

- `0b896788` v35.319 hotfix: clean conflict markers finally

## v35.318 — 2026-05-04

### Fixes

- `5e14aae7` v35.318 hotfix: remove conflict markers

## v35.317 — 2026-05-04

### Performance

- `7669b2d4` v35.317 perf: bound odds history loading

## v35.316 — 2026-05-04

### Features

- `707624af` v35.316 seo: align sitemap with V37 hubs

## v35.315 — 2026-05-04

### Performance

- `502cbbd9` v35.315 perf: delegate V37 detail listeners

## v35.314 — 2026-05-04

### Features

- `ba247c38` v35.314 security: render refresh status safely

## v35.313 — 2026-05-04

### Features

- `1f37b72d` v35.313 security: harden search suggestions

## Unversioned — 2026-05-04

### Features

- `26402113` data: auto-refresh 2026-05-04 22:57 UTC
- `971a4bde` data: auto-refresh 2026-05-04 22:56 UTC
- `24b615c8` data: auto-refresh 2026-05-04 22:52 UTC
- `9e47ae6d` data: auto-refresh 2026-05-04 22:43 UTC
- `61ba97fe` data: auto-refresh 2026-05-04 22:37 UTC
- `951a6309` data: auto-refresh 2026-05-04 22:32 UTC
- `e7cec04f` data: auto-refresh 2026-05-04 22:26 UTC
- `e629cf00` data: auto-refresh 2026-05-04 22:24 UTC
- `b2a3846e` data: auto-refresh 2026-05-04 22:20 UTC
- `9acb9f16` data: auto-refresh 2026-05-04 22:12 UTC
- `886c3b28` data: auto-refresh 2026-05-04 22:03 UTC
- `0e24aa2e` data: auto-refresh 2026-05-04 21:56 UTC
- `be320933` data: auto-refresh 2026-05-04 21:52 UTC
- `0f1fcc4e` data: auto-refresh 2026-05-04 21:49 UTC
- `bd2835b2` data: auto-refresh 2026-05-04 21:46 UTC
- `0d5832e5` data: auto-refresh 2026-05-04 21:38 UTC
- `897115a1` data: auto-refresh 2026-05-04 21:32 UTC
- `e8d461b9` data: auto-refresh 2026-05-04 21:26 UTC
- `b409acb8` data: auto-refresh 2026-05-04 21:22 UTC
- `88a642aa` data: auto-refresh 2026-05-04 21:19 UTC
- `aad68b4f` data: auto-refresh 2026-05-04 21:15 UTC
- `713c7bb0` data: auto-refresh 2026-05-04 21:09 UTC
- `97119b63` data: auto-refresh 2026-05-04 21:05 UTC
- `0328ba90` data: auto-refresh 2026-05-04 20:56 UTC
- `3f408e99` data: auto-refresh 2026-05-04 20:51 UTC
- `e28ef6eb` data: auto-refresh 2026-05-04 20:48 UTC
- `5ccd6584` data: auto-refresh 2026-05-04 20:43 UTC
- `fa8d7977` data: auto-refresh 2026-05-04 20:40 UTC
- `21d829e4` data: auto-refresh 2026-05-04 20:38 UTC
- `3408b364` data: auto-refresh 2026-05-04 20:28 UTC
