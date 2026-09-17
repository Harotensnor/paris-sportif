# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-17T08:58:28Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1036 picks sur 2026-08-17T16:00Z → 2026-09-16T21:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 2449776.6u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1036 picks** · 595 gagnés / 441 perdus · WR **57.4%**
- ROI flat (1u/pick) : **+15.24%** (+157.85u cumulé)
- Kelly 0.25× cap 10% : cumulé **+2449676.60u**
- Cote moyenne : 2.12 · Pick prob moyenne : 54.3%
- **Brier** : 0.2188 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6256 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **24497766.00€** (+2449676.6%) · DD max 33.5% · Sharpe/pick +0.283

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **13**
- Plus longue série perdante : **6**
- Top run win : 13 picks (2026-09-09T16:45Z → 2026-09-09T19:00Z)
- Top run lose : 6 picks (2026-09-12T14:00Z → 2026-09-12T14:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 1036 | 57% | 54–60% | 🟢 +15.2% | +2449676.60u | 0.2188 | +2.3pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1036 | 0.0412 | 0.755 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 950 | 58% | 🟢 +17.4% | +2449676.60u | 0.2169 |
| baseball | 82 | 54% | 🔴 -9.8% | +0.00u | 0.2421 |
| basketball | 4 | 75% | 🟢 +16.6% | +0.00u | 0.1903 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 769 | 57% | 🟢 +14.3% | 0.2197 |
| `football:top5` | 181 | 61% | 🟢 +30.4% | 0.2055 |
| `baseball:all` | 82 | 54% | 🔴 -9.8% | 0.2421 |
| `basketball:all` | 4 | 75% | 🟢 +16.6% | 0.1903 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 179 | 79% | 🟢 +4.1% | 0.1455 |
| fav | 404 | 55% | 🔴 -4.4% | 0.2273 |
| toss_up | 268 | 57% | 🟢 +31.0% | 0.2419 |
| dog | 182 | 43% | 🟢 +41.5% | 0.2357 |
| heavy_dog | 3 | 67% | 🟢 +330.0% | 0.3792 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.2–0.3] | 1 | 24.5% | 100.0% | 🟢 +75.5% |
| [0.3–0.4] | 175 | 36.6% | 40.0% | ⚪ +3.4% |
| [0.4–0.5] | 248 | 45.1% | 43.1% | ⚪ -2.0% |
| [0.5–0.6] | 303 | 54.8% | 56.4% | ⚪ +1.6% |
| [0.6–0.7] | 166 | 64.2% | 71.1% | 🟢 +6.9% |
| [0.7–0.8] | 83 | 74.6% | 84.3% | 🟢 +9.7% |
| [0.8–0.9] | 50 | 84.9% | 98.0% | 🟢 +13.1% |
| [0.9–1.0] | 10 | 91.5% | 90.0% | ⚪ -1.5% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 82 | 54% | 🔴 -9.8% | 0.2421 |
| `eng.2` | 62 | 58% | 🟢 +29.4% | 0.2236 |
| `eng.3` | 47 | 51% | 🟢 +19.8% | 0.2536 |
| `eng.4` | 47 | 57% | 🟢 +38.3% | 0.2396 |
| `esp.1` | 43 | 49% | 🔴 -15.0% | 0.1747 |
| `eng.1` | 40 | 60% | 🟢 +49.7% | 0.2334 |
| `jpn.1` | 40 | 52% | 🟢 +10.4% | 0.2233 |
| `ita.1` | 38 | 76% | 🟢 +54.8% | 0.1858 |
| `fra.1` | 35 | 60% | 🟢 +40.5% | 0.2322 |
| `esp.2` | 33 | 52% | 🟢 +16.1% | 0.2127 |
