# Backtest ROI — VRAI modèle (v2)

Généré : 2026-04-26T18:48:59Z  
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)  
Univers : 236 picks sur 2026-04-23T18:45Z → 2026-04-26T16:30Z  
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 317.2u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **236 picks** · 133 gagnés / 103 perdus · WR **56.4%**
- ROI flat (1u/pick) : **+5.43%** (+12.81u cumulé)
- Kelly 0.25× cap 10% : cumulé **+217.20u**
- Cote moyenne : 1.98 · Pick prob moyenne : 51.9%
- **Brier** : 0.2211 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6327 (plus bas = mieux calibré)

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **6**
- Plus longue série perdante : **8**
- Top run win : 6 picks (2026-04-24T02:00Z → 2026-04-24T18:00Z)
- Top run lose : 8 picks (2026-04-25T18:00Z → 2026-04-25T19:00Z)

## Par tier de fiabilité

| Tier | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| `lock` | 33 | 88% | 🟢 +23.7% | +51.91u | 0.1333 |
| `standard` | 60 | 67% | 🟢 +15.4% | +34.55u | 0.2309 |
| `lowconf` | 16 | 44% | 🟢 +0.4% | +13.06u | 0.2463 |
| `skip` | 127 | 45% | 🔴 -3.4% | +117.68u | 0.2361 |

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 217 | 56% | 🟢 +5.9% | +200.19u | 0.2203 |
| basketball | 8 | 38% | 🔴 -50.8% | +0.00u | 0.2452 |
| hockey | 7 | 71% | 🟢 +51.1% | +17.01u | 0.2297 |
| baseball | 4 | 75% | 🟢 +14.2% | +0.00u | 0.2033 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 39 | 77% | 🟢 +2.1% | 0.1638 |
| fav | 94 | 65% | 🟢 +12.7% | 0.2308 |
| toss_up | 88 | 43% | ⚪ +0.0% | 0.2394 |
| dog | 14 | 21% | 🔴 -32.5% | 0.1932 |
| heavy_dog | 1 | 100% | 🟢 +460.0% | 0.3209 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 36 | 37.5% | 38.9% | ⚪ +1.4% |
| [0.4–0.5] | 80 | 45.2% | 43.8% | ⚪ -1.4% |
| [0.5–0.6] | 66 | 54.8% | 62.1% | 🟢 +7.3% |
| [0.6–0.7] | 37 | 64.6% | 73.0% | 🟢 +8.4% |
| [0.7–0.8] | 14 | 73.0% | 92.9% | 🟢 +19.8% |
| [0.8–0.9] | 2 | 84.9% | 100.0% | 🟢 +15.1% |
| [0.9–1.0] | 1 | 91.4% | 100.0% | 🟢 +8.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `eng.3` | 12 | 50% | 🔴 -17.2% | 0.1755 |
| `eng.4` | 12 | 58% | 🔴 -9.5% | 0.174 |
| `eng.2` | 10 | 50% | 🔴 -1.3% | 0.2253 |
| `ger.1` | 9 | 67% | 🟢 +15.7% | 0.2212 |
| `chn.1` | 8 | 50% | 🔴 -8.0% | 0.228 |
| `esp.1` | 8 | 62% | 🟢 +69.5% | 0.2197 |
| `esp.2` | 8 | 50% | 🔴 -17.1% | 0.1908 |
| `fra.1` | 8 | 50% | 🔴 -24.1% | 0.1956 |
| `fra.2` | 8 | 38% | 🔴 -24.4% | 0.2407 |
| `ita.2` | 8 | 50% | 🔴 -12.9% | 0.1854 |
