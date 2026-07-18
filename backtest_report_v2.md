# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-18T05:55:02Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 701 picks sur 2026-05-27T22:40Z → 2026-07-18T03:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 122.42u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **701 picks** · 405 gagnés / 296 perdus · WR **57.8%**
- ROI flat (1u/pick) : **+0.25%** (+1.76u cumulé)
- Kelly 0.25× cap 10% : cumulé **+22.42u**
- Cote moyenne : 1.76 · Pick prob moyenne : 55.1%
- **Brier** : 0.242 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6771 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1224.16€** (+22.4%) · DD max 5.9% · Sharpe/pick +0.052

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
| `skip` | 701 | 58% | 54–61% | 🟢 +0.2% | +22.42u | 0.242 | -3.0pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 701 | 0.0314 | 0.173 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 546 | 57% | 🔴 -2.3% | +0.00u | 0.2445 |
| football | 104 | 55% | 🟢 +10.3% | +22.42u | 0.24 |
| basketball | 45 | 69% | 🟢 +1.8% | +0.00u | 0.2181 |
| hockey | 6 | 83% | 🟢 +43.9% | +0.00u | 0.2262 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 546 | 57% | 🔴 -2.3% | 0.2445 |
| `football:other` | 104 | 55% | 🟢 +10.3% | 0.24 |
| `basketball:all` | 45 | 69% | 🟡 +1.8% | 0.2181 |
| `hockey:all` | 6 | 83% | 🟢 +43.9% | 0.2262 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 75 | 64% | 🔴 -12.0% | 0.2264 |
| fav | 578 | 57% | 🔴 -0.6% | 0.2436 |
| toss_up | 35 | 54% | 🟢 +24.4% | 0.2469 |
| dog | 13 | 46% | 🟢 +43.5% | 0.2505 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 24 | 36.5% | 33.3% | ⚪ -3.1% |
| [0.4–0.5] | 67 | 47.1% | 61.2% | 🟢 +14.1% |
| [0.5–0.6] | 483 | 54.4% | 56.1% | ⚪ +1.7% |
| [0.6–0.7] | 108 | 63.8% | 64.8% | ⚪ +1.0% |
| [0.7–0.8] | 13 | 73.2% | 84.6% | 🟢 +11.4% |
| [0.8–0.9] | 6 | 83.9% | 66.7% | 🔴 -17.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 546 | 57% | 🔴 -2.3% | 0.2445 |
| `wnba` | 40 | 72% | 🟢 +6.2% | 0.2106 |
| `chn.1` | 26 | 62% | 🟢 +25.1% | 0.2339 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `allsvenskan` | 14 | 50% | 🔴 -10.9% | 0.2222 |
| `eliteserien` | 10 | 90% | 🟢 +71.0% | 0.2383 |
| `esp.2` | 9 | 78% | 🟢 +31.8% | 0.1901 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `nhl` | 6 | 83% | 🟢 +43.9% | 0.2262 |
| `ligamx` | 5 | 40% | 🔴 -30.0% | 0.2383 |
