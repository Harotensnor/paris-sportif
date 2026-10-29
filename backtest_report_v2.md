# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-29T10:30:39Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 2224 picks sur 2026-08-30T10:15Z → 2026-10-28T19:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 62573607.83u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **2224 picks** · 1269 gagnés / 955 perdus · WR **57.1%**
- ROI flat (1u/pick) : **+9.78%** (+217.46u cumulé)
- Kelly 0.25× cap 10% : cumulé **+62573507.83u**
- Cote moyenne : 2.04 · Pick prob moyenne : 54.4%
- **Brier** : 0.2207 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6305 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **625736078.30€** (+62573507.8%) · DD max 35.1% · Sharpe/pick +0.218

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **12**
- Plus longue série perdante : **8**
- Top run win : 12 picks (2026-09-08T18:45Z → 2026-09-08T19:00Z)
- Top run lose : 8 picks (2026-09-06T13:00Z → 2026-09-06T14:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 2224 | 57% | 55–59% | 🟢 +9.8% | +62573507.83u | 0.2207 | +1.1pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 2224 | 0.0407 | 0.076 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 2080 | 56% | 🟢 +10.0% | +62527674.91u | 0.2205 |
| baseball | 119 | 66% | 🟢 +8.8% | +0.00u | 0.2255 |
| basketball | 15 | 53% | 🔴 -19.5% | +45832.92u | 0.2396 |
| hockey | 10 | 80% | 🟢 +23.6% | +0.00u | 0.1709 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1768 | 56% | 🟢 +9.4% | 0.2213 |
| `football:top5` | 312 | 59% | 🟢 +13.4% | 0.2157 |
| `baseball:all` | 119 | 66% | 🟢 +8.8% | 0.2255 |
| `basketball:all` | 15 | 53% | 🔴 -19.5% | 0.2396 |
| `hockey:all` | 10 | 80% | 🟢 +23.6% | 0.1709 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 422 | 79% | 🟢 +3.7% | 0.1599 |
| fav | 869 | 56% | 🔴 -1.9% | 0.2288 |
| toss_up | 637 | 51% | 🟢 +17.8% | 0.2402 |
| dog | 294 | 41% | 🟢 +34.9% | 0.2412 |
| heavy_dog | 2 | 50% | 🟢 +135.0% | 0.2876 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 371 | 36.5% | 39.6% | ⚪ +3.2% |
| [0.4–0.5] | 550 | 45.3% | 42.4% | ⚪ -2.9% |
| [0.5–0.6] | 601 | 54.6% | 57.2% | ⚪ +2.6% |
| [0.6–0.7] | 376 | 64.6% | 71.8% | 🟢 +7.3% |
| [0.7–0.8] | 202 | 74.3% | 81.7% | 🟢 +7.4% |
| [0.8–0.9] | 108 | 83.9% | 87.0% | ⚪ +3.2% |
| [0.9–1.0] | 16 | 92.4% | 100.0% | 🟢 +7.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 119 | 66% | 🟢 +8.8% | 0.2255 |
| `eng.4` | 113 | 52% | 🟢 +23.6% | 0.2483 |
| `eng.2` | 108 | 55% | 🟢 +19.2% | 0.252 |
| `eng.3` | 108 | 51% | 🟢 +8.8% | 0.2288 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `esp.2` | 82 | 55% | 🟢 +15.6% | 0.2202 |
| `jpn.1` | 79 | 53% | 🟢 +6.8% | 0.2229 |
| `ita.2` | 74 | 53% | 🟢 +19.9% | 0.2355 |
| `esp.1` | 72 | 61% | 🟢 +15.7% | 0.2148 |
| `ita.1` | 70 | 66% | 🟢 +27.3% | 0.1962 |
