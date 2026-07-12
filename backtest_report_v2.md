# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-12T06:24:33Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 663 picks sur 2026-05-26T22:10Z → 2026-07-11T20:15Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 113.36u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **663 picks** · 391 gagnés / 272 perdus · WR **59.0%**
- ROI flat (1u/pick) : **+1.46%** (+9.70u cumulé)
- Kelly 0.25× cap 10% : cumulé **+13.36u**
- Cote moyenne : 1.75 · Pick prob moyenne : 55.3%
- **Brier** : 0.2382 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6691 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1133.65€** (+13.4%) · DD max 6.9% · Sharpe/pick +0.035

## Séries

- Streak courante : 🔥 **6** wins consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **6**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 6 picks (2026-06-10T22:35Z → 2026-06-10T23:40Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 2 | 50% | 9–91% | 🔴 -7.0% | -0.25u | 0.2374 | +2.1pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 661 | 59% | 55–63% | 🟢 +1.5% | +13.62u | 0.2382 | -3.1pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 2 | 0.043 | 0.043 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 661 | 0.0443 | 0.197 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 542 | 58% | 🔴 -1.1% | -0.48u | 0.2396 |
| football | 76 | 54% | 🟢 +13.8% | +13.84u | 0.243 |
| basketball | 39 | 72% | 🟢 +6.4% | +0.00u | 0.2115 |
| hockey | 6 | 83% | 🟢 +43.9% | +0.00u | 0.2262 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 542 | 58% | 🔴 -1.1% | 0.2396 |
| `football:other` | 76 | 54% | 🟢 +13.8% | 0.243 |
| `basketball:all` | 39 | 72% | 🟢 +6.4% | 0.2115 |
| `hockey:all` | 6 | 83% | 🟢 +43.9% | 0.2262 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 75 | 72% | 🔴 -3.8% | 0.1935 |
| fav | 544 | 58% | 🟢 +0.0% | 0.2437 |
| toss_up | 32 | 56% | 🟢 +27.5% | 0.2496 |
| dog | 12 | 42% | 🟢 +29.2% | 0.2384 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 23 | 36.6% | 30.4% | 🔴 -6.1% |
| [0.4–0.5] | 59 | 47.4% | 64.4% | 🟢 +17.0% |
| [0.5–0.6] | 457 | 54.3% | 56.2% | ⚪ +1.9% |
| [0.6–0.7] | 102 | 63.7% | 68.6% | ⚪ +4.9% |
| [0.7–0.8] | 16 | 74.1% | 93.8% | 🟢 +19.7% |
| [0.8–0.9] | 6 | 83.9% | 66.7% | 🔴 -17.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 542 | 58% | 🔴 -1.1% | 0.2396 |
| `wnba` | 33 | 76% | 🟢 +10.7% | 0.2023 |
| `chn.1` | 21 | 67% | 🟢 +40.7% | 0.2221 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `esp.2` | 9 | 78% | 🟢 +31.8% | 0.1901 |
| `allsvenskan` | 7 | 14% | 🔴 -72.7% | 0.2233 |
| `eliteserien` | 7 | 86% | 🟢 +78.5% | 0.2711 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `nba` | 6 | 50% | 🔴 -17.3% | 0.2622 |
| `nhl` | 6 | 83% | 🟢 +43.9% | 0.2262 |
