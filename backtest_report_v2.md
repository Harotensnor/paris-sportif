# Backtest ROI — VRAI modèle (v2)

Généré : 2026-06-17T08:52:27Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 361 picks sur 2026-05-24T15:00Z → 2026-06-16T02:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 96.9u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **361 picks** · 202 gagnés / 159 perdus · WR **56.0%**
- ROI flat (1u/pick) : **-1.26%** (-4.54u cumulé)
- Kelly 0.25× cap 10% : cumulé **-3.10u**
- Cote moyenne : 1.81 · Pick prob moyenne : 54.1%
- **Brier** : 0.2407 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6735 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **969.02€** (-3.1%) · DD max 14.3% · Sharpe/pick -0.009

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
| `standard` | 4 | 25% | 5–70% | 🔴 -56.6% | -4.73u | 0.2472 | +5.2pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 357 | 56% | 51–61% | 🔴 -0.6% | +1.63u | 0.2406 | -2.8pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 4 | 0.492 | 0.532 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 357 | 0.0328 | 0.27 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 267 | 57% | 🔴 -3.0% | -4.73u | 0.2436 |
| football | 68 | 47% | 🔴 -0.1% | +1.63u | 0.2407 |
| basketball | 18 | 72% | 🟢 +7.6% | +0.00u | 0.1999 |
| hockey | 8 | 75% | 🟢 +28.5% | +0.00u | 0.2336 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 267 | 57% | 🔴 -3.0% | 0.2436 |
| `football:other` | 62 | 45% | 🔴 -2.2% | 0.2367 |
| `basketball:all` | 18 | 72% | 🟢 +7.6% | 0.1999 |
| `hockey:all` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `football:top5` | 6 | 67% | 🟢 +21.8% | 0.2822 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 34 | 76% | 🟢 +5.8% | 0.174 |
| fav | 286 | 56% | 🔴 -3.1% | 0.2484 |
| toss_up | 27 | 41% | 🔴 -9.1% | 0.2395 |
| dog | 14 | 43% | 🟢 +33.6% | 0.2473 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 21 | 36.6% | 28.6% | 🔴 -8.0% |
| [0.4–0.5] | 36 | 46.4% | 63.9% | 🟢 +17.5% |
| [0.5–0.6] | 249 | 54.3% | 54.2% | ⚪ -0.0% |
| [0.6–0.7] | 47 | 63.7% | 63.8% | ⚪ +0.1% |
| [0.7–0.8] | 6 | 73.0% | 100.0% | 🟢 +27.0% |
| [0.8–0.9] | 2 | 84.7% | 100.0% | 🟢 +15.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 267 | 57% | 🔴 -3.0% | 0.2436 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `wnba` | 11 | 82% | 🟢 +16.0% | 0.167 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `esp.2` | 8 | 75% | 🟢 +20.7% | 0.1767 |
| `nhl` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `nba` | 7 | 57% | 🔴 -5.6% | 0.2515 |
| `allsvenskan` | 6 | 17% | 🔴 -46.7% | 0.2172 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `ita.1` | 5 | 60% | 🔴 -4.8% | 0.2735 |
