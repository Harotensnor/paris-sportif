# Synthèse conformité Winamax

Consultation : 2026-05-02.

URL demandée : https://www.winamax.fr/cgu-paris-sportifs  
Résultat direct : accès HTTP 403 depuis l'environnement de lecture. Analyse basée sur les documents officiels accessibles via le CDN Winamax :

- Conditions générales d'utilisation Winamax, dernière mise à jour 7 août 2025 : https://operator-front-static-cdn.winamax.fr/img/content/poker/2025/20250808_cgu/conditions-generales.pdf
- Règlement des paris sportifs Winamax, document 06 août 2024 : https://operator-front-static-cdn.winamax.fr/img/content/betting/2024/20240805_cgu/reglement-des-paris-sportifs-06_08_2024.pdf

## Points utiles pour Paris-Sportif

1. Winamax est l'opérateur de jeu. Paris-Sportif doit rester un site indépendant d'analyse, sans laisser croire à une affiliation ou à une validation par Winamax.
2. Le jeu est réservé aux personnes majeures. Les messages 18+ et jeu responsable doivent rester visibles, notamment sur l'accueil, le footer et les pages de conseil.
3. Les paris sont incertains et peuvent entraîner des pertes d'argent. Le site ne doit jamais promettre un gain, un ROI garanti, ni présenter un pari comme sûr.
4. Le règlement des paris interdit les paris pour le compte d'un tiers, les groupements/syndicats de paris, les paris avec avantage déloyal, les séries visant à contourner les limites, et les paris placés à l'aide d'un robot.
5. Conséquence produit : aucun auto-pari réel. Le site peut conseiller, expliquer, simuler, ouvrir un lien Winamax, mais l'utilisateur doit décider et valider lui-même sur Winamax.
6. Les cotes peuvent changer entre la sélection et la validation du pari. L'interface doit rappeler de vérifier la cote finale sur Winamax avant toute mise réelle.
7. Winamax fixe des limites de mise selon les matchs/paris et les limites de jeu du joueur. Les mises suggérées par Paris-Sportif doivent rester indicatives.
8. Le montant minimum de mise mentionné dans le règlement est 0,10 EUR et la cote minimale pariable est 1,05. Le site peut garder ces contraintes en garde-fou d'affichage.
9. Les paris live ont des cotes actualisées en permanence. Toute future page live doit afficher un avertissement renforcé sur la volatilité.
10. Les règles d'annulation/remboursement varient par marché. Les markets avancés (buteurs, combinés, MyMatch, périodes, handicaps) doivent afficher une note "règle Winamax à vérifier".

## Cotes et affichage public

Les documents consultés ne donnent pas une autorisation explicite de republier largement les cotes. Politique prudente à appliquer :

- afficher uniquement des cotes récupérées publiquement et datées ;
- toujours indiquer la source Winamax et l'heure de récupération ;
- ne jamais présenter les cotes comme contractuelles ;
- renvoyer l'utilisateur vers Winamax pour la cote finale et les règles complètes ;
- utiliser cache, quotas et backoff pour éviter tout scraping agressif ;
- ne pas copier l'identité visuelle Winamax au point de créer une confusion de marque.

## Mentions à garder dans le site

- "Site indépendant, non affilié à Winamax."
- "Les cotes affichées sont indicatives et peuvent évoluer."
- "Paris-Sportif ne prend pas de paris et ne mise pas automatiquement."
- "Vérifie toujours la cote, le marché et les règles sur Winamax avant de valider."
- "18+ · Jouer comporte des risques : endettement, isolement, dépendance. Aide : 09 74 75 13 13."

## Décision Phase 5

Statut : OK pour continuer l'inspiration visuelle Winamax sans copie stricte.  
Blocage : auto-pari réel hors scope et à éviter.  
Action suivante recommandée : P-5.28/P-5.29 pour renforcer légal + footer avec indépendance, source des cotes, et jeu responsable.
