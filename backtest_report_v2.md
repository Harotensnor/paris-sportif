# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-10T05:14:03Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 523 picks sur 2026-07-04T11:00Z → 2026-08-09T21:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 216.58u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **523 picks** · 300 gagnés / 223 perdus · WR **57.4%**
- ROI flat (1u/pick) : **+3.78%** (+19.75u cumulé)
- Kelly 0.25× cap 10% : cumulé **+116.58u**
- Cote moyenne : 1.88 · Pick prob moyenne : 54.1%
- **Brier** : 0.2351 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6629 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **2165.81€** (+116.6%) · DD max 19.6% · Sharpe/pick +0.106

## Séries

- Streak courante : ❄️ **2** loses consécutifs
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
| `skip` | 523 | 57% | 53–62% | 🟢 +3.8% | +116.58u | 0.2351 | -1.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 523 | 0.045 | 0.069 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 324 | 57% | 🟢 +7.9% | +116.58u | 0.2297 |
| baseball | 177 | 58% | 🔴 -1.5% | +0.00u | 0.2448 |
| basketball | 22 | 59% | 🔴 -14.6% | +0.00u | 0.2379 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 324 | 57% | 🟢 +7.9% | 0.2297 |
| `baseball:all` | 177 | 58% | 🔴 -1.5% | 0.2448 |
| `basketball:all` | 22 | 59% | 🔴 -14.6% | 0.2379 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 87 | 62% | 🔴 -16.7% | 0.2259 |
| fav | 305 | 61% | 🟢 +5.1% | 0.235 |
| toss_up | 95 | 54% | 🟢 +24.7% | 0.2574 |
| dog | 35 | 29% | 🔴 -10.6% | 0.2021 |
| heavy_dog | 1 | 0% | 🔴 -100.0% | 0.1078 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 52 | 36.4% | 32.7% | ⚪ -3.7% |
| [0.4–0.5] | 113 | 45.3% | 52.2% | 🟢 +6.9% |
| [0.5–0.6] | 237 | 54.8% | 59.5% | ⚪ +4.7% |
| [0.6–0.7] | 76 | 64.7% | 63.2% | ⚪ -1.5% |
| [0.7–0.8] | 35 | 73.3% | 77.1% | ⚪ +3.8% |
| [0.8–0.9] | 10 | 82.0% | 80.0% | ⚪ -2.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 177 | 58% | 🔴 -1.5% | 0.2448 |
| `chn.1` | 37 | 57% | 🟢 +12.1% | 0.2581 |
| `football.cup` | 28 | 61% | 🟢 +0.2% | 0.1687 |
| `nor.1` | 26 | 58% | 🟢 +9.7% | 0.2414 |
| `wnba` | 22 | 59% | 🔴 -14.6% | 0.2379 |
| `swe.1` | 20 | 60% | 🟢 +7.9% | 0.2518 |
| `ligamx` | 18 | 39% | 🔴 -33.2% | 0.2361 |
| `uru.1` | 17 | 24% | 🔴 -63.2% | 0.2068 |
| `arg.1` | 16 | 44% | 🟢 +2.0% | 0.21 |
| `per.1` | 15 | 67% | 🟢 +44.5% | 0.2654 |
