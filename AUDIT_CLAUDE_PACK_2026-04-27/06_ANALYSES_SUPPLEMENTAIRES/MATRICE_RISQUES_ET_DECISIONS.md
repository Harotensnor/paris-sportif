# Matrice risques et decisions

Cette matrice aide Claude a choisir, pas a appliquer automatiquement.

## Risque tres fort si la promesse produit est Winamax exact

Sujet : picks actionnables avec cote externe ou sans match Winamax exact.

Pourquoi c'est fort : c'est au coeur de la promesse utilisateur et de l'agent autonome.

Decision a prendre :

- bloquer strictement ;
- afficher en veille ;
- conserver temporairement avec badge ;
- ameliorer le mapping avant de bloquer.

## Risque fort mais moins visible

Sujet : page Sante trop verte.

Pourquoi : elle peut cacher un probleme reel a l'operateur.

Decision a prendre :

- Sante doit-elle etre un monitoring pipeline seulement ;
- ou un vrai garde-fou produit/actionnable ?

## Risque UX moyen/fort

Sujet : modal detail.

Pourquoi : elle sert a comprendre pourquoi parier. Si elle est confuse, la confiance baisse.

Decision a prendre :

- patch minimal ;
- refonte onglets ;
- attendre apres securisation Winamax.

## Risque navigation moyen

Sujet : hash/currentPage.

Pourquoi : partage de liens, refresh, retour navigateur.

Decision a prendre :

- corriger maintenant si simple ;
- attendre si le router doit etre refondu plus largement.

## Risque scoring moyen

Sujet : retired/walkover/scores null.

Pourquoi : peut fausser le bilan agent et les stats de confiance.

Decision a prendre :

- void ;
- exclusion ;
- regle bookmaker ;
- regle ESPN winner.

## Risque maintenance moyen

Sujet : app.js dense, CSS fragile.

Pourquoi : chaque patch augmente le risque de regressions.

Decision a prendre :

- tests avant patch ;
- extraction progressive ;
- refactor plus tard.

## Risque PWA/cache moyen

Sujet : service worker et doublons de chargement.

Pourquoi : peut creer des versions fantomes et du bruit.

Decision a prendre :

- ne toucher que si necessaire ;
- nettoyer avec cache bump ;
- reporter apres corrections produit.

