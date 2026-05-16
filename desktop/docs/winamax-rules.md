# Winamax — regles prises en compte par le modele

## Filet de securite 2-0 sur les paris Vainqueur foot

L'app modelise la garantie Winamax dite "2 buts d'ecart" sur les paris football Vainqueur eligibles. Le principe retenu est simple : si l'equipe jouee mene de deux buts a un moment du match, le pari peut etre considere gagnant plus tot selon les conditions Winamax de l'evenement.

Sources consultees le 16 mai 2026 :

- Winamax, reglement des paris sportifs : https://operator-front-static-cdn.winamax.fr/img/content/poker/2023/20230420_cgu/reglement-des-paris-sportifs.pdf
- Jeu Legal France, "Garantie 2 Buts d'Ecart" Winamax : https://www.jeu-legal-france.fr/actu-pari-winamax-garantie-2-buts-ecart.html
- SportyTrader, explication de la promotion Winamax : https://www.sportytrader.com/bookmakers/winamax/code-promo/comment-fonctionne-la-garantie-2-buts-d-ecart-de-winamax/

Implementation v2.1.0 :

- La regle ne s'applique qu'aux picks foot "Vainqueur du match", jamais aux matchs nuls, handicaps, buteurs, totals ou mi-temps.
- Le moteur calcule une probabilite prudente que l'equipe choisie mene de deux buts avec une simulation Poisson basee sur les xG du match ou, si les xG manquent, sur la probabilite implicite du pick.
- Le bonus est plafonne : il ameliore le score et la priorite, mais ne transforme pas automatiquement un pick faible en pari pret.
- L'interface affiche "Filet 2-0" pour rappeler a l'utilisateur de verifier que la page Winamax du match porte bien l'offre au moment de miser.
