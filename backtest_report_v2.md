# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-20T06:36:50Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 719 picks sur 2026-05-29T00:30Z → 2026-07-19T14:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 121.5u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **719 picks** · 414 gagnés / 305 perdus · WR **57.6%**
- ROI flat (1u/pick) : **+0.01%** (+0.05u cumulé)
- Kelly 0.25× cap 10% : cumulé **+21.50u**
- Cote moyenne : 1.76 · Pick prob moyenne : 55.0%
- **Brier** : 0.2415 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6759 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1215.01€** (+21.5%) · DD max 6.6% · Sharpe/pick +0.048

## Séries

- Streak courante : 🔥 **3** wins consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **7**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 7 picks (2026-07-10T23:50Z → 2026-07-11T02:15Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 719 | 58% | 54–61% | 🟢 +0.0% | +21.50u | 0.2415 | -3.0pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 719 | 0.0315 | 0.173 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 544 | 57% | 🔴 -2.6% | +0.00u | 0.2442 |
| football | 126 | 56% | 🟢 +9.7% | +21.50u | 0.2372 |
| basketball | 44 | 68% | 🟢 +0.7% | +0.00u | 0.2208 |
| hockey | 5 | 80% | 🟢 +39.8% | +0.00u | 0.2357 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 544 | 57% | 🔴 -2.6% | 0.2442 |
| `football:other` | 126 | 56% | 🟢 +9.7% | 0.2372 |
| `basketball:all` | 44 | 68% | 🟡 +0.7% | 0.2208 |
| `hockey:all` | 5 | 80% | 🟢 +39.8% | 0.2357 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 79 | 65% | 🔴 -11.8% | 0.2236 |
| fav | 585 | 57% | 🔴 -0.4% | 0.2434 |
| toss_up | 40 | 52% | 🟢 +20.6% | 0.2512 |
| dog | 15 | 40% | 🟢 +24.3% | 0.2336 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 27 | 37.0% | 33.3% | ⚪ -3.6% |
| [0.4–0.5] | 79 | 46.8% | 58.2% | 🟢 +11.4% |
| [0.5–0.6] | 480 | 54.4% | 56.0% | ⚪ +1.7% |
| [0.6–0.7] | 112 | 63.8% | 65.2% | ⚪ +1.3% |
| [0.7–0.8] | 15 | 73.1% | 86.7% | 🟢 +13.6% |
| [0.8–0.9] | 6 | 84.0% | 66.7% | 🔴 -17.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 544 | 57% | 🔴 -2.6% | 0.2442 |
| `wnba` | 39 | 72% | 🟢 +5.0% | 0.2134 |
| `chn.1` | 30 | 60% | 🟢 +20.7% | 0.244 |
| `allsvenskan` | 17 | 59% | 🟢 +5.8% | 0.2286 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `eliteserien` | 15 | 80% | 🟢 +46.2% | 0.2212 |
| `esp.2` | 9 | 78% | 🟢 +31.8% | 0.1901 |
| `ligamx` | 9 | 44% | 🔴 -21.9% | 0.2158 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `uru.1` | 6 | 50% | 🟢 +25.1% | 0.2469 |
