# Backtest ROI — VRAI modèle (v2)

Généré : 2026-06-10T07:58:31Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 287 picks sur 2026-05-24T15:00Z → 2026-06-10T02:05Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 124.19u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **287 picks** · 162 gagnés / 125 perdus · WR **56.4%**
- ROI flat (1u/pick) : **+0.24%** (+0.70u cumulé)
- Kelly 0.25× cap 10% : cumulé **+24.19u**
- Cote moyenne : 1.82 · Pick prob moyenne : 54.0%
- **Brier** : 0.2385 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6692 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1241.87€** (+24.2%) · DD max 6.1% · Sharpe/pick +0.089

## Séries

- Streak courante : 🔥 **2** wins consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **4**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 4 picks (2026-05-24T18:10Z → 2026-05-24T18:45Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 4 | 100% | 51–100% | 🟢 +98.2% | +19.86u | 0.1608 | +9.6pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 283 | 56% | 50–62% | 🔴 -1.1% | +4.32u | 0.2396 | -2.8pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 4 | 0.3995 | 0.434 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 283 | 0.0329 | 0.27 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 201 | 58% | 🔴 -1.6% | +13.65u | 0.2395 |
| football | 64 | 48% | 🟢 +3.1% | +7.17u | 0.2405 |
| basketball | 15 | 67% | 🟢 +0.8% | +0.00u | 0.218 |
| hockey | 7 | 71% | 🟢 +25.7% | +3.36u | 0.2354 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 201 | 58% | 🔴 -1.6% | 0.2395 |
| `football:other` | 58 | 47% | 🟡 +1.1% | 0.2362 |
| `basketball:all` | 15 | 67% | 🟡 +0.8% | 0.218 |
| `hockey:all` | 7 | 71% | 🟢 +25.7% | 0.2354 |
| `football:top5` | 6 | 67% | 🟢 +21.8% | 0.2822 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 27 | 78% | 🟢 +8.2% | 0.1756 |
| fav | 221 | 56% | 🔴 -3.5% | 0.2458 |
| toss_up | 25 | 48% | 🟢 +6.4% | 0.2373 |
| dog | 14 | 43% | 🟢 +33.6% | 0.2473 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 21 | 36.6% | 28.6% | 🔴 -8.0% |
| [0.4–0.5] | 31 | 46.2% | 58.1% | 🟢 +11.9% |
| [0.5–0.6] | 186 | 54.4% | 55.9% | ⚪ +1.5% |
| [0.6–0.7] | 42 | 63.3% | 64.3% | ⚪ +1.0% |
| [0.7–0.8] | 6 | 73.0% | 100.0% | 🟢 +27.0% |
| [0.8–0.9] | 1 | 84.4% | 100.0% | 🟢 +15.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 201 | 58% | 🔴 -1.6% | 0.2395 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `wnba` | 9 | 78% | 🟢 +14.0% | 0.1908 |
| `esp.2` | 7 | 86% | 🟢 +38.0% | 0.1635 |
| `nhl` | 7 | 71% | 🟢 +25.7% | 0.2354 |
| `allsvenskan` | 6 | 17% | 🔴 -46.7% | 0.2172 |
| `nba` | 6 | 50% | 🔴 -18.9% | 0.2587 |
| `ita.1` | 5 | 60% | 🔴 -4.8% | 0.2735 |
| `laliga2` | 5 | 0% | 🔴 -100.0% | 0.173 |
