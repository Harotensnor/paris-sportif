# Backtest ROI — VRAI modèle (v2)

Généré : 2026-05-02T06:10:39Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 492 picks sur 2026-04-23T18:45Z → 2026-05-02T03:55Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 277.04u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **492 picks** · 264 gagnés / 228 perdus · WR **53.7%**
- ROI flat (1u/pick) : **-0.42%** (-2.07u cumulé)
- Kelly 0.25× cap 10% : cumulé **+177.04u**
- Cote moyenne : 1.98 · Pick prob moyenne : 52.9%
- **Brier** : 0.2291 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6504 (plus bas = mieux calibré)

## Séries

- Streak courante : ❄️ **4** loses consécutifs
- Plus longue série gagnante : **9**
- Plus longue série perdante : **9**
- Top run win : 9 picks (2026-04-30T19:00Z → 2026-05-01T00:00Z)
- Top run lose : 9 picks (2026-04-25T21:00Z → 2026-04-25T21:30Z)

## Par tier de fiabilité

| Tier | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| `lock` | 25 | 84% | 🟢 +6.4% | +21.64u | 0.1451 |
| `standard` | 13 | 54% | 🔴 -7.8% | -0.75u | 0.241 |
| `skip` | 454 | 52% | 🔴 -0.6% | +156.15u | 0.2334 |

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 390 | 53% | 🟢 +1.8% | +177.20u | 0.2253 |
| baseball | 58 | 55% | 🔴 -4.9% | -0.16u | 0.2459 |
| basketball | 24 | 58% | 🔴 -13.2% | +0.00u | 0.2391 |
| hockey | 20 | 50% | 🔴 -14.5% | +0.00u | 0.2419 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 342 | 53% | 🟡 +1.8% | 0.2268 |
| `baseball:all` | 58 | 55% | 🔴 -4.9% | 0.2459 |
| `football:top5` | 48 | 56% | 🟡 +1.6% | 0.2147 |
| `basketball:all` | 24 | 58% | 🔴 -13.2% | 0.2391 |
| `hockey:all` | 20 | 50% | 🔴 -14.5% | 0.2419 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 79 | 71% | 🔴 -5.3% | 0.1986 |
| fav | 237 | 58% | 🟢 +2.3% | 0.2351 |
| toss_up | 126 | 44% | 🔴 -0.8% | 0.2446 |
| dog | 49 | 31% | 🔴 -2.8% | 0.2116 |
| heavy_dog | 1 | 0% | 🔴 -100.0% | 0.122 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 82 | 36.4% | 34.1% | ⚪ -2.3% |
| [0.4–0.5] | 124 | 45.6% | 41.9% | ⚪ -3.7% |
| [0.5–0.6] | 165 | 54.7% | 58.2% | ⚪ +3.5% |
| [0.6–0.7] | 76 | 64.4% | 67.1% | ⚪ +2.7% |
| [0.7–0.8] | 34 | 74.4% | 82.4% | 🟢 +8.0% |
| [0.8–0.9] | 9 | 83.7% | 88.9% | 🟢 +5.2% |
| [0.9–1.0] | 2 | 91.0% | 50.0% | 🔴 -41.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 58 | 55% | 🔴 -4.9% | 0.2459 |
| `nba` | 24 | 58% | 🔴 -13.2% | 0.2391 |
| `nhl` | 20 | 50% | 🔴 -14.5% | 0.2419 |
| `jpn.1` | 19 | 42% | 🔴 -10.6% | 0.2305 |
| `ita.2` | 18 | 56% | 🟢 +10.7% | 0.219 |
| `conmebol.libertadores` | 16 | 69% | 🟢 +14.8% | 0.1857 |
| `conmebol.sudamericana` | 15 | 60% | 🟢 +22.1% | 0.218 |
| `eng.3` | 15 | 60% | 🟢 +23.2% | 0.2375 |
| `chn.1` | 13 | 46% | 🔴 -14.6% | 0.2514 |
| `esp.2` | 13 | 46% | 🔴 -6.2% | 0.2192 |
