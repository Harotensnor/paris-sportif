# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-10T08:27:51Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 795 picks sur 2026-08-16T10:15Z → 2026-09-09T19:45Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 1068045.51u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **795 picks** · 476 gagnés / 319 perdus · WR **59.9%**
- ROI flat (1u/pick) : **+22.04%** (+175.21u cumulé)
- Kelly 0.25× cap 10% : cumulé **+1067945.51u**
- Cote moyenne : 2.15 · Pick prob moyenne : 53.9%
- **Brier** : 0.2181 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6247 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **10680455.11€** (+1067945.5%) · DD max 18.7% · Sharpe/pick +0.325

## Séries

- Streak courante : 🔥 **2** wins consécutifs
- Plus longue série gagnante : **13**
- Plus longue série perdante : **5**
- Top run win : 13 picks (2026-09-09T16:45Z → 2026-09-09T19:00Z)
- Top run lose : 5 picks (2026-08-19T17:10Z → 2026-08-19T21:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 795 | 60% | 56–63% | 🟢 +22.0% | +1067945.51u | 0.2181 | +2.6pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 795 | 0.0598 | 0.755 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 718 | 61% | 🟢 +25.4% | +1067945.51u | 0.2155 |
| baseball | 71 | 51% | 🔴 -13.1% | +0.00u | 0.2459 |
| basketball | 6 | 83% | 🟢 +37.7% | +0.00u | 0.2012 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 590 | 59% | 🟢 +19.5% | 0.2147 |
| `football:top5` | 128 | 68% | 🟢 +52.6% | 0.219 |
| `baseball:all` | 71 | 51% | 🔴 -13.1% | 0.2459 |
| `basketball:all` | 6 | 83% | 🟢 +37.7% | 0.2012 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 120 | 80% | 🟢 +6.3% | 0.1455 |
| fav | 320 | 60% | 🟢 +5.7% | 0.2205 |
| toss_up | 211 | 59% | 🟢 +36.6% | 0.2399 |
| dog | 141 | 43% | 🟢 +42.1% | 0.2375 |
| heavy_dog | 3 | 67% | 🟢 +433.3% | 0.4169 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.2–0.3] | 2 | 24.5% | 100.0% | 🟢 +75.5% |
| [0.3–0.4] | 126 | 36.5% | 37.3% | ⚪ +0.8% |
| [0.4–0.5] | 198 | 45.3% | 46.5% | ⚪ +1.1% |
| [0.5–0.6] | 246 | 55.0% | 61.4% | 🟢 +6.4% |
| [0.6–0.7] | 124 | 63.8% | 78.2% | 🟢 +14.4% |
| [0.7–0.8] | 63 | 74.7% | 82.5% | 🟢 +7.8% |
| [0.8–0.9] | 31 | 84.3% | 96.8% | 🟢 +12.5% |
| [0.9–1.0] | 5 | 91.6% | 100.0% | 🟢 +8.4% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 71 | 51% | 🔴 -13.1% | 0.2459 |
| `eng.2` | 48 | 60% | 🟢 +38.4% | 0.2217 |
| `eng.4` | 36 | 64% | 🟢 +59.2% | 0.2427 |
| `eng.3` | 35 | 46% | 🟢 +0.8% | 0.2041 |
| `eng.1` | 30 | 60% | 🟢 +41.2% | 0.2092 |
| `jpn.1` | 30 | 50% | 🟢 +0.6% | 0.217 |
| `ita.1` | 28 | 93% | 🟢 +102.8% | 0.2066 |
| `esp.1` | 27 | 59% | 🟢 +17.1% | 0.1929 |
| `esp.2` | 27 | 56% | 🟢 +23.2% | 0.1977 |
| `fra.1` | 26 | 69% | 🟢 +86.7% | 0.2525 |
