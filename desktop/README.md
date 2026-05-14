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

## Garde-fou

Cette version ne place pas encore de pari réel automatiquement. Elle prépare le
poste de pilotage stable avant d'ajouter une action Winamax sensible.
