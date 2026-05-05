# MODEL_V5_REPORT

Generated: `2026-05-06T00:00:00Z`

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

## Section K — Backtest deep

- Status: **active**
- Artifact: `backtest_deep_v5.json`
- Report: `BACKTEST_DEEP_V5.md`
- Breakdown: sport, ligue, bucket de cote, marché, mois et météo.
- Worst zones: 5 zones triées par risque ROI/Brier, avec recommandations.

Limitation documentée: le repo local ne contient actuellement que la fenêtre historisée disponible dans `backtest_training_rows.jsonl`; la demande 24 mois est conservée dans l'artefact, sans inventer d'historique absent.

## Section L — Self-evaluation framework

- Status: **active**
- Runtime: `selfEvaluateConfidenceV5(match, pred, best)`
- Output: `confidence_in_confidence ∈ [0,1]`, label, factors et penalty.
- Guardrail: si la méta-confiance passe sous `0.40`, le score qualité et le score d'opportunité reçoivent un malus visible.
- UI: la modal détail affiche `méta-confiance XX%` dans la décomposition fiabilité.

Facteurs utilisés: consensus inter-signaux, richesse data, nombre de composantes, largeur de l'intervalle bootstrap V5, variance ensemble, edge, cold start, drift feature et abstain.

## Section M — Adversarial validation

- Status: **active**
- Artifact: `adversarial_validation.json`
- Split: chronologique 65/35 sur `backtest_training_rows.jsonl`
- AUC train/test: `0.892` avec seuil d'alerte `0.600`
- Test synthétique: AUC `0.934`, drift correctement détecté.
- UI: Crédibilité et Santé affichent le statut, l'AUC et les top shifts.

Interprétation: le sample local est encore court (`49` lignes), donc l'alerte bloque surtout la promotion automatique agressive. Elle indique que les lignes récentes diffèrent assez du train historique pour garder V5 en rollout prudent jusqu'à plus de picks settled.

## Section N — Vérification finale

- Status: **clôturé v37.014**
- Playwright V5: `26/26` desktop + mobile.
- Syntaxe: `app.js` parse OK via `new Function(app.js)`.
- Drift pipeline: `python scripts/check_pipeline_drift.py` OK, `0` divergence auto_refresh vs refresh.yml.
- Health: `python scripts/build_health.py` génère `overall=warning` avec `67` warnings non bloquants.
- Freshness: `python scripts/check_pipeline_freshness.py` OK, `data.js` âgé de `3 min` après refresh local.
- Captures: `captures/v37.014/accueil.png`, `tous.png`, `performance.png`, `credibilite.png`.

Matrice V5:

| Item | Résultat |
|---|---|
| Bayesian priors | `3730` équipes, `769` joueurs |
| Stacking meta | entraîné, influence runtime clampée ±2.5pt |
| Feature engineering | ranking exposé dans `?debug=1` |
| Online learning prep | `model_versions.json`, rollout 10% → 50% → 100% |
| Drift detection | KL features actif, adversarial AUC `0.892` en alerte prudente |
| Calibration | par sport, corrections appliquées seulement si gain Brier ≥ `0.005` |
| Ensemble adaptatif | poids bornés et recalculables chaque dimanche |
| Prediction intervals | P10-P90 visibles en modal |
| Cold start | edge +2pt et variance augmentée pour équipes peu observées |
| Multi-task | 1N2 / O-U 2.5 / BTTS / score exact gated no-worse |
| Backtest deep | `BACKTEST_DEEP_V5.md` + breakdowns 6 familles |
| Self-evaluation | `confidence_in_confidence` et malus si < `0.40` |

Décision: V5 est livré comme couche prudente et auditable. La promotion agressive reste bloquée tant que l'historique settled local est court ; la fraîcheur data est revenue sous 30 minutes sur cette passe.
