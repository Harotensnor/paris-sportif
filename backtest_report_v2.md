# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-20T08:52:09Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1191 picks sur 2026-08-18T11:35Z → 2026-09-19T20:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 5847981.52u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1191 picks** · 678 gagnés / 513 perdus · WR **56.9%**
- ROI flat (1u/pick) : **+15.28%** (+182.04u cumulé)
- Kelly 0.25× cap 10% : cumulé **+5847881.52u**
- Cote moyenne : 2.12 · Pick prob moyenne : 54.1%
- **Brier** : 0.2234 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6354 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **58479815.25€** (+5847881.5%) · DD max 33.7% · Sharpe/pick +0.270

## Séries

- Streak courante : 🔥 **2** wins consécutifs
- Plus longue série gagnante : **13**
- Plus longue série perdante : **8**
- Top run win : 13 picks (2026-09-09T16:45Z → 2026-09-09T19:00Z)
- Top run lose : 8 picks (2026-09-19T14:00Z → 2026-09-19T14:30Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 1191 | 57% | 54–60% | 🟢 +15.3% | +5847881.52u | 0.2234 | +2.2pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1191 | 0.0422 | 0.755 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1098 | 57% | 🟢 +17.2% | +5847881.52u | 0.2225 |
| baseball | 88 | 55% | 🔴 -9.2% | +0.00u | 0.2381 |
| basketball | 5 | 80% | 🟢 +17.4% | +0.00u | 0.1613 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 888 | 55% | 🟢 +12.9% | 0.2244 |
| `football:top5` | 210 | 64% | 🟢 +35.7% | 0.2142 |
| `baseball:all` | 88 | 55% | 🔴 -9.2% | 0.2381 |
| `basketball:all` | 5 | 80% | 🟢 +17.4% | 0.1613 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 196 | 78% | 🟢 +2.4% | 0.1545 |
| fav | 466 | 55% | 🔴 -4.5% | 0.2275 |
| toss_up | 320 | 54% | 🟢 +25.0% | 0.2419 |
| dog | 206 | 46% | 🟢 +52.5% | 0.2484 |
| heavy_dog | 3 | 67% | 🟢 +330.0% | 0.3792 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.2–0.3] | 1 | 24.5% | 100.0% | 🟢 +75.5% |
| [0.3–0.4] | 203 | 36.6% | 43.8% | 🟢 +7.2% |
| [0.4–0.5] | 286 | 45.2% | 42.3% | ⚪ -2.8% |
| [0.5–0.6] | 352 | 54.7% | 55.7% | ⚪ +1.0% |
| [0.6–0.7] | 190 | 64.2% | 70.5% | 🟢 +6.3% |
| [0.7–0.8] | 96 | 74.6% | 79.2% | ⚪ +4.5% |
| [0.8–0.9] | 52 | 84.6% | 98.1% | 🟢 +13.5% |
| [0.9–1.0] | 11 | 91.9% | 90.9% | ⚪ -1.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 88 | 55% | 🔴 -9.2% | 0.2381 |
| `eng.2` | 69 | 57% | 🟢 +24.6% | 0.2304 |
| `eng.3` | 59 | 47% | 🟢 +17.8% | 0.256 |
| `eng.4` | 59 | 54% | 🟢 +28.2% | 0.2324 |
| `esp.1` | 50 | 60% | 🟢 +13.1% | 0.2056 |
| `jpn.1` | 47 | 53% | 🟢 +9.8% | 0.2224 |
| `eng.1` | 46 | 59% | 🟢 +43.1% | 0.2395 |
| `ita.1` | 43 | 70% | 🟢 +41.4% | 0.1855 |
| `fra.1` | 41 | 66% | 🟢 +49.8% | 0.2283 |
| `esp.2` | 37 | 54% | 🟢 +20.7% | 0.2252 |
