# Backtest ROI — VRAI modèle (v2)

Généré : 2026-06-22T09:37:06Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 435 picks sur 2026-05-24T15:00Z → 2026-06-21T20:10Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 95.69u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **435 picks** · 248 gagnés / 187 perdus · WR **57.0%**
- ROI flat (1u/pick) : **-0.92%** (-3.99u cumulé)
- Kelly 0.25× cap 10% : cumulé **-4.31u**
- Cote moyenne : 1.78 · Pick prob moyenne : 54.7%
- **Brier** : 0.238 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6679 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **956.94€** (-4.3%) · DD max 11.9% · Sharpe/pick -0.015

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **6**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 6 picks (2026-06-10T22:35Z → 2026-06-10T23:40Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 2 | 50% | 9–91% | 🔴 -13.2% | -0.79u | 0.2532 | +1.8pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 433 | 57% | 52–62% | 🔴 -0.9% | -3.52u | 0.2379 | -2.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 2 | 0.085 | 0.085 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 433 | 0.0331 | 0.265 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 330 | 57% | 🔴 -2.8% | -0.79u | 0.2431 |
| football | 69 | 45% | 🔴 -5.2% | -3.52u | 0.2378 |
| basketball | 28 | 82% | 🟢 +23.4% | +0.00u | 0.1799 |
| hockey | 8 | 75% | 🟢 +28.5% | +0.00u | 0.2336 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 330 | 57% | 🔴 -2.8% | 0.2431 |
| `football:other` | 63 | 44% | 🔴 -3.7% | 0.2369 |
| `basketball:all` | 28 | 82% | 🟢 +23.4% | 0.1799 |
| `hockey:all` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `football:top5` | 6 | 50% | 🔴 -20.7% | 0.2468 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 47 | 72% | 🔴 -0.3% | 0.1821 |
| fav | 348 | 57% | 🔴 -1.3% | 0.2458 |
| toss_up | 25 | 40% | 🔴 -12.0% | 0.2335 |
| dog | 15 | 40% | 🟢 +24.7% | 0.2384 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 22 | 36.4% | 27.3% | 🔴 -9.2% |
| [0.4–0.5] | 38 | 46.7% | 63.2% | 🟢 +16.5% |
| [0.5–0.6] | 300 | 54.3% | 55.0% | ⚪ +0.7% |
| [0.6–0.7] | 63 | 63.5% | 65.1% | ⚪ +1.6% |
| [0.7–0.8] | 10 | 73.5% | 100.0% | 🟢 +26.5% |
| [0.8–0.9] | 2 | 84.7% | 100.0% | 🟢 +15.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 330 | 57% | 🔴 -2.8% | 0.2431 |
| `wnba` | 21 | 90% | 🟢 +33.1% | 0.156 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `esp.2` | 9 | 67% | 🟢 +7.3% | 0.1828 |
| `nhl` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `nba` | 7 | 57% | 🔴 -5.6% | 0.2515 |
| `allsvenskan` | 6 | 17% | 🔴 -46.7% | 0.2172 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `ita.1` | 5 | 60% | 🔴 -4.8% | 0.2735 |
