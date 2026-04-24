# Backtest ROI — VRAI modèle (v2)

Généré : 2026-04-24T13:27:05Z  
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)  
Univers : 10 picks sur 2026-04-22T19:00Z → 2026-04-23T02:00Z  
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 113.92u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **10 picks** · 5 gagnés / 5 perdus · WR **50.0%**
- ROI flat (1u/pick) : **-11.86%** (-1.19u cumulé)
- Kelly 0.25× cap 10% : cumulé **+13.92u**
- Cote moyenne : 1.77 · Pick prob moyenne : 58.8%
- **Brier** : 0.2235 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6337 (plus bas = mieux calibré)

## Par tier de fiabilité

| Tier | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| `lock` | 2 | 100% | 🟢 +9.6% | +0.00u | 0.0635 |
| `standard` | 8 | 38% | 🔴 -17.2% | +13.92u | 0.2635 |

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 5 | 40% | 🔴 -7.1% | +13.92u | 0.2484 |
| hockey | 3 | 33% | 🔴 -37.7% | +0.00u | 0.2713 |
| basketball | 2 | 100% | 🟢 +15.1% | +0.00u | 0.0893 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 3 | 100% | 🟢 +14.8% | 0.0798 |
| fav | 6 | 17% | 🔴 -68.8% | 0.2901 |
| dog | 1 | 100% | 🟢 +250.0% | 0.2546 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.4–0.5] | 1 | 49.5% | 100.0% | 🟢 +50.5% |
| [0.5–0.6] | 5 | 52.3% | 20.0% | 🔴 -32.3% |
| [0.6–0.7] | 2 | 63.8% | 50.0% | 🔴 -13.8% |
| [0.7–0.8] | 2 | 74.8% | 100.0% | 🟢 +25.2% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `nhl` | 3 | 33% | 🔴 -37.7% | 0.2713 |
| `usa.1` | 3 | 33% | 🟢 +16.7% | 0.3062 |
| `eng.1` | 2 | 50% | 🔴 -42.9% | 0.1617 |
| `nba` | 2 | 100% | 🟢 +15.1% | 0.0893 |
