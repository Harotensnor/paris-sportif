# BACKTEST_DEEP_V5

Generated: `2026-05-05T23:31:21Z`

## Résumé

- Fenêtre demandée: `24` mois
- Fenêtre disponible: `2026-05-01T18:45:00Z` → `2026-05-04T19:00:00Z`
- Lignes évaluées: `49`
- Win rate: `38.8%`
- ROI flat: `-18.5%`
- Brier: `0.188`

## 5 zones les plus fragiles

| Zone | n | WR | ROI | Brier |
|---|---:|---:|---:|---:|
| odds:5.00+ | 4 | 0.0% | -100.0% | 0.017 |
| league:fra.1 | 3 | 33.3% | -62.0% | 0.012 |
| odds:1.50-2.00 | 12 | 41.7% | -27.5% | 0.254 |
| league:premierdivision | 3 | 33.3% | +10.0% | 0.298 |
| league:mex.1 | 6 | 33.3% | -28.7% | 0.159 |

## Recommandations

- odds:5.00+: surveiller (ROI flat négatif, sample faible).
- league:fra.1: surveiller (ROI flat négatif, sample faible).
- odds:1.50-2.00: surveiller (ROI flat négatif, Brier élevé, sample faible).
- league:premierdivision: surveiller (Brier élevé, sample faible).
- league:mex.1: surveiller (ROI flat négatif, sample faible).

## Limites assumées

- Le repo local contient la fenêtre disponible dans backtest_training_rows.jsonl ; la demande 24 mois est documentée même si le sample actuel est plus court.
- Les marchés hors 1N2 utilisent les agrégats existants tant que le row-level multi-market complet n'est pas historisé.

