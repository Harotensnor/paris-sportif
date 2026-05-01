# References code live

Fichier reference : `07_SNAPSHOTS_LIVE/app.live.js`

Ces lignes sont issues du snapshot live, pas forcement du checkout local.

## Router / pages

- `VALID_PAGES` : ligne 46.
- Initialisation `currentPage` depuis hash/localStorage : ligne 56.
- Ecoute `hashchange` principale : ligne 68.
- Delegation `.page-btn` : ligne 17218 et suivantes.
- Assignation `currentPage = btn.dataset.page` : ligne 17224.
- Health indicator vers `credibilite` : ligne 17484.

Point a relire : les clics `.page-btn` changent `currentPage`, mais l'audit a observe une URL/hash pas toujours synchronisee.

## Coeur modele / staking

- `kellyFraction` : ligne 350.
- `kellyStake` : ligne 358.
- `getSides` : ligne 493.
- `predictMatch` : ligne 1519.
- `_predictMatchImpl` : ligne 1541.
- `evaluateModelPick` : ligne 3102.

Point a relire : separer clairement les cotes exactes Winamax des fallbacks externes avant tout calcul actionnable.

## Modal detail

- `openDetail` : ligne 5200.
- Exposition `window.openDetail` : ligne 6925.

Point a relire : structure de la modal, focus clavier, onglets, source des cotes affichees.

## Agent autonome

- `_agentBestPick` : ligne 7797.
- `_evaluateBestPick` : ligne 7837.
- `_loadAgentRules` : ligne 7867.
- `_applyAgentRules` : ligne 7879.
- `_proposedRules` : ligne 7895.
- `_agentReplay` : ligne 7966.
- `renderDashboardPage` : ligne 8079.

Point a relire : l'agent doit-il exclure strictement les picks sans `winamax_exact` ?

## Pages de rendu

- `renderCombines` : ligne 4435.
- `renderDashboardPage` : ligne 8079.
- `renderButeursPage` : ligne 10563.
- `renderHistoriquePage` : ligne 13494.
- `renderBilanPage` : ligne 15400.

## Note sur issue/tache modal

Le contexte projet mentionne une task `#138` sur la modal detail. La verification GitHub via connecteur n'a pas trouve d'issue publique accessible `#138` dans `Harotensnor/paris-sportif` au moment de l'audit. Elle peut etre locale, fermee, dans un autre repo, ou hors GitHub.

