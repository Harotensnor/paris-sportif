# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-01T06:19:06Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 460 picks sur 2026-06-21T22:00Z → 2026-07-31T19:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 107.19u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **460 picks** · 257 gagnés / 203 perdus · WR **55.9%**
- ROI flat (1u/pick) : **-2.12%** (-9.75u cumulé)
- Kelly 0.25× cap 10% : cumulé **+7.19u**
- Cote moyenne : 1.80 · Pick prob moyenne : 54.9%
- **Brier** : 0.241 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6752 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1071.89€** (+7.2%) · DD max 10.3% · Sharpe/pick +0.022

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
| `skip` | 460 | 56% | 51–60% | 🔴 -2.1% | +7.19u | 0.241 | -2.6pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 460 | 0.0264 | 0.235 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 284 | 57% | 🔴 -2.9% | +0.00u | 0.2442 |
| football | 152 | 55% | 🟢 +2.6% | +7.19u | 0.2314 |
| basketball | 24 | 54% | 🔴 -22.7% | +0.00u | 0.2639 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 284 | 57% | 🔴 -2.9% | 0.2442 |
| `football:other` | 152 | 55% | 🟡 +2.6% | 0.2314 |
| `basketball:all` | 24 | 54% | 🔴 -22.7% | 0.2639 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 61 | 62% | 🔴 -15.5% | 0.2271 |
| fav | 337 | 57% | 🔴 -0.5% | 0.2443 |
| toss_up | 46 | 50% | 🟢 +18.3% | 0.2556 |
| dog | 16 | 19% | 🔴 -42.8% | 0.183 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 29 | 37.1% | 37.9% | ⚪ +0.8% |
| [0.4–0.5] | 67 | 46.7% | 50.7% | ⚪ +4.0% |
| [0.5–0.6] | 268 | 54.5% | 55.6% | ⚪ +1.1% |
| [0.6–0.7] | 74 | 64.3% | 60.8% | ⚪ -3.5% |
| [0.7–0.8] | 17 | 73.5% | 88.2% | 🟢 +14.8% |
| [0.8–0.9] | 5 | 83.5% | 60.0% | 🔴 -23.5% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 284 | 57% | 🔴 -2.9% | 0.2442 |
| `chn.1` | 35 | 60% | 🟢 +21.9% | 0.2543 |
| `wnba` | 24 | 54% | 🔴 -22.7% | 0.2639 |
| `ligamx` | 18 | 39% | 🔴 -33.2% | 0.2361 |
| `nor.1` | 16 | 56% | 🔴 -4.2% | 0.2184 |
| `conmebol.sudamericana` | 14 | 79% | 🟢 +28.1% | 0.1795 |
| `allsvenskan` | 13 | 69% | 🟢 +21.4% | 0.2206 |
| `swe.1` | 11 | 45% | 🔴 -17.1% | 0.2627 |
| `uru.1` | 8 | 38% | 🔴 -6.2% | 0.2378 |
| `ecu.1` | 7 | 29% | 🔴 -41.2% | 0.254 |
