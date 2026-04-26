# Backtest ROI — VRAI modèle (v2)

Généré : 2026-04-26T06:38:18Z  
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)  
Univers : 179 picks sur 2026-04-23T18:45Z → 2026-04-25T21:30Z  
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 177.81u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **179 picks** · 105 gagnés / 74 perdus · WR **58.7%**
- ROI flat (1u/pick) : **+7.20%** (+12.88u cumulé)
- Kelly 0.25× cap 10% : cumulé **+77.81u**
- Cote moyenne : 1.96 · Pick prob moyenne : 52.6%
- **Brier** : 0.2163 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6221 (plus bas = mieux calibré)

## Par tier de fiabilité

| Tier | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| `lock` | 45 | 87% | 🟢 +26.4% | +41.68u | 0.1472 |
| `standard` | 40 | 62% | 🟢 +12.8% | +12.47u | 0.2355 |
| `lowconf` | 13 | 54% | 🟢 +25.7% | +13.00u | 0.2557 |
| `skip` | 81 | 42% | 🔴 -9.2% | +10.66u | 0.2389 |

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 160 | 59% | 🟢 +8.1% | +70.31u | 0.2141 |
| basketball | 8 | 38% | 🔴 -51.5% | +0.00u | 0.245 |
| hockey | 7 | 57% | 🟢 +14.6% | +7.15u | 0.2329 |
| baseball | 4 | 100% | 🟢 +75.5% | +0.35u | 0.2194 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 30 | 83% | 🟢 +10.0% | 0.1457 |
| fav | 76 | 66% | 🟢 +14.1% | 0.2251 |
| toss_up | 61 | 44% | 🟢 +2.8% | 0.2431 |
| dog | 12 | 25% | 🔴 -21.2% | 0.2008 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 24 | 37.7% | 41.7% | ⚪ +4.0% |
| [0.4–0.5] | 57 | 45.2% | 42.1% | ⚪ -3.1% |
| [0.5–0.6] | 56 | 54.6% | 62.5% | 🟢 +7.9% |
| [0.6–0.7] | 28 | 64.8% | 78.6% | 🟢 +13.8% |
| [0.7–0.8] | 11 | 73.0% | 100.0% | 🟢 +27.0% |
| [0.8–0.9] | 2 | 84.9% | 100.0% | 🟢 +15.1% |
| [0.9–1.0] | 1 | 91.4% | 100.0% | 🟢 +8.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `eng.3` | 12 | 50% | 🔴 -17.2% | 0.1755 |
| `eng.4` | 12 | 58% | 🔴 -9.5% | 0.174 |
| `eng.2` | 9 | 44% | 🔴 -10.2% | 0.2334 |
| `fra.2` | 8 | 38% | 🔴 -24.4% | 0.2407 |
| `ita.2` | 8 | 50% | 🔴 -12.9% | 0.1854 |
| `jpn.1` | 8 | 75% | 🟢 +58.7% | 0.2436 |
| `nba` | 8 | 38% | 🔴 -51.5% | 0.245 |
| `ger.1` | 7 | 71% | 🟢 +28.3% | 0.1919 |
| `nhl` | 7 | 57% | 🟢 +14.6% | 0.2329 |
| `eng.1` | 6 | 83% | 🟢 +60.5% | 0.2521 |
