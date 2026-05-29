# Backtest ROI — VRAI modèle (v2)

Généré : 2026-05-29T07:44:24Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 99 picks sur 2026-05-24T05:00Z → 2026-05-28T20:10Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 109.18u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **99 picks** · 53 gagnés / 46 perdus · WR **53.5%**
- ROI flat (1u/pick) : **-3.85%** (-3.81u cumulé)
- Kelly 0.25× cap 10% : cumulé **+9.18u**
- Cote moyenne : 1.85 · Pick prob moyenne : 54.2%
- **Brier** : 0.2484 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6897 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1091.77€** (+9.2%) · DD max 3.9% · Sharpe/pick +0.099

## Séries

- Streak courante : 🔥 **2** wins consécutifs
- Plus longue série gagnante : **8**
- Plus longue série perdante : **6**
- Top run win : 8 picks (2026-05-26T23:07Z → 2026-05-27T01:40Z)
- Top run lose : 6 picks (2026-05-24T05:00Z → 2026-05-24T11:35Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 1 | 100% | 21–100% | 🟢 +70.0% | +0.57u | 0.1587 | +1.3pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 98 | 53% | 43–63% | 🔴 -4.6% | +8.61u | 0.2493 | -2.7pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 1 | 0.398 | 0.398 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 98 | 0.1078 | 0.225 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 50 | 58% | 🔴 -0.5% | +0.00u | 0.2395 |
| football | 39 | 44% | 🔴 -10.7% | +8.61u | 0.2662 |
| basketball | 7 | 71% | 🟢 +3.3% | +0.00u | 0.2229 |
| hockey | 3 | 67% | 🟢 +11.5% | +0.57u | 0.2235 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 50 | 58% | 🔴 -0.5% | 0.2395 |
| `football:other` | 24 | 33% | 🔴 -32.5% | 0.2575 |
| `football:top5` | 15 | 60% | 🟢 +24.3% | 0.2801 |
| `basketball:all` | 7 | 71% | 🟡 +3.3% | 0.2229 |
| `hockey:all` | 3 | 67% | 🟢 +11.5% | 0.2235 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 19 | 63% | 🔴 -11.5% | 0.2324 |
| fav | 64 | 55% | 🔴 -3.1% | 0.2593 |
| toss_up | 10 | 40% | 🔴 -6.0% | 0.2261 |
| dog | 6 | 33% | 🟢 +15.8% | 0.2193 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 9 | 35.0% | 22.2% | 🔴 -12.8% |
| [0.4–0.5] | 13 | 46.0% | 61.5% | 🟢 +15.6% |
| [0.5–0.6] | 51 | 53.8% | 58.8% | 🟢 +5.0% |
| [0.6–0.7] | 23 | 64.4% | 47.8% | 🔴 -16.6% |
| [0.7–0.8] | 2 | 72.5% | 50.0% | 🔴 -22.5% |
| [0.8–0.9] | 1 | 84.4% | 100.0% | 🟢 +15.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 50 | 58% | 🔴 -0.5% | 0.2395 |
| `eng.1` | 8 | 50% | 🟢 +24.3% | 0.3013 |
| `ita.1` | 6 | 67% | 🟢 +3.4% | 0.2529 |
| `chn.1` | 5 | 0% | 🔴 -100.0% | 0.3478 |
| `eliteserien` | 5 | 20% | 🔴 -55.0% | 0.248 |
| `wnba` | 5 | 60% | 🔴 -20.6% | 0.2305 |
| `allsvenskan` | 4 | 50% | 🟢 +22.9% | 0.2896 |
| `nhl` | 3 | 67% | 🟢 +11.5% | 0.2235 |
| `esp.2` | 2 | 50% | 🔴 -2.4% | 0.3226 |
| `jpn.1` | 2 | 0% | 🔴 -100.0% | 0.124 |
