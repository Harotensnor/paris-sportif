# Ensemble Model Validation

- Generated: `2026-05-03T18:09:23Z`
- Status: **ok**
- Historical predictions: **701 / 701**
- Ensemble Brier: **0.2333** vs random 0.2500
- High disagreement (>0.15 variance): **0**
- Current upcoming checked: **266**, predictions **266**

## Component Comparison

| Kind | N | Avg weight | Component Brier | Ensemble same rows | Δ component-ensemble |
|---|---:|---:|---:|---:|---:|
| dixon_coles_xg | 501 | 0.5 | 0.2391 | 0.235 | 0.0041 |
| elo | 34 | 0.3 | 0.2852 | 0.2524 | 0.0327 |
| form | 103 | 0.3 | 0.2376 | 0.2256 | 0.0121 |

## Warnings

- Aucun sous-modele ne bat l'ensemble de plus de 0.010 Brier sur un sample >=30.

## Current Snapshot

- Component counts: `{'n': 266, 'avg': 2.1992, 'p95': 3.0, 'max': 4.0}`
- Variance: `{'n': 266, 'avg': 0.0082, 'p95': 0.0432, 'max': 0.0787}`
- V36 tier counts: `{'tier3_valeur': 15, 'tier2_solide': 15, 'opportunity_other': 224, 'tier4_big_odds': 12}`
- V36 qualified tier picks: **42**
- V36 strict tier picks: **7**
