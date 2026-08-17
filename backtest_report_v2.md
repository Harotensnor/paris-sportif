# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-17T04:29:40Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 538 picks sur 2026-07-23T22:00Z → 2026-08-16T21:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 343.61u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **538 picks** · 296 gagnés / 242 perdus · WR **55.0%**
- ROI flat (1u/pick) : **+3.65%** (+19.63u cumulé)
- Kelly 0.25× cap 10% : cumulé **+243.61u**
- Cote moyenne : 2.01 · Pick prob moyenne : 52.4%
- **Brier** : 0.2301 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6525 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **3436.08€** (+243.6%) · DD max 14.0% · Sharpe/pick +0.131

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **7**
- Plus longue série perdante : **6**
- Top run win : 7 picks (2026-08-09T15:00Z → 2026-08-09T17:00Z)
- Top run lose : 6 picks (2026-07-26T18:15Z → 2026-07-26T19:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 538 | 55% | 51–59% | 🟢 +3.6% | +243.61u | 0.2301 | -0.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 538 | 0.0441 | 0.103 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 445 | 54% | 🟢 +4.5% | +243.61u | 0.2275 |
| baseball | 82 | 57% | 🔴 -1.8% | +0.00u | 0.248 |
| basketball | 11 | 73% | 🟢 +11.6% | +0.00u | 0.1987 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 445 | 54% | 🟡 +4.5% | 0.2275 |
| `baseball:all` | 82 | 57% | 🔴 -1.8% | 0.248 |
| `basketball:all` | 11 | 73% | 🟢 +11.6% | 0.1987 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 83 | 69% | 🔴 -6.7% | 0.2085 |
| fav | 254 | 62% | 🟢 +7.8% | 0.2348 |
| toss_up | 139 | 45% | 🟢 +5.2% | 0.2429 |
| dog | 61 | 31% | 🔴 -1.6% | 0.2123 |
| heavy_dog | 1 | 0% | 🔴 -100.0% | 0.1078 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 97 | 36.6% | 34.0% | ⚪ -2.5% |
| [0.4–0.5] | 134 | 44.7% | 45.5% | ⚪ +0.8% |
| [0.5–0.6] | 171 | 54.8% | 64.3% | 🟢 +9.6% |
| [0.6–0.7] | 89 | 64.8% | 62.9% | ⚪ -1.8% |
| [0.7–0.8] | 40 | 73.8% | 77.5% | ⚪ +3.7% |
| [0.8–0.9] | 7 | 81.7% | 71.4% | 🔴 -10.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 82 | 57% | 🔴 -1.8% | 0.248 |
| `eng.league_cup` | 34 | 59% | 🔴 -5.2% | 0.1802 |
| `chn.1` | 28 | 54% | 🟢 +8.2% | 0.2411 |
| `swe.1` | 26 | 46% | 🔴 -15.6% | 0.2571 |
| `arg.1` | 23 | 57% | 🟢 +32.7% | 0.2282 |
| `nor.1` | 22 | 55% | 🔴 -2.8% | 0.2401 |
| `par.1` | 19 | 58% | 🟢 +27.4% | 0.2392 |
| `per.1` | 19 | 63% | 🟢 +33.4% | 0.2628 |
| `ned.1` | 18 | 56% | 🔴 -9.0% | 0.2455 |
| `uru.1` | 18 | 28% | 🔴 -45.8% | 0.21 |
