# Backtest ROI — VRAI modèle (v2)

Généré : 2026-04-25T18:48:05Z  
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)  
Univers : 87 picks sur 2026-04-23T18:45Z → 2026-04-25T16:45Z  
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 136.29u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **87 picks** · 53 gagnés / 34 perdus · WR **60.9%**
- ROI flat (1u/pick) : **+9.54%** (+8.30u cumulé)
- Kelly 0.25× cap 10% : cumulé **+36.29u**
- Cote moyenne : 1.97 · Pick prob moyenne : 51.9%
- **Brier** : 0.2091 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6081 (plus bas = mieux calibré)

## Par tier de fiabilité

| Tier | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| `lock` | 1 | 100% | 🟢 +21.1% | +0.00u | 0.0429 |
| `standard` | 42 | 74% | 🟢 +18.3% | +29.89u | 0.1907 |
| `lowconf` | 18 | 72% | 🟢 +54.1% | +27.80u | 0.2674 |
| `skip` | 26 | 31% | 🔴 -35.9% | -21.40u | 0.2047 |

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 81 | 62% | 🟢 +9.9% | +22.62u | 0.2072 |
| basketball | 3 | 0% | 🔴 -100.0% | +0.00u | 0.2754 |
| hockey | 3 | 100% | 🟢 +109.0% | +13.66u | 0.1941 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 14 | 93% | 🟢 +21.3% | 0.1293 |
| fav | 39 | 69% | 🟢 +21.2% | 0.2263 |
| toss_up | 27 | 44% | 🟢 +3.1% | 0.2359 |
| dog | 7 | 14% | 🔴 -54.3% | 0.1693 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 13 | 37.3% | 23.1% | 🔴 -14.2% |
| [0.4–0.5] | 28 | 45.6% | 57.1% | 🟢 +11.5% |
| [0.5–0.6] | 27 | 54.2% | 59.3% | 🟢 +5.1% |
| [0.6–0.7] | 12 | 64.4% | 91.7% | 🟢 +27.3% |
| [0.7–0.8] | 7 | 74.1% | 100.0% | 🟢 +25.9% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `eng.3` | 12 | 50% | 🔴 -17.2% | 0.1755 |
| `eng.4` | 12 | 58% | 🔴 -9.5% | 0.1759 |
| `jpn.1` | 8 | 75% | 🟢 +58.7% | 0.2436 |
| `fra.2` | 7 | 43% | 🔴 -13.5% | 0.2432 |
| `eng.1` | 6 | 83% | 🟢 +57.3% | 0.25 |
| `ger.1` | 6 | 67% | 🟢 +22.3% | 0.1836 |
| `aus.1` | 4 | 100% | 🟢 +92.6% | 0.2285 |
| `col.1` | 3 | 33% | 🔴 -38.9% | 0.23 |
| `esp.1` | 3 | 67% | 🟢 +23.5% | 0.2304 |
| `nba` | 3 | 0% | 🔴 -100.0% | 0.2754 |
