# Schemas data sidecars

Version cible : `schema_version: 2`.

Le validateur central est `scripts/data_integrity_monitor.py`. Il lit les sidecars en mode non destructif, applique trois niveaux de contrôle, puis écrit :

- `data_integrity_report.json` : résultat complet de validation.
- `data_integrity_quarantine.jsonl` : anomalies bloquantes ou à surveiller.
- `source_health.json` : score 0-100 par source.
- `data_lineage_summary.json` : couverture de provenance.
- `pipeline_traces_summary.json` : synthèse observabilité.

## Niveaux de validation

| Niveau | Contrôle | Exemple |
|---|---|---|
| 1 structure | clés obligatoires présentes | `generated_at`, `matches`, `events`, `teams` |
| 2 types | type JSON attendu | `matches` doit être un objet, `tournaments` une liste |
| 3 sémantique | fraîcheur, volume, cotes, dates | cote non finie, source stale, couverture trop basse |

## Sources validées

| Source | Fichier | SLA | Cible minimale |
|---|---:|---:|---:|
| Winamax catalogue | `winamax_catalog.json` | 15 min | 100 matchs |
| Winamax marchés | `winamax_markets.json` | 15 min | 100 matchs |
| Blessures foot | `injuries_soccer.json` | 180 min | 100 joueurs |
| Compositions foot | `lineups_soccer.json` | 180 min | 80 événements |
| Arbitres foot | `referees_soccer.json` | 180 min | 50 événements |
| Météo | `weather.json` | 60 min | 50 matchs |
| Stats équipes | `team_stats.json` | 300 min | 80 équipes |
| ClubElo | `clubelo.json` | 1440 min | 300 clubs |
| Sofascore events | `sofascore_events.json` | 30 min | 100 événements |
| Priors équipes | `team_priors.json` | 1440 min | 800 équipes |
| Priors bayésiens | `bayesian_priors.json` | 1440 min | 3 niveaux |

## Versioning

Les anciens fichiers sans `schema_version` sont lus comme v1. Le validateur applique une migration runtime vers v2 sans réécrire le sidecar : cela évite les gros diffs JSON pendant les passes UI ou performance. Les prochains fetchers peuvent écrire `schema_version: 2` directement.

## Contrat pour les nouveaux sidecars

Chaque nouveau JSON doit exposer au minimum :

```json
{
  "schema_version": 2,
  "generated_at": "2026-05-06T00:00:00Z",
  "status": "ok"
}
```

Le script qui produit le fichier doit rester idempotent et ne jamais casser la pipeline entière si la source optionnelle échoue.
