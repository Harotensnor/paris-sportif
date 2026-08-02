# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-02T06:24:41Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 452 picks sur 2026-06-25T22:40Z → 2026-08-01T21:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 114.4u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **452 picks** · 253 gagnés / 199 perdus · WR **56.0%**
- ROI flat (1u/pick) : **-0.82%** (-3.70u cumulé)
- Kelly 0.25× cap 10% : cumulé **+14.40u**
- Cote moyenne : 1.82 · Pick prob moyenne : 54.4%
- **Brier** : 0.24 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6726 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1144.01€** (+14.4%) · DD max 13.2% · Sharpe/pick +0.037

## Séries

- Streak courante : 🔥 **1** wins consécutifs
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
| `skip` | 452 | 56% | 51–60% | 🔴 -0.8% | +14.40u | 0.24 | -2.5pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 452 | 0.024 | 0.108 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 250 | 58% | 🔴 -1.6% | +0.00u | 0.2438 |
| football | 181 | 54% | 🟢 +2.2% | +14.40u | 0.2334 |
| basketball | 21 | 57% | 🔴 -17.9% | +0.00u | 0.2506 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 250 | 58% | 🔴 -1.6% | 0.2438 |
| `football:other` | 181 | 54% | 🟡 +2.2% | 0.2334 |
| `basketball:all` | 21 | 57% | 🔴 -17.9% | 0.2506 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 61 | 62% | 🔴 -15.6% | 0.2247 |
| fav | 313 | 58% | 🟢 +0.2% | 0.2431 |
| toss_up | 58 | 52% | 🟢 +22.2% | 0.2579 |
| dog | 20 | 20% | 🔴 -39.5% | 0.1851 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 36 | 37.3% | 36.1% | ⚪ -1.2% |
| [0.4–0.5] | 76 | 46.2% | 50.0% | ⚪ +3.8% |
| [0.5–0.6] | 247 | 54.7% | 56.3% | ⚪ +1.6% |
| [0.6–0.7] | 70 | 64.6% | 62.9% | ⚪ -1.7% |
| [0.7–0.8] | 19 | 73.4% | 84.2% | 🟢 +10.8% |
| [0.8–0.9] | 4 | 82.8% | 75.0% | 🔴 -7.8% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 250 | 58% | 🔴 -1.6% | 0.2438 |
| `chn.1` | 39 | 59% | 🟢 +18.4% | 0.2598 |
| `wnba` | 21 | 57% | 🔴 -17.9% | 0.2506 |
| `ligamx` | 18 | 39% | 🔴 -33.2% | 0.2361 |
| `nor.1` | 18 | 61% | 🟢 +6.5% | 0.2179 |
| `conmebol.sudamericana` | 14 | 79% | 🟢 +28.1% | 0.1795 |
| `allsvenskan` | 13 | 69% | 🟢 +21.4% | 0.2206 |
| `swe.1` | 12 | 42% | 🔴 -24.1% | 0.2699 |
| `uru.1` | 11 | 36% | 🔴 -17.5% | 0.2351 |
| `arg.1` | 9 | 44% | 🟢 +6.2% | 0.2189 |
