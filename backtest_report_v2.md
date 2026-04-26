# Backtest ROI — VRAI modèle (v2)

Généré : 2026-04-26T21:20:06Z  
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)  
Univers : 264 picks sur 2026-04-23T18:45Z → 2026-04-26T19:00Z  
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 247.52u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **264 picks** · 147 gagnés / 117 perdus · WR **55.7%**
- ROI flat (1u/pick) : **+3.34%** (+8.81u cumulé)
- Kelly 0.25× cap 10% : cumulé **+147.52u**
- Cote moyenne : 1.97 · Pick prob moyenne : 52.0%
- **Brier** : 0.2243 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6391 (plus bas = mieux calibré)

## Séries

- Streak courante : ❄️ **1** loses consécutifs
- Plus longue série gagnante : **6**
- Plus longue série perdante : **8**
- Top run win : 6 picks (2026-04-24T02:00Z → 2026-04-24T18:00Z)
- Top run lose : 8 picks (2026-04-25T18:00Z → 2026-04-25T19:00Z)

## Par tier de fiabilité

| Tier | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| `lock` | 25 | 92% | 🟢 +23.0% | +15.45u | 0.1079 |
| `standard` | 70 | 60% | 🟢 +6.4% | +29.17u | 0.246 |
| `lowconf` | 16 | 50% | 🟢 +10.2% | +14.17u | 0.253 |
| `skip` | 153 | 48% | 🔴 -2.0% | +88.73u | 0.2304 |

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 234 | 57% | 🟢 +6.6% | +128.43u | 0.2204 |
| baseball | 13 | 38% | 🔴 -36.7% | +0.00u | 0.2561 |
| basketball | 9 | 33% | 🔴 -49.4% | +1.89u | 0.2702 |
| hockey | 8 | 62% | 🟢 +32.2% | +17.20u | 0.233 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 42 | 74% | 🔴 -2.1% | 0.1729 |
| fav | 110 | 63% | 🟢 +9.8% | 0.2354 |
| toss_up | 94 | 46% | 🟢 +4.9% | 0.2379 |
| dog | 17 | 24% | 🔴 -27.4% | 0.2004 |
| heavy_dog | 1 | 0% | 🔴 -100.0% | 0.2791 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 35 | 37.7% | 37.1% | ⚪ -0.6% |
| [0.4–0.5] | 92 | 45.0% | 45.7% | ⚪ +0.6% |
| [0.5–0.6] | 78 | 54.6% | 59.0% | ⚪ +4.4% |
| [0.6–0.7] | 40 | 64.5% | 70.0% | 🟢 +5.5% |
| [0.7–0.8] | 16 | 73.2% | 93.8% | 🟢 +20.6% |
| [0.8–0.9] | 2 | 84.9% | 100.0% | 🟢 +15.1% |
| [0.9–1.0] | 1 | 91.4% | 100.0% | 🟢 +8.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 13 | 38% | 🔴 -36.7% | 0.2561 |
| `eng.3` | 12 | 50% | 🔴 -17.2% | 0.1755 |
| `eng.4` | 12 | 58% | 🔴 -9.5% | 0.174 |
| `eng.2` | 10 | 50% | 🔴 -1.3% | 0.2253 |
| `esp.1` | 9 | 67% | 🟢 +23.3% | 0.1956 |
| `esp.2` | 9 | 44% | 🔴 -6.7% | 0.2068 |
| `fra.1` | 9 | 44% | 🔴 -32.5% | 0.2054 |
| `ger.1` | 9 | 67% | 🟢 +15.7% | 0.2192 |
| `nba` | 9 | 33% | 🔴 -49.4% | 0.2702 |
| `chn.1` | 8 | 50% | 🔴 -8.0% | 0.2277 |
