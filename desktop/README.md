# Paris-Sportif Desktop

Première version du logiciel PC local.

## Lancer

Depuis la racine du projet, double-cliquer sur `LANCER-LOGICIEL.bat`.

Le premier lancement installe Electron dans `desktop/node_modules`, puis ouvre
une fenêtre locale. Rien ne passe par GitHub Pages et le Service Worker du site
est désactivé dans cette fenêtre.

## Ce que fait cette version

- affiche une interface logicielle native, sans montrer le site ;
- lit les fichiers locaux `data.js`, `data_today.json`, `health.json` ;
- lance le moteur de calcul dans un service interne au logiciel, sans iframe ;
- calcule les picks actionnables via le runtime copié dans `desktop/src/engine/runtime/` ;
- applique le blocage si les données ont plus de 4h ;
- lance un refresh local à la demande ;
- affiche les picks, les combinés, les buteurs probables, tous les matchs, l'historique, l'agent et l'état des données dans le logiciel.
- affiche un brief d'ouverture avec les picks du jour, la bankroll, le prochain départ et les performances récentes ;
- suit les paris en un clic avec P&L, CLV, apprentissage par segment, export CSV et discipline bankroll locale ;
- propose des préférences locales : sports, marchés, seuils, mode de mise, stop-loss et take-profit.
- affiche un calendrier 7 jours des picks, une aide intégrée, un panneau pipeline avec log live et un panneau debug accessible par raccourci ;
- permet d'ajouter des notes privées et tags aux paris suivis, puis de filtrer/exporter ces informations ;
- peut envoyer les alertes importantes vers un webhook mobile externe configuré par l'utilisateur, depuis le process Electron local ;
- surveille la mémoire et la stabilité longue durée sans bloquer l'interface.

## Raccourcis utiles

- `Ctrl+1` à `Ctrl+7` : vues principales.
- `Ctrl+8` : calendrier.
- `Ctrl+9` : pipeline / refresh.
- `Ctrl+0` : aide.
- `Ctrl+Shift+L` : panneau logs debug.

## Garde-fou

Cette version ne place pas encore de pari réel automatiquement. Elle prépare le
poste de pilotage stable avant d'ajouter une action Winamax sensible.
