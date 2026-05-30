# Backtest ROI — VRAI modèle (v2)

Généré : 2026-05-30T06:39:19Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 108 picks sur 2026-05-24T05:00Z → 2026-05-29T18:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 107.34u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **108 picks** · 57 gagnés / 51 perdus · WR **52.8%**
- ROI flat (1u/pick) : **-3.42%** (-3.70u cumulé)
- Kelly 0.25× cap 10% : cumulé **+7.34u**
- Cote moyenne : 1.86 · Pick prob moyenne : 54.0%
- **Brier** : 0.2518 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6966 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1073.43€** (+7.3%) · DD max 3.8% · Sharpe/pick +0.067

## Séries

- Streak courante : ❄️ **1** loses consécutifs
- Plus longue série gagnante : **8**
- Plus longue série perdante : **6**
- Top run win : 8 picks (2026-05-26T23:07Z → 2026-05-27T01:40Z)
- Top run lose : 6 picks (2026-05-24T05:00Z → 2026-05-24T11:35Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 1 | 0% | 0–79% | 🔴 -100.0% | -3.11u | 0.3261 | +6.1pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 107 | 53% | 44–62% | 🔴 -2.5% | +10.45u | 0.2511 | -2.5pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 1 | 0.571 | 0.571 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 107 | 0.0826 | 0.225 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 51 | 57% | 🔴 -2.4% | -3.11u | 0.2412 |
| football | 46 | 46% | 🔴 -4.6% | +10.45u | 0.2707 |
| basketball | 8 | 62% | 🔴 -8.1% | +0.00u | 0.2187 |
| hockey | 3 | 67% | 🟢 +9.7% | +0.00u | 0.2302 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 51 | 57% | 🔴 -2.4% | 0.2412 |
| `football:other` | 31 | 39% | 🔴 -18.6% | 0.2661 |
| `football:top5` | 15 | 60% | 🟢 +24.3% | 0.2801 |
| `basketball:all` | 8 | 62% | 🔴 -8.1% | 0.2187 |
| `hockey:all` | 3 | 67% | 🟢 +9.7% | 0.2302 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 18 | 61% | 🔴 -14.3% | 0.2354 |
| fav | 72 | 53% | 🔴 -7.0% | 0.2588 |
| toss_up | 11 | 45% | 🟢 +6.4% | 0.236 |
| dog | 7 | 43% | 🟢 +45.7% | 0.2464 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 10 | 35.1% | 30.0% | 🔴 -5.1% |
| [0.4–0.5] | 14 | 45.7% | 64.3% | 🟢 +18.6% |
| [0.5–0.6] | 58 | 54.0% | 55.2% | ⚪ +1.2% |
| [0.6–0.7] | 23 | 64.6% | 47.8% | 🔴 -16.8% |
| [0.7–0.8] | 2 | 72.5% | 50.0% | 🔴 -22.5% |
| [0.8–0.9] | 1 | 84.4% | 100.0% | 🟢 +15.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 51 | 57% | 🔴 -2.4% | 0.2412 |
| `eliteserien` | 9 | 44% | ⚪ +0.0% | 0.263 |
| `eng.1` | 8 | 50% | 🟢 +24.3% | 0.3013 |
| `chn.1` | 6 | 17% | 🔴 -61.7% | 0.3439 |
| `ita.1` | 6 | 67% | 🟢 +3.4% | 0.2529 |
| `allsvenskan` | 5 | 40% | 🔴 -1.7% | 0.2904 |
| `wnba` | 5 | 60% | 🔴 -18.2% | 0.2254 |
| `nba` | 3 | 67% | 🟢 +8.7% | 0.2075 |
| `nhl` | 3 | 67% | 🟢 +9.7% | 0.2302 |
| `esp.2` | 2 | 50% | 🔴 -2.4% | 0.3226 |
