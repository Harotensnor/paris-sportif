# Backtest ROI — VRAI modèle (v2)

Généré : 2026-06-23T07:36:53Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 438 picks sur 2026-05-24T15:00Z → 2026-06-22T00:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 96.45u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **438 picks** · 250 gagnés / 188 perdus · WR **57.1%**
- ROI flat (1u/pick) : **-0.88%** (-3.87u cumulé)
- Kelly 0.25× cap 10% : cumulé **-3.55u**
- Cote moyenne : 1.78 · Pick prob moyenne : 54.7%
- **Brier** : 0.2384 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6688 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **964.54€** (-3.5%) · DD max 10.7% · Sharpe/pick -0.012

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
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 438 | 57% | 52–62% | 🔴 -0.9% | -3.55u | 0.2384 | -2.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 438 | 0.0335 | 0.265 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 331 | 57% | 🔴 -2.2% | +0.00u | 0.2427 |
| football | 69 | 45% | 🔴 -5.2% | -3.55u | 0.2378 |
| basketball | 30 | 77% | 🟢 +15.2% | +0.00u | 0.1936 |
| hockey | 8 | 75% | 🟢 +28.5% | +0.00u | 0.2336 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 331 | 57% | 🔴 -2.2% | 0.2427 |
| `football:other` | 63 | 44% | 🔴 -3.7% | 0.2369 |
| `basketball:all` | 30 | 77% | 🟢 +15.2% | 0.1936 |
| `hockey:all` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `football:top5` | 6 | 50% | 🔴 -20.7% | 0.2468 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 48 | 71% | 🔴 -2.4% | 0.1902 |
| fav | 350 | 57% | 🔴 -1.0% | 0.2454 |
| toss_up | 25 | 40% | 🔴 -12.0% | 0.2335 |
| dog | 15 | 40% | 🟢 +24.7% | 0.2384 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 22 | 36.4% | 27.3% | 🔴 -9.2% |
| [0.4–0.5] | 38 | 46.7% | 63.2% | 🟢 +16.5% |
| [0.5–0.6] | 298 | 54.3% | 55.4% | ⚪ +1.1% |
| [0.6–0.7] | 68 | 63.5% | 63.2% | ⚪ -0.2% |
| [0.7–0.8] | 10 | 73.5% | 100.0% | 🟢 +26.5% |
| [0.8–0.9] | 2 | 84.7% | 100.0% | 🟢 +15.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 331 | 57% | 🔴 -2.2% | 0.2427 |
| `wnba` | 23 | 83% | 🟢 +21.6% | 0.176 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `esp.2` | 9 | 67% | 🟢 +7.3% | 0.1828 |
| `nhl` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `nba` | 7 | 57% | 🔴 -5.6% | 0.2515 |
| `allsvenskan` | 6 | 17% | 🔴 -46.7% | 0.2172 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `ita.1` | 5 | 60% | 🔴 -4.8% | 0.2735 |
