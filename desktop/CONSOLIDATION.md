# Consolidation desktop

Objectif : rendre la migration Electron facile à relire et à valider sans
mélanger le logiciel PC, les données rafraîchies et l'ancien site statique.

## Lots Git conseillés

1. Migration logiciel PC
   - `desktop/**`
   - `LANCER-LOGICIEL.bat`
   - `LANCER-LOGICIEL.vbs`
   - `.github/workflows/desktop-check.yml`
   - `package.json`

2. Données locales rafraîchies
   - `data.js`, `data_lite.js`, `data_today.json`, `data_manifest.json`
   - `health.json`, `daily_insights.json`
   - `picks_history*.jsonl`, `picks_history_summary.json`
   - `winamax_*.json`, `weather*.json`, `lineups_soccer.json`
   - `injuries_*.json`, `referees_soccer.json`, `team_*.json*`, `h2h_extended.json`
   - `odds_history.jsonl`, `results_archive.jsonl`, `signal_unmatched.log`

3. Scripts data compatibles desktop
   - `scripts/_data_io.py`
   - `scripts/fetch_*.py`, `scripts/patch_*.py`, `scripts/build_*.py`
   - `scripts/check_winamax_markets_attached.py`
   - `scripts/qa_quality_gate.py`
   - `scripts/audit_smoke_workflow_triggers.py`

4. Ancien site isolé
   - suppressions des routes HTML/PWA historiques
   - `scripts/legacy_site/**`
   - `scripts/legacy_site_manifest.json`

## Commandes de validation avant commit

- `npm run qa:engine`
- `npm test`
- `npm run qa:visual`
- `npm --prefix desktop audit --json`

## Points à surveiller

- Ne pas réintroduire `pronostics.html` dans le logiciel Electron.
- Garder les scripts legacy relançables seulement depuis `scripts/legacy_site/`.
- Ne pas mélanger un commit de code desktop avec un gros rafraîchissement de
  données si le diff devient illisible.
- Conserver un rapport de tests dans le message de commit ou la PR.

## Suite proposée

1. Finaliser une passe de QA desktop après chaque lot.
2. Créer un commit dédié à la structure desktop.
3. Créer un commit séparé pour les données générées.
4. Créer un commit séparé pour l'isolation de l'ancien site.

## Préparation prochaine boucle

1. Ajouter des filtres au journal refresh quand l'historique aura plusieurs
   runs réels : erreurs seulement, sources lentes, sources données.
2. Exporter le journal refresh en CSV pour diagnostiquer les lenteurs sans
   ouvrir les logs.
3. Renforcer la fiche détail match avec un onglet signaux exploitant H2H,
   météo, xG, lineups et arbitres.
4. Réduire les alertes restantes sur les rapports secondaires anciens
   (`season_phase`, `star_players`) ou afficher une raison claire si une
   source n'est pas censée être fraîche au quotidien.

## Dernière passe réalisée

- Historique refresh partagé entre CLI et application Electron :
  `desktop/state/refresh-history.json` est alimenté par `refresh_once.py`
  et relu par l'API locale.
- Journal refresh ajouté dans la vue Données avec durée, statut et étape par
  étape du dernier run réel.
- Export CSV des scénarios de mise user ajouté et testé dans le smoke Electron.
- Couverture moteur renforcée sur météo/H2H/xG avec test contractuel pour
  éviter les régressions silencieuses.
- Refresh ciblé météo réel exécuté avec succès après les changements :
  14 étapes OK, données fraîches, historique persisté.
- Validation complète relancée : `npm run qa:engine`, `npm test`,
  `npm run qa:visual`, `npm --prefix desktop audit --json`.
