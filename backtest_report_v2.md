# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-15T04:17:48Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 422 picks sur 2026-07-13T17:00Z → 2026-08-14T22:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 280.99u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **422 picks** · 240 gagnés / 182 perdus · WR **56.9%**
- ROI flat (1u/pick) : **+6.38%** (+26.94u cumulé)
- Kelly 0.25× cap 10% : cumulé **+180.99u**
- Cote moyenne : 1.95 · Pick prob moyenne : 53.3%
- **Brier** : 0.2335 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6592 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **2809.94€** (+181.0%) · DD max 16.4% · Sharpe/pick +0.144

## Séries

- Streak courante : 🔥 **5** wins consécutifs
- Plus longue série gagnante : **7**
- Plus longue série perdante : **6**
- Top run win : 7 picks (2026-07-22T22:00Z → 2026-07-25T03:00Z)
- Top run lose : 6 picks (2026-07-26T18:15Z → 2026-07-26T19:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 422 | 57% | 52–62% | 🟢 +6.4% | +180.99u | 0.2335 | -1.3pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 422 | 0.0462 | 0.073 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 338 | 56% | 🟢 +7.8% | +180.99u | 0.2335 |
| baseball | 70 | 60% | 🟢 +1.7% | +0.00u | 0.2383 |
| basketball | 14 | 64% | 🔴 -4.3% | +0.00u | 0.2099 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 338 | 56% | 🟢 +7.8% | 0.2335 |
| `baseball:all` | 70 | 60% | 🟡 +1.7% | 0.2383 |
| `basketball:all` | 14 | 64% | 🔴 -4.3% | 0.2099 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 76 | 68% | 🔴 -8.0% | 0.2053 |
| fav | 203 | 61% | 🟢 +5.3% | 0.2359 |
| toss_up | 103 | 48% | 🟢 +11.6% | 0.2491 |
| dog | 40 | 40% | 🟢 +26.0% | 0.2346 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 62 | 36.7% | 38.7% | ⚪ +2.0% |
| [0.4–0.5] | 113 | 45.3% | 50.4% | 🟢 +5.2% |
| [0.5–0.6] | 139 | 55.0% | 60.4% | 🟢 +5.5% |
| [0.6–0.7] | 64 | 64.9% | 62.5% | ⚪ -2.4% |
| [0.7–0.8] | 36 | 73.2% | 80.6% | 🟢 +7.3% |
| [0.8–0.9] | 8 | 82.1% | 75.0% | 🔴 -7.1% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 70 | 60% | 🟢 +1.7% | 0.2383 |
| `eng.league_cup` | 34 | 59% | 🔴 -5.2% | 0.1802 |
| `chn.1` | 32 | 50% | 🔴 -2.1% | 0.2489 |
| `nor.1` | 24 | 58% | 🟢 +12.6% | 0.242 |
| `swe.1` | 22 | 55% | 🔴 -4.3% | 0.2643 |
| `ligamx` | 18 | 39% | 🔴 -33.2% | 0.2361 |
| `arg.1` | 16 | 56% | 🟢 +39.5% | 0.2433 |
| `per.1` | 16 | 62% | 🟢 +33.6% | 0.2622 |
| `uru.1` | 15 | 33% | 🔴 -38.3% | 0.2173 |
| `conmebol.sudamericana` | 14 | 86% | 🟢 +57.6% | 0.2356 |
