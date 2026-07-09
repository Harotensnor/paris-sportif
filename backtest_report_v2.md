# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-09T07:26:41Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 614 picks sur 2026-05-25T22:10Z → 2026-07-08T19:45Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 111.93u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **614 picks** · 354 gagnés / 260 perdus · WR **57.7%**
- ROI flat (1u/pick) : **+0.13%** (+0.82u cumulé)
- Kelly 0.25× cap 10% : cumulé **+11.93u**
- Cote moyenne : 1.76 · Pick prob moyenne : 55.0%
- **Brier** : 0.2413 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6756 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1119.30€** (+11.9%) · DD max 6.9% · Sharpe/pick +0.032

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **6**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 6 picks (2026-06-10T22:35Z → 2026-06-10T23:40Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 4 | 25% | 5–70% | 🔴 -47.5% | -3.33u | 0.2709 | +3.1pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 610 | 58% | 54–62% | 🟢 +0.5% | +15.26u | 0.2411 | -2.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 4 | 0.272 | 0.272 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 610 | 0.0402 | 0.35 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 501 | 57% | 🔴 -2.8% | -3.94u | 0.2441 |
| football | 70 | 53% | 🟢 +12.4% | +15.88u | 0.2358 |
| basketball | 36 | 72% | 🟢 +7.5% | +0.00u | 0.2164 |
| hockey | 7 | 86% | 🟢 +46.8% | +0.00u | 0.2194 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 501 | 57% | 🔴 -2.8% | 0.2441 |
| `football:other` | 70 | 53% | 🟢 +12.4% | 0.2358 |
| `basketball:all` | 36 | 72% | 🟢 +7.5% | 0.2164 |
| `hockey:all` | 7 | 86% | 🟢 +46.8% | 0.2194 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 60 | 70% | 🔴 -3.5% | 0.2048 |
| fav | 509 | 57% | 🔴 -1.6% | 0.2453 |
| toss_up | 33 | 55% | 🟢 +22.7% | 0.2464 |
| dog | 12 | 42% | 🟢 +29.2% | 0.2383 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 22 | 36.7% | 27.3% | 🔴 -9.4% |
| [0.4–0.5] | 54 | 47.3% | 64.8% | 🟢 +17.6% |
| [0.5–0.6] | 428 | 54.3% | 55.4% | ⚪ +1.1% |
| [0.6–0.7] | 94 | 63.5% | 67.0% | ⚪ +3.6% |
| [0.7–0.8] | 12 | 73.1% | 91.7% | 🟢 +18.5% |
| [0.8–0.9] | 4 | 85.0% | 50.0% | 🔴 -35.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 501 | 57% | 🔴 -2.8% | 0.2441 |
| `wnba` | 30 | 77% | 🟢 +12.5% | 0.2073 |
| `chn.1` | 18 | 67% | 🟢 +43.8% | 0.2073 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `esp.2` | 9 | 78% | 🟢 +31.8% | 0.1901 |
| `nhl` | 7 | 86% | 🟢 +46.8% | 0.2194 |
| `allsvenskan` | 6 | 17% | 🔴 -68.2% | 0.1911 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `nba` | 6 | 50% | 🔴 -17.3% | 0.2622 |
| `eliteserien` | 5 | 80% | 🟢 +67.1% | 0.2593 |
