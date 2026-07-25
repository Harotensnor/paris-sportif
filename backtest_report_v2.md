# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-25T06:08:24Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 651 picks sur 2026-06-01T18:00Z → 2026-07-24T19:45Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 117.93u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **651 picks** · 373 gagnés / 278 perdus · WR **57.3%**
- ROI flat (1u/pick) : **-1.19%** (-7.76u cumulé)
- Kelly 0.25× cap 10% : cumulé **+17.93u**
- Cote moyenne : 1.75 · Pick prob moyenne : 55.5%
- **Brier** : 0.2418 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6767 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1179.34€** (+17.9%) · DD max 6.1% · Sharpe/pick +0.047

## Séries

- Streak courante : 🔥 **6** wins consécutifs
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
| `skip` | 651 | 57% | 53–61% | 🔴 -1.2% | +17.93u | 0.2418 | -2.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 651 | 0.027 | 0.172 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 500 | 56% | 🔴 -3.6% | +0.00u | 0.2454 |
| football | 104 | 57% | 🟢 +8.9% | +17.93u | 0.2322 |
| basketball | 42 | 67% | 🔴 -1.8% | +0.00u | 0.2242 |
| hockey | 5 | 80% | 🟢 +39.8% | +0.00u | 0.2357 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 500 | 56% | 🔴 -3.6% | 0.2454 |
| `football:other` | 104 | 57% | 🟢 +8.9% | 0.2322 |
| `basketball:all` | 42 | 67% | 🔴 -1.8% | 0.2242 |
| `hockey:all` | 5 | 80% | 🟢 +39.8% | 0.2357 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 78 | 64% | 🔴 -12.8% | 0.2234 |
| fav | 530 | 57% | 🔴 -0.8% | 0.2446 |
| toss_up | 33 | 52% | 🟢 +19.4% | 0.249 |
| dog | 10 | 30% | 🔴 -2.5% | 0.2162 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 16 | 36.8% | 31.2% | 🔴 -5.5% |
| [0.4–0.5] | 73 | 47.4% | 57.5% | 🟢 +10.2% |
| [0.5–0.6] | 433 | 54.4% | 55.4% | ⚪ +1.0% |
| [0.6–0.7] | 105 | 63.9% | 62.9% | ⚪ -1.0% |
| [0.7–0.8] | 18 | 73.2% | 88.9% | 🟢 +15.7% |
| [0.8–0.9] | 6 | 83.9% | 66.7% | 🔴 -17.2% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 500 | 56% | 🔴 -3.6% | 0.2454 |
| `wnba` | 38 | 71% | 🟢 +4.0% | 0.2159 |
| `chn.1` | 26 | 62% | 🟢 +21.7% | 0.2448 |
| `allsvenskan` | 13 | 69% | 🟢 +21.4% | 0.2206 |
| `ligamx` | 11 | 45% | 🔴 -21.2% | 0.2189 |
| `jpn.1` | 9 | 33% | 🔴 -28.3% | 0.2616 |
| `nor.1` | 9 | 67% | 🟢 +36.1% | 0.2323 |
| `conmebol.sudamericana` | 7 | 86% | 🟢 +46.9% | 0.1832 |
| `uru.1` | 6 | 50% | 🟢 +25.1% | 0.2469 |
| `eliteserien` | 5 | 100% | 🟢 +75.0% | 0.2093 |
