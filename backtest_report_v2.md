# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-23T06:22:16Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 688 picks sur 2026-05-30T19:00Z → 2026-07-22T03:05Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 124.78u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **688 picks** · 394 gagnés / 294 perdus · WR **57.3%**
- ROI flat (1u/pick) : **-1.06%** (-7.32u cumulé)
- Kelly 0.25× cap 10% : cumulé **+24.78u**
- Cote moyenne : 1.76 · Pick prob moyenne : 55.3%
- **Brier** : 0.2408 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6745 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1247.83€** (+24.8%) · DD max 6.6% · Sharpe/pick +0.053

## Séries

- Streak courante : ❄️ **1** loses consécutifs
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
| `skip` | 688 | 57% | 54–61% | 🔴 -1.1% | +24.78u | 0.2408 | -2.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 688 | 0.0283 | 0.172 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 528 | 57% | 🔴 -3.3% | +0.00u | 0.2445 |
| football | 112 | 55% | 🟢 +7.6% | +24.78u | 0.2304 |
| basketball | 43 | 67% | 🔴 -0.3% | +0.00u | 0.2231 |
| hockey | 5 | 80% | 🟢 +39.8% | +0.00u | 0.2357 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 528 | 57% | 🔴 -3.3% | 0.2445 |
| `football:other` | 112 | 55% | 🟢 +7.6% | 0.2304 |
| `basketball:all` | 43 | 67% | 🔴 -0.3% | 0.2231 |
| `hockey:all` | 5 | 80% | 🟢 +39.8% | 0.2357 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 79 | 65% | 🔴 -11.7% | 0.2226 |
| fav | 559 | 57% | 🔴 -0.8% | 0.2436 |
| toss_up | 38 | 50% | 🟢 +15.0% | 0.2452 |
| dog | 12 | 33% | 🟢 +6.2% | 0.2162 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 19 | 36.7% | 26.3% | 🔴 -10.4% |
| [0.4–0.5] | 77 | 47.2% | 57.1% | 🟢 +10.0% |
| [0.5–0.6] | 458 | 54.4% | 55.5% | ⚪ +1.1% |
| [0.6–0.7] | 113 | 63.9% | 65.5% | ⚪ +1.6% |
| [0.7–0.8] | 15 | 73.7% | 86.7% | 🟢 +13.0% |
| [0.8–0.9] | 6 | 83.9% | 66.7% | 🔴 -17.2% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 528 | 57% | 🔴 -3.3% | 0.2445 |
| `wnba` | 39 | 72% | 🟢 +5.5% | 0.2149 |
| `chn.1` | 28 | 61% | 🟢 +23.2% | 0.2426 |
| `allsvenskan` | 16 | 56% | 🔴 -1.4% | 0.2078 |
| `ligamx` | 11 | 45% | 🔴 -21.8% | 0.2159 |
| `jpn.1` | 10 | 40% | 🔴 -4.0% | 0.2787 |
| `esp.2` | 9 | 78% | 🟢 +31.8% | 0.1901 |
| `nor.1` | 9 | 67% | 🟢 +36.1% | 0.2323 |
| `uru.1` | 6 | 50% | 🟢 +25.1% | 0.2469 |
| `eliteserien` | 5 | 100% | 🟢 +75.0% | 0.2093 |
