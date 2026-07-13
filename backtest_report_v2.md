# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-13T06:43:04Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 702 picks sur 2026-05-26T22:10Z → 2026-07-12T21:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 149.76u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **702 picks** · 413 gagnés / 289 perdus · WR **58.8%**
- ROI flat (1u/pick) : **+2.64%** (+18.52u cumulé)
- Kelly 0.25× cap 10% : cumulé **+49.76u**
- Cote moyenne : 1.76 · Pick prob moyenne : 55.1%
- **Brier** : 0.2409 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.675 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1497.57€** (+49.8%) · DD max 6.3% · Sharpe/pick +0.084

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
| `standard` | 9 | 89% | 56–98% | 🟢 +80.5% | +20.21u | 0.2123 | +5.2pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 693 | 58% | 55–62% | 🟢 +1.6% | +29.55u | 0.2413 | -2.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 9 | 0.346 | 0.346 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 693 | 0.0406 | 0.343 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 564 | 58% | 🔴 -0.1% | +20.85u | 0.2425 |
| football | 91 | 56% | 🟢 +16.2% | +28.91u | 0.2431 |
| basketball | 41 | 71% | 🟢 +4.8% | +0.00u | 0.2168 |
| hockey | 6 | 83% | 🟢 +43.9% | +0.00u | 0.2262 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 564 | 58% | 🔴 -0.1% | 0.2425 |
| `football:other` | 91 | 56% | 🟢 +16.2% | 0.2431 |
| `basketball:all` | 41 | 71% | 🟡 +4.8% | 0.2168 |
| `hockey:all` | 6 | 83% | 🟢 +43.9% | 0.2262 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 72 | 65% | 🔴 -9.7% | 0.2214 |
| fav | 576 | 58% | 🟢 +1.1% | 0.2427 |
| toss_up | 40 | 60% | 🟢 +35.8% | 0.2498 |
| dog | 14 | 43% | 🟢 +33.2% | 0.2421 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 25 | 36.4% | 32.0% | ⚪ -4.4% |
| [0.4–0.5] | 65 | 47.4% | 64.6% | 🟢 +17.2% |
| [0.5–0.6] | 485 | 54.4% | 57.1% | ⚪ +2.7% |
| [0.6–0.7] | 109 | 63.6% | 67.0% | ⚪ +3.4% |
| [0.7–0.8] | 14 | 73.1% | 78.6% | 🟢 +5.5% |
| [0.8–0.9] | 4 | 84.3% | 50.0% | 🔴 -34.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 564 | 58% | 🔴 -0.1% | 0.2425 |
| `wnba` | 35 | 74% | 🟢 +8.6% | 0.209 |
| `chn.1` | 21 | 67% | 🟢 +40.7% | 0.2221 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `allsvenskan` | 12 | 50% | 🔴 -10.7% | 0.2183 |
| `eliteserien` | 9 | 89% | 🟢 +72.0% | 0.2408 |
| `esp.2` | 9 | 78% | 🟢 +31.8% | 0.1901 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `nba` | 6 | 50% | 🔴 -17.3% | 0.2622 |
| `nhl` | 6 | 83% | 🟢 +43.9% | 0.2262 |
