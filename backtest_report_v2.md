# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-18T12:23:32Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 85 picks sur 2026-11-09T18:00Z → 2026-11-18T03:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 113.2u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **85 picks** · 57 gagnés / 28 perdus · WR **67.1%**
- ROI flat (1u/pick) : **+8.67%** (+7.37u cumulé)
- Kelly 0.25× cap 10% : cumulé **+13.20u**
- Cote moyenne : 1.75 · Pick prob moyenne : 58.2%
- **Brier** : 0.2064 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.5974 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1131.96€** (+13.2%) · DD max 4.6% · Sharpe/pick +0.121

## Séries

- Streak courante : ❄️ **2** loses consécutifs
- Plus longue série gagnante : **11**
- Plus longue série perdante : **4**
- Top run win : 11 picks (2026-11-15T18:00Z → 2026-11-16T01:00Z)
- Top run lose : 4 picks (2026-11-13T17:00Z → 2026-11-13T19:30Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 85 | 67% | 57–76% | 🟢 +8.7% | +13.20u | 0.2064 | -3.5pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 85 | 0.1648 | 0.413 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 59 | 64% | 🟢 +8.0% | +13.20u | 0.195 |
| basketball | 15 | 87% | 🟢 +23.3% | +0.00u | 0.1784 |
| hockey | 11 | 55% | 🔴 -7.5% | +0.00u | 0.3054 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 59 | 64% | 🟢 +8.0% | 0.195 |
| `basketball:all` | 15 | 87% | 🟢 +23.3% | 0.1784 |
| `hockey:all` | 11 | 55% | 🔴 -7.5% | 0.3054 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 29 | 79% | 🔴 -1.8% | 0.1569 |
| fav | 38 | 68% | 🟢 +21.4% | 0.2415 |
| toss_up | 12 | 67% | 🟢 +47.9% | 0.2575 |
| dog | 6 | 0% | 🔴 -100.0% | 0.1205 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 9 | 35.9% | 0.0% | 🔴 -35.9% |
| [0.4–0.5] | 15 | 45.3% | 86.7% | 🟢 +41.3% |
| [0.5–0.6] | 24 | 55.1% | 66.7% | 🟢 +11.6% |
| [0.6–0.7] | 18 | 63.4% | 66.7% | ⚪ +3.3% |
| [0.7–0.8] | 14 | 74.6% | 78.6% | ⚪ +4.0% |
| [0.8–0.9] | 3 | 83.2% | 100.0% | 🟢 +16.8% |
| [0.9–1.0] | 2 | 93.0% | 100.0% | 🟢 +7.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `uefa.nations` | 20 | 65% | 🔴 -2.5% | 0.1683 |
| `nba` | 14 | 86% | 🟢 +25.0% | 0.191 |
| `nhl` | 11 | 55% | 🔴 -7.5% | 0.3054 |
| `eng.4` | 10 | 80% | 🟢 +66.6% | 0.2883 |
| `esp.copa_del_rey` | 6 | 100% | 🟢 +24.6% | 0.0577 |
| `laliga2` | 6 | 50% | 🔴 -2.5% | 0.2637 |
| `eng.3` | 5 | 80% | 🟢 +42.8% | 0.1587 |
| `esp.2` | 5 | 40% | 🔴 -21.0% | 0.193 |
| `fra.coupe_de_france` | 4 | 25% | 🔴 -65.9% | 0.2169 |
