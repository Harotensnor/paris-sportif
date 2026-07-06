# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-06T08:07:58Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 600 picks sur 2026-05-25T15:00Z → 2026-07-05T20:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 117.95u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **600 picks** · 347 gagnés / 253 perdus · WR **57.8%**
- ROI flat (1u/pick) : **+0.67%** (+4.03u cumulé)
- Kelly 0.25× cap 10% : cumulé **+17.95u**
- Cote moyenne : 1.77 · Pick prob moyenne : 54.9%
- **Brier** : 0.2398 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6723 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1179.47€** (+17.9%) · DD max 6.9% · Sharpe/pick +0.046

## Séries

- Streak courante : ❄️ **3** loses consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **6**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 6 picks (2026-06-10T22:35Z → 2026-06-10T23:40Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 600 | 58% | 54–62% | 🟢 +0.7% | +17.95u | 0.2398 | -2.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 600 | 0.0376 | 0.267 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 483 | 57% | 🔴 -2.9% | +0.00u | 0.2432 |
| football | 76 | 53% | 🟢 +13.2% | +17.95u | 0.2399 |
| basketball | 34 | 76% | 🟢 +13.8% | +0.00u | 0.197 |
| hockey | 7 | 86% | 🟢 +46.8% | +0.00u | 0.2194 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 483 | 57% | 🔴 -2.9% | 0.2432 |
| `football:other` | 76 | 53% | 🟢 +13.2% | 0.2399 |
| `basketball:all` | 34 | 76% | 🟢 +13.8% | 0.197 |
| `hockey:all` | 7 | 86% | 🟢 +46.8% | 0.2194 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 59 | 73% | 🟢 +0.7% | 0.1898 |
| fav | 494 | 57% | 🔴 -1.8% | 0.2453 |
| toss_up | 33 | 55% | 🟢 +23.2% | 0.2469 |
| dog | 14 | 43% | 🟢 +33.6% | 0.2416 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 24 | 36.4% | 29.2% | 🔴 -7.3% |
| [0.4–0.5] | 56 | 47.1% | 66.1% | 🟢 +19.0% |
| [0.5–0.6] | 413 | 54.3% | 55.2% | ⚪ +0.9% |
| [0.6–0.7] | 93 | 63.5% | 66.7% | ⚪ +3.2% |
| [0.7–0.8] | 11 | 73.3% | 100.0% | 🟢 +26.7% |
| [0.8–0.9] | 3 | 85.2% | 66.7% | 🔴 -18.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 483 | 57% | 🔴 -2.9% | 0.2432 |
| `wnba` | 28 | 82% | 🟢 +20.5% | 0.1831 |
| `chn.1` | 18 | 67% | 🟢 +43.8% | 0.2073 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `eliteserien` | 9 | 56% | 🟢 +17.8% | 0.2623 |
| `esp.2` | 9 | 78% | 🟢 +31.8% | 0.1901 |
| `allsvenskan` | 7 | 29% | 🔴 -27.0% | 0.2221 |
| `nhl` | 7 | 86% | 🟢 +46.8% | 0.2194 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `nba` | 6 | 50% | 🔴 -17.3% | 0.2622 |
