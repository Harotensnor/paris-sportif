# Runbook execution Claude

But : transformer le pack en action sans perdre le contexte ni casser le deploy.

## Phase 0 - Lire et choisir

1. Lire `MASTER_INDEX.md`.
2. Lire `TOP_FINDINGS_A_ARBITRER.md`.
3. Lire `ROOT_CAUSE_BACKEND.md`.
4. Poser au proprietaire les questions bloquantes si besoin.

## Phase 1 - Re-verifier l'etat frais

Avant de coder :

1. Verifier `origin/main`.
2. Comparer le live et le repo.
3. Verifier que le cron n'est pas en train de pousser.
4. Preserver le splice/deploy existant.

## Phase 2 - Rejouer les checks data

Depuis la racine du repo frais :

```bash
python 10_OUTILS_RELECTURE_CLAUDE/verify_data_quality.py --data data.js --out audit-quality-output.json
```

Comparer avec :

- `06_ANALYSES_SUPPLEMENTAIRES/DATA_QUALITY_AUDIT.json`
- `06_ANALYSES_SUPPLEMENTAIRES/QUALITE_DATA_SIGNAL.md`
- `10_OUTILS_RELECTURE_CLAUDE/verify_data_quality_snapshot_output.json` pour le resultat obtenu sur le snapshot live du pack.

## Phase 3 - Decider le patch minimal

Ordre de securisation souvent logique :

1. Corriger `team_stats` ou ajouter une garde defensive.
2. Clarifier source de cote Winamax exacte.
3. Ajouter health semantique.
4. Neutraliser meteo faible confiance.
5. Traiter UX/modal/navigation.

Mais Claude doit arbitrer selon l'historique projet et la preference utilisateur.

## Phase 4 - Tests de non regression

Apres patch :

1. Rejouer `verify_data_quality.py`.
2. Verifier `Unión (Santa Fe)` sans `Boston Celtics`.
3. Verifier `Boca Juniors` sans `Toronto Raptors`.
4. Verifier qu'une reco actionnable utilise bien Winamax exact.
5. Verifier page Sante.
6. Verifier dashboard mobile.
7. Verifier modal detail si touchee.
8. Verifier service worker version si UI modifiee.

## Phase 5 - Deploy

Respecter les conventions du projet :

- partir de remote frais ;
- ne pas ecraser data cron ;
- garder splice ;
- bumper cache service worker si assets UI changent ;
- syntax check ;
- push avec prudence.
