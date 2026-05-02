# Backtest ROI — VRAI modèle (v2)

Généré : 2026-05-02T06:17:53Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 492 picks sur 2026-04-23T18:45Z → 2026-05-02T03:55Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 280.92u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **492 picks** · 267 gagnés / 225 perdus · WR **54.3%**
- ROI flat (1u/pick) : **+0.76%** (+3.73u cumulé)
- Kelly 0.25× cap 10% : cumulé **+180.92u**
- Cote moyenne : 1.98 · Pick prob moyenne : 52.9%
- **Brier** : 0.2292 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6507 (plus bas = mieux calibré)

## Séries

- Streak courante : ❄️ **2** loses consécutifs
- Plus longue série gagnante : **9**
- Plus longue série perdante : **9**
- Top run win : 9 picks (2026-04-30T19:00Z → 2026-05-01T00:00Z)
- Top run lose : 9 picks (2026-04-25T21:00Z → 2026-04-25T21:30Z)

## Par tier de fiabilité

| Tier | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| `lock` | 25 | 84% | 🟢 +6.4% | +21.95u | 0.1451 |
| `standard` | 1 | 100% | 🟢 +54.0% | +0.00u | 0.1454 |
| `skip` | 466 | 53% | 🟢 +0.3% | +158.97u | 0.2339 |

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 390 | 53% | 🟢 +1.8% | +180.32u | 0.2255 |
| baseball | 58 | 60% | 🟢 +4.4% | +0.60u | 0.2439 |
| basketball | 24 | 58% | 🔴 -11.3% | +0.00u | 0.2429 |
| hockey | 20 | 50% | 🔴 -14.5% | +0.00u | 0.2424 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 342 | 53% | 🟡 +1.8% | 0.2271 |
| `baseball:all` | 58 | 60% | 🟡 +4.4% | 0.2439 |
| `football:top5` | 48 | 56% | 🟡 +1.6% | 0.2147 |
| `basketball:all` | 24 | 58% | 🔴 -11.3% | 0.2429 |
| `hockey:all` | 20 | 50% | 🔴 -14.5% | 0.2424 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 77 | 71% | 🔴 -4.4% | 0.1988 |
| fav | 240 | 59% | 🟢 +4.0% | 0.2353 |
| toss_up | 125 | 44% | 🔴 -0.0% | 0.2442 |
| dog | 49 | 31% | 🔴 -2.8% | 0.2114 |
| heavy_dog | 1 | 0% | 🔴 -100.0% | 0.122 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 82 | 36.4% | 34.1% | ⚪ -2.2% |
| [0.4–0.5] | 123 | 45.6% | 43.1% | ⚪ -2.6% |
| [0.5–0.6] | 165 | 54.7% | 59.4% | ⚪ +4.7% |
| [0.6–0.7] | 77 | 64.4% | 66.2% | ⚪ +1.8% |
| [0.7–0.8] | 34 | 74.4% | 82.4% | 🟢 +8.0% |
| [0.8–0.9] | 9 | 83.7% | 88.9% | 🟢 +5.2% |
| [0.9–1.0] | 2 | 91.0% | 50.0% | 🔴 -41.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 58 | 60% | 🟢 +4.4% | 0.2439 |
| `nba` | 24 | 58% | 🔴 -11.3% | 0.2429 |
| `nhl` | 20 | 50% | 🔴 -14.5% | 0.2424 |
| `jpn.1` | 19 | 42% | 🔴 -10.6% | 0.2359 |
| `ita.2` | 18 | 56% | 🟢 +10.7% | 0.219 |
| `conmebol.libertadores` | 16 | 69% | 🟢 +14.8% | 0.1857 |
| `conmebol.sudamericana` | 15 | 60% | 🟢 +22.1% | 0.218 |
| `eng.3` | 15 | 60% | 🟢 +23.2% | 0.2375 |
| `chn.1` | 13 | 46% | 🔴 -14.6% | 0.2514 |
| `esp.2` | 13 | 46% | 🔴 -6.2% | 0.2192 |
