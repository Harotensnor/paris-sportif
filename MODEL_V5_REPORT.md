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
