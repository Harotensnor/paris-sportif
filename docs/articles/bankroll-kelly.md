# Bankroll et Kelly

La bankroll est l'argent reserve aux paris. Elle doit etre separee du reste. Sans separation, chaque perte devient emotionnelle et chaque gain donne envie d'augmenter trop vite. Le site raisonne donc comme un agent : une cagnotte, des mises calculees, des limites, et un refus clair des paris sans edge.

La methode Kelly sert a dimensionner une mise en fonction de l'avantage estime. Elle repond a la question : "si la cote est favorable, quelle part de ma bankroll dois-je engager ?" La formule brute est agressive. Elle maximise la croissance theorique a long terme, mais elle peut provoquer de gros drawdowns si les probabilites sont un peu trop optimistes. Dans un contexte de pari sportif, ou la data est imparfaite, Kelly brut est rarement raisonnable.

Le site utilise une logique de Kelly fractionne. Par exemple, Kelly 25% signifie que l'on ne joue qu'un quart de la mise theorique. Cela reduit la vitesse de croissance, mais augmente beaucoup la robustesse. L'objectif n'est pas de devenir riche en trois paris. L'objectif est de survivre assez longtemps pour que l'edge se manifeste.

Exemple : bankroll 100 euros, cote 2.00, probabilite modele 56%. Le pari a une value. Kelly brut peut proposer une mise significative. En Kelly 25%, la mise devient plus calme. Si le pari perd, la bankroll reste jouable. Si plusieurs bons paris perdent de suite, le systeme ne s'effondre pas.

Le cap de mise est un deuxieme garde-fou. Meme si Kelly propose trop, le site limite la mise par pari. Un cap a 5% ou 10% evite qu'un seul match decide de la semaine. Le cap daily aggregate limite aussi l'exposition totale sur une journee. C'est essentiel quand le tableau affiche beaucoup de picks : voir 80 opportunites ne veut pas dire jouer 80 mises pleines.

La taille de mise doit suivre le risque du tier :

1. Tier Sur : mise potentiellement plus stable, mais edge souvent plus petit.
2. Tier Solide : bon terrain pour une strategie reguliere.
3. Tier Valeur : mise adaptee, variance moyenne.
4. Big Odds : mise plus petite, car variance forte.
5. Outsider : mise tres petite ou simple observation.

Une erreur classique consiste a augmenter la mise apres une perte pour "se refaire". C'est le debut du tilt. Le streak detector sert a detecter ce comportement : plusieurs pertes consecutives, puis des mises qui grossissent. Quand cela arrive, le meilleur conseil est souvent de faire une pause. Une bankroll se protege d'abord contre son proprietaire.

Le ROI doit etre lu avec la mise. Un ROI flat positif dit que les picks sont bons a mise constante. Un ROI bankroll positif dit que la strategie de staking a bien transforme ces picks en croissance. Si le ROI flat est bon mais le ROI bankroll mauvais, les mises sont peut-etre mal taillees. Si le ROI bankroll est bon mais le ROI flat mauvais, il peut y avoir un hasard de sizing ou un echantillon trop petit.

La CLV aide a juger la qualite sans attendre des milliers de resultats. Si le site prend regulierement de meilleures cotes que la closing line, les picks ont probablement une vraie value. Cela ne remplace pas le ROI, mais c'est un indicateur plus rapide. Une strategie peut etre en drawdown tout en battant la closing line : dans ce cas, il faut souvent reduire la taille, pas jeter le modele.

La gestion de bankroll doit aussi respecter le profil de Theo. Si son historique montre qu'il performe mieux sur les cotes 1.80-2.50, le site peut recommander une exposition plus forte sur ce bucket et reduire les outsiders. Si une ligue donne un ROI negatif, elle peut etre masquee ou jouee en micro-mise. La personnalisation ne change pas les mathematiques, elle adapte le risque.

Regle pratique : ne jamais jouer un pari parce qu'il est dans le tableau. Le tableau propose. Le score explique. La bankroll decide. Un pari sans edge positif, sans data fraiche, ou avec signaux opposes doit rester dehors, meme s'il "sent bon". Le staking est le dernier filtre entre l'analyse et l'argent.

Une bonne bankroll n'a rien de spectaculaire. Elle progresse par petites decisions coherentes. Elle accepte les pertes normales, refuse les coups de tete et mesure la performance avec des chiffres stables. C'est moins excitant qu'un all-in, mais c'est exactement ce qui permet de rester dans le jeu.

## Exemple de sequence reelle

Supposons une bankroll de 100 euros. Le site propose cinq paris : deux tiers Surs, deux Solides et un Big Odds. Les deux tiers Surs ont des cotes basses et un edge modeste. Les Solides ont un meilleur ratio risque/gain. Le Big Odds a un edge fort, mais une probabilite plus faible. Une gestion naive jouerait 10 euros sur chaque pari. Une gestion bankroll jouera peut-etre 3 euros, 4 euros, 4 euros, 3 euros et 1 euro.

Si le Big Odds perd, ce n'est pas grave. Il etait taille pour perdre souvent. Si un Sur perd, ce n'est pas une catastrophe non plus, car le cap protege la bankroll. L'important est que la taille de chaque mise corresponde au risque et a la value, pas a l'envie du moment.

## Pourquoi le plancher peut etre dangereux

Un plancher de mise, par exemple 0.10 euro, evite les positions ridiculement petites. Mais il peut devenir dangereux si trop de picks tres faibles passent le filtre. Si 80 paris sont joues au plancher, l'exposition totale peut devenir importante. Le systeme doit donc avoir un cap daily aggregate et un abstain strict sur les edges negatifs. Le plancher ne doit jamais transformer un pari non rentable en mise forcee.

## Tilt et drawdown

Le drawdown mesure la baisse depuis le plus haut de bankroll. Une strategie rentable peut avoir un drawdown. Le probleme commence quand le joueur change la strategie pendant ce drawdown. Apres trois pertes, il augmente la mise. Apres quatre pertes, il sort du plan. Apres cinq pertes, il cherche un outsider pour recuperer. Le tilt detector sert a detecter cette derive.

Un bon message n'est pas moralisateur. Il doit etre pratique : "Trois pertes consecutives et mises en hausse. Pause recommandee. Reviens au sizing normal demain." La protection de bankroll est aussi une protection cognitive.

## Adapter Kelly au niveau de confiance

Kelly suppose que la probabilite est correcte. Or elle ne l'est jamais parfaitement. Plus l'intervalle de confiance est large, plus Kelly doit etre reduit. Un pick a 68% avec CI 65-72% peut supporter une mise normale. Un pick a 68% avec CI 52-81% doit etre reduit ou ignore. La taille de mise doit donc integrer l'incertitude, pas seulement l'edge.

Les signaux contradictoires reduisent aussi le sizing. Si une equipe a un bon edge mais plusieurs angles contre, le pari peut rester visible avec un tag prudence. Mais la mise suggeree doit descendre. C'est la difference entre afficher une information et recommander une exposition.

## Strategie par profil

Le profil de Theo peut changer la repartition. Si son historique montre une bonne performance sur les cotes 1.80-2.50, le site peut suggerer de concentrer les mises sur cette zone. Si les outsiders ont un ROI negatif ou un drawdown trop fort, ils peuvent passer en mode observation. La personnalisation doit rester rationnelle : elle adapte la strategie a ses resultats, pas a ses preferences du jour.

## Checklist bankroll

Avant de valider une journee :

1. Bankroll separee et montant confirme.
2. Cap par pari actif.
3. Cap journalier actif.
4. Kelly fractionne, jamais brut.
5. Aucun pari avec edge negatif.
6. Pas de sur-exposition sur un meme match.
7. Streak detector calme.
8. Outsiders tailles petit.
9. CLV suivie apres coup.
10. Aucune mise augmentee pour recuperer une perte.

La bankroll est le frein qui permet au moteur de durer. Sans elle, meme un bon modele finit par exploser. Avec elle, les erreurs restent petites et les edges ont le temps de s'exprimer.

## Mise fixe, Kelly et hybride

Trois approches existent. La mise fixe est simple : chaque pari vaut 1 unite. Elle est excellente pour mesurer le modele, mais elle ne profite pas davantage des meilleurs edges. Kelly ajuste la mise a l'avantage, mais peut etre trop sensible aux erreurs de probabilite. L'approche hybride combine les deux : une base fixe, un multiplicateur limite par le score d'opportunite, puis un cap strict.

Cette approche hybride est souvent la plus confortable pour un utilisateur. Elle garde une logique math, mais evite les variations brutales. Par exemple, un pick score 82 peut recevoir 1.3 unite, un pick score 65 recoit 0.8 unite, et un Outsider recoit 0.3 unite. Les differences existent, mais la bankroll ne depend pas d'un seul calcul.

## Quand reduire les mises

Le site doit reduire automatiquement les mises quand :

1. La data est stale.
2. Les signaux sont mitigés.
3. L'intervalle de confiance est large.
4. La ligue a un Brier faible.
5. Le marche est marque `watch`.
6. La cote a bouge contre le pick.
7. Theo est en streak de pertes.
8. Plusieurs picks du meme match sont affiches.

Cette reduction n'est pas un manque de conviction. C'est une facon d'integrer l'incertitude. Le pari sportif n'est pas un exercice ou il faut avoir raison fort. C'est un exercice ou il faut survivre aux moments ou l'on a tort.

## Comment analyser une mauvaise semaine

Une mauvaise semaine doit etre decoupee calmement. Combien de picks avaient une CLV positive ? Les pertes viennent-elles d'un sport, d'une ligue, d'un tier ou d'un type de marche ? Les mises etaient-elles plus grosses sur les mauvais segments ? Le drawdown est-il normal par rapport a la variance attendue ?

Si la CLV reste positive et que les segments faibles sont limites, il faut souvent continuer avec des mises reduites. Si la CLV devient negative et que les signaux se contredisent, il faut declasser les picks, recalibrer, ou passer en abstain. La bankroll donne le temps de faire cette analyse avant que l'argent ne force une mauvaise decision.
