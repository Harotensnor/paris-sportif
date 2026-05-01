# Inventaire des preuves

## Rapport complet

- `01_RAPPORT_COMPLET/AUDIT-CODEX-2026-04-27.md`

Contient l'audit detaille, les findings classes P1/P2/P3, et le complement de passe 2.

## Resumes pour Claude

Dans `04_RESUMES_POUR_CLAUDE/` :

- `PROMPT_A_COLLER_DANS_CLAUDE.md` : prompt principal.
- `TOP_FINDINGS_A_ARBITRER.md` : top 10 des constats a juger.
- `RESUME_NEUTRE.md` : synthese sans decision imposee.
- `OPTIONS_A_ARBITRER.md` : options produit/techniques.
- `QUESTIONS_A_POSER_AVANT_PATCH.md` : questions a trancher avant code.
- `DONNEES_CLES.md` : chiffres importants.

## Preuves brutes JSON

Dans `02_PREUVES_BRUTES/` :

- `surface-audit.json` : etat des pages/assets principaux, tailles, cache, manifest, service worker.
- `link-audit-refined.json` : verification de liens/assets reels, avec faux positifs notes.
- `interaction-accessibility-perf-audit.json` : interactions desktop/mobile, accessibilite visible, perf, focus modal, ressources chargees.
- `static-data-code-audit.json` : analyse data live, providers, Winamax exact/fallback, cas competitors vides, statuses tennis, signaux de dette front.
- `browser-audit.json` : gros dump initial navigateur.
- `deep-audit.json` : parcours SPA/pages/captures.
- `manual-interactions.json` : essais manuels supplementaires.
- `real-interactions.json` : essais de navigation et modal sur vrais selecteurs UI.

## Captures utiles

Dans `03_CAPTURES/` :

- `spa-dashboard.png` : dashboard principal apres onboarding.
- `spa-sante.png` : page Sante affichant le vert.
- `real-detail-button.png` : modal detail actuelle.
- `mobile-dashboard-clean.png` : rendu mobile dashboard.
- `mobile-hamburger.png` : drawer mobile avec bottom nav visible.
- `spa-top.png`, `spa-tous.png`, `spa-locks.png` si present, `spa-calendrier.png`, `spa-combines.png`, `spa-historique.png`, `spa-bilan.png`, `spa-profil.png`.
- `static-*.png` : pages statiques mobile.

## Analyses supplementaires

Dans `06_ANALYSES_SUPPLEMENTAIRES/` :

- `TECH_INVENTORY_LIVE.json` : inventaire complet extrait des snapshots live.
- `TECH_INVENTORY_SUMMARY.json` : version courte de l'inventaire technique.
- `CARTOGRAPHIE_TECHNIQUE.md` : lecture humaine des pages, stockage local, donnees du jour, CSS, service worker.
- `MATRICE_RISQUES_ET_DECISIONS.md` : classement par risques et decisions possibles.
- `REFERENCES_CODE_LIVE.md` : lignes utiles dans le `app.live.js` snapshot.
- `QUALITE_DATA_SIGNAL.md` : contamination inter-sports, cotes snapshot externes malgre Winamax exact, meteo ambigue.
- `DATA_QUALITY_AUDIT.json` : resultats bruts de la passe qualite data.

## Snapshots live

Dans `07_SNAPSHOTS_LIVE/` :

- `pronostics.live.html`
- `app.live.js`
- `app.live.css`
- `sw.live.js`
- `manifest.live.webmanifest`
- `data_manifest.live.json`
- `health.live.json`
- `data_today.live.json`
- `data.live.js`
- `backtest_report_v2.live.json`

Ces fichiers permettent a Claude de verifier l'etat audite meme si le site live bouge ensuite.

## Recettes de reproduction

Dans `08_REPROS_ET_TESTS/` :

- `RECETTE_MANUELLE_CLAUDE.md` : comment reproduire les principaux constats.
- `SCENARIOS_A_RETESTER_APRES_PATCH.md` : mini check-list de non-regression.

## Root cause backend

Dans `09_BACKEND_ROOT_CAUSE/` :

- `ROOT_CAUSE_BACKEND.md` : hypotheses de cause racine avec references scripts/lignes.
- `PIPELINE_MAIN_ANALYSIS.md` : analyse du workflow live.
- `PATCH_BLUEPRINTS_OPTIONNELS.md` : chemins de correction possibles, a arbitrer par Claude.
- `BACKEND_SCRIPT_INVENTORY.json` : inventaire automatique des scripts.
- `scripts_main_snapshot/` : copies des scripts actuels de `main` utiles a Claude.

## Outils de relecture Claude

Dans `10_OUTILS_RELECTURE_CLAUDE/` :

- `verify_data_quality.py` : script autonome pour rejouer les checks data sur un repo frais.
- `RUNBOOK_EXECUTION_CLAUDE.md` : ordre de lecture, verification, patch et retest.
- `DECISION_TREE.md` : arbre de decision produit/technique.
- `FINDINGS_MACHINE_READABLE.json` : findings P1/P2/P3 au format structure.

## Backlog et tickets

Dans `11_BACKLOG_ET_TICKETS/` :

- `BACKLOG_PRIORISE.csv` : backlog priorise importable en tableur.
- `TICKETS_CLAUDE.md` : tickets proposes avec definition of done.
- `HANDOFF_MESSAGE_COURT.md` : message tres court pour lancer Claude.
- `README_BACKLOG.md` : explication du dossier.

## Contexte projet

Dans `05_CONTEXTE_PROJET/` :

- `AGENTS.md` : instructions projet donnees a Codex.
- `CLAUDE.md` : contexte local Claude si disponible.

## Points a verifier si Claude veut reproduire

- Relancer les tests sur le site live apres pull frais de `origin/main`.
- Ne pas se baser sur le vieux `pronostics.html` local si le repo local est encore en retard.
- Comparer `winamax.available`, `winamax.match_id`, `winamax.markets`, `odds_snapshot.provider` et l'affichage UI.
- Verifier une reco user et une position agent avec source de cote exacte.
