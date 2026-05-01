# Pack audit Paris-Sportif - 2026-04-27

Ce dossier est un pack de transmission pour Claude. Il ne decide pas a la place de Claude ni a la place du proprietaire du projet.

Objectif : donner a Claude un maximum de preuves, captures, chiffres et pistes pour qu'il puisse juger quoi faire selon :

- les preferences du proprietaire du site ;
- l'historique deja construit avec Claude ;
- la strategie produit Winamax-only ;
- le niveau de risque acceptable ;
- le temps disponible pour patcher proprement.

## Ordre de lecture conseille

1. `04_RESUMES_POUR_CLAUDE/PROMPT_A_COLLER_DANS_CLAUDE.md`
2. `04_RESUMES_POUR_CLAUDE/TOP_FINDINGS_A_ARBITRER.md`
3. `04_RESUMES_POUR_CLAUDE/RESUME_NEUTRE.md`
4. `04_RESUMES_POUR_CLAUDE/OPTIONS_A_ARBITRER.md`
5. `09_BACKEND_ROOT_CAUSE/ROOT_CAUSE_BACKEND.md`
6. `09_BACKEND_ROOT_CAUSE/PATCH_BLUEPRINTS_OPTIONNELS.md`
7. `01_RAPPORT_COMPLET/AUDIT-CODEX-2026-04-27.md`
8. `04_RESUMES_POUR_CLAUDE/INVENTAIRE_PREUVES.md`
9. `04_RESUMES_POUR_CLAUDE/QUESTIONS_A_POSER_AVANT_PATCH.md`
10. `06_ANALYSES_SUPPLEMENTAIRES/CARTOGRAPHIE_TECHNIQUE.md`
11. `08_REPROS_ET_TESTS/RECETTE_MANUELLE_CLAUDE.md`
12. `02_PREUVES_BRUTES/`, `03_CAPTURES/` et `07_SNAPSHOTS_LIVE/` si Claude veut verifier point par point.

## Point important

Le checkout local observe pendant l'audit est en retard par rapport a `origin/main`. Le site live est en architecture recente `pronostics.html + app.js + app.css + data.js`, alors que le contexte historique parle encore beaucoup du gros `pronostics.html` monolithique.

Avant toute modification, Claude devrait donc repartir de l'etat distant frais et respecter le mecanisme de splice/deploy deja etabli dans le projet.

## Ajouts de la passe 3

La passe 3 ajoute :

- des snapshots du live actuel (`07_SNAPSHOTS_LIVE/`) ;
- un inventaire technique automatique (`06_ANALYSES_SUPPLEMENTAIRES/TECH_INVENTORY_*.json`) ;
- une cartographie lisible des pages, stockage, service worker, dette CSS/JS ;
- une recette de tests manuels pour reproduire les principaux constats ;
- une liste de questions a poser avant patch pour eviter de corriger a contre-sens des preferences du proprietaire.
- une analyse backend/root-cause avec snapshots des scripts actuels de `main`.

## Ajouts finaux

- `MASTER_INDEX.md` : index global du pack.
- `10_OUTILS_RELECTURE_CLAUDE/verify_data_quality.py` : script autonome pour rejouer les checks data.
- `10_OUTILS_RELECTURE_CLAUDE/RUNBOOK_EXECUTION_CLAUDE.md` : ordre d'execution conseille.
- `10_OUTILS_RELECTURE_CLAUDE/DECISION_TREE.md` : arbre de decision.
- `10_OUTILS_RELECTURE_CLAUDE/FINDINGS_MACHINE_READABLE.json` : findings structurés pour tri automatique.
- `11_BACKLOG_ET_TICKETS/` : backlog CSV, tickets proposes, message court a envoyer a Claude.
