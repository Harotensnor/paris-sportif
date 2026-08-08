# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-08T04:44:42Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 470 picks sur 2026-06-29T22:35Z → 2026-08-07T21:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 113.03u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **470 picks** · 269 gagnés / 201 perdus · WR **57.2%**
- ROI flat (1u/pick) : **+2.04%** (+9.61u cumulé)
- Kelly 0.25× cap 10% : cumulé **+13.03u**
- Cote moyenne : 1.85 · Pick prob moyenne : 54.1%
- **Brier** : 0.2368 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6658 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1130.28€** (+13.0%) · DD max 12.2% · Sharpe/pick +0.030

## Séries

- Streak courante : ❄️ **2** loses consécutifs
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
| `skip` | 470 | 57% | 53–62% | 🟢 +2.0% | +13.03u | 0.2368 | -2.2pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 470 | 0.0386 | 0.12 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 230 | 55% | 🟢 +3.5% | +13.03u | 0.2307 |
| baseball | 221 | 60% | 🟢 +2.8% | +0.00u | 0.2415 |
| basketball | 19 | 53% | 🔴 -24.3% | +0.00u | 0.2561 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 230 | 55% | 🟡 +3.5% | 0.2307 |
| `baseball:all` | 221 | 60% | 🟡 +2.8% | 0.2415 |
| `basketball:all` | 19 | 53% | 🔴 -24.3% | 0.2561 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 66 | 64% | 🔴 -14.3% | 0.2176 |
| fav | 305 | 61% | 🟢 +5.2% | 0.2401 |
| toss_up | 73 | 49% | 🟢 +14.7% | 0.2562 |
| dog | 26 | 23% | 🔴 -28.5% | 0.1921 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 45 | 37.1% | 35.6% | ⚪ -1.6% |
| [0.4–0.5] | 84 | 45.7% | 50.0% | ⚪ +4.3% |
| [0.5–0.6] | 245 | 54.7% | 58.8% | ⚪ +4.1% |
| [0.6–0.7] | 68 | 64.9% | 63.2% | ⚪ -1.6% |
| [0.7–0.8] | 22 | 74.3% | 86.4% | 🟢 +12.0% |
| [0.8–0.9] | 6 | 82.6% | 83.3% | ⚪ +0.8% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 221 | 60% | 🟢 +2.8% | 0.2415 |
| `chn.1` | 35 | 60% | 🟢 +19.9% | 0.2686 |
| `nor.1` | 23 | 61% | 🟢 +8.4% | 0.2246 |
| `wnba` | 19 | 53% | 🔴 -24.3% | 0.2561 |
| `ligamx` | 18 | 39% | 🔴 -33.2% | 0.2361 |
| `swe.1` | 17 | 53% | 🔴 -6.3% | 0.2652 |
| `conmebol.sudamericana` | 14 | 86% | 🟢 +57.6% | 0.2289 |
| `uru.1` | 14 | 50% | 🟢 +10.4% | 0.2338 |
| `allsvenskan` | 13 | 69% | 🟢 +21.4% | 0.2206 |
| `arg.1` | 13 | 31% | 🔴 -26.5% | 0.2098 |
