# Backtest ROI — VRAI modèle (v2)

Généré : 2026-06-26T07:40:23Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 472 picks sur 2026-05-24T15:00Z → 2026-06-25T02:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 96.45u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **472 picks** · 267 gagnés / 205 perdus · WR **56.6%**
- ROI flat (1u/pick) : **-1.91%** (-9.01u cumulé)
- Kelly 0.25× cap 10% : cumulé **-3.55u**
- Cote moyenne : 1.78 · Pick prob moyenne : 54.8%
- **Brier** : 0.2397 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6721 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **964.54€** (-3.5%) · DD max 10.7% · Sharpe/pick -0.012

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
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 472 | 57% | 52–61% | 🔴 -1.9% | -3.55u | 0.2397 | -2.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 472 | 0.0341 | 0.267 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 362 | 56% | 🔴 -3.9% | +0.00u | 0.2434 |
| football | 69 | 45% | 🔴 -5.2% | -3.55u | 0.2378 |
| basketball | 33 | 79% | 🟢 +18.9% | +0.00u | 0.2046 |
| hockey | 8 | 75% | 🟢 +28.5% | +0.00u | 0.2336 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 362 | 56% | 🔴 -3.9% | 0.2434 |
| `football:other` | 63 | 44% | 🔴 -3.7% | 0.2369 |
| `basketball:all` | 33 | 79% | 🟢 +18.9% | 0.2046 |
| `hockey:all` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `football:top5` | 6 | 50% | 🔴 -20.7% | 0.2468 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 51 | 71% | 🔴 -2.6% | 0.2013 |
| fav | 381 | 56% | 🔴 -2.2% | 0.2453 |
| toss_up | 25 | 40% | 🔴 -12.0% | 0.2335 |
| dog | 15 | 40% | 🟢 +24.7% | 0.2384 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 22 | 36.4% | 27.3% | 🔴 -9.2% |
| [0.4–0.5] | 41 | 46.9% | 63.4% | 🟢 +16.5% |
| [0.5–0.6] | 322 | 54.2% | 55.0% | ⚪ +0.8% |
| [0.6–0.7] | 73 | 63.4% | 61.6% | ⚪ -1.7% |
| [0.7–0.8] | 11 | 73.3% | 100.0% | 🟢 +26.7% |
| [0.8–0.9] | 3 | 85.2% | 66.7% | 🔴 -18.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 362 | 56% | 🔴 -3.9% | 0.2434 |
| `wnba` | 26 | 85% | 🟢 +25.6% | 0.1919 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `esp.2` | 9 | 67% | 🟢 +7.3% | 0.1828 |
| `nhl` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `nba` | 7 | 57% | 🔴 -5.6% | 0.2515 |
| `allsvenskan` | 6 | 17% | 🔴 -46.7% | 0.2172 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `ita.1` | 5 | 60% | 🔴 -4.8% | 0.2735 |
