# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-15T06:05:15Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 690 picks sur 2026-05-27T19:00Z → 2026-07-14T23:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 127.76u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **690 picks** · 403 gagnés / 287 perdus · WR **58.4%**
- ROI flat (1u/pick) : **+1.61%** (+11.12u cumulé)
- Kelly 0.25× cap 10% : cumulé **+27.76u**
- Cote moyenne : 1.76 · Pick prob moyenne : 55.1%
- **Brier** : 0.242 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6772 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1277.61€** (+27.8%) · DD max 6.4% · Sharpe/pick +0.058

## Séries

- Streak courante : 🔥 **5** wins consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **7**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 7 picks (2026-07-10T23:50Z → 2026-07-11T02:15Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 1 | 100% | 21–100% | 🟢 +100.0% | +3.67u | 0.182 | +7.3pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 689 | 58% | 55–62% | 🟢 +1.5% | +24.09u | 0.2421 | -2.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 1 | 0.427 | 0.427 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 689 | 0.0389 | 0.24 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 549 | 57% | 🔴 -1.8% | +0.00u | 0.2444 |
| football | 93 | 57% | 🟢 +16.6% | +24.09u | 0.2403 |
| basketball | 42 | 71% | 🟢 +7.2% | +3.67u | 0.2162 |
| hockey | 6 | 83% | 🟢 +43.9% | +0.00u | 0.2262 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 549 | 57% | 🔴 -1.8% | 0.2444 |
| `football:other` | 93 | 57% | 🟢 +16.6% | 0.2403 |
| `basketball:all` | 42 | 71% | 🟢 +7.2% | 0.2162 |
| `hockey:all` | 6 | 83% | 🟢 +43.9% | 0.2262 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 71 | 65% | 🔴 -10.7% | 0.2247 |
| fav | 571 | 58% | 🟢 +0.4% | 0.2435 |
| toss_up | 34 | 59% | 🟢 +34.3% | 0.2526 |
| dog | 14 | 43% | 🟢 +33.2% | 0.2421 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 25 | 36.4% | 32.0% | ⚪ -4.4% |
| [0.4–0.5] | 61 | 47.3% | 65.6% | 🟢 +18.3% |
| [0.5–0.6] | 479 | 54.4% | 56.6% | ⚪ +2.2% |
| [0.6–0.7] | 106 | 63.7% | 66.0% | ⚪ +2.4% |
| [0.7–0.8] | 14 | 73.1% | 78.6% | 🟢 +5.5% |
| [0.8–0.9] | 5 | 84.0% | 60.0% | 🔴 -24.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 549 | 57% | 🔴 -1.8% | 0.2444 |
| `wnba` | 37 | 76% | 🟢 +12.7% | 0.2079 |
| `chn.1` | 22 | 68% | 🟢 +41.1% | 0.2214 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `allsvenskan` | 12 | 50% | 🔴 -10.7% | 0.2183 |
| `eliteserien` | 9 | 89% | 🟢 +72.0% | 0.2408 |
| `esp.2` | 9 | 78% | 🟢 +31.8% | 0.1901 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `nhl` | 6 | 83% | 🟢 +43.9% | 0.2262 |
| `nba` | 5 | 40% | 🔴 -33.1% | 0.2782 |
