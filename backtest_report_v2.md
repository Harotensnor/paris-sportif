# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-12T05:21:58Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 490 picks sur 2026-07-07T22:35Z → 2026-08-10T21:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 238.23u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **490 picks** · 282 gagnés / 208 perdus · WR **57.6%**
- ROI flat (1u/pick) : **+5.39%** (+26.40u cumulé)
- Kelly 0.25× cap 10% : cumulé **+138.23u**
- Cote moyenne : 1.89 · Pick prob moyenne : 53.9%
- **Brier** : 0.2365 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6656 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **2382.27€** (+138.2%) · DD max 17.6% · Sharpe/pick +0.118

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **7**
- Plus longue série perdante : **7**
- Top run win : 7 picks (2026-07-11T16:00Z → 2026-07-11T20:05Z)
- Top run lose : 7 picks (2026-07-10T23:50Z → 2026-07-11T02:15Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 490 | 58% | 53–62% | 🟢 +5.4% | +138.23u | 0.2365 | -1.8pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 490 | 0.0415 | 0.069 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 324 | 57% | 🟢 +8.6% | +138.23u | 0.2349 |
| baseball | 147 | 58% | 🔴 -0.9% | +0.00u | 0.2452 |
| basketball | 19 | 68% | 🔴 -1.2% | +0.00u | 0.198 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 324 | 57% | 🟢 +8.6% | 0.2349 |
| `baseball:all` | 147 | 58% | 🔴 -0.9% | 0.2452 |
| `basketball:all` | 19 | 68% | 🔴 -1.2% | 0.198 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 81 | 63% | 🔴 -15.8% | 0.2253 |
| fav | 276 | 61% | 🟢 +6.2% | 0.2353 |
| toss_up | 98 | 50% | 🟢 +16.6% | 0.253 |
| dog | 35 | 37% | 🟢 +16.9% | 0.2261 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 56 | 36.8% | 39.3% | ⚪ +2.5% |
| [0.4–0.5] | 111 | 45.4% | 52.3% | 🟢 +6.9% |
| [0.5–0.6] | 208 | 54.8% | 59.1% | ⚪ +4.3% |
| [0.6–0.7] | 72 | 65.1% | 63.9% | ⚪ -1.2% |
| [0.7–0.8] | 34 | 73.2% | 76.5% | ⚪ +3.3% |
| [0.8–0.9] | 9 | 81.8% | 77.8% | ⚪ -4.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 147 | 58% | 🔴 -0.9% | 0.2452 |
| `eng.league_cup` | 33 | 58% | 🔴 -8.0% | 0.178 |
| `chn.1` | 32 | 53% | 🟢 +5.2% | 0.2673 |
| `nor.1` | 26 | 58% | 🟢 +9.7% | 0.2414 |
| `swe.1` | 21 | 52% | 🔴 -7.5% | 0.2708 |
| `wnba` | 19 | 68% | 🔴 -1.2% | 0.198 |
| `ligamx` | 18 | 39% | 🔴 -33.2% | 0.2361 |
| `uru.1` | 17 | 24% | 🔴 -63.2% | 0.2068 |
| `arg.1` | 16 | 50% | 🟢 +22.4% | 0.2329 |
| `per.1` | 15 | 67% | 🟢 +44.5% | 0.2654 |
