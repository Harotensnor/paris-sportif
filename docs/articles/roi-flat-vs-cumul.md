# ROI flat vs ROI cumule

Le ROI mesure la rentabilite. Pourtant, il existe plusieurs facons de le lire, et elles ne racontent pas toutes la meme histoire. Le ROI flat regarde ce qui se passerait si chaque pari etait joue avec la meme mise. Le ROI cumule, ou bankroll ROI, regarde l'evolution reelle de la bankroll avec les tailles de mises appliquees.

Le ROI flat est le plus propre pour juger la qualite des picks. Chaque pari compte pareil. Un outsider a 5.00 ne domine pas toute la courbe parce qu'il a recu une grosse mise, et un favori a 1.35 ne masque pas une mauvaise value simplement parce qu'il gagne souvent. C'est une mesure froide : a mise constante, les selections produisent-elles de l'argent ?

La formule est simple :

`ROI flat = profit flat / total mises flat`

Si 100 paris de 1 unite produisent +8 unites, le ROI flat est +8%. Cela permet de comparer des sports, des ligues, des marches ou des tiers sans etre pollue par la taille des mises. C'est utile pour dire "le modele est bon sur le tennis ATP" ou "les BTTS de cette ligue sont faibles".

Le ROI cumule integre la strategie de staking. Si le site joue plus gros les picks a forte confiance et plus petit les outsiders, le resultat bankroll depend a la fois des picks et des tailles de mise. C'est la mesure qui interesse l'argent reel, mais elle melange deux questions : les picks etaient-ils bons ? et les mises etaient-elles bien taillees ?

Un bon audit regarde donc les deux. Si le ROI flat est positif et le ROI cumule negatif, le probleme vient peut-etre du staking : trop d'exposition sur les mauvais buckets, Kelly trop agressif, cap daily mal regle, ou trop de mises sur des signaux incertains. Si le ROI flat est negatif et le ROI cumule positif, il faut se mefier : quelques gros gains peuvent cacher une selection moyenne.

Le win rate ne suffit jamais. Une strategie a 70% de win rate peut perdre si les cotes sont trop basses. Exemple : cote moyenne 1.25, win rate 70%. Le retour attendu est 0.70 * 1.25 = 0.875, donc perte moyenne. A l'inverse, une strategie a 38% peut gagner si la cote moyenne est 3.00. Le ROI est donc superieur au simple pourcentage de victoires.

Le site doit afficher les resultats par segment :

1. Par sport.
2. Par ligue.
3. Par marche.
4. Par tier.
5. Par bucket de cote.
6. Par periode.
7. Par statut de data.

Cette granularite evite les conclusions fausses. Un ROI global positif peut venir uniquement du foot top-5, pendant que la Liga MX ou certains props restent dangereux. Une periode recente peut etre meilleure qu'une periode ancienne si le modele a ete corrige. Le rapport doit donc montrer ce qui marche maintenant, pas seulement ce qui a marche dans une ancienne version.

Le ROI journalier est utile pour suivre le rythme. "Hier : 47 picks, 28 won, ROI +6.2%" donne une lecture rapide. Mais il faut garder en tete qu'une journee est bruyante. Le calendrier P&L heatmap aide a voir les series : beaucoup de petites journees vertes valent souvent mieux que deux gros jours verts et quinze jours rouges.

La CLV complete le tableau. Un ROI negatif sur quelques jours avec une CLV positive peut etre une variance normale. Un ROI positif avec une CLV negative peut etre un run chanceux. Les pros regardent la closing line parce qu'elle integre l'information de marche avant le coup d'envoi. Battre cette ligne de facon reguliere est un signe plus robuste que gagner un pari isole.

Pour Theo, la lecture pratique est :

1. Le ROI flat dit si les picks meritent confiance.
2. Le ROI cumule dit si la taille des mises est saine.
3. La CLV dit si le prix pris etait bon.
4. Le win rate sert a comprendre le confort psychologique, pas la rentabilite.

Il ne faut pas optimiser uniquement le ROI cumule. Cela pousse souvent a augmenter le risque trop vite. Il faut chercher un trio stable : ROI flat positif, CLV positive, drawdown acceptable. C'est moins brillant sur une capture, mais beaucoup plus fiable pour jouer toute la saison.

Enfin, il faut toujours regarder la taille de l'echantillon. Dix paris ne prouvent presque rien. Cinquante donnent une premiere indication. Cent commencent a parler. Plusieurs centaines par segment permettent de decider avec plus de calme. Le site doit donc marquer les petits echantillons comme `watch` ou `data_insufficient`, plutot que vendre une certitude inexistante.

## Exemple de lecture contradictoire

Imagine un mois avec ROI cumule +12% mais ROI flat -3%. Sur le papier, la bankroll monte. Pourtant, les picks moyens perdent a mise constante. Le gain vient peut-etre de deux grosses mises chanceuses. Ce n'est pas durable. Le bon diagnostic est de reduire l'euphorie, analyser les segments gagnants et verifier la CLV.

Inversement, un mois avec ROI flat +6% et ROI cumule -2% peut etre frustrant mais instructif. Les picks sont bons, mais le staking a peut-etre trop charge une zone perdante. Il faut alors revoir le sizing par tier, pas jeter le modele. Cette separation evite des decisions emotionnelles.

## Pourquoi le ROI par bucket de cote compte

Les cotes basses donnent un win rate confortable, mais un mauvais prix les rend vite perdantes. Les cotes moyennes sont souvent le coeur d'une strategie stable. Les grosses cotes apportent du rendement mais aussi des longues periodes rouges. Un ROI global peut cacher tout cela.

Le site doit donc afficher des buckets simples :

1. 1.30-1.50.
2. 1.50-2.00.
3. 2.00-3.00.
4. 3.00-5.00.
5. 5.00+.

Si Theo performe surtout sur 1.80-2.50, les suggestions personnalisees doivent le dire. Si les cotes 5.00+ sont negatives, elles doivent etre reduites, meme si elles sont amusantes.

## ROI et biais de ligue

Une ligue peut etre globalement rentable sur un marche precis et mauvaise sur les autres. Par exemple, une ligue peut donner de bons Unders mais de mauvais 1N2. Le rapport doit eviter les conclusions trop larges comme "Liga X bonne" ou "NBA mauvaise". Il faut dire "Liga X Under 2.5 watch positif, 1N2 insuffisant" ou "NBA win rate ok mais ROI negatif car cotes trop basses".

Cela rejoint les corrections de biais marche : un tag exploit doit verifier `cote * WR > 1`. Sans cela, le site peut recommander un marche qui gagne souvent mais perd de l'argent.

## Heatmap P&L

La heatmap annuelle rend le ROI plus humain. Une colonne rouge isolee n'est pas grave. Une longue sequence rouge demande une pause. Une alternance reguliere de vert et rouge est normale. Le plus important est de voir si les pertes grossissent avec le temps. Si les jours rouges deviennent plus rouges que les jours verts ne sont verts, le sizing est peut-etre trop agressif.

La heatmap doit afficher au hover : nombre de picks, profit, ROI, CLV moyenne et plus gros drawdown du jour. Cela permet de comprendre si un mauvais jour vient d'un volume excessif, d'une mauvaise selection ou d'une variance normale.

## Checklist performance

Pour evaluer une strategie :

1. ROI flat positif.
2. ROI cumule positif ou drawdown acceptable.
3. CLV moyenne positive.
4. Brier stable.
5. Pas de dependance a un seul gros gain.
6. Segments faibles identifies.
7. Petits echantillons marques comme tels.
8. Strategie de mise coherente avec les tiers.

Le ROI n'est pas un trophée. C'est un instrument de pilotage. Il doit dire quoi renforcer, quoi reduire, quoi surveiller et quoi supprimer.

## Comparer deux strategies

Supposons deux strategies. Strategie A : ROI flat +4%, drawdown faible, CLV +2%, volume regulier. Strategie B : ROI flat +15%, drawdown tres fort, CLV instable, profits concentres sur trois outsiders. La strategie B semble plus attirante, mais elle peut etre beaucoup moins exploitable. Si Theo ne supporte pas les longues series rouges, il abandonnera avant que l'avantage se realise.

Le meilleur choix n'est donc pas toujours le ROI maximum. C'est le meilleur couple rendement / stabilite. Le score d'opportunite enrichi doit aider a cela en integrant la stabilite des signaux et la fraicheur data. Une strategie rentable mais instable peut etre gardee en petite dose. Une strategie rentable et stable peut devenir le coeur du plan.

## Mesurer apres chaque changement

Chaque ajout au modele doit etre mesure avant et apres. Si le weather impact est active, il faut comparer les picks concernes. Si LightGBM entre dans l'ensemble, il faut regarder le Brier avec et sans. Si un nouveau marche foot est expose, il faut suivre son ROI separement. Sans separation, on ne sait jamais si l'ajout a aide ou simplement ajoute du volume.

La bonne pratique est de marquer les nouveaux marches en `watch` au debut. Ils peuvent etre visibles, mais pas promus en Big Bets tant que l'historique ne prouve pas leur qualite. Cela evite qu'une innovation produit devienne une regression modele.

## Decision de suppression

Un segment doit etre reduit ou supprime si :

1. ROI flat negatif sur echantillon suffisant.
2. CLV negative persistante.
3. Brier mauvais.
4. Signaux souvent contradictoires.
5. Data rarement fraiche.
6. Utilisation faible par Theo.

Supprimer un segment n'est pas un recul. C'est une amelioration du produit. Le site doit aider a mieux parier, pas afficher tout ce qui est techniquement possible.
