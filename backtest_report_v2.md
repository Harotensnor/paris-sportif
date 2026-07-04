# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-04T06:38:22Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 572 picks sur 2026-05-25T12:30Z → 2026-07-04T02:10Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 119.9u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **572 picks** · 332 gagnés / 240 perdus · WR **58.0%**
- ROI flat (1u/pick) : **+0.98%** (+5.58u cumulé)
- Kelly 0.25× cap 10% : cumulé **+19.90u**
- Cote moyenne : 1.77 · Pick prob moyenne : 54.9%
- **Brier** : 0.2395 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6717 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1199.01€** (+19.9%) · DD max 6.9% · Sharpe/pick +0.055

## Séries

- Streak courante : ❄️ **1** loses consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **6**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 6 picks (2026-06-10T22:35Z → 2026-06-10T23:40Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 2 | 100% | 34–100% | 🟢 +104.5% | +3.76u | 0.2236 | +3.4pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 570 | 58% | 54–62% | 🟢 +0.6% | +16.14u | 0.2396 | -3.0pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 2 | 0.472 | 0.472 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 570 | 0.0333 | 0.268 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 462 | 57% | 🔴 -2.1% | +5.31u | 0.2426 |
| football | 70 | 50% | 🟢 +9.4% | +14.59u | 0.2437 |
| basketball | 33 | 79% | 🟢 +17.3% | +0.00u | 0.1915 |
| hockey | 7 | 86% | 🟢 +46.8% | +0.00u | 0.2194 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 462 | 57% | 🔴 -2.1% | 0.2426 |
| `football:other` | 70 | 50% | 🟢 +9.4% | 0.2437 |
| `basketball:all` | 33 | 79% | 🟢 +17.3% | 0.1915 |
| `hockey:all` | 7 | 86% | 🟢 +46.8% | 0.2194 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 56 | 73% | 🟢 +0.9% | 0.1909 |
| fav | 471 | 57% | 🔴 -1.6% | 0.2444 |
| toss_up | 32 | 53% | 🟢 +21.1% | 0.247 |
| dog | 13 | 46% | 🟢 +43.9% | 0.2539 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 23 | 36.4% | 34.8% | ⚪ -1.6% |
| [0.4–0.5] | 51 | 47.0% | 60.8% | 🟢 +13.8% |
| [0.5–0.6] | 394 | 54.3% | 55.8% | ⚪ +1.5% |
| [0.6–0.7] | 90 | 63.3% | 66.7% | ⚪ +3.3% |
| [0.7–0.8] | 11 | 73.2% | 100.0% | 🟢 +26.8% |
| [0.8–0.9] | 3 | 85.2% | 66.7% | 🔴 -18.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 462 | 57% | 🔴 -2.1% | 0.2426 |
| `wnba` | 27 | 85% | 🟢 +25.0% | 0.1758 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `chn.1` | 13 | 69% | 🟢 +57.1% | 0.2329 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `esp.2` | 9 | 78% | 🟢 +31.8% | 0.1901 |
| `nhl` | 7 | 86% | 🟢 +46.8% | 0.2194 |
| `allsvenskan` | 6 | 17% | 🔴 -46.7% | 0.2172 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `nba` | 6 | 50% | 🔴 -17.3% | 0.2622 |
