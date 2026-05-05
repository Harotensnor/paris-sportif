# Rapport stabilite — v35.464 → v35.472

Date: 2026-05-05

## Objectif

Pause volontaire sur les ajouts produit. La phase a cible uniquement la stabilite, la clarte de decision et la verification du tableau dense.

## Tableau Accueil

- Etat valide: le dashboard debug affiche 285 matchs scannes, 490 picks qualifies et 360 lignes rendues en mode horizon.
- Les 5 tiers sont alimentes.
- Le panneau `?debug=1` expose les compteurs de filtrage et les raisons de rejet.
- Les filtres locaux legacy qui masquaient tout sont neutralises au boot.
- Le fallback vide n'affiche plus un message sec: il oriente vers les matchs bookables avec data fiable.

## Aide a la decision

- Le guide "Comment choisir" explique l'ordre Score -> Tier -> Cote -> Edge.
- Les headers Cote, Conf, Edge, Score et Tier ont des tooltips simples.
- Le score affiche maintenant une recommandation directe: Conviction forte, Bon pari, Acceptable, Peu fiable.
- La modale Pourquoi liste les 3 raisons sous une hierarchie claire: raison principale, signal support, risque a connaitre.

## Data et signaux

- `night_metrics.json` est la source de verite du rapport.
- Events: 285 total, 265 a venir.
- Winamax: 285 disponibles, 285 exacts, ratio 100%.
- Marches detailles: 285 events avec plus que 1N2 cote front, 715 matchs detailles dans `winamax_markets.json`.
- Signaux: injuries 159, lineups/starter signals 97, xG 199, weather 189.
- Arbitres: `referee=97` desormais signifie couverture utile, avec `referee_named=5` et `referee_context=92`.
- Smart money: 3 events, statut `rare_event`, considere normal car ce signal doit rester rare.
- Pipeline drift: OK.

## Qualite et performance

- 32 captures visuelles `visual_capture.js validation-finale`: OK.
- a11y: 0 critical / 0 serious / 0 moderate sur les hubs audites.
- Lighthouse: 100/100/100 mobile et desktop sur Accueil, Tous, Performance, Academie.
- Tests dashboard: `phase-finale-dashboard.spec.js` passe 6/6 desktop+mobile.
- Tests V37 focuses: 77 passed / 11 skipped optionnels sur les specs modernisees.
- Bundle: `app.js` 1,571.4 KB / 1,750 KB budget; `app.css` 260.4 KB / 300 KB budget apres compression.

## Risques restants

- `ISSUES_ACTIVE.md` garde une issue ouverte: la suite Playwright complete historique contient encore des specs legacy pre-refonte.
- `health.json` reste en warning car certains sidecars non bloquants ont une cadence plus lente que leurs seuils stricts.
- Smart money peut rester bas certains jours: c'est un signal rare, pas un volume garanti.

## Decision

Le site est utilisable sur le point critique: le tableau est plein, les picks sont lisibles, l'aide a la decision est visible et les audits principaux sont verts. La prochaine phase doit continuer le nettoyage de la suite Playwright legacy avant de reprendre les ajouts produit.
