# Paris Sportif Desktop - Guide utilisateur

Paris Sportif Desktop est une application locale pour préparer, suivre et analyser tes paris Winamax. Elle ne place jamais un pari a ta place : elle te dit quoi selectionner, avec quelle cote, quelle mise prudente, et pourquoi.

## 1. Premier lancement

Au premier demarrage, l'app te demande les reglages essentiels :

- bankroll de depart ;
- sports suivis ;
- niveau de prudence ;
- mode demo si tu veux tester sans risque.

Le mode standard garde trois vues : `Picks`, `Bilan`, `Reglages`. Les diagnostics techniques restent caches dans `Avance` tant que le Mode expert est desactive.

## 2. Routine quotidienne

Ouvre d'abord `Picks`.

1. Lis le bandeau : fraicheur des donnees, bankroll, P&L du jour.
2. Regarde le `TOP PICK` si disponible.
3. Parcours les sections horaires : dans l'heure, dans les 3 heures, aujourd'hui, cette nuit, demain.
4. Pour chaque carte, lis seulement quatre lignes :
   - `PARI` : ce que tu dois choisir chez Winamax ;
   - `COTE` : la cote Winamax utilisee ;
   - `MISE` : la mise prudente suggeree ;
   - `Pourquoi` : la raison courte.
5. Clique `Je mise` pour suivre le pari dans l'app.
6. Clique `Ouvrir Winamax` pour confirmer manuellement sur Winamax.
7. Avant un pari important, ouvre la fiche enrichie : elle regroupe le texte narratif, les compositions, la forme, les joueurs cles, la meteo, le H2H et les sources verifiees.

Si tu vois `Modèle trop strict aujourd'hui`, ce n'est pas un bug automatique. L'app a trouve beaucoup de matchs mais pas assez de signaux simples assez propres. Ouvre le diagnostic si tu veux voir le funnel exact.

## 3. Marches simples et marches avances

Par defaut, l'app affiche les marches simples :

- vainqueur du match ;
- plus / moins de buts ;
- les deux equipes marquent ;
- buteur, uniquement si la cote Winamax reelle est confirmee ;
- vainqueur a la mi-temps.

Les handicaps, jeux tennis, scores exacts, cartons, corners et autres marches plus complexes restent caches en mode standard. Active le Mode expert seulement si tu veux volontairement les revoir.

## 4. Comprendre les badges

- `Fiable` : le pick respecte les garde-fous du modele.
- `A surveiller` : signal positif, mais pas assez propre pour proposer une mise.
- `Ecarte` : signal insuffisant ou risque trop eleve.
- `Tendance forte` : segment recemment performant.
- `Tendance froide` : segment a traiter avec prudence.

Un pick sans bouton `Je mise` ne doit pas etre joue automatiquement. Il sert a comprendre le programme du jour. Pour les buteurs, l'app exige une cote Winamax reelle : une cote theorique seule ne suffit pas.

## 5. Lire une fiche enrichie

La fiche match sert a te rassurer sans jargon.

- `PARI / COTE / MISE` : le ticket exact a reproduire chez Winamax.
- `Pourquoi ce pari` : 4 a 6 phrases factuelles avec les chiffres disponibles.
- `Joueurs cles` : forme, xG/xA, tirs, passes cles, aces, break points ou stats sportives selon le sport.
- `Analyse tactique` : surtout pour le foot, les duels et styles qui expliquent le sens du pick.
- `Sources enrichies` et `News watcher` : ce qui a ete verifie, ce qui est indisponible, et ce qui doit etre relance avant le coup d'envoi.

Si une source est absente, l'app l'indique clairement. Elle ne transforme pas une absence de donnee en preuve positive.

## 6. Bilan et bankroll

La vue `Bilan` regroupe :

- P&L total ;
- ROI ;
- win rate ;
- historique des paris ;
- simulation 30 jours ;
- decomposition par sport, ligue, marche, horaire et cote ;
- strategies sauvegardees ;
- comparaison entre ton suivi reel et le modele.

Dans `Reglages > Bankroll`, tu peux ajouter depots et retraits. L'app separe le ROI bankroll du ROI des paris pour eviter les lectures trompeuses.

## 7. Strategies

Quand tu filtres une selection utile dans `Picks`, clique `Sauver cette selection`.

Tu peux ensuite :

- appliquer la strategie en un clic ;
- comparer son ROI avec les autres ;
- supprimer une strategie si elle n'est plus utile.

Les strategies ne changent pas le modele. Elles t'aident a suivre tes habitudes.

## 8. Favoris

Dans `Reglages > Favoris`, ajoute les equipes ou joueurs que tu veux suivre.

Quand un favori a un match Winamax a venir, l'app peut le remonter dans `Picks`, meme si ce n'est pas le meilleur pick global. C'est pratique pour ne pas rater un match que tu surveilles.

## 9. Alertes

Les alertes disponibles couvrent :

- pick imminent ;
- nouveau top pick ;
- cote qui bouge ;
- settlement ;
- stop-loss ;
- anti-tilt ;
- webhook mobile.

Garde les alertes importantes actives, mais evite de tout activer si tu veux une experience calme.

## 10. Mode demo

Le mode demo utilise une bankroll virtuelle separee.

Utilise-le pour :

- faire le tour guide ;
- tester `Je mise` ;
- verifier le P&L ;
- comprendre l'historique sans toucher a ton vrai suivi ;
- apprendre a lire une fiche enrichie avec le texte narratif et les joueurs cles.

Tu peux le reinitialiser depuis les reglages.

## 11. Auto-tracking supervise

Cette option est cachee en Mode expert. Elle peut suivre automatiquement des paris dans l'app selon tes regles, mais elle ne place jamais le pari reel chez Winamax.

Utilise d'abord le mode `Dry-run` pour voir ce que les regles auraient suivi. Active le tracking reel local seulement quand tu comprends bien les limites.

Le bouton `Stopper l'auto-tracking` coupe tout immediatement.

## 11. Reconciliation Winamax

Dans `Reglages > Bankroll`, colle le texte de la page `Mes paris` Winamax.

L'app tente de rapprocher :

- les paris Winamax ;
- les paris suivis localement ;
- les differences de montant ;
- les paris oublies dans l'app.

Cette reconciliation reste locale.

## 12. Recherche

La vue `Recherche` permet de chercher :

- une equipe ;
- un joueur ;
- une ligue.

Tu peux consulter les prochains matchs Winamax, la forme recente, les blessures locales et les performances historiques du modele. La comparaison cote a cote aide a choisir entre deux matchs ou deux equipes.

## 13. Mode expert

Le Mode expert ajoute :

- pipeline et logs ;
- audit Winamax ;
- coverage 24h ;
- todayFunnel ;
- performance modele ;
- Trading Desk ;
- auto-tracking ;
- rapports de stress ;
- bug reporting ;
- auto-update.

N'active ce mode que si tu veux diagnostiquer ou piloter finement l'app.

## 14. Diagnostic Winamax

Le diagnostic `qa:winamax-audit` indique :

- sports disponibles dans le catalogue ;
- matchs bookables aujourd'hui ;
- familles de marches detectees ;
- familles exploitees ou dormantes ;
- boosts et promos detectes ;
- conversion events vers picks affiches.

Depuis le projet :

```powershell
npm --prefix desktop run qa:winamax-audit
```

## 15. Donnees anciennes ou trop peu de picks

Si les donnees sont anciennes, l'app affiche un bandeau de fraicheur.

Si beaucoup de matchs Winamax existent mais peu de picks simples ressortent, l'app affiche `Modèle trop strict aujourd'hui`, `Aucun pari prêt aujourd'hui` ou `Volume prêt limité aujourd'hui`. Dans ce cas :

1. lance un refresh ;
2. ouvre `Avance > Pipeline` ;
3. lis le funnel ;
4. n'ouvre les marches avances que si tu acceptes volontairement plus de complexite.

Depuis v1.4.0, les segments avec peu d'historique ne sont plus penalises automatiquement si le signal est fort : l'app peut valider un pari avec peu de sample quand l'avantage, la confiance et la cote restent dans une zone prudente.

Depuis v1.5.0, l'app peut aussi afficher un signal `Confiance limitee` quand la cote Winamax est claire mais que le contexte local reste leger. Ce signal aide a ne pas rater un match, mais il ne doit pas etre joue tant que le bouton `Je mise` n'apparait pas.

## 16. Sauvegarde et restauration

Exporte ton profil regulierement depuis `Reglages > Profil local`.

Le fichier contient :

- preferences ;
- bankroll ;
- paris suivis ;
- notes ;
- tags ;
- alertes ;
- strategies.

Les backups automatiques restent dans `desktop/state/backups/`.

## 17. Depannage

- L'app ne demarre pas : relance une seule instance, puis consulte `Avance > Logs`.
- Aucun pick : verifie la fraicheur des donnees et le funnel.
- Winamax ne s'ouvre pas : certains evenements n'ont pas de lien direct, ouvre le match manuellement.
- Notifications absentes : verifie les permissions Windows et le webhook.
- P&L incoherent : verifie les settlements et la reconciliation Winamax.
- Profil abime : importe un export ou restaure un backup local.

## 18. Bon usage

L'app sert a etre plus discipline, pas a miser plus vite.

Une bonne routine :

1. lis le top pick ;
2. choisis seulement les picks avec mise claire ;
3. respecte le budget jour ;
4. note les paris atypiques ;
5. regarde le bilan en fin de semaine ;
6. ajuste tes preferences avec calme.
