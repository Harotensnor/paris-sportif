# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-26T06:27:22Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 632 picks sur 2026-06-04T23:40Z → 2026-07-25T21:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 117.65u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **632 picks** · 369 gagnés / 263 perdus · WR **58.4%**
- ROI flat (1u/pick) : **+1.30%** (+8.24u cumulé)
- Kelly 0.25× cap 10% : cumulé **+17.65u**
- Cote moyenne : 1.77 · Pick prob moyenne : 55.2%
- **Brier** : 0.2403 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6735 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1176.50€** (+17.6%) · DD max 6.8% · Sharpe/pick +0.045

## Séries

- Streak courante : 🔥 **3** wins consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **7**
- Top run win : 10 picks (2026-06-30T23:40Z → 2026-07-01T17:10Z)
- Top run lose : 7 picks (2026-07-10T23:50Z → 2026-07-11T02:15Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 632 | 58% | 55–62% | 🟢 +1.3% | +17.65u | 0.2403 | -2.8pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 632 | 0.0364 | 0.172 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 464 | 58% | 🔴 -1.5% | +0.00u | 0.2441 |
| football | 123 | 57% | 🟢 +9.8% | +17.65u | 0.2331 |
| basketball | 41 | 68% | 🟢 +0.6% | +0.00u | 0.2214 |
| hockey | 4 | 100% | 🟢 +74.7% | +0.00u | 0.2083 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 464 | 58% | 🔴 -1.5% | 0.2441 |
| `football:other` | 123 | 57% | 🟢 +9.8% | 0.2331 |
| `basketball:all` | 41 | 68% | 🟡 +0.6% | 0.2214 |
| `hockey:all` | 4 | 100% | 🟢 +74.7% | 0.2083 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 72 | 64% | 🔴 -13.3% | 0.2231 |
| fav | 506 | 59% | 🟢 +2.3% | 0.2424 |
| toss_up | 43 | 53% | 🟢 +25.9% | 0.2581 |
| dog | 11 | 18% | 🔴 -44.1% | 0.1841 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 25 | 37.3% | 36.0% | ⚪ -1.3% |
| [0.4–0.5] | 74 | 47.3% | 58.1% | 🟢 +10.8% |
| [0.5–0.6] | 409 | 54.3% | 57.0% | ⚪ +2.6% |
| [0.6–0.7] | 101 | 63.9% | 64.4% | ⚪ +0.5% |
| [0.7–0.8] | 17 | 73.5% | 88.2% | 🟢 +14.7% |
| [0.8–0.9] | 6 | 83.8% | 66.7% | 🔴 -17.2% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 464 | 58% | 🔴 -1.5% | 0.2441 |
| `wnba` | 38 | 71% | 🟢 +4.0% | 0.2159 |
| `chn.1` | 30 | 63% | 🟢 +29.3% | 0.2565 |
| `allsvenskan` | 13 | 69% | 🟢 +21.4% | 0.2206 |
| `ligamx` | 13 | 46% | 🔴 -18.7% | 0.2283 |
| `nor.1` | 10 | 50% | 🔴 -13.5% | 0.2047 |
| `jpn.1` | 9 | 33% | 🔴 -28.3% | 0.2616 |
| `conmebol.sudamericana` | 7 | 86% | 🟢 +50.0% | 0.1779 |
| `uru.1` | 7 | 43% | 🟢 +7.2% | 0.2433 |
| `swe.1` | 6 | 67% | 🟢 +27.1% | 0.2387 |
