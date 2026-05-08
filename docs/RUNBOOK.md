# Runbook admin

## Tableau vide

1. Ouvrir `/pronostics.html?debug=1`.
2. Lire `terminalScanPool`, `v37ScanPool`, `v36PickPool`, `v36Filtered`.
3. Vérifier les raisons de rejet.
4. Vérifier `health.json` et l'âge data.
5. Si data stale, lancer la pipeline locale ou inspecter GitHub Actions.

## Pipeline rouge

1. Lancer `python scripts/check_pipeline_drift.py`.
2. Lancer `python scripts/check_data_integrity.py`.
3. Lire `pipeline_traces.jsonl`.
4. Isoler la source rouge.
5. Relancer le fetcher seul.
6. Si source annexe KO, laisser warning non bloquant.

## Data stale GitHub Actions

Incident BUG-006 du 2026-05-08 :

1. `gh run list --repo Harotensnor/paris-sportif --workflow refresh.yml --limit 20` est la commande directe, mais elle nécessite un `gh auth login` ou `GH_TOKEN`.
2. Sans auth, l'API publique GitHub donne les statuts récents : plusieurs `workflow_dispatch` toutes les 5 minutes, des runs `cancelled`, et des runs `failure` dans l'étape `Fetch pipeline`.
3. Cause repo constatée : `check_pipeline_freshness.py --max-age-min 30` est fatal à chaque tick, alors que `fetch_v3.py` ne tournait qu'à minute 0. Si ce run horaire est annulé ou reste en queue, les runs suivants échouent sans tenter de reconstruire `data.js`.
4. Fix côté repo : `refresh.yml` force maintenant `fetch_v3.py` dès que `data.js` dépasse 30 minutes, en plus du passage horaire.
5. Limite infra : l'état du hook cron-job.org externe et l'expiration du PAT ne sont pas vérifiables depuis le repo ou l'API publique. Vérifier cron-job.org côté compte si les runs `workflow_dispatch` s'arrêtent.

## Cache utilisateur bloqué

1. Vérifier footer version.
2. Vérifier `sw.js` `CACHE_VERSION`.
3. Utiliser le bouton refresh de l'app.
4. En dernier recours, vider cache site dans DevTools.

## Déploiement manuel

1. `git pull --rebase --autostash origin main`.
2. Préserver `PRONOSTICS_DATA`.
3. Bumper footer + SW.
4. Tests rapides.
5. Commit/push.

## Incident data corrompue

1. Stopper les patchers locaux.
2. Restaurer dernier `data.js` sain depuis git/cache.
3. Mettre les sidecars fautifs en quarantaine.
4. Relancer `scripts/build_health.py`.
