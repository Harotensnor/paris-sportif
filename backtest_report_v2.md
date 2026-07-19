# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-19T06:20:56Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 714 picks sur 2026-05-28T17:10Z → 2026-07-18T20:10Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 122.17u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **714 picks** · 411 gagnés / 303 perdus · WR **57.6%**
- ROI flat (1u/pick) : **+0.03%** (+0.22u cumulé)
- Kelly 0.25× cap 10% : cumulé **+22.17u**
- Cote moyenne : 1.76 · Pick prob moyenne : 55.0%
- **Brier** : 0.242 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.677 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1221.66€** (+22.2%) · DD max 6.6% · Sharpe/pick +0.050

## Séries

- Streak courante : 🔥 **1** wins consécutifs
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
| `skip` | 714 | 58% | 54–61% | 🟢 +0.0% | +22.17u | 0.242 | -3.0pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 714 | 0.0296 | 0.173 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 548 | 57% | 🔴 -2.7% | +0.00u | 0.2442 |
| football | 117 | 56% | 🟢 +11.1% | +22.17u | 0.24 |
| basketball | 44 | 68% | 🟢 +0.7% | +0.00u | 0.2203 |
| hockey | 5 | 80% | 🟢 +39.8% | +0.00u | 0.2357 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 548 | 57% | 🔴 -2.7% | 0.2442 |
| `football:other` | 117 | 56% | 🟢 +11.1% | 0.24 |
| `basketball:all` | 44 | 68% | 🟡 +0.7% | 0.2203 |
| `hockey:all` | 5 | 80% | 🟢 +39.8% | 0.2357 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 77 | 64% | 🔴 -12.7% | 0.2273 |
| fav | 584 | 57% | 🔴 -0.7% | 0.2432 |
| toss_up | 39 | 54% | 🟢 +23.7% | 0.2524 |
| dog | 14 | 43% | 🟢 +33.2% | 0.242 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 25 | 37.0% | 36.0% | ⚪ -1.0% |
| [0.4–0.5] | 78 | 46.6% | 57.7% | 🟢 +11.1% |
| [0.5–0.6] | 481 | 54.4% | 56.1% | ⚪ +1.8% |
| [0.6–0.7] | 110 | 63.8% | 64.5% | ⚪ +0.7% |
| [0.7–0.8] | 14 | 73.3% | 85.7% | 🟢 +12.4% |
| [0.8–0.9] | 6 | 83.9% | 66.7% | 🔴 -17.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 548 | 57% | 🔴 -2.7% | 0.2442 |
| `wnba` | 39 | 72% | 🟢 +5.0% | 0.2129 |
| `chn.1` | 30 | 60% | 🟢 +21.4% | 0.2447 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `allsvenskan` | 15 | 53% | 🔴 -1.2% | 0.2317 |
| `eliteserien` | 15 | 80% | 🟢 +46.2% | 0.2239 |
| `esp.2` | 9 | 78% | 🟢 +31.8% | 0.1901 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `uru.1` | 6 | 50% | 🟢 +25.1% | 0.2469 |
| `nba` | 5 | 40% | 🔴 -33.1% | 0.2782 |
