# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-01T08:57:48Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 519 picks sur 2026-08-15T09:00Z → 2026-08-31T19:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 29812.91u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **519 picks** · 318 gagnés / 201 perdus · WR **61.3%**
- ROI flat (1u/pick) : **+24.47%** (+126.98u cumulé)
- Kelly 0.25× cap 10% : cumulé **+29712.91u**
- Cote moyenne : 2.13 · Pick prob moyenne : 53.6%
- **Brier** : 0.2234 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6364 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **298129.08€** (+29712.9%) · DD max 22.8% · Sharpe/pick +0.316

## Séries

- Streak courante : 🔥 **7** wins consécutifs
- Plus longue série gagnante : **9**
- Plus longue série perdante : **5**
- Top run win : 9 picks (2026-08-15T19:30Z → 2026-08-15T21:30Z)
- Top run lose : 5 picks (2026-08-15T18:00Z → 2026-08-15T18:30Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 519 | 61% | 57–65% | 🟢 +24.5% | +29712.91u | 0.2234 | +2.4pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 519 | 0.0768 | 0.11 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 467 | 63% | 🟢 +28.9% | +29712.91u | 0.2207 |
| baseball | 45 | 44% | 🔴 -22.9% | +0.00u | 0.2575 |
| basketball | 7 | 86% | 🟢 +35.9% | +0.00u | 0.1808 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 387 | 62% | 🟢 +30.5% | 0.2207 |
| `football:top5` | 80 | 64% | 🟢 +21.1% | 0.2208 |
| `baseball:all` | 45 | 44% | 🔴 -22.9% | 0.2575 |
| `basketball:all` | 7 | 86% | 🟢 +35.9% | 0.1808 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 78 | 79% | 🟢 +6.6% | 0.1538 |
| fav | 204 | 61% | 🟢 +7.2% | 0.2245 |
| toss_up | 142 | 61% | 🟢 +42.8% | 0.2501 |
| dog | 95 | 46% | 🟢 +49.0% | 0.2382 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 76 | 36.6% | 40.8% | ⚪ +4.2% |
| [0.4–0.5] | 159 | 45.4% | 54.7% | 🟢 +9.3% |
| [0.5–0.6] | 136 | 54.8% | 60.3% | 🟢 +5.4% |
| [0.6–0.7] | 85 | 64.3% | 75.3% | 🟢 +10.9% |
| [0.7–0.8] | 44 | 74.5% | 81.8% | 🟢 +7.3% |
| [0.8–0.9] | 18 | 83.4% | 94.4% | 🟢 +11.0% |
| [0.9–1.0] | 1 | 93.5% | 100.0% | 🟢 +6.5% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 45 | 44% | 🔴 -22.9% | 0.2575 |
| `eng.4` | 24 | 75% | 🟢 +91.4% | 0.2404 |
| `eng.3` | 23 | 57% | 🟢 +27.4% | 0.2063 |
| `eng.2` | 22 | 73% | 🟢 +86.4% | 0.2278 |
| `eng.1` | 20 | 60% | 🟢 +16.3% | 0.2442 |
| `esp.2` | 20 | 60% | 🟢 +38.7% | 0.206 |
| `jpn.1` | 19 | 68% | 🟢 +42.0% | 0.2364 |
| `ita.1` | 18 | 72% | 🟢 +20.0% | 0.1936 |
| `ned.1` | 18 | 72% | 🟢 +21.7% | 0.2118 |
| `bel.1` | 17 | 53% | 🟢 +6.2% | 0.1899 |
