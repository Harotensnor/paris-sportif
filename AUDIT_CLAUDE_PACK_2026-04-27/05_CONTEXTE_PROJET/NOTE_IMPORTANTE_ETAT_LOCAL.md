# Note importante sur l'etat local

Pendant l'audit, le checkout local etait en retard important par rapport a `origin/main`.

Observation :

- Le site live utilise une architecture recente avec `pronostics.html`, `app.js`, `app.css`, `data.js`.
- Le contexte historique du projet mentionne encore un gros `pronostics.html` monolithique.
- Le dossier local contenait des modifications et fichiers non suivis.

Consequence :

Claude devrait eviter de patcher directement depuis un vieux checkout sans verifier l'etat distant frais.

Avant toute action :

1. Verifier `origin/main`.
2. Partir de la version live la plus recente.
3. Preserver le systeme de splice `PRONOSTICS_DATA`.
4. Ne pas ecraser les donnees fraiches du cron.
5. Bumper le service worker si une modification UI/HTML/JS/CSS est deployee.

