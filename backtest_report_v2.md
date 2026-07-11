# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-11T06:05:21Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 651 picks sur 2026-05-26T00:00Z → 2026-07-11T02:10Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 121.2u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **651 picks** · 382 gagnés / 269 perdus · WR **58.7%**
- ROI flat (1u/pick) : **+1.48%** (+9.64u cumulé)
- Kelly 0.25× cap 10% : cumulé **+21.20u**
- Cote moyenne : 1.76 · Pick prob moyenne : 55.2%
- **Brier** : 0.2388 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6704 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1211.98€** (+21.2%) · DD max 6.9% · Sharpe/pick +0.050

## Séries

- Streak courante : ❄️ **1** loses consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **6**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 6 picks (2026-06-10T22:35Z → 2026-06-10T23:40Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 4 | 75% | 30–95% | 🟢 +41.0% | +3.24u | 0.2146 | +3.3pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 647 | 59% | 55–62% | 🟢 +1.2% | +17.96u | 0.2389 | -3.0pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 4 | 0.1845 | 0.363 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 647 | 0.0446 | 0.243 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 533 | 58% | 🔴 -1.1% | +2.44u | 0.242 |
| football | 71 | 54% | 🟢 +13.2% | +17.96u | 0.2347 |
| basketball | 40 | 72% | 🟢 +6.8% | +0.80u | 0.2067 |
| hockey | 7 | 86% | 🟢 +46.8% | +0.00u | 0.2194 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 533 | 58% | 🔴 -1.1% | 0.242 |
| `football:other` | 71 | 54% | 🟢 +13.2% | 0.2347 |
| `basketball:all` | 40 | 72% | 🟢 +6.8% | 0.2067 |
| `hockey:all` | 7 | 86% | 🟢 +46.8% | 0.2194 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 68 | 71% | 🔴 -3.2% | 0.1994 |
| fav | 539 | 58% | 🔴 -0.0% | 0.2435 |
| toss_up | 32 | 56% | 🟢 +26.6% | 0.2431 |
| dog | 12 | 42% | 🟢 +29.2% | 0.2385 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 22 | 36.7% | 27.3% | 🔴 -9.4% |
| [0.4–0.5] | 57 | 47.4% | 63.2% | 🟢 +15.8% |
| [0.5–0.6] | 455 | 54.3% | 56.5% | ⚪ +2.2% |
| [0.6–0.7] | 98 | 63.5% | 68.4% | ⚪ +4.8% |
| [0.7–0.8] | 14 | 73.6% | 92.9% | 🟢 +19.3% |
| [0.8–0.9] | 5 | 84.3% | 60.0% | 🔴 -24.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 533 | 58% | 🔴 -1.1% | 0.242 |
| `wnba` | 34 | 76% | 🟢 +11.1% | 0.1969 |
| `chn.1` | 19 | 68% | 🟢 +45.0% | 0.2047 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `esp.2` | 9 | 78% | 🟢 +31.8% | 0.1901 |
| `nhl` | 7 | 86% | 🟢 +46.8% | 0.2194 |
| `allsvenskan` | 6 | 17% | 🔴 -68.2% | 0.1911 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `nba` | 6 | 50% | 🔴 -17.3% | 0.2622 |
| `eliteserien` | 5 | 80% | 🟢 +67.1% | 0.2593 |
