# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-23T08:53:57Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 2108 picks sur 2026-08-23T14:45Z → 2026-10-22T19:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 202144245.73u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **2108 picks** · 1212 gagnés / 896 perdus · WR **57.5%**
- ROI flat (1u/pick) : **+12.11%** (+255.24u cumulé)
- Kelly 0.25× cap 10% : cumulé **+202144145.73u**
- Cote moyenne : 2.06 · Pick prob moyenne : 54.2%
- **Brier** : 0.2208 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6304 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **2021442457.26€** (+202144145.7%) · DD max 26.6% · Sharpe/pick +0.243

## Séries

- Streak courante : 🔥 **5** wins consécutifs
- Plus longue série gagnante : **12**
- Plus longue série perdante : **7**
- Top run win : 12 picks (2026-09-08T18:45Z → 2026-09-08T19:00Z)
- Top run lose : 7 picks (2026-08-29T14:30Z → 2026-08-29T16:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 2108 | 57% | 55–60% | 🟢 +12.1% | +202144145.73u | 0.2208 | +1.2pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 2108 | 0.0332 | 0.091 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1960 | 57% | 🟢 +12.6% | +201758676.88u | 0.2207 |
| baseball | 126 | 63% | 🟢 +5.4% | +0.00u | 0.2275 |
| basketball | 15 | 67% | 🔴 -0.8% | +385468.85u | 0.2066 |
| hockey | 7 | 86% | 🟢 +32.6% | +0.00u | 0.1632 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1658 | 56% | 🟢 +10.7% | 0.2214 |
| `football:top5` | 302 | 62% | 🟢 +22.6% | 0.2169 |
| `baseball:all` | 126 | 63% | 🟢 +5.4% | 0.2275 |
| `basketball:all` | 15 | 67% | 🔴 -0.8% | 0.2066 |
| `hockey:all` | 7 | 86% | 🟢 +32.6% | 0.1632 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 390 | 77% | 🟢 +1.6% | 0.1614 |
| fav | 822 | 57% | 🔴 -1.1% | 0.2258 |
| toss_up | 590 | 53% | 🟢 +22.9% | 0.2419 |
| dog | 304 | 43% | 🟢 +39.5% | 0.2422 |
| heavy_dog | 2 | 50% | 🟢 +140.0% | 0.2906 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 372 | 36.5% | 39.0% | ⚪ +2.4% |
| [0.4–0.5] | 517 | 45.3% | 46.6% | ⚪ +1.3% |
| [0.5–0.6] | 575 | 54.7% | 56.9% | ⚪ +2.1% |
| [0.6–0.7] | 349 | 64.6% | 69.9% | 🟢 +5.3% |
| [0.7–0.8] | 191 | 74.6% | 83.8% | 🟢 +9.1% |
| [0.8–0.9] | 88 | 84.1% | 89.8% | 🟢 +5.7% |
| [0.9–1.0] | 16 | 92.1% | 100.0% | 🟢 +7.9% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 126 | 63% | 🟢 +5.4% | 0.2275 |
| `eng.4` | 113 | 53% | 🟢 +28.7% | 0.2509 |
| `eng.2` | 108 | 52% | 🟢 +10.8% | 0.2392 |
| `eng.3` | 102 | 51% | 🟢 +10.9% | 0.2266 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `esp.2` | 79 | 54% | 🟢 +18.6% | 0.2134 |
| `jpn.1` | 79 | 54% | 🟢 +10.0% | 0.2282 |
| `esp.1` | 73 | 64% | 🟢 +24.8% | 0.2136 |
| `ita.1` | 64 | 62% | 🟢 +19.7% | 0.1844 |
| `eng.1` | 61 | 56% | 🟢 +21.4% | 0.2386 |
