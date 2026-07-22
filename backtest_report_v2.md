# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-22T06:19:35Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 701 picks sur 2026-05-30T05:00Z → 2026-07-22T03:05Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 126.27u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **701 picks** · 400 gagnés / 301 perdus · WR **57.1%**
- ROI flat (1u/pick) : **-0.59%** (-4.17u cumulé)
- Kelly 0.25× cap 10% : cumulé **+26.27u**
- Cote moyenne : 1.77 · Pick prob moyenne : 55.1%
- **Brier** : 0.2416 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6762 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1262.69€** (+26.3%) · DD max 6.6% · Sharpe/pick +0.054

## Séries

- Streak courante : ❄️ **1** loses consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **7**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 7 picks (2026-07-10T23:50Z → 2026-07-11T02:15Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 701 | 57% | 53–61% | 🔴 -0.6% | +26.27u | 0.2416 | -2.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 701 | 0.0255 | 0.172 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 529 | 57% | 🔴 -3.5% | +0.00u | 0.2445 |
| football | 124 | 56% | 🟢 +11.3% | +26.27u | 0.2343 |
| basketball | 43 | 65% | 🔴 -3.6% | +0.00u | 0.2273 |
| hockey | 5 | 80% | 🟢 +39.8% | +0.00u | 0.2357 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 529 | 57% | 🔴 -3.5% | 0.2445 |
| `football:other` | 124 | 56% | 🟢 +11.3% | 0.2343 |
| `basketball:all` | 43 | 65% | 🔴 -3.6% | 0.2273 |
| `hockey:all` | 5 | 80% | 🟢 +39.8% | 0.2357 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 78 | 64% | 🔴 -12.4% | 0.2239 |
| fav | 564 | 57% | 🔴 -1.1% | 0.2435 |
| toss_up | 42 | 50% | 🟢 +15.1% | 0.2473 |
| dog | 17 | 41% | 🟢 +31.2% | 0.2446 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 27 | 36.6% | 33.3% | ⚪ -3.3% |
| [0.4–0.5] | 79 | 47.0% | 57.0% | 🟢 +10.0% |
| [0.5–0.6] | 462 | 54.4% | 55.4% | ⚪ +1.0% |
| [0.6–0.7] | 112 | 63.9% | 65.2% | ⚪ +1.3% |
| [0.7–0.8] | 15 | 73.7% | 86.7% | 🟢 +13.0% |
| [0.8–0.9] | 6 | 83.9% | 66.7% | 🔴 -17.2% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 529 | 57% | 🔴 -3.5% | 0.2445 |
| `wnba` | 39 | 69% | 🟢 +1.8% | 0.2195 |
| `chn.1` | 29 | 59% | 🟢 +18.9% | 0.2395 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `allsvenskan` | 16 | 62% | 🟢 +19.3% | 0.2285 |
| `ligamx` | 11 | 45% | 🔴 -21.8% | 0.2159 |
| `esp.2` | 9 | 78% | 🟢 +31.8% | 0.1901 |
| `nor.1` | 9 | 67% | 🟢 +36.1% | 0.233 |
| `eliteserien` | 6 | 100% | 🟢 +72.6% | 0.2027 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
