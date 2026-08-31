# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-31T10:11:41Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 503 picks sur 2026-08-15T09:00Z → 2026-08-30T21:10Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 28330.65u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **503 picks** · 305 gagnés / 198 perdus · WR **60.6%**
- ROI flat (1u/pick) : **+24.30%** (+122.22u cumulé)
- Kelly 0.25× cap 10% : cumulé **+28230.65u**
- Cote moyenne : 2.15 · Pick prob moyenne : 53.3%
- **Brier** : 0.2249 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6398 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **283306.51€** (+28230.7%) · DD max 22.8% · Sharpe/pick +0.320

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **9**
- Plus longue série perdante : **5**
- Top run win : 9 picks (2026-08-15T19:30Z → 2026-08-15T21:30Z)
- Top run lose : 5 picks (2026-08-15T18:00Z → 2026-08-15T18:30Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 503 | 61% | 56–65% | 🟢 +24.3% | +28230.65u | 0.2249 | +2.5pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 503 | 0.0734 | 0.106 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 451 | 62% | 🟢 +28.8% | +28230.65u | 0.2224 |
| baseball | 45 | 44% | 🔴 -22.9% | +0.00u | 0.2575 |
| basketball | 7 | 86% | 🟢 +35.9% | +0.00u | 0.1808 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 376 | 62% | 🟢 +30.9% | 0.222 |
| `football:top5` | 75 | 61% | 🟢 +18.3% | 0.224 |
| `baseball:all` | 45 | 44% | 🔴 -22.9% | 0.2575 |
| `basketball:all` | 7 | 86% | 🟢 +35.9% | 0.1808 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 73 | 78% | 🟢 +5.0% | 0.1592 |
| fav | 194 | 61% | 🟢 +6.5% | 0.2252 |
| toss_up | 141 | 61% | 🟢 +42.2% | 0.2496 |
| dog | 95 | 46% | 🟢 +49.0% | 0.2382 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 76 | 36.6% | 40.8% | ⚪ +4.2% |
| [0.4–0.5] | 155 | 45.3% | 54.8% | 🟢 +9.5% |
| [0.5–0.6] | 134 | 54.9% | 59.7% | ⚪ +4.8% |
| [0.6–0.7] | 78 | 64.2% | 74.4% | 🟢 +10.1% |
| [0.7–0.8] | 43 | 74.6% | 81.4% | 🟢 +6.8% |
| [0.8–0.9] | 16 | 83.1% | 93.8% | 🟢 +10.6% |
| [0.9–1.0] | 1 | 93.5% | 100.0% | 🟢 +6.5% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 45 | 44% | 🔴 -22.9% | 0.2575 |
| `eng.4` | 24 | 75% | 🟢 +91.4% | 0.2404 |
| `eng.3` | 23 | 57% | 🟢 +27.4% | 0.2063 |
| `eng.2` | 22 | 73% | 🟢 +86.4% | 0.2278 |
| `eng.1` | 19 | 58% | 🟢 +14.4% | 0.2498 |
| `esp.2` | 19 | 63% | 🟢 +46.0% | 0.2039 |
| `jpn.1` | 19 | 68% | 🟢 +42.0% | 0.2364 |
| `ned.1` | 18 | 72% | 🟢 +21.7% | 0.2118 |
| `bel.1` | 17 | 53% | 🟢 +6.2% | 0.1899 |
| `eng.league_cup` | 17 | 65% | 🟢 +21.1% | 0.2203 |
