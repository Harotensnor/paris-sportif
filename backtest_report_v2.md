# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-22T08:59:06Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 2077 picks sur 2026-08-23T11:00Z → 2026-10-21T19:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 247884925.11u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **2077 picks** · 1196 gagnés / 881 perdus · WR **57.6%**
- ROI flat (1u/pick) : **+12.61%** (+261.94u cumulé)
- Kelly 0.25× cap 10% : cumulé **+247884825.11u**
- Cote moyenne : 2.07 · Pick prob moyenne : 54.1%
- **Brier** : 0.2206 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6298 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **2478849251.06€** (+247884825.1%) · DD max 26.6% · Sharpe/pick +0.248

## Séries

- Streak courante : 🔥 **1** wins consécutifs
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
| `skip` | 2077 | 58% | 55–60% | 🟢 +12.6% | +247884825.11u | 0.2206 | +1.3pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 2077 | 0.0352 | 0.089 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1929 | 57% | 🟢 +13.1% | +247423049.13u | 0.2204 |
| baseball | 126 | 63% | 🟢 +5.4% | +0.00u | 0.2275 |
| basketball | 15 | 67% | 🔴 -0.8% | +461775.98u | 0.2066 |
| hockey | 7 | 86% | 🟢 +32.6% | +0.00u | 0.1632 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1624 | 56% | 🟢 +11.2% | 0.2212 |
| `football:top5` | 305 | 62% | 🟢 +23.1% | 0.216 |
| `baseball:all` | 126 | 63% | 🟢 +5.4% | 0.2275 |
| `basketball:all` | 15 | 67% | 🔴 -0.8% | 0.2066 |
| `hockey:all` | 7 | 86% | 🟢 +32.6% | 0.1632 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 377 | 78% | 🟢 +2.3% | 0.1588 |
| fav | 809 | 57% | 🔴 -1.0% | 0.2256 |
| toss_up | 586 | 53% | 🟢 +23.4% | 0.2417 |
| dog | 303 | 43% | 🟢 +40.0% | 0.2426 |
| heavy_dog | 2 | 50% | 🟢 +140.0% | 0.2906 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 369 | 36.5% | 39.3% | ⚪ +2.8% |
| [0.4–0.5] | 511 | 45.3% | 46.4% | ⚪ +1.1% |
| [0.5–0.6] | 569 | 54.7% | 57.3% | ⚪ +2.6% |
| [0.6–0.7] | 338 | 64.6% | 70.1% | 🟢 +5.5% |
| [0.7–0.8] | 188 | 74.7% | 83.5% | 🟢 +8.9% |
| [0.8–0.9] | 86 | 84.1% | 90.7% | 🟢 +6.6% |
| [0.9–1.0] | 16 | 92.1% | 100.0% | 🟢 +7.9% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 126 | 63% | 🟢 +5.4% | 0.2275 |
| `eng.4` | 113 | 53% | 🟢 +28.7% | 0.2509 |
| `eng.2` | 109 | 52% | 🟢 +12.1% | 0.2389 |
| `eng.3` | 102 | 51% | 🟢 +10.9% | 0.2266 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `esp.2` | 79 | 54% | 🟢 +18.6% | 0.2134 |
| `jpn.1` | 79 | 54% | 🟢 +10.0% | 0.2282 |
| `esp.1` | 73 | 64% | 🟢 +24.8% | 0.2136 |
| `ita.1` | 64 | 62% | 🟢 +19.7% | 0.1844 |
| `eng.1` | 63 | 57% | 🟢 +23.2% | 0.2343 |
