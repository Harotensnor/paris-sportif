# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-16T06:08:37Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 692 picks sur 2026-05-27T19:00Z → 2026-07-16T00:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 123.25u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **692 picks** · 404 gagnés / 288 perdus · WR **58.4%**
- ROI flat (1u/pick) : **+1.43%** (+9.89u cumulé)
- Kelly 0.25× cap 10% : cumulé **+23.25u**
- Cote moyenne : 1.76 · Pick prob moyenne : 55.1%
- **Brier** : 0.2418 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6766 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1232.49€** (+23.2%) · DD max 6.4% · Sharpe/pick +0.050

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
| `skip` | 692 | 58% | 55–62% | 🟢 +1.4% | +23.25u | 0.2418 | -3.0pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 692 | 0.0391 | 0.24 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 549 | 57% | 🔴 -1.8% | +0.00u | 0.2444 |
| football | 93 | 57% | 🟢 +16.6% | +23.25u | 0.24 |
| basketball | 44 | 70% | 🟢 +4.1% | +0.00u | 0.2143 |
| hockey | 6 | 83% | 🟢 +43.9% | +0.00u | 0.2262 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 549 | 57% | 🔴 -1.8% | 0.2444 |
| `football:other` | 93 | 57% | 🟢 +16.6% | 0.24 |
| `basketball:all` | 44 | 70% | 🟡 +4.1% | 0.2143 |
| `hockey:all` | 6 | 83% | 🟢 +43.9% | 0.2262 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 72 | 65% | 🔴 -10.4% | 0.2218 |
| fav | 572 | 58% | 🟢 +0.2% | 0.2436 |
| toss_up | 34 | 59% | 🟢 +34.3% | 0.2526 |
| dog | 14 | 43% | 🟢 +33.2% | 0.2421 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 25 | 36.4% | 32.0% | ⚪ -4.4% |
| [0.4–0.5] | 61 | 47.3% | 65.6% | 🟢 +18.3% |
| [0.5–0.6] | 480 | 54.4% | 56.5% | ⚪ +2.1% |
| [0.6–0.7] | 107 | 63.7% | 65.4% | ⚪ +1.7% |
| [0.7–0.8] | 14 | 73.6% | 85.7% | 🟢 +12.1% |
| [0.8–0.9] | 5 | 84.0% | 60.0% | 🔴 -24.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 549 | 57% | 🔴 -1.8% | 0.2444 |
| `wnba` | 39 | 74% | 🟢 +8.9% | 0.2061 |
| `chn.1` | 22 | 68% | 🟢 +41.1% | 0.2214 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `allsvenskan` | 12 | 50% | 🔴 -10.7% | 0.2183 |
| `eliteserien` | 9 | 89% | 🟢 +72.0% | 0.2408 |
| `esp.2` | 9 | 78% | 🟢 +31.8% | 0.1901 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `nhl` | 6 | 83% | 🟢 +43.9% | 0.2262 |
| `nba` | 5 | 40% | 🔴 -33.1% | 0.2782 |
