# Data Integrity Report

Passe : `v37.018 data integrity`

## Résumé

| Item | Résultat |
|---|---:|
| Sources validées | 11 |
| Sources OK | 2 |
| Sources en warning | 9 |
| Sources critiques | 0 |
| Quarantaines émises | 11 |
| Anomalies émises | 11 |
| Score santé moyen | 73.1 / 100 |
| Score santé min | 57 / 100 |
| Lineage events | 1018 / 1018 |

État global : `degraded`, pas `critical`.

La dégradation vient surtout de la fraîcheur du snapshot courant, pas d’une corruption structurelle. Le validateur distingue maintenant l’âge réel du `generated_at` et l’âge fichier local, ce qui évite les faux verts quand un script réécrit `data.js` sans refresh source.

## Livré

- Validation sidecars à 3 niveaux : structure, types, sémantique.
- Quarantaine append-only logique : `data_integrity_quarantine.jsonl`.
- Audit trail append-only : `data_audit_log.jsonl`.
- Provenance événement : champ `event.lineage` ajouté dans `data.js`.
- Résumés machine-readable :
  - `data_integrity_report.json`
  - `source_health.json`
  - `data_quality_kpis.json`
  - `data_lineage_summary.json`
  - `pipeline_traces_summary.json`
- Tracing local par script dans `auto_refresh.py`.
- Health étendu en 5 sections : pipeline, data, model, ui, tests.
- Protection SW : un `data.js` sans marqueur `window.PRONOSTICS_DATA` ne remplace plus le cache valide.
- Backup local navigateur : `data.js`, `health.json`, `source_health.json`, `data_integrity_report.json` vers IndexedDB toutes les 24h.
- Alerting santé Discord opt-in : `notify_discord_health.py`.
- Documentation :
  - `docs/SCHEMAS.md`
  - `docs/DISASTER_RECOVERY.md`

## Points à surveiller

- `winamax_markets` contient quelques cotes `1.0` et beaucoup de très hautes cotes de score exact. Elles sont maintenant visibles en warning/quarantaine, sans bloquer la pipeline.
- Plusieurs sources foot contextuelles sont stale sur le snapshot local. Le cron doit les rafraîchir au prochain tick sain.
- Les migrations `schema_version: 2` restent runtime/non-mutating pour éviter de réécrire de gros sidecars juste pour ajouter un champ.

## Vérification

```powershell
python scripts/data_integrity_monitor.py
python scripts/build_health.py
python -m pytest tests/test_data_integrity_monitor.py
```

Résultat pytest : `5 passed`.
