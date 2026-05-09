# Backtest ROI — VRAI modèle (v2)

Généré : 2026-05-09T16:05:34Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 29 picks sur 2026-05-09T08:30Z → 2026-05-09T14:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 107.65u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **29 picks** · 17 gagnés / 12 perdus · WR **58.6%**
- ROI flat (1u/pick) : **+14.51%** (+4.21u cumulé)
- Kelly 0.25× cap 10% : cumulé **+7.65u**
- Cote moyenne : 2.07 · Pick prob moyenne : 49.1%
- **Brier** : 0.2242 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6379 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1076.53€** (+7.7%) · DD max 5.0% · Sharpe/pick +0.174

## Séries

- Streak courante : ❄️ **2** loses consécutifs
- Plus longue série gagnante : **8**
- Plus longue série perdante : **4**
- Top run win : 8 picks (2026-05-09T13:30Z → 2026-05-09T14:00Z)
- Top run lose : 4 picks (2026-05-09T11:00Z → 2026-05-09T11:35Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 1 | 0% | 0–79% | 🔴 -100.0% | -2.10u | 0.2819 | +4.3pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 28 | 61% | 42–76% | 🟢 +18.6% | +9.76u | 0.2221 | -2.3pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 1 | 0.531 | 0.531 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 28 | 0.1178 | 0.364 | en apprentissage |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 29 | 59% | 🟢 +14.5% | +7.65u | 0.2242 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 19 | 63% | 🟢 +33.3% | 0.2487 |
| `football:top5` | 10 | 50% | 🔴 -21.3% | 0.1776 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 5 | 60% | 🔴 -19.7% | 0.1843 |
| fav | 7 | 86% | 🟢 +49.2% | 0.1819 |
| toss_up | 14 | 50% | 🟢 +11.8% | 0.2593 |
| dog | 3 | 33% | 🟢 +3.3% | 0.2255 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 7 | 37.4% | 42.9% | 🟢 +5.4% |
| [0.4–0.5] | 11 | 43.9% | 54.5% | 🟢 +10.6% |
| [0.5–0.6] | 6 | 53.7% | 50.0% | ⚪ -3.7% |
| [0.6–0.7] | 1 | 63.6% | 100.0% | 🟢 +36.4% |
| [0.7–0.8] | 4 | 73.0% | 100.0% | 🟢 +27.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `eng.1` | 4 | 25% | 🔴 -68.0% | 0.1727 |
| `ger.1` | 4 | 100% | 🟢 +64.9% | 0.1868 |
| `sco.1` | 3 | 33% | 🔴 -28.3% | 0.2141 |
| `swe.1` | 3 | 100% | 🟢 +97.4% | 0.2452 |
| `chn.1` | 2 | 50% | 🔴 -22.9% | 0.194 |
| `gre.1` | 2 | 100% | 🟢 +170.0% | 0.3706 |
| `idn.1` | 2 | 100% | 🟢 +132.5% | 0.3315 |
