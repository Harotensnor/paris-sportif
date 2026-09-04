# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-04T08:16:58Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 599 picks sur 2026-08-15T09:55Z → 2026-09-03T20:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 189052.07u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **599 picks** · 372 gagnés / 227 perdus · WR **62.1%**
- ROI flat (1u/pick) : **+28.44%** (+170.37u cumulé)
- Kelly 0.25× cap 10% : cumulé **+188952.07u**
- Cote moyenne : 2.13 · Pick prob moyenne : 53.4%
- **Brier** : 0.226 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6412 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1890520.71€** (+188952.1%) · DD max 20.8% · Sharpe/pick +0.358

## Séries

- Streak courante : ❄️ **6** loses consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **6**
- Top run win : 10 picks (2026-08-31T17:30Z → 2026-08-31T19:30Z)
- Top run lose : 6 picks (2026-09-03T18:45Z → 2026-09-03T20:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 599 | 62% | 58–66% | 🟢 +28.4% | +188952.07u | 0.226 | +2.4pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 599 | 0.0868 | 0.149 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 540 | 63% | 🟢 +33.0% | +188952.07u | 0.2237 |
| baseball | 52 | 46% | 🔴 -20.3% | +0.00u | 0.2561 |
| basketball | 7 | 86% | 🟢 +35.9% | +0.00u | 0.1808 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 458 | 63% | 🟢 +35.3% | 0.224 |
| `football:top5` | 82 | 63% | 🟢 +20.6% | 0.222 |
| `baseball:all` | 52 | 46% | 🔴 -20.3% | 0.2561 |
| `basketball:all` | 7 | 86% | 🟢 +35.9% | 0.1808 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 87 | 80% | 🟢 +8.1% | 0.1475 |
| fav | 234 | 60% | 🟢 +5.6% | 0.2234 |
| toss_up | 174 | 60% | 🟢 +40.5% | 0.2484 |
| dog | 104 | 54% | 🟢 +76.7% | 0.2599 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 93 | 36.7% | 51.6% | 🟢 +14.9% |
| [0.4–0.5] | 172 | 45.3% | 51.2% | 🟢 +5.9% |
| [0.5–0.6] | 176 | 54.9% | 60.8% | 🟢 +5.9% |
| [0.6–0.7] | 85 | 64.2% | 75.3% | 🟢 +11.1% |
| [0.7–0.8] | 50 | 74.5% | 86.0% | 🟢 +11.5% |
| [0.8–0.9] | 20 | 84.1% | 95.0% | 🟢 +10.9% |
| [0.9–1.0] | 3 | 92.9% | 100.0% | 🟢 +7.1% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 52 | 46% | 🔴 -20.3% | 0.2561 |
| `eng.4` | 36 | 69% | 🟢 +76.2% | 0.2564 |
| `eng.3` | 35 | 66% | 🟢 +60.7% | 0.239 |
| `eng.2` | 34 | 68% | 🟢 +72.1% | 0.2364 |
| `jpn.1` | 26 | 62% | 🟢 +30.5% | 0.2294 |
| `bel.1` | 20 | 60% | 🟢 +15.1% | 0.1817 |
| `eng.1` | 20 | 60% | 🟢 +16.3% | 0.2442 |
| `esp.2` | 20 | 60% | 🟢 +38.7% | 0.199 |
| `fra.1` | 18 | 56% | 🟢 +17.1% | 0.2549 |
| `ita.1` | 18 | 72% | 🟢 +20.0% | 0.1936 |
