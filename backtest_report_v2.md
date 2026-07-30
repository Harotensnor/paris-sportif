# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-30T06:16:26Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 538 picks sur 2026-06-15T22:40Z → 2026-07-30T00:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 109.29u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **538 picks** · 304 gagnés / 234 perdus · WR **56.5%**
- ROI flat (1u/pick) : **-1.91%** (-10.28u cumulé)
- Kelly 0.25× cap 10% : cumulé **+9.29u**
- Cote moyenne : 1.78 · Pick prob moyenne : 55.1%
- **Brier** : 0.2389 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6709 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1092.91€** (+9.3%) · DD max 8.9% · Sharpe/pick +0.025

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
| `skip` | 538 | 57% | 52–61% | 🔴 -1.9% | +9.29u | 0.2389 | -2.6pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 538 | 0.0264 | 0.235 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 357 | 57% | 🔴 -2.7% | +0.00u | 0.2433 |
| football | 147 | 52% | 🔴 -0.3% | +9.29u | 0.2309 |
| basketball | 34 | 68% | 🔴 -0.8% | +0.00u | 0.2275 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 357 | 57% | 🔴 -2.7% | 0.2433 |
| `football:other` | 147 | 52% | 🔴 -0.3% | 0.2309 |
| `basketball:all` | 34 | 68% | 🔴 -0.8% | 0.2275 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 70 | 61% | 🔴 -16.3% | 0.23 |
| fav | 406 | 58% | 🟢 +1.0% | 0.2418 |
| toss_up | 45 | 47% | 🟢 +11.2% | 0.2499 |
| dog | 17 | 18% | 🔴 -46.2% | 0.1783 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 29 | 37.0% | 34.5% | ⚪ -2.5% |
| [0.4–0.5] | 70 | 46.9% | 50.0% | ⚪ +3.1% |
| [0.5–0.6] | 321 | 54.4% | 56.4% | ⚪ +1.9% |
| [0.6–0.7] | 96 | 64.2% | 62.5% | ⚪ -1.7% |
| [0.7–0.8] | 17 | 74.1% | 88.2% | 🟢 +14.1% |
| [0.8–0.9] | 5 | 83.5% | 60.0% | 🔴 -23.5% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 357 | 57% | 🔴 -2.7% | 0.2433 |
| `chn.1` | 34 | 59% | 🟢 +18.9% | 0.2443 |
| `wnba` | 34 | 68% | 🔴 -0.8% | 0.2275 |
| `ligamx` | 18 | 39% | 🔴 -33.2% | 0.2361 |
| `nor.1` | 16 | 56% | 🔴 -4.2% | 0.2151 |
| `allsvenskan` | 13 | 69% | 🟢 +21.4% | 0.2206 |
| `conmebol.sudamericana` | 11 | 64% | 🟢 +11.3% | 0.2027 |
| `swe.1` | 11 | 45% | 🔴 -17.1% | 0.2627 |
| `uru.1` | 8 | 38% | 🔴 -6.2% | 0.2378 |
| `ecu.1` | 7 | 29% | 🔴 -41.2% | 0.254 |
