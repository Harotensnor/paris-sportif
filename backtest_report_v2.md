# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-30T09:31:40Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 410 picks sur 2026-08-14T21:30Z → 2026-08-29T20:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 6817.27u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **410 picks** · 244 gagnés / 166 perdus · WR **59.5%**
- ROI flat (1u/pick) : **+22.02%** (+90.28u cumulé)
- Kelly 0.25× cap 10% : cumulé **+6717.27u**
- Cote moyenne : 2.15 · Pick prob moyenne : 52.3%
- **Brier** : 0.2268 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6434 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **68172.69€** (+6717.3%) · DD max 12.7% · Sharpe/pick +0.312

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **9**
- Plus longue série perdante : **5**
- Top run win : 9 picks (2026-08-15T19:30Z → 2026-08-15T21:30Z)
- Top run lose : 5 picks (2026-08-19T17:10Z → 2026-08-19T21:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 410 | 60% | 55–64% | 🟢 +22.0% | +6717.27u | 0.2268 | +1.8pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 410 | 0.0717 | 0.175 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 373 | 61% | 🟢 +26.3% | +6717.27u | 0.2239 |
| baseball | 32 | 38% | 🔴 -33.1% | +0.00u | 0.2735 |
| basketball | 5 | 100% | 🟢 +52.9% | +0.00u | 0.142 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 313 | 62% | 🟢 +30.4% | 0.2234 |
| `football:top5` | 60 | 55% | 🟢 +5.4% | 0.2261 |
| `baseball:all` | 32 | 38% | 🔴 -33.1% | 0.2735 |
| `basketball:all` | 5 | 100% | 🟢 +52.9% | 0.142 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 56 | 77% | 🟢 +2.9% | 0.1623 |
| fav | 157 | 61% | 🟢 +6.1% | 0.2267 |
| toss_up | 121 | 60% | 🟢 +38.7% | 0.2538 |
| dog | 76 | 45% | 🟢 +42.4% | 0.2314 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 61 | 36.3% | 37.7% | ⚪ +1.4% |
| [0.4–0.5] | 143 | 45.1% | 53.8% | 🟢 +8.8% |
| [0.5–0.6] | 102 | 55.1% | 62.7% | 🟢 +7.7% |
| [0.6–0.7] | 64 | 64.2% | 70.3% | 🟢 +6.1% |
| [0.7–0.8] | 30 | 75.1% | 83.3% | 🟢 +8.2% |
| [0.8–0.9] | 10 | 82.5% | 100.0% | 🟢 +17.5% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 32 | 38% | 🔴 -33.1% | 0.2735 |
| `eng.4` | 24 | 75% | 🟢 +91.4% | 0.2404 |
| `eng.2` | 22 | 73% | 🟢 +86.4% | 0.2278 |
| `eng.3` | 21 | 57% | 🟢 +24.7% | 0.2201 |
| `jpn.1` | 19 | 68% | 🟢 +42.0% | 0.2364 |
| `eng.league_cup` | 17 | 65% | 🟢 +21.1% | 0.2203 |
| `chn.1` | 15 | 40% | 🔴 -23.6% | 0.2472 |
| `eng.1` | 15 | 47% | 🔴 -14.3% | 0.2426 |
| `esp.2` | 15 | 53% | 🟢 +4.5% | 0.2166 |
| `fra.1` | 14 | 43% | 🔴 -3.9% | 0.2579 |
