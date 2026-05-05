# Edge & Value

L'edge est le coeur d'un bon pari. Ce n'est pas une intuition vague, ni un simple "je pense que cette equipe va gagner". C'est l'ecart entre la probabilite estimee par le modele et la probabilite implicite de la cote proposee par le bookmaker. Quand cet ecart est positif apres marge, on parle de value. Sans edge, meme une selection qui gagne souvent peut perdre de l'argent sur la duree.

Exemple simple : une cote a 2.00 implique environ 50% de probabilite avant marge. Si le modele estime que l'evenement a 56% de chances d'arriver, il y a une value theorique. La cote paie comme si le pari etait a pile ou face, alors que le modele pense que le cote choisi gagne un peu plus d'une fois sur deux. A l'inverse, une cote a 1.30 peut etre tres probable, mais si l'evenement vaut vraiment 72% et non 77%, la value est negative.

Le site doit donc separer deux idees qui sont souvent confondues : la confiance et la rentabilite. La confiance dit "quelle est la probabilite que ca passe". L'edge dit "est-ce que la cote paie assez pour ce risque". Un favori a 82% de confiance peut etre un mauvais pari si la cote est trop basse. Un outsider a 34% peut etre excellent si la cote paie comme s'il n'avait que 25% de chances.

La formule de base est :

`edge = probabilite_modele - probabilite_marche`

La probabilite de marche se calcule avec `1 / cote`, puis on ajuste la marge si on compare plusieurs issues d'un meme marche. Pour une lecture rapide, le tableau affiche l'edge en points. Un edge de +6% veut dire que le modele voit environ six points de probabilite de plus que le prix implicite.

Un autre indicateur utile est l'EV, ou esperance de gain :

`EV = probabilite_modele * cote - 1`

Si l'EV est positive, chaque euro mise a une esperance de profit positive. Cela ne garantit pas que le pari va gagner aujourd'hui. Cela signifie seulement que, repete sur un grand nombre de cas similaires, le prix est favorable. Le pari sportif rentable vit dans cette difference entre court terme bruyant et long terme mesurable.

La value ne doit jamais etre lue seule. Un edge enorme sur une cote exotique peut venir d'une data faible, d'un marche mal modele, d'une equipe mal mappee, d'une blessure non integree, ou d'un match trop proche du coup d'envoi. C'est pour cela que le score d'opportunite combine edge, confiance, fraicheur data, stabilite des signaux, biais de ligue et timing de cote. Un bon edge avec signaux contradictoires doit devenir un "prudence", pas un feu vert automatique.

Les cinq tiers du site utilisent cette logique. Le tier Sur privilegie la confiance et accepte des edges modestes. Le tier Solide cherche l'equilibre. Le tier Valeur devient plus exigeant sur l'edge. Les Big Odds et Outsiders demandent des edges plus hauts parce que la variance est plus violente. Une cote a 5.00 peut perdre quatre fois de suite tout en restant bonne, mais elle doit etre payee assez cher pour justifier cette patience.

La discipline consiste aussi a refuser les faux bons plans. Le double chance "12" peut avoir 76% de win rate, mais si la cote moyenne est 1.20, le retour attendu peut etre negatif. Gagner souvent n'est pas gagner bien. Le site marque donc certains patterns comme `low_value` meme quand le taux de reussite brut semble joli. C'est ce type de garde-fou qui evite de confondre securite psychologique et rentabilite.

Pour juger un pick, il faut lire dans cet ordre :

1. Le marche est-il comprehensible ?
2. La cote est-elle dans un tier coherent ?
3. L'edge est-il positif apres les filtres ?
4. Les signaux pour et contre sont-ils alignes ?
5. La data est-elle fraiche ?
6. Le timing de mise est-il favorable ?
7. Le pari correspond-il au profil de risque de Theo ?

Un pari peut etre bon et ne pas etre joue. Si la data est trop ancienne, si le match vient de commencer, si les signaux se neutralisent, ou si la cote a deja trop bouge, le meilleur choix est parfois de ne rien faire. L'abstain n'est pas un echec du modele : c'est une preuve de maturite.

La CLV, ou Closing Line Value, permet ensuite de verifier si les edges etaient reels. Si le site recommande une cote a 2.10 et que la cote cloture a 1.95, le marche a fini par aller dans le meme sens que le modele. Meme si le pari perd, c'est souvent bon signe. A long terme, battre la closing line est l'une des mesures les plus solides d'un avantage durable.

En pratique, l'objectif n'est pas de trouver le pari "sur". Il n'existe pas. L'objectif est de trouver les prix mal ajustes, de les filtrer avec la qualite data, puis de miser avec une taille adaptee. Edge, value, CLV et discipline forment le noyau de cette approche. Tout le reste du site sert a rendre cette lecture plus rapide et plus fiable.

## Cas pratique : favori trop court

Imaginons un match ou le favori est cote 1.32. Le public voit une grosse equipe, une serie de victoires et un adversaire faible. Le modele donne 74% de chances au favori. La cote 1.32 implique environ 75.8% avant marge. Meme si le favori reste le resultat le plus probable, le pari est mauvais : le bookmaker paie moins que le risque reel. C'est exactement le genre de pari que beaucoup de joueurs appellent "sur", alors qu'il detruit lentement le ROI.

Dans ce cas, le bon angle peut etre ailleurs : handicap adverse, total de buts, BTTS, ou abstain. Le site ne doit pas forcer un pari parce qu'un match est populaire. Il doit chercher le marche ou le prix est faux. Parfois, la meilleure decision sur un match tres visible est de ne rien jouer.

## Cas pratique : outsider sous-cote

Autre match : outsider cote 4.20, donc environ 23.8% implicite. Le modele le place a 29%. L'edge est reel, mais le pari reste perdant la plupart du temps. Il faut donc verifier la stabilite des signaux : blessure du favori, calendrier charge, voyage, meteo, historique tactique, mouvement de cote. Si trois signaux independants vont dans le meme sens, l'outsider peut entrer dans les picks. Si l'edge vient d'une seule source fragile, il doit rester en observation.

Cette difference est essentielle. Un outsider value n'est pas un pari "qui va passer". C'est un pari dont la cote est trop haute par rapport au risque. Le langage doit rester clair pour eviter la fausse promesse.

## Erreurs frequentes

La premiere erreur est de confondre edge et certitude. Un edge positif ne garantit pas le resultat. Il garantit seulement que le prix semble favorable. La deuxieme erreur est de regarder seulement la cote. Une cote haute n'est pas une value si la probabilite est encore plus basse. La troisieme erreur est de jouer un edge calcule sur une data stale. Si les lineups, blessures ou cotes ne sont plus fraiches, l'edge peut etre obsolete.

La quatrieme erreur est de doubler les paris equivalents. En football, un 1N2 domicile et un handicap -0.5 domicile racontent souvent la meme chose. Les jouer ensemble augmente l'exposition sans ajouter de diversification. Le site doit donc dedoublonner ou grouper visuellement ces marches.

La cinquieme erreur est de poursuivre les pertes. Si l'edge est bon, il faut accepter les pertes normales. Si l'edge n'est plus bon, il faut arreter. Augmenter les mises pour recuperer plus vite transforme une strategie mathematique en reaction emotionnelle.

## Checklist avant de jouer

Avant de cliquer vers Winamax, la checklist minimale est :

1. Le libelle du pari est compris sans ambiguite.
2. La cote affichee correspond bien au pari dans la modal.
3. L'edge est positif et coherent avec le tier.
4. Le score d'opportunite est explique dans le tooltip.
5. Les signaux pour dominent les signaux contre.
6. La data n'est pas marquee stale.
7. Le marche n'est pas signale comme incertain.
8. La taille de mise respecte la bankroll.
9. Le pari ne duplique pas une exposition deja prise.
10. La CLV attendue ou le timing ne conseille pas d'attendre.

Cette checklist peut sembler lente, mais elle devient automatique. Elle transforme le tableau dense en outil de decision, pas en machine a clics.

## Ce que le site doit afficher

Un bon affichage d'edge ne doit pas etre cryptique. Il doit dire : "le modele estime 58%, la cote paie 52%, edge +6 points, data fraiche, signaux stables." Si un element manque, il doit le dire aussi. Le but n'est pas de vendre le pick, mais de donner assez d'information pour que Theo comprenne pourquoi il existe.

La value est un concept simple mais exigeant. Elle demande de penser en probabilites, pas en certitudes. Elle demande de juger une decision avant le resultat. Elle demande d'accepter qu'un bon pari peut perdre et qu'un mauvais pari peut gagner. C'est cette discipline qui separe un site de pronostics amusant d'un vrai outil de betting.
