# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-31T06:34:57Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 493 picks sur 2026-06-18T22:40Z → 2026-07-30T00:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 109.21u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **493 picks** · 273 gagnés / 220 perdus · WR **55.4%**
- ROI flat (1u/pick) : **-3.28%** (-16.15u cumulé)
- Kelly 0.25× cap 10% : cumulé **+9.21u**
- Cote moyenne : 1.80 · Pick prob moyenne : 55.0%
- **Brier** : 0.241 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6753 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1092.05€** (+9.2%) · DD max 9.1% · Sharpe/pick +0.026

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
| `skip` | 493 | 55% | 51–60% | 🔴 -3.3% | +9.21u | 0.241 | -2.5pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 493 | 0.0267 | 0.235 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 318 | 56% | 🔴 -4.5% | +0.00u | 0.2453 |
| football | 147 | 53% | 🟢 +0.8% | +9.21u | 0.2304 |
| basketball | 28 | 61% | 🔴 -11.2% | +0.00u | 0.2489 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 318 | 56% | 🔴 -4.5% | 0.2453 |
| `football:other` | 147 | 53% | 🟡 +0.8% | 0.2304 |
| `basketball:all` | 28 | 61% | 🔴 -11.2% | 0.2489 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 65 | 60% | 🔴 -18.2% | 0.2357 |
| fav | 365 | 57% | 🔴 -0.7% | 0.2437 |
| toss_up | 46 | 48% | 🟢 +13.4% | 0.251 |
| dog | 17 | 18% | 🔴 -46.2% | 0.1783 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 29 | 37.0% | 34.5% | ⚪ -2.5% |
| [0.4–0.5] | 68 | 46.8% | 50.0% | ⚪ +3.2% |
| [0.5–0.6] | 290 | 54.4% | 55.5% | ⚪ +1.1% |
| [0.6–0.7] | 85 | 64.3% | 60.0% | ⚪ -4.3% |
| [0.7–0.8] | 16 | 73.5% | 87.5% | 🟢 +14.0% |
| [0.8–0.9] | 5 | 83.5% | 60.0% | 🔴 -23.5% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 318 | 56% | 🔴 -4.5% | 0.2453 |
| `chn.1` | 34 | 59% | 🟢 +18.9% | 0.2443 |
| `wnba` | 28 | 61% | 🔴 -11.2% | 0.2489 |
| `ligamx` | 18 | 39% | 🔴 -33.2% | 0.2361 |
| `nor.1` | 16 | 56% | 🔴 -4.2% | 0.2151 |
| `allsvenskan` | 13 | 69% | 🟢 +21.4% | 0.2206 |
| `conmebol.sudamericana` | 11 | 73% | 🟢 +26.2% | 0.1953 |
| `swe.1` | 11 | 45% | 🔴 -17.1% | 0.2627 |
| `uru.1` | 8 | 38% | 🔴 -6.2% | 0.2378 |
| `ecu.1` | 7 | 29% | 🔴 -41.2% | 0.254 |
