# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-08T06:20:08Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 601 picks sur 2026-05-25T19:40Z → 2026-07-07T18:15Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 113.99u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **601 picks** · 348 gagnés / 253 perdus · WR **57.9%**
- ROI flat (1u/pick) : **+0.53%** (+3.18u cumulé)
- Kelly 0.25× cap 10% : cumulé **+13.99u**
- Cote moyenne : 1.76 · Pick prob moyenne : 55.0%
- **Brier** : 0.2401 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6729 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1139.89€** (+14.0%) · DD max 6.9% · Sharpe/pick +0.037

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
| `standard` | 3 | 33% | 6–79% | 🔴 -30.0% | -2.32u | 0.2666 | +3.3pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 598 | 58% | 54–62% | 🟢 +0.7% | +16.31u | 0.24 | -2.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 3 | 0.183 | 0.183 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 598 | 0.0389 | 0.267 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 488 | 57% | 🔴 -2.4% | -2.18u | 0.2433 |
| football | 70 | 53% | 🟢 +12.4% | +16.17u | 0.2358 |
| basketball | 36 | 72% | 🟢 +7.5% | +0.00u | 0.21 |
| hockey | 7 | 86% | 🟢 +46.8% | +0.00u | 0.2194 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 488 | 57% | 🔴 -2.4% | 0.2433 |
| `football:other` | 70 | 53% | 🟢 +12.4% | 0.2358 |
| `basketball:all` | 36 | 72% | 🟢 +7.5% | 0.21 |
| `hockey:all` | 7 | 86% | 🟢 +46.8% | 0.2194 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 59 | 71% | 🔴 -1.9% | 0.1961 |
| fav | 496 | 57% | 🔴 -1.1% | 0.2449 |
| toss_up | 34 | 53% | 🟢 +19.1% | 0.2468 |
| dog | 12 | 42% | 🟢 +29.2% | 0.2383 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 22 | 36.7% | 27.3% | 🔴 -9.4% |
| [0.4–0.5] | 53 | 47.2% | 66.0% | 🟢 +18.8% |
| [0.5–0.6] | 418 | 54.3% | 55.5% | ⚪ +1.2% |
| [0.6–0.7] | 94 | 63.5% | 66.0% | ⚪ +2.5% |
| [0.7–0.8] | 11 | 73.3% | 100.0% | 🟢 +26.7% |
| [0.8–0.9] | 3 | 85.2% | 66.7% | 🔴 -18.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 488 | 57% | 🔴 -2.4% | 0.2433 |
| `wnba` | 30 | 77% | 🟢 +12.5% | 0.1995 |
| `chn.1` | 18 | 67% | 🟢 +43.8% | 0.2073 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `esp.2` | 9 | 78% | 🟢 +31.8% | 0.1901 |
| `nhl` | 7 | 86% | 🟢 +46.8% | 0.2194 |
| `allsvenskan` | 6 | 17% | 🔴 -68.2% | 0.1911 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `nba` | 6 | 50% | 🔴 -17.3% | 0.2622 |
| `eliteserien` | 5 | 80% | 🟢 +67.1% | 0.2593 |
