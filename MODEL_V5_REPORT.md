# MODEL_V5_REPORT

Generated: `2026-05-05T22:57:31Z`

## Section B — Stacking meta-apprentissage

- Status: **trained**
- Trainer: `bounded_logistic_regression`
- Rows: `49`
- Rolling-origin baseline Brier: `0.1730`
- Rolling-origin V5 meta Brier: `0.2050`
- Delta Brier: `+0.0320`

Top coefficients:

| Feature | Weight |
|---|---:|
| log_odd | -0.9505 |
| xg_prob | +0.4476 |
| base_prob | +0.4352 |
| implied_prob | +0.4352 |
| lightgbm_prob | +0.4347 |
| bayesian_prob | +0.4167 |
| injury_diff | +0.2164 |
| elo_prob | +0.1944 |
| is_tennis | -0.1275 |
| is_football | -0.1168 |

Guardrail: browser runtime clamps the stacking influence to ±2.5pt and only nudges when the meta-model differs from the current confidence by at least 0.4pt.

## Section G — Pondération adaptative ensemble

- Status: **ok**
- Artifact: `ensemble_adaptive_weights.json`
- Policy: validation Brier + importance stacking + pénalité drift, avec bornes conservatrices.
- Drift state: `warning`, pénalité appliquée `0.9500`.

Top weights:

| Component | Weight |
|---|---:|
| dixon_coles_xg | 20.6% |
| market | 19.6% |
| form | 8.4% |
| elo | 7.4% |
| empirical_xg | 7.0% |

Guardrail: les poids sont normalisés par sport et bornés côté runtime entre 4% et 55%, donc un signal utile peut monter sans écraser le consensus.

## Section H — Prediction intervals

- Status: **active**
- Method: bootstrap déterministe V5, 100 runs par pick.
- Interval: P10-P90, affiché en modal sous forme `[confiance lo-hi%]`.
- Inputs: dispersion des sous-modèles, variance d'accord, qualité data et drift features.

Guardrail: le Wilson 95% historique reste disponible en fallback, mais la modal privilégie désormais la fourchette bootstrap V5 pour parler d'incertitude propre au match.

## Section I — Cold start handling

- Status: **active**
- Artifact: `cold_start_v5.json`
- Coverage: `3730` équipes connues, dont `3337` en cold start strict (`sample_size < 5`).
- Policy: fallback ligue/sport pour les équipes nouvelles, variance `×1.25`, confidence decay `0.88`, edge requis `+2pt`.
- Runtime: `predictMatch` réduit la confiance des équipes cold start et ajoute `cold_start_edge_lt_2pt` si le pick ne compense pas l'incertitude.

Guardrail: la règle ne bloque pas silencieusement le tableau entier ; elle ne s'applique qu'aux équipes réellement peu observées et reste visible dans `?debug=1` + modal détail via le badge `Cold start V5`.

## Section J — Multi-task learning

- Status: **active**
- Artifact: `multitask_v5.json`
- Tasks: `1n2`, `ou_25`, `btts`, `exact_score`
- Loss policy: `weighted_market_loss_gated_no_worse_than_baseline`
- Brier guardrail: chaque branche garde `v5_brier <= baseline_brier`; la branche score exact reste neutre tant que le sample ligne par ligne manque.

Task weights:

| Task | Weight |
|---|---:|
| 1N2 | 43.3% |
| O/U 2.5 | 25.3% |
| BTTS | 25.3% |
| Score exact | 6.1% |

Guardrail: la couche multi-task expose la vérité par marché dans `?debug=1` et Crédibilité, mais ne force aucun ajustement agressif sans preuve backtest.
