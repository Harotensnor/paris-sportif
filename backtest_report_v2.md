# Backtest ROI — VRAI modèle (v2)

Généré : 2026-06-25T07:31:56Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 464 picks sur 2026-05-24T15:00Z → 2026-06-24T19:10Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 93.27u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **464 picks** · 261 gagnés / 203 perdus · WR **56.2%**
- ROI flat (1u/pick) : **-2.61%** (-12.13u cumulé)
- Kelly 0.25× cap 10% : cumulé **-6.73u**
- Cote moyenne : 1.77 · Pick prob moyenne : 55.0%
- **Brier** : 0.2415 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6764 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **932.72€** (-6.7%) · DD max 13.6% · Sharpe/pick -0.024

## Séries

- Streak courante : ❄️ **1** loses consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **6**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 6 picks (2026-06-10T22:35Z → 2026-06-10T23:40Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 2 | 0% | 0–66% | 🔴 -100.0% | -2.18u | 0.3206 | +1.9pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 462 | 56% | 52–61% | 🔴 -2.2% | -4.55u | 0.2412 | -3.0pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 2 | 0.566 | 0.566 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 462 | 0.0347 | 0.347 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 356 | 56% | 🔴 -4.4% | -3.30u | 0.2459 |
| football | 69 | 45% | 🔴 -5.2% | -3.43u | 0.2378 |
| basketball | 31 | 77% | 🟢 +15.8% | +0.00u | 0.2017 |
| hockey | 8 | 75% | 🟢 +28.5% | +0.00u | 0.2336 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 356 | 56% | 🔴 -4.4% | 0.2459 |
| `football:other` | 63 | 44% | 🔴 -3.7% | 0.2369 |
| `basketball:all` | 31 | 77% | 🟢 +15.8% | 0.2017 |
| `hockey:all` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `football:top5` | 6 | 50% | 🔴 -20.7% | 0.2468 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 54 | 69% | 🔴 -5.9% | 0.2141 |
| fav | 370 | 56% | 🔴 -2.6% | 0.2462 |
| toss_up | 25 | 40% | 🔴 -12.0% | 0.2335 |
| dog | 15 | 40% | 🟢 +24.7% | 0.2384 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 22 | 36.4% | 27.3% | 🔴 -9.2% |
| [0.4–0.5] | 41 | 46.9% | 63.4% | 🟢 +16.5% |
| [0.5–0.6] | 311 | 54.3% | 54.7% | ⚪ +0.4% |
| [0.6–0.7] | 73 | 63.4% | 61.6% | ⚪ -1.7% |
| [0.7–0.8] | 13 | 73.7% | 92.3% | 🟢 +18.7% |
| [0.8–0.9] | 4 | 84.7% | 50.0% | 🔴 -34.7% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 356 | 56% | 🔴 -4.4% | 0.2459 |
| `wnba` | 24 | 83% | 🟢 +22.1% | 0.1871 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `esp.2` | 9 | 67% | 🟢 +7.3% | 0.1828 |
| `nhl` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `nba` | 7 | 57% | 🔴 -5.6% | 0.2515 |
| `allsvenskan` | 6 | 17% | 🔴 -46.7% | 0.2172 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `ita.1` | 5 | 60% | 🔴 -4.8% | 0.2735 |
