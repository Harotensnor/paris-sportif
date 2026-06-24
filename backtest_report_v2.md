# Backtest ROI — VRAI modèle (v2)

Généré : 2026-06-24T07:30:25Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 447 picks sur 2026-05-24T15:00Z → 2026-06-23T20:07Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 89.06u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **447 picks** · 251 gagnés / 196 perdus · WR **56.2%**
- ROI flat (1u/pick) : **-2.64%** (-11.81u cumulé)
- Kelly 0.25× cap 10% : cumulé **-10.94u**
- Cote moyenne : 1.78 · Pick prob moyenne : 54.9%
- **Brier** : 0.2404 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6735 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **890.63€** (-10.9%) · DD max 19.8% · Sharpe/pick -0.037

## Séries

- Streak courante : ❄️ **2** loses consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **6**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 6 picks (2026-06-10T22:35Z → 2026-06-10T23:40Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 3 | 33% | 6–79% | 🔴 -40.7% | -6.23u | 0.2706 | +7.2pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 444 | 56% | 52–61% | 🔴 -2.4% | -4.70u | 0.2402 | -3.0pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 3 | 0.5133 | 0.574 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 444 | 0.0298 | 0.267 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 339 | 56% | 🔴 -4.5% | -7.66u | 0.2446 |
| football | 69 | 45% | 🔴 -5.2% | -3.27u | 0.2378 |
| basketball | 31 | 77% | 🟢 +15.7% | +0.00u | 0.2017 |
| hockey | 8 | 75% | 🟢 +28.5% | +0.00u | 0.2336 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 339 | 56% | 🔴 -4.5% | 0.2446 |
| `football:other` | 63 | 44% | 🔴 -3.7% | 0.2369 |
| `basketball:all` | 31 | 77% | 🟢 +15.7% | 0.2017 |
| `hockey:all` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `football:top5` | 6 | 50% | 🔴 -20.7% | 0.2468 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 51 | 71% | 🔴 -2.6% | 0.2007 |
| fav | 355 | 56% | 🔴 -2.9% | 0.2464 |
| toss_up | 26 | 38% | 🔴 -15.4% | 0.2375 |
| dog | 15 | 40% | 🟢 +24.7% | 0.2384 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 22 | 36.4% | 27.3% | 🔴 -9.2% |
| [0.4–0.5] | 38 | 46.7% | 63.2% | 🟢 +16.5% |
| [0.5–0.6] | 303 | 54.3% | 54.1% | ⚪ -0.1% |
| [0.6–0.7] | 70 | 63.5% | 62.9% | ⚪ -0.7% |
| [0.7–0.8] | 11 | 73.3% | 100.0% | 🟢 +26.7% |
| [0.8–0.9] | 3 | 85.2% | 66.7% | 🔴 -18.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 339 | 56% | 🔴 -4.5% | 0.2446 |
| `wnba` | 24 | 83% | 🟢 +21.9% | 0.1872 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `esp.2` | 9 | 67% | 🟢 +7.3% | 0.1828 |
| `nhl` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `nba` | 7 | 57% | 🔴 -5.6% | 0.2515 |
| `allsvenskan` | 6 | 17% | 🔴 -46.7% | 0.2172 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `ita.1` | 5 | 60% | 🔴 -4.8% | 0.2735 |
