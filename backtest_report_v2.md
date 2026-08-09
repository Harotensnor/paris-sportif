# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-09T04:53:32Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 478 picks sur 2026-07-01T16:35Z → 2026-08-08T19:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 174.62u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **478 picks** · 273 gagnés / 205 perdus · WR **57.1%**
- ROI flat (1u/pick) : **+1.93%** (+9.22u cumulé)
- Kelly 0.25× cap 10% : cumulé **+74.62u**
- Cote moyenne : 1.87 · Pick prob moyenne : 54.3%
- **Brier** : 0.2321 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6562 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1746.16€** (+74.6%) · DD max 16.1% · Sharpe/pick +0.089

## Séries

- Streak courante : 🔥 **2** wins consécutifs
- Plus longue série gagnante : **7**
- Plus longue série perdante : **7**
- Top run win : 7 picks (2026-07-07T02:10Z → 2026-07-07T22:40Z)
- Top run lose : 7 picks (2026-07-10T23:50Z → 2026-07-11T02:15Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 478 | 57% | 53–61% | 🟢 +1.9% | +74.62u | 0.2321 | -1.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 478 | 0.0491 | 0.093 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 266 | 56% | 🟢 +4.4% | +74.62u | 0.222 |
| baseball | 193 | 59% | 🟢 +1.1% | +0.00u | 0.2437 |
| basketball | 19 | 53% | 🔴 -24.3% | +0.00u | 0.2561 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 266 | 56% | 🟡 +4.4% | 0.222 |
| `baseball:all` | 193 | 59% | 🟡 +1.1% | 0.2437 |
| `basketball:all` | 19 | 53% | 🔴 -24.3% | 0.2561 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 76 | 64% | 🔴 -13.3% | 0.2139 |
| fav | 291 | 61% | 🟢 +5.4% | 0.2367 |
| toss_up | 80 | 51% | 🟢 +20.1% | 0.2546 |
| dog | 30 | 20% | 🔴 -38.5% | 0.1786 |
| heavy_dog | 1 | 0% | 🔴 -100.0% | 0.1078 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 51 | 36.8% | 27.5% | 🔴 -9.3% |
| [0.4–0.5] | 86 | 45.6% | 51.2% | 🟢 +5.6% |
| [0.5–0.6] | 232 | 54.7% | 59.9% | 🟢 +5.2% |
| [0.6–0.7] | 70 | 64.6% | 64.3% | ⚪ -0.3% |
| [0.7–0.8] | 32 | 73.8% | 78.1% | ⚪ +4.3% |
| [0.8–0.9] | 7 | 82.0% | 85.7% | ⚪ +3.7% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 193 | 59% | 🟢 +1.1% | 0.2437 |
| `chn.1` | 35 | 60% | 🟢 +19.9% | 0.2609 |
| `football.cup` | 30 | 60% | 🔴 -3.0% | 0.163 |
| `nor.1` | 23 | 61% | 🟢 +8.4% | 0.2242 |
| `wnba` | 19 | 53% | 🔴 -24.3% | 0.2561 |
| `ligamx` | 18 | 39% | 🔴 -33.2% | 0.2361 |
| `swe.1` | 17 | 53% | 🔴 -6.3% | 0.2555 |
| `conmebol.sudamericana` | 14 | 86% | 🟢 +57.6% | 0.2356 |
| `uru.1` | 14 | 29% | 🔴 -55.3% | 0.1944 |
| `allsvenskan` | 13 | 69% | 🟢 +21.4% | 0.2206 |
