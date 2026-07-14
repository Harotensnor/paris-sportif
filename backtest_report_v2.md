# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-14T06:02:15Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 702 picks sur 2026-05-26T22:10Z → 2026-07-14T01:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 124.78u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **702 picks** · 410 gagnés / 292 perdus · WR **58.4%**
- ROI flat (1u/pick) : **+1.44%** (+10.14u cumulé)
- Kelly 0.25× cap 10% : cumulé **+24.78u**
- Cote moyenne : 1.76 · Pick prob moyenne : 55.1%
- **Brier** : 0.2415 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6761 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1247.85€** (+24.8%) · DD max 6.3% · Sharpe/pick +0.052

## Séries

- Streak courante : 🔥 **3** wins consécutifs
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
| `skip` | 702 | 58% | 55–62% | 🟢 +1.4% | +24.78u | 0.2415 | -2.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 702 | 0.0396 | 0.24 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 562 | 57% | 🔴 -1.7% | +0.00u | 0.2438 |
| football | 92 | 57% | 🟢 +16.3% | +24.78u | 0.2407 |
| basketball | 42 | 71% | 🟢 +5.1% | +0.00u | 0.2139 |
| hockey | 6 | 83% | 🟢 +43.9% | +0.00u | 0.2262 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 562 | 57% | 🔴 -1.7% | 0.2438 |
| `football:other` | 92 | 57% | 🟢 +16.3% | 0.2407 |
| `basketball:all` | 42 | 71% | 🟢 +5.1% | 0.2139 |
| `hockey:all` | 6 | 83% | 🟢 +43.9% | 0.2262 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 74 | 66% | 🔴 -8.8% | 0.2194 |
| fav | 580 | 58% | 🟢 +0.1% | 0.2437 |
| toss_up | 34 | 59% | 🟢 +34.3% | 0.252 |
| dog | 14 | 43% | 🟢 +33.2% | 0.2421 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 25 | 36.4% | 32.0% | ⚪ -4.4% |
| [0.4–0.5] | 63 | 47.4% | 65.1% | 🟢 +17.7% |
| [0.5–0.6] | 485 | 54.3% | 56.3% | ⚪ +2.0% |
| [0.6–0.7] | 110 | 63.8% | 67.3% | ⚪ +3.5% |
| [0.7–0.8] | 14 | 73.1% | 78.6% | 🟢 +5.5% |
| [0.8–0.9] | 5 | 84.0% | 60.0% | 🔴 -24.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 562 | 57% | 🔴 -1.7% | 0.2438 |
| `wnba` | 36 | 75% | 🟢 +8.9% | 0.2058 |
| `chn.1` | 21 | 67% | 🟢 +40.7% | 0.2221 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `allsvenskan` | 12 | 50% | 🔴 -10.7% | 0.2183 |
| `eliteserien` | 9 | 89% | 🟢 +72.0% | 0.2408 |
| `esp.2` | 9 | 78% | 🟢 +31.8% | 0.1901 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `nba` | 6 | 50% | 🔴 -17.3% | 0.2622 |
| `nhl` | 6 | 83% | 🟢 +43.9% | 0.2262 |
