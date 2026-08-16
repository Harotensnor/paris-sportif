# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-16T04:23:41Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 501 picks sur 2026-07-18T11:00Z → 2026-08-15T22:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 232.23u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **501 picks** · 279 gagnés / 222 perdus · WR **55.7%**
- ROI flat (1u/pick) : **+6.39%** (+32.04u cumulé)
- Kelly 0.25× cap 10% : cumulé **+132.23u**
- Cote moyenne : 2.02 · Pick prob moyenne : 51.8%
- **Brier** : 0.2325 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6574 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **2322.25€** (+132.2%) · DD max 17.3% · Sharpe/pick +0.107

## Séries

- Streak courante : ❄️ **1** loses consécutifs
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
| `skip` | 501 | 56% | 51–60% | 🟢 +6.4% | +132.23u | 0.2325 | -1.3pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 501 | 0.0437 | 0.15 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 416 | 55% | 🟢 +7.8% | +132.23u | 0.232 |
| baseball | 75 | 59% | 🔴 -0.6% | +0.00u | 0.2418 |
| basketball | 10 | 70% | 🟢 +1.8% | +0.00u | 0.1847 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 416 | 55% | 🟢 +7.8% | 0.232 |
| `baseball:all` | 75 | 59% | 🔴 -0.6% | 0.2418 |
| `basketball:all` | 10 | 70% | 🟡 +1.8% | 0.1847 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 79 | 70% | 🔴 -5.9% | 0.2008 |
| fav | 225 | 61% | 🟢 +5.7% | 0.233 |
| toss_up | 137 | 47% | 🟢 +10.3% | 0.2514 |
| dog | 60 | 37% | 🟢 +16.2% | 0.2295 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 98 | 36.7% | 40.8% | ⚪ +4.1% |
| [0.4–0.5] | 137 | 45.0% | 46.0% | ⚪ +1.0% |
| [0.5–0.6] | 150 | 55.0% | 63.3% | 🟢 +8.3% |
| [0.6–0.7] | 73 | 64.8% | 64.4% | ⚪ -0.4% |
| [0.7–0.8] | 37 | 73.2% | 81.1% | 🟢 +7.8% |
| [0.8–0.9] | 6 | 81.7% | 66.7% | 🔴 -15.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 75 | 59% | 🔴 -0.6% | 0.2418 |
| `eng.league_cup` | 34 | 59% | 🔴 -5.2% | 0.1802 |
| `chn.1` | 32 | 53% | 🟢 +8.8% | 0.2466 |
| `nor.1` | 24 | 58% | 🟢 +12.6% | 0.2421 |
| `swe.1` | 22 | 50% | 🔴 -9.9% | 0.2718 |
| `arg.1` | 21 | 57% | 🟢 +37.9% | 0.2377 |
| `per.1` | 18 | 61% | 🟢 +36.5% | 0.2686 |
| `uru.1` | 18 | 28% | 🔴 -48.6% | 0.2084 |
| `par.1` | 16 | 50% | 🟢 +20.2% | 0.2537 |
| `conmebol.sudamericana` | 14 | 86% | 🟢 +57.6% | 0.2356 |
