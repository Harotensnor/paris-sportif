# Calibration

La calibration repond a une question simple : quand le modele dit 70%, est-ce que l'evenement arrive vraiment environ 70 fois sur 100 ? Un modele peut etre spectaculaire dans son interface, produire des explications longues et afficher des scores precis, mais s'il annonce 70% et gagne seulement 58%, il est mal calibre. En paris sportifs, la calibration est aussi importante que la prediction brute.

Un pronostic n'est pas seulement un choix. C'est une probabilite. Dire "PSG gagne" n'est pas assez. Il faut dire si PSG gagne 55%, 65%, 75% ou 85% du temps dans ce contexte. La cote acceptable change completement selon cette probabilite. Une estimation trop optimiste pousse a jouer des cotes trop basses. Une estimation trop prudente fait manquer de bonnes value.

Le Brier score est l'un des outils de base pour mesurer cette qualite. Il compare la probabilite annoncee au resultat final. Un pick annonce a 80% qui gagne est bon, mais un pick annonce a 55% qui gagne n'a pas la meme signification. Le Brier penalise surtout les predictions tres confiantes qui se trompent. C'est utile, parce qu'un modele de pari doit eviter la fausse certitude.

La calibration globale ne suffit pas. Un modele peut etre correct sur le football en general et mauvais sur les corners, bon sur la NBA mais faible sur le hockey, solide sur les cotes 1.50-2.00 et dangereux sur les outsiders. C'est pour cela que la calibration doit etre decoupee par sport, ligue, marche et phase de saison. Une Ligue 1 en septembre ne ressemble pas toujours a une Ligue 1 en avril, quand les enjeux de titre, maintien et rotation changent.

Le site utilise plusieurs couches :

1. Probabilite brute du modele.
2. Ajustements par marche.
3. Calibration par contexte quand l'echantillon est suffisant.
4. Garde-fous si l'echantillon est trop petit.
5. Affichage d'un intervalle de confiance quand il est lisible.

L'intervalle de confiance est important. Une probabilite de 68% avec un intervalle 65-72% est utilisable. Une probabilite de 68% avec un intervalle 50-84% raconte autre chose : le modele n'est pas assez certain. Dans ce cas, le pick doit etre marque comme incertain, ou descendre dans la priorite. Le but n'est pas de cacher l'incertitude, mais de la rendre visible.

La calibration protege aussi contre les ligues pieges. Certaines competitions ont des donnees plus bruitees, des lineups moins fiables, des rotations plus fortes ou des cotes plus difficiles a battre. Si une ligue affiche un Brier superieur au seuil, le systeme doit reduire son poids dans les Big Bets. Cela ne veut pas dire qu'il ne faut jamais jouer cette ligue. Cela veut dire qu'elle demande plus de prudence, plus d'edge, ou une taille de mise plus faible.

Un autre piege est le taux de reussite brut. Une strategie peut gagner 76% de ses paris et perdre de l'argent si les cotes sont trop basses. La calibration doit donc etre lue avec le ROI, l'EV et la CLV. Un modele qui gagne moins souvent mais bat regulierement la closing line peut etre plus robuste qu'un modele qui empile des favoris sous-payes.

Le recalibrage doit etre recent. Une courbe construite il y a trois mois peut devenir fausse si les fetchers changent, si les marches ajoutes sont differents, ou si la saison entre dans une nouvelle phase. Les fichiers de calibration doivent donc porter une date de generation. Si cette date est trop ancienne, le site doit revenir a la probabilite brute ou afficher un warning plutot que d'appliquer un ajustement obsolete.

Pour Theo, la bonne lecture est la suivante : plus la calibration est stable, plus le score d'opportunite est credible. Quand le tooltip montre une bonne confiance, un edge positif, une data fraiche et une stabilite de signaux, le pari merite l'attention. Quand un seul de ces piliers manque, le pari peut encore etre interessant, mais il doit etre joue plus petit ou simplement surveille.

La calibration transforme le site d'un tableau de picks en outil de decision. Elle force le modele a rendre des comptes. Elle dit : "voici ce que j'annonce, voici ce qui s'est passe, voici ou je suis fiable, voici ou je dois me taire." Cette transparence est ce qui permet d'ameliorer le systeme sans tomber dans le storytelling.

## Comment lire une courbe de calibration

Une courbe de calibration regroupe les picks par tranches de probabilite. Par exemple, tous les picks annonces entre 60% et 70% sont mis ensemble. Si la tranche gagne 65% du temps, elle est bien calibree. Si elle gagne 54%, le modele est trop optimiste. Si elle gagne 75%, il est trop prudent ou le marche etait particulierement mauvais sur ce segment.

La diagonale parfaite n'est pas obligatoire sur chaque petit groupe. Le sport contient du bruit. Ce qui compte, c'est la tendance sur un echantillon suffisant. Une tranche avec 8 picks ne prouve presque rien. Une tranche avec 120 picks commence a raconter quelque chose. Le site doit donc afficher le nombre de picks derriere chaque mesure, ou au minimum cacher les conclusions trop fragiles.

## Pourquoi la calibration change par marche

Le modele peut predire correctement le vainqueur mais etre moins bon sur les handicaps. Il peut bien lire les Over/Under en football top-5 et mal lire les BTTS en ligues secondaires. Chaque marche a ses propres distributions. Un total de buts depend de la tempo, du style, des lineups, de la meteo et parfois de l'arbitre. Un 1N2 depend davantage du rapport de force general. Un score exact demande une precision beaucoup plus fine.

C'est pour cela qu'une calibration unique est dangereuse. Si les Over sont surconfiants et les DNB sont prudents, une moyenne globale peut masquer les deux problemes. La bonne approche est de calibrer par marche quand l'echantillon le permet, puis de retomber sur une calibration plus large quand il ne le permet pas.

## Calibration et phases de saison

Le debut de saison est instable. Les equipes changent, les coachs testent, les transferts ne sont pas encore digeres. Le milieu de saison est souvent plus lisible. La fin de saison introduit d'autres biais : maintien, rotation, fatigue, equipe deja championne, equipe sans enjeu. Un meme modele peut donc etre bien calibre en novembre et moins bon en mai.

Les phases doivent etre simples : early, mid, late, puis playoff ou coupe quand le format change. Trop de granularite casse l'echantillon. Pas assez de granularite cache les regimes differents. Le bon compromis est de garder la separation seulement quand elle ameliore le Brier et garde un nombre de picks suffisant.

## Ce que l'utilisateur doit voir

La modal ne doit pas afficher seulement "confiance 68%". Elle doit contextualiser : "Proba 68% (CI 65-72%), calibration marche correcte, 143 picks comparables." Si l'intervalle est large, le message doit changer : "Proba 68%, mais incertitude elevee." Si la calibration est obsolete, le site doit l'avouer.

Cette transparence evite les mauvaises lectures. Theo peut alors distinguer un pick propre d'un pick interessant mais fragile. Les deux peuvent etre affiches, mais ils ne doivent pas avoir la meme taille de mise ni le meme statut.

## Erreurs a eviter

Ne jamais recalibrer sur le meme echantillon que celui utilise pour prouver la performance sans le signaler. Cela donne une illusion de precision. Ne jamais appliquer une calibration ancienne sans date. Ne jamais comparer un Brier football top-5 avec un Brier de props MLB sans contexte. Ne jamais afficher un pourcentage trop precis quand la data est faible : 67.3% donne une impression de science exacte qui n'existe pas.

La calibration est une hygiene. Elle ne rend pas le modele magique, elle l'empeche de mentir. Plus le site devient riche en signaux, plus cette hygiene devient importante. Chaque nouveau signal peut ameliorer la prediction, mais aussi ajouter du bruit. La calibration dit si l'ajout a vraiment rendu le systeme meilleur.

## Checklist calibration

Avant de faire confiance a un segment, verifier :

1. Echantillon suffisant.
2. Date de generation recente.
3. Brier meilleur que baseline.
4. Calibration separee par marche si possible.
5. Pas de melange entre sports incompatibles.
6. Intervalle de confiance raisonnable.
7. Abstain actif sur les zones faibles.
8. Aucune conclusion forte sur un petit n.

Un site de betting intelligent doit parfois dire "je ne sais pas". La calibration donne le courage de cette phrase.

## Exemple d'ajustement prudent

Supposons que le modele brut donne 72% sur un favori a domicile. La calibration du marche 1N2 foot top-5 montre que les predictions entre 70% et 75% gagnent plutot 68% sur les 180 derniers picks comparables. Le site peut alors descendre la probabilite affichee a 68% ou reduire le score d'opportunite. Ce n'est pas une punition. C'est une correction d'humilite.

Inversement, si les predictions entre 55% et 60% gagnent 62% sur un marche specifique, le modele est peut-etre trop prudent. Il peut alors remonter legerement certains picks, mais seulement si la CLV confirme que le marche ferme dans le meme sens. Une calibration isolee sans validation de cote peut etre un simple hasard.

## Relation avec LightGBM et ensemble

Un modele supplementaire comme LightGBM ne doit pas etre branche parce qu'il semble moderne. Il doit ameliorer le Brier ou la CLV sur un echantillon de validation. Si LightGBM ajoute un signal faible mais stable, il peut recevoir un poids modeste, par exemple 0.20. S'il augmente la variance ou rend les picks trop confiants, il doit rester en observation.

L'ensemble doit donc exposer ses composantes : Poisson, ELO, xG, forme, h2h, marche, LightGBM. Quand ces sous-modeles sont d'accord, la confiance peut monter. Quand ils divergent, le site doit le dire. L'accord entre modeles est une information de calibration : il indique si la probabilite finale repose sur un consensus ou sur une seule hypothese forte.

## Tableau de bord minimum

Une bonne page Performance doit montrer :

1. Brier global.
2. Brier par sport.
3. Brier par marche.
4. Courbe de calibration.
5. Nombre de picks par bucket.
6. Segments exclus ou declasses.
7. Date de generation des courbes.
8. Comparaison avec baseline non calibree.

Avec ces elements, Theo peut savoir si le site devient vraiment plus fiable ou seulement plus complexe.
