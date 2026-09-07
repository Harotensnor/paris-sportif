# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-07T08:41:55Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 736 picks sur 2026-08-16T10:15Z → 2026-09-06T21:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 28808.45u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **736 picks** · 423 gagnés / 313 perdus · WR **57.5%**
- ROI flat (1u/pick) : **+17.10%** (+125.89u cumulé)
- Kelly 0.25× cap 10% : cumulé **+28708.45u**
- Cote moyenne : 2.12 · Pick prob moyenne : 53.3%
- **Brier** : 0.2307 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6515 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **288084.50€** (+28708.5%) · DD max 64.0% · Sharpe/pick +0.231

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **8**
- Top run win : 10 picks (2026-08-31T17:30Z → 2026-08-31T19:30Z)
- Top run lose : 8 picks (2026-09-05T14:00Z → 2026-09-05T15:15Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 736 | 57% | 54–61% | 🟢 +17.1% | +28708.45u | 0.2307 | +1.8pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 736 | 0.0572 | 0.755 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 668 | 58% | 🟢 +20.1% | +28708.45u | 0.2293 |
| baseball | 62 | 48% | 🔴 -17.0% | +0.00u | 0.2482 |
| basketball | 6 | 83% | 🟢 +37.7% | +0.00u | 0.2012 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 544 | 59% | 🟢 +22.3% | 0.2305 |
| `football:top5` | 124 | 56% | 🟢 +10.3% | 0.224 |
| `baseball:all` | 62 | 48% | 🔴 -17.0% | 0.2482 |
| `basketball:all` | 6 | 83% | 🟢 +37.7% | 0.2012 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 113 | 78% | 🟢 +4.4% | 0.1619 |
| fav | 301 | 56% | 🔴 -1.4% | 0.2352 |
| toss_up | 189 | 57% | 🟢 +30.6% | 0.2498 |
| dog | 132 | 44% | 🟢 +45.6% | 0.2493 |
| heavy_dog | 1 | 100% | 🟢 +700.0% | 0.57 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.2–0.3] | 1 | 24.5% | 100.0% | 🟢 +75.5% |
| [0.3–0.4] | 109 | 36.6% | 52.3% | 🟢 +15.7% |
| [0.4–0.5] | 217 | 45.5% | 42.9% | ⚪ -2.7% |
| [0.5–0.6] | 222 | 54.9% | 57.7% | ⚪ +2.7% |
| [0.6–0.7] | 104 | 64.4% | 72.1% | 🟢 +7.7% |
| [0.7–0.8] | 55 | 74.2% | 76.4% | ⚪ +2.2% |
| [0.8–0.9] | 24 | 83.9% | 95.8% | 🟢 +11.9% |
| [0.9–1.0] | 4 | 92.2% | 100.0% | 🟢 +7.8% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 62 | 48% | 🔴 -17.0% | 0.2482 |
| `eng.2` | 39 | 62% | 🟢 +49.8% | 0.2362 |
| `eng.4` | 36 | 58% | 🟢 +40.1% | 0.2397 |
| `eng.3` | 34 | 62% | 🟢 +47.5% | 0.242 |
| `eng.1` | 30 | 53% | 🟢 +3.9% | 0.2366 |
| `jpn.1` | 30 | 53% | 🟢 +9.9% | 0.2411 |
| `esp.2` | 26 | 54% | 🟢 +29.9% | 0.2308 |
| `fra.1` | 26 | 54% | 🟢 +36.3% | 0.2483 |
| `ita.1` | 26 | 65% | 🟢 +13.0% | 0.1934 |
| `esp.1` | 25 | 52% | 🔴 -0.9% | 0.2 |
