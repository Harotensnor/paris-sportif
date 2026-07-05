# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-05T06:58:19Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 581 picks sur 2026-05-25T15:00Z → 2026-07-04T20:10Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 117.09u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **581 picks** · 339 gagnés / 242 perdus · WR **58.3%**
- ROI flat (1u/pick) : **+1.39%** (+8.05u cumulé)
- Kelly 0.25× cap 10% : cumulé **+17.09u**
- Cote moyenne : 1.77 · Pick prob moyenne : 54.9%
- **Brier** : 0.2385 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6694 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1170.94€** (+17.1%) · DD max 6.9% · Sharpe/pick +0.047

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **6**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 6 picks (2026-06-10T22:35Z → 2026-06-10T23:40Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 3 | 67% | 21–94% | 🟢 +38.3% | +2.57u | 0.2461 | +3.3pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 578 | 58% | 54–62% | 🟢 +1.2% | +14.52u | 0.2385 | -3.0pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 3 | 0.145 | 0.145 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 578 | 0.0398 | 0.264 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 466 | 58% | 🔴 -2.2% | +3.13u | 0.2418 |
| football | 75 | 52% | 🟢 +12.2% | +13.97u | 0.2406 |
| basketball | 33 | 79% | 🟢 +17.3% | +0.00u | 0.1915 |
| hockey | 7 | 86% | 🟢 +46.8% | +0.00u | 0.2194 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 466 | 58% | 🔴 -2.2% | 0.2418 |
| `football:other` | 75 | 52% | 🟢 +12.2% | 0.2406 |
| `basketball:all` | 33 | 79% | 🟢 +17.3% | 0.1915 |
| `hockey:all` | 7 | 86% | 🟢 +46.8% | 0.2194 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 58 | 74% | 🟢 +0.5% | 0.1837 |
| fav | 475 | 57% | 🔴 -1.2% | 0.2444 |
| toss_up | 34 | 56% | 🟢 +25.9% | 0.2475 |
| dog | 14 | 43% | 🟢 +33.6% | 0.2439 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 23 | 36.3% | 30.4% | 🔴 -5.9% |
| [0.4–0.5] | 55 | 46.8% | 65.5% | 🟢 +18.6% |
| [0.5–0.6] | 396 | 54.3% | 55.3% | ⚪ +1.0% |
| [0.6–0.7] | 90 | 63.3% | 67.8% | ⚪ +4.5% |
| [0.7–0.8] | 13 | 73.6% | 100.0% | 🟢 +26.4% |
| [0.8–0.9] | 4 | 85.4% | 75.0% | 🔴 -10.4% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 466 | 58% | 🔴 -2.2% | 0.2418 |
| `wnba` | 27 | 85% | 🟢 +25.0% | 0.1758 |
| `chn.1` | 18 | 67% | 🟢 +43.8% | 0.2109 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `eliteserien` | 9 | 56% | 🟢 +17.8% | 0.2623 |
| `esp.2` | 9 | 78% | 🟢 +31.8% | 0.1901 |
| `nhl` | 7 | 86% | 🟢 +46.8% | 0.2194 |
| `allsvenskan` | 6 | 17% | 🔴 -46.7% | 0.2172 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `nba` | 6 | 50% | 🔴 -17.3% | 0.2622 |
