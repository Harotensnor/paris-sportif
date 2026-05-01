# Questions a poser avant patch

Ces questions aident Claude a arbitrer sans appliquer l'audit aveuglement.

## Promesse Winamax-only

1. Est-ce que "Winamax-only" veut dire :
   - seulement competition/tournoi disponible sur Winamax ;
   - ou obligatoirement match exact + marche exact + cote exacte Winamax ?
2. Si une cote externe existe mais pas la cote Winamax exacte, faut-il :
   - masquer le pick ;
   - afficher le match sans recommandation ;
   - afficher un badge "veille non actionnable" ;
   - ou continuer en fallback temporaire ?
3. L'agent autonome doit-il etre plus strict que la section utilisateur ?

## Produit et UX

4. La priorite du moment est-elle la confiance des recos, la qualite visuelle, ou la maintenabilite ?
5. La modal detail doit-elle etre un gros chantier maintenant, ou seulement une correction minimale ?
6. Les compteurs Locks doivent-ils compter :
   - locks du jour ;
   - locks futurs ;
   - locks deja vus ;
   - locks historiquement detectes ?

## Bilan et scoring

7. Les matchs tennis `RETIRED` / `WALKOVER` doivent-ils etre :
   - void ;
   - exclus du bilan ;
   - comptes selon le winner ESPN ;
   - comptes selon une regle bookmaker specifique ?
8. Les events golf/racing sans competitors doivent-ils etre exclus du modele ou traites dans un rendu specialise ?

## Donnees et pipeline

9. Le pipeline doit-il echouer/warn si la couverture Winamax exacte baisse sous un seuil ?
10. Quel seuil minimum de couverture exacte est acceptable avant d'afficher des recos ?
11. Les cotes externes doivent-elles rester dans `data.js` pour analyse/modelisation, meme si elles sont interdites en affichage actionnable ?
12. Les caches/team stats sont-ils indexes par `team_id` seul ou par `sport + league + team_id` ?
13. Si une stat football est impossible, faut-il la supprimer cote backend ou seulement l'ignorer cote frontend ?

## Deploy et risque

14. Faut-il d'abord ajouter des tests de non-regression avant de toucher `predictMatch` ou `_agentReplay` ?
15. Faut-il faire un patch tres cible ou preparer une branche de refactor plus large ?
16. Le service worker doit-il etre touche maintenant, sachant qu'il peut provoquer du cache fantome ?
