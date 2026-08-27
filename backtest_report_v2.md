# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-27T14:50:10Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 295 picks sur 2026-08-13T17:10Z → 2026-08-26T19:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 98.52u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **295 picks** · 168 gagnés / 127 perdus · WR **56.9%**
- ROI flat (1u/pick) : **+7.75%** (+22.85u cumulé)
- Kelly 0.25× cap 10% : cumulé **-1.48u**
- Cote moyenne : 2.06 · Pick prob moyenne : 50.0%
- **Brier** : 0.2254 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6421 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **985.18€** (-1.5%) · DD max 9.1% · Sharpe/pick -0.001

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **7**
- Plus longue série perdante : **9**
- Top run win : 7 picks (2026-08-16T20:30Z → 2026-08-16T21:30Z)
- Top run lose : 9 picks (2026-08-15T13:00Z → 2026-08-15T14:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 295 | 57% | 51–62% | 🟢 +7.8% | -1.48u | 0.2254 | -2.2pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 295 | 0.0701 | 0.181 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 262 | 58% | 🟢 +10.7% | -1.48u | 0.2216 |
| baseball | 29 | 41% | 🔴 -26.4% | +0.00u | 0.2691 |
| basketball | 4 | 100% | 🟢 +59.8% | +0.00u | 0.1629 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 231 | 57% | 🟢 +9.4% | 0.2219 |
| `football:top5` | 31 | 65% | 🟢 +20.9% | 0.219 |
| `baseball:all` | 29 | 41% | 🔴 -26.4% | 0.2691 |
| `basketball:all` | 4 | 100% | 🟢 +59.8% | 0.1629 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 45 | 82% | 🟢 +11.2% | 0.1621 |
| fav | 123 | 65% | 🟢 +14.1% | 0.2366 |
| toss_up | 85 | 46% | 🟢 +4.7% | 0.2513 |
| dog | 42 | 29% | 🔴 -8.2% | 0.2083 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 79 | 36.8% | 36.7% | ⚪ -0.0% |
| [0.4–0.5] | 83 | 45.2% | 48.2% | ⚪ +3.0% |
| [0.5–0.6] | 74 | 54.8% | 71.6% | 🟢 +16.8% |
| [0.6–0.7] | 42 | 65.1% | 73.8% | 🟢 +8.7% |
| [0.7–0.8] | 14 | 74.6% | 85.7% | 🟢 +11.1% |
| [0.8–0.9] | 3 | 81.9% | 100.0% | 🟢 +18.1% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 29 | 41% | 🔴 -26.4% | 0.2691 |
| `ita.coppa_italia` | 16 | 88% | 🟢 +43.6% | 0.2023 |
| `eng.league_cup` | 14 | 71% | 🟢 +36.9% | 0.2374 |
| `eng.3` | 12 | 58% | 🟢 +36.7% | 0.2553 |
| `eng.4` | 12 | 58% | 🟢 +36.8% | 0.2743 |
| `eng.2` | 11 | 18% | 🔴 -46.4% | 0.2199 |
| `esp.2` | 11 | 55% | 🔴 -2.1% | 0.2258 |
| `arg.1` | 10 | 60% | 🟢 +25.3% | 0.2362 |
| `chn.1` | 10 | 60% | 🟢 +21.9% | 0.278 |
| `eng.1` | 10 | 60% | 🟢 +12.3% | 0.2397 |
