# Prompt a coller dans Claude

Tu vas recevoir un pack d'audit complet du projet Paris-Sportif.

Important : ne prends pas le rapport comme une liste d'ordres a appliquer automatiquement. Je veux que tu juges quoi faire selon mon historique avec toi, mes preferences produit, la strategie actuelle du site, et le niveau de risque acceptable.

Contexte produit :

- Site de pronostics de paris sportifs deploye sur GitHub Pages.
- Strategie produit : Winamax-only pour les recommandations actionnables.
- Agent autonome avec bankroll separee.
- Section utilisateur "A parier aujourd'hui" avec les meilleurs edges.
- Le pipeline data tourne frequemment et le deploy manuel peut entrer en conflit avec le cron.

Ce que je veux de toi :

1. Lire le dossier `00_LIRE_EN_PREMIER.md`.
2. Lire le resume neutre et les options a arbitrer.
3. Lire le rapport complet seulement apres avoir compris les priorites.
4. Lire `QUESTIONS_A_POSER_AVANT_PATCH.md` et `CARTOGRAPHIE_TECHNIQUE.md`.
5. Lire `ROOT_CAUSE_BACKEND.md` si tu veux comprendre les causes probables cote pipeline.
6. Utiliser `REFERENCES_CODE_LIVE.md` pour retrouver vite les zones importantes dans le snapshot live.
7. Decider toi-meme ce qui vaut la peine d'etre corrige maintenant, plus tard, ou ignore.
8. Me proposer un plan de patch realiste, en tenant compte de ce que nous avons deja fait ensemble.
9. Avant de coder, verifier l'etat frais de `origin/main`.
10. Ne pas casser le systeme de deploy/splice ni ecraser les donnees fraiches.

Points qui semblent importants dans l'audit, a re-evaluer par toi :

- Difference entre `winamax.available` et cote Winamax exacte.
- Recommandations actionnables qui semblent parfois utiliser des cotes externes.
- Page Sante qui affiche peut-etre un faux vert produit.
- Modal detail match a refondre ou au moins rendre plus fiable/accessible.
- Navigation SPA qui ne synchronise pas toujours l'URL.
- Incoherences de compteurs Locks.
- Details mobile/PWA/cache/service worker.
- Cas sportifs speciaux : tennis `RETIRED/WALKOVER`, golf/racing sans competitors.
- Cause probable data : `team_stats` indexe par `team_id` seul, collision entre sports.
- Cause probable cotes : `getMatchOdds` lit ESPN/snapshot avant Winamax exact.
- Cause probable meteo : geocoding par nom d'equipe quand la ville n'est pas mappee.

Ta mission : transformer cet audit en decision technique utile, pas juste appliquer tout aveuglement.

Les dossiers `07_SNAPSHOTS_LIVE/`, `06_ANALYSES_SUPPLEMENTAIRES/` et `09_BACKEND_ROOT_CAUSE/` contiennent une photographie du live, un inventaire technique automatique, et les scripts backend de `main` au moment de l'audit. Utilise-les comme preuves, mais re-verifie le live et `origin/main` si tu codes plus tard car les donnees changent souvent.
