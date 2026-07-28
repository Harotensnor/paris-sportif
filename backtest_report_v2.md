# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-28T06:16:44Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 614 picks sur 2026-06-09T22:35Z → 2026-07-27T19:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 107.06u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **614 picks** · 346 gagnés / 268 perdus · WR **56.4%**
- ROI flat (1u/pick) : **-2.09%** (-12.86u cumulé)
- Kelly 0.25× cap 10% : cumulé **+7.06u**
- Cote moyenne : 1.78 · Pick prob moyenne : 55.1%
- **Brier** : 0.2401 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.673 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1070.56€** (+7.1%) · DD max 9.2% · Sharpe/pick +0.019

## Séries

- Streak courante : ❄️ **2** loses consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **7**
- Top run win : 10 picks (2026-06-30T23:40Z → 2026-07-01T17:10Z)
- Top run lose : 7 picks (2026-07-10T23:50Z → 2026-07-11T02:15Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 614 | 56% | 52–60% | 🔴 -2.1% | +7.06u | 0.2401 | -2.6pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 614 | 0.0265 | 0.171 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 428 | 56% | 🔴 -3.5% | +0.00u | 0.2459 |
| football | 147 | 52% | 🔴 -0.1% | +7.06u | 0.2292 |
| basketball | 37 | 70% | 🟢 +2.6% | +0.00u | 0.2178 |
| hockey | 2 | 100% | 🟢 +73.9% | +0.00u | 0.2062 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 428 | 56% | 🔴 -3.5% | 0.2459 |
| `football:other` | 147 | 52% | 🔴 -0.1% | 0.2292 |
| `basketball:all` | 37 | 70% | 🟡 +2.6% | 0.2178 |
| `hockey:all` | 2 | 100% | 🟢 +73.9% | 0.2062 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 77 | 62% | 🔴 -15.1% | 0.2243 |
| fav | 474 | 58% | 🟢 +0.5% | 0.2442 |
| toss_up | 45 | 47% | 🟢 +11.2% | 0.2493 |
| dog | 18 | 17% | 🔴 -49.2% | 0.1749 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 30 | 36.9% | 33.3% | ⚪ -3.6% |
| [0.4–0.5] | 74 | 47.0% | 52.7% | 🟢 +5.7% |
| [0.5–0.6] | 384 | 54.3% | 55.7% | ⚪ +1.4% |
| [0.6–0.7] | 103 | 64.2% | 62.1% | ⚪ -2.1% |
| [0.7–0.8] | 17 | 74.1% | 88.2% | 🟢 +14.1% |
| [0.8–0.9] | 6 | 83.8% | 66.7% | 🔴 -17.1% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 428 | 56% | 🔴 -3.5% | 0.2459 |
| `wnba` | 36 | 69% | 🟢 +0.7% | 0.2182 |
| `chn.1` | 34 | 59% | 🟢 +18.9% | 0.2443 |
| `ligamx` | 18 | 39% | 🔴 -33.2% | 0.2287 |
| `nor.1` | 16 | 56% | 🔴 -4.2% | 0.2151 |
| `allsvenskan` | 13 | 69% | 🟢 +21.4% | 0.2206 |
| `swe.1` | 11 | 45% | 🔴 -17.1% | 0.2627 |
| `uru.1` | 8 | 38% | 🔴 -6.2% | 0.2378 |
| `conmebol.sudamericana` | 7 | 86% | 🟢 +50.0% | 0.1779 |
| `ecu.1` | 7 | 29% | 🔴 -41.2% | 0.2535 |
