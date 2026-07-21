# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-21T06:20:20Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 719 picks sur 2026-05-29T17:00Z → 2026-07-21T00:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 127.93u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **719 picks** · 413 gagnés / 306 perdus · WR **57.4%**
- ROI flat (1u/pick) : **+0.27%** (+1.93u cumulé)
- Kelly 0.25× cap 10% : cumulé **+27.93u**
- Cote moyenne : 1.77 · Pick prob moyenne : 55.0%
- **Brier** : 0.2418 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6765 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1279.31€** (+27.9%) · DD max 6.6% · Sharpe/pick +0.054

## Séries

- Streak courante : ❄️ **1** loses consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **7**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 7 picks (2026-07-10T23:50Z → 2026-07-11T02:15Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 719 | 57% | 54–61% | 🟢 +0.3% | +27.93u | 0.2418 | -2.8pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 719 | 0.028 | 0.172 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 544 | 57% | 🔴 -2.6% | +0.00u | 0.2442 |
| football | 126 | 56% | 🟢 +12.4% | +27.93u | 0.238 |
| basketball | 44 | 66% | 🔴 -3.0% | +0.00u | 0.2235 |
| hockey | 5 | 80% | 🟢 +39.8% | +0.00u | 0.2357 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 544 | 57% | 🔴 -2.6% | 0.2442 |
| `football:other` | 126 | 56% | 🟢 +12.4% | 0.238 |
| `basketball:all` | 44 | 66% | 🔴 -3.0% | 0.2235 |
| `hockey:all` | 5 | 80% | 🟢 +39.8% | 0.2357 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 78 | 64% | 🔴 -12.5% | 0.2234 |
| fav | 581 | 57% | 🔴 -0.4% | 0.2435 |
| toss_up | 42 | 50% | 🟢 +15.1% | 0.2474 |
| dog | 18 | 44% | 🟢 +41.9% | 0.2537 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 28 | 36.6% | 35.7% | ⚪ -0.9% |
| [0.4–0.5] | 78 | 47.0% | 57.7% | 🟢 +10.7% |
| [0.5–0.6] | 479 | 54.4% | 55.7% | ⚪ +1.4% |
| [0.6–0.7] | 112 | 63.8% | 65.2% | ⚪ +1.4% |
| [0.7–0.8] | 16 | 73.5% | 87.5% | 🟢 +14.0% |
| [0.8–0.9] | 6 | 83.9% | 66.7% | 🔴 -17.2% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 544 | 57% | 🔴 -2.6% | 0.2442 |
| `wnba` | 40 | 70% | 🟢 +2.4% | 0.2156 |
| `chn.1` | 29 | 59% | 🟢 +18.9% | 0.2395 |
| `allsvenskan` | 17 | 59% | 🟢 +11.4% | 0.2344 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `eliteserien` | 10 | 90% | 🟢 +71.0% | 0.2343 |
| `esp.2` | 9 | 78% | 🟢 +31.8% | 0.1901 |
| `ligamx` | 9 | 44% | 🔴 -18.7% | 0.2201 |
| `nor.1` | 9 | 67% | 🟢 +36.1% | 0.233 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
