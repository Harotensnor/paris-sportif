# Backtest ROI — VRAI modèle (v2)

Généré : 2026-06-11T08:26:18Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 290 picks sur 2026-05-24T15:00Z → 2026-06-10T19:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 106.87u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **290 picks** · 162 gagnés / 128 perdus · WR **55.9%**
- ROI flat (1u/pick) : **-0.66%** (-1.90u cumulé)
- Kelly 0.25× cap 10% : cumulé **+6.87u**
- Cote moyenne : 1.82 · Pick prob moyenne : 53.9%
- **Brier** : 0.2396 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6714 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1068.67€** (+6.9%) · DD max 9.7% · Sharpe/pick +0.034

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **4**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 4 picks (2026-05-24T18:10Z → 2026-05-24T18:45Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 3 | 33% | 6–79% | 🔴 -29.0% | +0.58u | 0.2611 | +6.2pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 287 | 56% | 50–62% | 🔴 -0.4% | +6.29u | 0.2394 | -2.8pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 3 | 0.22 | 0.22 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 287 | 0.038 | 0.27 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 203 | 57% | 🔴 -3.3% | +0.69u | 0.2408 |
| football | 65 | 49% | 🟢 +4.6% | +6.17u | 0.2411 |
| basketball | 15 | 67% | 🟢 +0.8% | +0.00u | 0.2182 |
| hockey | 7 | 71% | 🟢 +23.3% | +0.00u | 0.2382 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 203 | 57% | 🔴 -3.3% | 0.2408 |
| `football:other` | 59 | 47% | 🟡 +2.8% | 0.2369 |
| `basketball:all` | 15 | 67% | 🟡 +0.8% | 0.2182 |
| `hockey:all` | 7 | 71% | 🟢 +23.3% | 0.2382 |
| `football:top5` | 6 | 67% | 🟢 +21.8% | 0.2822 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 26 | 77% | 🟢 +6.7% | 0.1734 |
| fav | 225 | 55% | 🔴 -4.5% | 0.2469 |
| toss_up | 25 | 48% | 🟢 +6.7% | 0.2384 |
| dog | 14 | 43% | 🟢 +33.6% | 0.2473 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 21 | 36.6% | 28.6% | 🔴 -8.0% |
| [0.4–0.5] | 32 | 46.2% | 62.5% | 🟢 +16.3% |
| [0.5–0.6] | 193 | 54.4% | 54.9% | ⚪ +0.5% |
| [0.6–0.7] | 37 | 63.5% | 62.2% | ⚪ -1.4% |
| [0.7–0.8] | 6 | 73.0% | 100.0% | 🟢 +27.0% |
| [0.8–0.9] | 1 | 84.4% | 100.0% | 🟢 +15.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 203 | 57% | 🔴 -3.3% | 0.2408 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `wnba` | 9 | 78% | 🟢 +14.0% | 0.1908 |
| `esp.2` | 7 | 86% | 🟢 +38.0% | 0.1635 |
| `nhl` | 7 | 71% | 🟢 +23.3% | 0.2382 |
| `allsvenskan` | 6 | 17% | 🔴 -46.7% | 0.2172 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `nba` | 6 | 50% | 🔴 -18.9% | 0.2593 |
| `ita.1` | 5 | 60% | 🔴 -4.8% | 0.2735 |
