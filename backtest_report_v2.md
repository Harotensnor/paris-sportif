# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-04T06:18:12Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 484 picks sur 2026-06-27T17:00Z → 2026-08-03T21:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 120.02u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **484 picks** · 276 gagnés / 208 perdus · WR **57.0%**
- ROI flat (1u/pick) : **+1.07%** (+5.19u cumulé)
- Kelly 0.25× cap 10% : cumulé **+20.02u**
- Cote moyenne : 1.83 · Pick prob moyenne : 54.4%
- **Brier** : 0.2382 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6689 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1200.18€** (+20.0%) · DD max 13.2% · Sharpe/pick +0.043

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
| `skip` | 484 | 57% | 53–61% | 🟢 +1.1% | +20.02u | 0.2382 | -2.5pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 484 | 0.03 | 0.125 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 246 | 59% | 🟢 +1.6% | +0.00u | 0.2436 |
| football | 215 | 54% | 🟢 +2.6% | +20.02u | 0.2315 |
| basketball | 23 | 57% | 🔴 -18.7% | +0.00u | 0.2449 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 246 | 59% | 🟡 +1.6% | 0.2436 |
| `football:other` | 215 | 54% | 🟡 +2.6% | 0.2315 |
| `basketball:all` | 23 | 57% | 🔴 -18.7% | 0.2449 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 69 | 64% | 🔴 -13.6% | 0.2172 |
| fav | 327 | 59% | 🟢 +2.9% | 0.2422 |
| toss_up | 64 | 50% | 🟢 +17.0% | 0.2555 |
| dog | 24 | 25% | 🔴 -23.5% | 0.1986 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 42 | 37.2% | 38.1% | ⚪ +0.9% |
| [0.4–0.5] | 79 | 46.0% | 49.4% | ⚪ +3.3% |
| [0.5–0.6] | 262 | 54.6% | 57.6% | ⚪ +3.0% |
| [0.6–0.7] | 74 | 64.6% | 63.5% | ⚪ -1.1% |
| [0.7–0.8] | 22 | 73.9% | 86.4% | 🟢 +12.5% |
| [0.8–0.9] | 5 | 82.4% | 80.0% | ⚪ -2.4% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 246 | 59% | 🟢 +1.6% | 0.2436 |
| `chn.1` | 36 | 58% | 🟢 +19.6% | 0.2725 |
| `wnba` | 23 | 57% | 🔴 -18.7% | 0.2449 |
| `nor.1` | 22 | 64% | 🟢 +13.3% | 0.225 |
| `ligamx` | 18 | 39% | 🔴 -33.2% | 0.2361 |
| `swe.1` | 17 | 53% | 🔴 -6.3% | 0.2652 |
| `conmebol.sudamericana` | 14 | 79% | 🟢 +28.1% | 0.1795 |
| `uru.1` | 14 | 50% | 🟢 +10.4% | 0.2338 |
| `allsvenskan` | 13 | 69% | 🟢 +21.4% | 0.2206 |
| `arg.1` | 13 | 31% | 🔴 -26.5% | 0.2098 |
