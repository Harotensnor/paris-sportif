# Migration site -> logiciel PC

Objectif : faire du logiciel PC le produit principal. Le site statique
historique a été retiré de la racine du projet.

## Etat actuel

- Le logiciel affiche maintenant une interface native.
- Les onglets `Accueil`, `Tous les matchs`, `Agent` et `Données` remplacent la
  vue visible du site.
- Le moteur historique tourne maintenant dans un service interne du logiciel,
  sans `pronostics.html` et sans iframe.
- La copie utilisée par le logiciel est dans `desktop/src/engine/runtime/`.
- Les pages HTML, la PWA, le Service Worker et l'ancien dossier de déploiement
  site ont été supprimés.

## Ordre de migration conseillé

1. Stabiliser le logiciel comme interface quotidienne.
2. Extraire progressivement le moteur depuis `legacy-app.js` vers des modules
   desktop plus petits.
3. Remplacer les derniers scripts orientés site par des modules internes.
4. Garder les scripts data Python et le refresh local.
5. Continuer à extraire le runtime historique vers des modules desktop.

## A garder pour le logiciel

- `data.js`, `data_lite.js`, `data_today.json`
- `desktop/src/engine/runtime/legacy-app.js`
- `scripts/`

Ces fichiers servent encore au moteur et au refresh du logiciel.
