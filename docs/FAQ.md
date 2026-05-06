# FAQ

Questions fréquentes, groupées par thème.

## Modèle

### Comment choisir un pari ?

Lis d'abord le score qualité, puis le tier, puis la cote. Le détail modal explique les signaux et les risques.

### Pourquoi le score qualité n'est pas une probabilité ?

Le score qualité agrège edge, fraîcheur, stabilité, historique et signaux. La probabilité reste affichée séparément.

### Pourquoi un pick peut-il disparaître ?

Un match passé, une donnée stale ou une incohérence marché peut le retirer du tableau actionnable.

### Que signifie edge ?

L'edge mesure l'écart entre la probabilité modèle et la probabilité implicite de la cote.

### Un edge élevé suffit-il ?

Non. Il faut aussi vérifier confiance, marché, cohérence et fraîcheur data.

### Pourquoi limiter les edges extrêmes ?

Pour éviter qu'une cote ou une proba corrompue fasse croire à une opportunité irréaliste.

### Que mesure le Brier ?

La calibration des probabilités. Plus il est bas, plus les probabilités annoncées sont honnêtes.

### Qu'est-ce que CLV ?

La Closing Line Value compare la cote prise à la cote de clôture.

### Pourquoi faire du backtest ?

Pour vérifier que les règles auraient tenu sur des données passées.

### Que veut dire drift ?

Un changement de distribution ou de performance qui rend les anciens réglages moins fiables.

## Données

### Pourquoi le footer indique données anciennes ?

Parce que `data.generated_at` dépasse le seuil de fraîcheur attendu.

### Pourquoi le pipeline peut être en warning ?

Une source annexe peut être lente ou partielle sans bloquer toute la page.

### Winamax exact veut dire quoi ?

Le match est précisément identifié chez Winamax avec une cote actionnable.

### Cote indicative veut dire quoi ?

La cote vient d'une source de comparaison et demande une vérification avant action.

### Que faire si le tableau est vide ?

Ouvrir `?debug=1`, lire les compteurs et vérifier la fraîcheur dans Profil.

### Où voir les sources ?

Page Santé/Profil et docs Data sources.

### Pourquoi garder un historique ?

Pour auditer les résultats passés et éviter que la rolling window efface le contexte.

### Qu'est-ce que la quarantaine data ?

Une zone où les événements invalides sont isolés au lieu de polluer le modèle.

### Pourquoi plusieurs IDs pour un match ?

ESPN, Winamax et sidecars peuvent nommer le même match différemment.

### Pourquoi les horaires peuvent bouger ?

Fuseau horaire, report ou merge incomplet peuvent décaler l'affichage.

## Paris

### Qu'est-ce qu'un tier Sûr ?

Un pick à cote basse et confiance élevée, mais jamais garanti.

### Qu'est-ce qu'un outsider ?

Un pari à cote élevée, plus rare, qui exige un edge plus fort.

### Comment gérer la bankroll ?

Utiliser une mise fixe ou Kelly fractionné, jamais une mise émotionnelle.

### Pourquoi éviter les montantes trop longues ?

La probabilité cumulée chute vite quand les jambes s'ajoutent.

### Qu'est-ce qu'un void ?

Un pari annulé/remboursé, souvent match reporté ou ligne push.

### Pourquoi suivre ses paris ?

Pour comparer la performance personnelle au modèle.

### Que veut dire ROI flat ?

Profit divisé par mises avec une unité constante.

### Que veut dire PNL Kelly ?

Profit simulé avec une stratégie Kelly prudente.

### Pourquoi une cote 1.10 peut être risquée ?

Le gain est faible ; une seule erreur peut effacer beaucoup de petites victoires.

### Pourquoi le marché peut avoir raison ?

Les cotes agrègent beaucoup d'information publique et sharp.

## Technique

### Où est le frontend ?

`pronostics.html`, `legacy-app.js`, `app.js` et les modules `src/`.

### Où est la pipeline ?

Dans `scripts/` et `.github/workflows/refresh.yml`.

### Comment tester vite ?

Syntaxe JS, drift pipeline, data integrity, puis Playwright ciblé.

### Pourquoi un Service Worker ?

Pour accélérer et fournir un fallback offline/stale contrôlé.

### Pourquoi bumper le cache ?

Pour forcer les navigateurs à prendre la nouvelle version.

### Pourquoi un changelog auto ?

Pour relier les commits aux versions visibles.

### Pourquoi des ADRs ?

Pour garder la mémoire des décisions techniques.

### Pourquoi une wiki interne ?

Pour transmettre le projet sans relire tout le code.

### Comment ajouter une source ?

Créer fetcher, patcher, health tracking, cadence et tests.

### Comment ajouter une page ?

Créer rendu, route, test, lien et documentation.

## Légal

### Le site place-t-il des paris ?

Non, il affiche des recommandations et suivis locaux selon les sections existantes.

### Y a-t-il une affiliation Winamax ?

Non, les liens sont indicatifs sans tag d'affiliation.

### Les données personnelles sortent-elles ?

Les préférences et suivis restent dans ton navigateur.

### Comment effacer mes données ?

Utiliser le bouton Profil ou vider le localStorage du domaine.

### Les QR codes uploadent-ils quelque chose ?

Non, ils encodent localement un fragment d'URL.

### Le site utilise-t-il des cookies tiers ?

Non.

### Pourquoi un disclaimer 18+ ?

Parce que les paris comportent un risque financier réel.

### Les résultats sont-ils garantis ?

Non, le modèle fournit des probabilités, pas des certitudes.

### Puis-je auditer le code ?

Oui, le dépôt est public.

### Que voit GitHub Pages ?

Comme hébergeur, GitHub peut voir des logs techniques, pas les données locales.

## Usage

### Comment relancer le tutoriel ?

Dans Profil ou via le bouton aide global.

### Comment chercher dans la doc ?

Depuis l'Académie ou le bouton aide, la base de connaissance filtre les docs.

### Comment lire une modal détail ?

Synthèse d'abord, puis signaux, cotes, historique et risques.

### Comment construire un combiné ?

Privilégier des jambes peu corrélées et un risque total maîtrisé.

### Comment signaler un bug ?

Créer une issue GitHub avec capture, URL, version footer et panneau debug si utile.
