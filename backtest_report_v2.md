# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-27T06:53:12Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 634 picks sur 2026-06-06T23:35Z → 2026-07-26T21:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 108.3u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **634 picks** · 366 gagnés / 268 perdus · WR **57.7%**
- ROI flat (1u/pick) : **+0.28%** (+1.77u cumulé)
- Kelly 0.25× cap 10% : cumulé **+8.30u**
- Cote moyenne : 1.77 · Pick prob moyenne : 55.1%
- **Brier** : 0.2399 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6727 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1083.04€** (+8.3%) · DD max 12.2% · Sharpe/pick +0.021

## Séries

- Streak courante : ❄️ **1** loses consécutifs
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
| `skip` | 634 | 58% | 54–62% | 🟢 +0.3% | +8.30u | 0.2399 | -2.7pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 634 | 0.0353 | 0.172 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 452 | 58% | 🔴 -1.6% | +0.00u | 0.2438 |
| football | 140 | 54% | 🟢 +4.4% | +8.30u | 0.2337 |
| basketball | 39 | 69% | 🟢 +1.5% | +0.00u | 0.2184 |
| hockey | 3 | 100% | 🟢 +79.0% | +0.00u | 0.221 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 452 | 58% | 🔴 -1.6% | 0.2438 |
| `football:other` | 140 | 54% | 🟡 +4.4% | 0.2337 |
| `basketball:all` | 39 | 69% | 🟡 +1.5% | 0.2184 |
| `hockey:all` | 3 | 100% | 🟢 +79.0% | 0.221 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 75 | 65% | 🔴 -11.3% | 0.2169 |
| fav | 497 | 59% | 🟢 +2.2% | 0.2438 |
| toss_up | 48 | 46% | 🟢 +9.0% | 0.2502 |
| dog | 14 | 21% | 🔴 -34.6% | 0.1916 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 28 | 37.3% | 35.7% | ⚪ -1.6% |
| [0.4–0.5] | 80 | 47.1% | 53.7% | 🟢 +6.6% |
| [0.5–0.6] | 396 | 54.3% | 57.3% | ⚪ +3.0% |
| [0.6–0.7] | 104 | 63.9% | 62.5% | ⚪ -1.4% |
| [0.7–0.8] | 20 | 73.7% | 85.0% | 🟢 +11.3% |
| [0.8–0.9] | 6 | 83.8% | 66.7% | 🔴 -17.2% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 452 | 58% | 🔴 -1.6% | 0.2438 |
| `wnba` | 37 | 70% | 🟢 +2.3% | 0.2169 |
| `chn.1` | 34 | 62% | 🟢 +25.5% | 0.2551 |
| `nor.1` | 15 | 53% | 🔴 -8.0% | 0.2353 |
| `allsvenskan` | 13 | 69% | 🟢 +21.4% | 0.2206 |
| `ligamx` | 13 | 46% | 🔴 -18.7% | 0.2283 |
| `swe.1` | 10 | 50% | 🔴 -8.9% | 0.2611 |
| `uru.1` | 8 | 38% | 🔴 -6.2% | 0.2414 |
| `conmebol.sudamericana` | 7 | 86% | 🟢 +50.0% | 0.1779 |
| `ecu.1` | 6 | 33% | 🔴 -31.4% | 0.2448 |
