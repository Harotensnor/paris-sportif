# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-13T05:26:01Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 468 picks sur 2026-07-09T16:35Z → 2026-08-12T19:45Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 257.23u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **468 picks** · 268 gagnés / 200 perdus · WR **57.3%**
- ROI flat (1u/pick) : **+5.37%** (+25.12u cumulé)
- Kelly 0.25× cap 10% : cumulé **+157.23u**
- Cote moyenne : 1.90 · Pick prob moyenne : 53.9%
- **Brier** : 0.2373 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6672 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **2572.31€** (+157.2%) · DD max 16.9% · Sharpe/pick +0.129

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **7**
- Plus longue série perdante : **7**
- Top run win : 7 picks (2026-07-11T16:00Z → 2026-07-11T20:05Z)
- Top run lose : 7 picks (2026-07-10T23:50Z → 2026-07-11T02:15Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 468 | 57% | 53–62% | 🟢 +5.4% | +157.23u | 0.2373 | -1.7pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 468 | 0.0455 | 0.073 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 324 | 57% | 🟢 +9.5% | +157.23u | 0.2359 |
| baseball | 124 | 56% | 🔴 -3.5% | +0.00u | 0.2469 |
| basketball | 20 | 65% | 🔴 -6.1% | +0.00u | 0.2018 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 324 | 57% | 🟢 +9.5% | 0.2359 |
| `baseball:all` | 124 | 56% | 🔴 -3.5% | 0.2469 |
| `basketball:all` | 20 | 65% | 🔴 -6.1% | 0.2018 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 80 | 64% | 🔴 -14.7% | 0.2217 |
| fav | 255 | 60% | 🟢 +4.7% | 0.2368 |
| toss_up | 99 | 51% | 🟢 +18.2% | 0.2543 |
| dog | 34 | 38% | 🟢 +20.3% | 0.229 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 54 | 36.7% | 40.7% | ⚪ +4.0% |
| [0.4–0.5] | 112 | 45.4% | 52.7% | 🟢 +7.3% |
| [0.5–0.6] | 187 | 54.9% | 58.3% | ⚪ +3.4% |
| [0.6–0.7] | 73 | 65.0% | 61.6% | ⚪ -3.3% |
| [0.7–0.8] | 33 | 73.3% | 78.8% | 🟢 +5.5% |
| [0.8–0.9] | 9 | 81.8% | 77.8% | ⚪ -4.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 124 | 56% | 🔴 -3.5% | 0.2469 |
| `eng.league_cup` | 34 | 59% | 🔴 -5.2% | 0.1802 |
| `chn.1` | 32 | 53% | 🟢 +5.2% | 0.2681 |
| `nor.1` | 26 | 58% | 🟢 +9.7% | 0.2414 |
| `swe.1` | 21 | 52% | 🔴 -7.5% | 0.2708 |
| `wnba` | 20 | 65% | 🔴 -6.1% | 0.2018 |
| `ligamx` | 18 | 39% | 🔴 -33.2% | 0.2361 |
| `uru.1` | 17 | 24% | 🔴 -63.2% | 0.2068 |
| `arg.1` | 16 | 56% | 🟢 +39.5% | 0.2433 |
| `per.1` | 15 | 67% | 🟢 +44.5% | 0.2654 |
