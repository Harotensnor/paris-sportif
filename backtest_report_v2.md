# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-14T05:22:47Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 443 picks sur 2026-07-11T11:35Z → 2026-08-13T17:10Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 265.18u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **443 picks** · 255 gagnés / 188 perdus · WR **57.6%**
- ROI flat (1u/pick) : **+6.83%** (+30.27u cumulé)
- Kelly 0.25× cap 10% : cumulé **+165.18u**
- Cote moyenne : 1.92 · Pick prob moyenne : 53.7%
- **Brier** : 0.2381 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6689 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **2651.78€** (+165.2%) · DD max 16.9% · Sharpe/pick +0.136

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **7**
- Plus longue série perdante : **6**
- Top run win : 7 picks (2026-07-11T16:00Z → 2026-07-11T20:05Z)
- Top run lose : 6 picks (2026-07-26T18:15Z → 2026-07-26T19:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 443 | 58% | 53–62% | 🟢 +6.8% | +165.18u | 0.2381 | -1.6pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 443 | 0.0511 | 0.073 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 326 | 57% | 🟢 +9.2% | +165.18u | 0.2374 |
| baseball | 100 | 59% | 🟢 +0.9% | +0.00u | 0.2437 |
| basketball | 17 | 65% | 🔴 -3.7% | +0.00u | 0.2184 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 326 | 57% | 🟢 +9.2% | 0.2374 |
| `baseball:all` | 100 | 59% | 🟡 +0.9% | 0.2437 |
| `basketball:all` | 17 | 65% | 🔴 -3.7% | 0.2184 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 78 | 63% | 🔴 -15.6% | 0.2274 |
| fav | 231 | 61% | 🟢 +6.8% | 0.2354 |
| toss_up | 99 | 51% | 🟢 +18.2% | 0.2543 |
| dog | 35 | 40% | 🟢 +25.3% | 0.2334 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 55 | 36.7% | 41.8% | 🟢 +5.1% |
| [0.4–0.5] | 112 | 45.4% | 52.7% | 🟢 +7.3% |
| [0.5–0.6] | 164 | 54.8% | 59.8% | ⚪ +4.9% |
| [0.6–0.7] | 71 | 65.0% | 62.0% | ⚪ -3.1% |
| [0.7–0.8] | 33 | 73.1% | 75.8% | ⚪ +2.6% |
| [0.8–0.9] | 8 | 81.8% | 75.0% | 🔴 -6.8% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 100 | 59% | 🟢 +0.9% | 0.2437 |
| `eng.league_cup` | 34 | 59% | 🔴 -5.2% | 0.1802 |
| `chn.1` | 31 | 52% | 🟢 +3.2% | 0.271 |
| `nor.1` | 26 | 58% | 🟢 +9.7% | 0.2414 |
| `swe.1` | 21 | 52% | 🔴 -7.5% | 0.2708 |
| `ligamx` | 18 | 39% | 🔴 -33.2% | 0.2361 |
| `uru.1` | 17 | 24% | 🔴 -63.2% | 0.2068 |
| `wnba` | 17 | 65% | 🔴 -3.7% | 0.2184 |
| `arg.1` | 16 | 56% | 🟢 +39.5% | 0.2433 |
| `per.1` | 15 | 67% | 🟢 +44.5% | 0.2654 |
