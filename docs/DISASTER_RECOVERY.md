# Disaster recovery

Objectif : garder le tableau exploitable même si une source tombe, si `data.js` est corrompu, ou si le modèle dérive.

## 1. `data.js` corrompu

Symptômes :

- page blanche ou tableau vide brutal ;
- `health.json` en `critical` ;
- `scripts/check_pipeline_health.py` échoue ;
- `data_integrity_report.json` signale un parse error.

Procédure :

1. Vérifier `health.json` et `data_integrity_report.json`.
2. Revenir au dernier `data.js` sain depuis `archives/data-YYYY-MM-DD.js.gz` si disponible.
3. Relancer `scripts/validate_data_quality.py`.
4. Relancer `scripts/data_integrity_monitor.py`.
5. Relancer `scripts/build_health.py`.
6. Commit/push uniquement si `health.json` revient au moins en `warning`.

Le service worker garde une protection : une réponse `data.js` sans marqueur `window.PRONOSTICS_DATA =` ne remplace plus le cache valide.

## 2. Cron bloqué

Symptômes :

- footer `MAJ` > 30 min ;
- `health.json.sections.pipeline.status` en `degraded` ou `critical` ;
- 5+ sources rouges dans `pipeline_lag_per_script`.

Procédure :

1. Lire le dernier run GitHub Actions `refresh-data`.
2. Identifier le premier script rouge dans `pipeline_traces_summary.json` ou dans les logs Actions.
3. Si source optionnelle : laisser le script en skip warning et continuer.
4. Si source critique Winamax/Sofascore/data.js : corriger ou rollback le dernier script lié.
5. Relancer `workflow_dispatch`.

## 3. Source optionnelle cassée

Sources optionnelles typiques : ClubElo, météo, footballdata, previews, stats contextuelles.

Procédure :

1. Le fetcher doit écrire un status explicite ou ne rien modifier.
2. `data_integrity_monitor.py` marque la source en warning.
3. `build_health.py` expose l’alerte, mais le tableau continue.
4. Backloguer la réparation si l’impact pronos est faible.

## 4. Dérive modèle

Symptômes :

- ROI 7j ou 30j chute fortement ;
- `feature_drift_v5.json`, `adversarial_validation.json` ou `model_anomalies_summary.json` alertent ;
- page Santé affiche `model` dégradé.

Procédure :

1. Geler les seuils, ne pas ajouter de marchés.
2. Lire `BACKTEST_DEEP_V5.md`.
3. Identifier les pires zones sport × ligue × marché × cote.
4. Désactiver les zones faibles plutôt que recalibrer globalement.
5. Documenter dans `BACKLOG.md` si le correctif demande plus d’une passe.

## 5. GitHub Pages indisponible

Procédure :

1. Vérifier l’état GitHub Pages dans les settings du repo.
2. Servir localement avec `python serveur.py` si Théo doit consulter en urgence.
3. Garder `DEPLOY-V20.bat` comme chemin de push manuel, en conservant le splice `PRONOSTICS_DATA`.

## Commandes de vérification

```powershell
python scripts/validate_data_quality.py
python scripts/data_integrity_monitor.py --strict
python scripts/build_health.py
python scripts/check_pipeline_health.py
```

`--strict` doit être réservé aux validations de release : en cron, les sources optionnelles restent non bloquantes.
