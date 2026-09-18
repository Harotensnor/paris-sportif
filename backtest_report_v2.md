# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-18T08:33:18Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1053 picks sur 2026-08-17T16:00Z → 2026-09-17T19:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 2494769.44u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1053 picks** · 607 gagnés / 446 perdus · WR **57.6%**
- ROI flat (1u/pick) : **+15.39%** (+162.07u cumulé)
- Kelly 0.25× cap 10% : cumulé **+2494669.44u**
- Cote moyenne : 2.11 · Pick prob moyenne : 54.3%
- **Brier** : 0.2189 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6258 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **24947694.41€** (+2494669.4%) · DD max 33.5% · Sharpe/pick +0.281

## Séries

- Streak courante : 🔥 **5** wins consécutifs
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
| `skip` | 1053 | 58% | 55–61% | 🟢 +15.4% | +2494669.44u | 0.2189 | +2.2pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1053 | 0.0395 | 0.755 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 963 | 58% | 🟢 +17.6% | +2494669.44u | 0.2172 |
| baseball | 86 | 55% | 🔴 -8.8% | +0.00u | 0.239 |
| basketball | 4 | 75% | 🟢 +16.6% | +0.00u | 0.1903 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 780 | 57% | 🟢 +14.4% | 0.22 |
| `football:top5` | 183 | 62% | 🟢 +31.0% | 0.2055 |
| `baseball:all` | 86 | 55% | 🔴 -8.8% | 0.239 |
| `basketball:all` | 4 | 75% | 🟢 +16.6% | 0.1903 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 185 | 79% | 🟢 +4.3% | 0.1459 |
| fav | 410 | 55% | 🔴 -4.6% | 0.2274 |
| toss_up | 271 | 57% | 🟢 +31.8% | 0.2424 |
| dog | 184 | 43% | 🟢 +41.9% | 0.2362 |
| heavy_dog | 3 | 67% | 🟢 +330.0% | 0.3792 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.2–0.3] | 1 | 24.5% | 100.0% | 🟢 +75.5% |
| [0.3–0.4] | 177 | 36.6% | 40.1% | ⚪ +3.6% |
| [0.4–0.5] | 251 | 45.1% | 43.8% | ⚪ -1.3% |
| [0.5–0.6] | 308 | 54.9% | 56.2% | ⚪ +1.3% |
| [0.6–0.7] | 169 | 64.2% | 71.6% | 🟢 +7.4% |
| [0.7–0.8] | 86 | 74.6% | 83.7% | 🟢 +9.1% |
| [0.8–0.9] | 51 | 84.8% | 98.0% | 🟢 +13.2% |
| [0.9–1.0] | 10 | 91.5% | 90.0% | ⚪ -1.5% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 86 | 55% | 🔴 -8.8% | 0.239 |
| `eng.2` | 62 | 58% | 🟢 +29.4% | 0.2236 |
| `eng.3` | 48 | 52% | 🟢 +24.6% | 0.2576 |
| `eng.4` | 47 | 57% | 🟢 +38.3% | 0.2396 |
| `esp.1` | 45 | 51% | 🔴 -10.8% | 0.1762 |
| `eng.1` | 40 | 60% | 🟢 +49.7% | 0.2334 |
| `jpn.1` | 40 | 52% | 🟢 +10.4% | 0.2233 |
| `ita.1` | 38 | 76% | 🟢 +54.8% | 0.1858 |
| `fra.1` | 35 | 60% | 🟢 +40.5% | 0.2322 |
| `eng.league_cup` | 33 | 73% | 🟢 +28.2% | 0.2119 |
