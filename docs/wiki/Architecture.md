# Architecture

[Architecture](Architecture.md) · [Pipeline](Pipeline.md) · [Model](Model.md) · [Data sources](Data-sources.md) · [Deployment](Deployment.md) · [Testing](Testing.md) · [Contributing](Contributing.md) · [FAQ](FAQ.md)

## Vue d'ensemble

Paris-Sportif est une application statique servie par GitHub Pages. Le navigateur
charge `pronostics.html`, `legacy-app.js`, `app.js`, les modules `src/*` et les
sidecars de données générés par la pipeline.

## Flux principal

1. Les fetchers Python écrivent des JSON sidecars.
2. Les patchers injectent ces signaux dans `data.js`.
3. `pronostics.html` charge les données et rend Accueil, Tous, Performance,
   Méthode et Profil.
4. Les helpers globaux exposent `getDisplayablePicks`, `getDataAge`,
   `predictMatch`, les outils de debug et les exports locaux.

## Frontend

- `legacy-app.js` : moteur historique et rendu principal.
- `app.js` : shell léger ESM.
- `src/privacy-social.js` : partage, badges et exports strictement locaux.
- `src/docs-onboarding.js` : aide globale, FAQ, tour et onboarding pro.

## Voir aussi

- [Model](Model.md)
- [Pipeline](Pipeline.md)
- [API reference](../API_REFERENCE.md)
