# Ensemble Model Validation

- Generated: `2026-05-03T19:32:47Z`
- Status: **ok**
- Historical predictions: **714 / 714**
- Ensemble Brier: **0.2355** vs random 0.2500
- High disagreement (>0.15 variance): **0**
- Current upcoming checked: **254**, predictions **254**

## Component Comparison

| Kind | N | Avg weight | Component Brier | Ensemble same rows | Δ component-ensemble |
|---|---:|---:|---:|---:|---:|
| dixon_coles_xg | 512 | 0.5 | 0.242 | 0.2364 | 0.0057 |
| elo | 36 | 0.3 | 0.2889 | 0.2523 | 0.0366 |
| form | 90 | 0.3 | 0.2471 | 0.2428 | 0.0043 |

## Warnings

- Aucun sous-modele ne bat l'ensemble de plus de 0.010 Brier sur un sample >=30.

## Current Snapshot

- Component counts: `{'n': 254, 'avg': 2.2047, 'p95': 4.0, 'max': 4.0}`
- Variance: `{'n': 254, 'avg': 0.008, 'p95': 0.0432, 'max': 0.0787}`
- V36 tier counts: `{'tier2_solide': 12, 'tier3_valeur': 13, 'opportunity_other': 214, 'tier1_sur': 1, 'tier4_big_odds': 13, 'unpriced': 1}`
- V36 qualified tier picks: **39**
- V36 strict tier picks: **7**
