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
