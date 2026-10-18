# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-18T08:22:49Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1948 picks sur 2026-08-22T11:30Z → 2026-10-18T04:55Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 13733496.38u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1948 picks** · 1108 gagnés / 840 perdus · WR **56.9%**
- ROI flat (1u/pick) : **+10.17%** (+198.06u cumulé)
- Kelly 0.25× cap 10% : cumulé **+13733396.38u**
- Cote moyenne : 2.07 · Pick prob moyenne : 54.0%
- **Brier** : 0.22 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.629 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **137334963.79€** (+13733396.4%) · DD max 48.4% · Sharpe/pick +0.213

## Séries

- Streak courante : ❄️ **1** loses consécutifs
- Plus longue série gagnante : **12**
- Plus longue série perdante : **9**
- Top run win : 12 picks (2026-10-10T16:30Z → 2026-10-10T17:30Z)
- Top run lose : 9 picks (2026-09-12T12:00Z → 2026-09-12T13:30Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 1948 | 57% | 55–59% | 🟢 +10.2% | +13733396.38u | 0.22 | +1.2pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1948 | 0.0311 | 0.083 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1801 | 56% | 🟢 +10.6% | +13733396.38u | 0.2199 |
| baseball | 126 | 63% | 🟢 +5.4% | +0.00u | 0.2275 |
| basketball | 14 | 64% | 🔴 -8.2% | +0.00u | 0.2034 |
| hockey | 7 | 86% | 🟢 +32.6% | +0.00u | 0.1632 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1508 | 56% | 🟢 +9.4% | 0.2207 |
| `football:top5` | 293 | 60% | 🟢 +16.7% | 0.2154 |
| `baseball:all` | 126 | 63% | 🟢 +5.4% | 0.2275 |
| `basketball:all` | 14 | 64% | 🔴 -8.2% | 0.2034 |
| `hockey:all` | 7 | 86% | 🟢 +32.6% | 0.1632 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 355 | 79% | 🟢 +3.2% | 0.1579 |
| fav | 762 | 57% | 🔴 -1.0% | 0.2293 |
| toss_up | 539 | 52% | 🟢 +19.9% | 0.2408 |
| dog | 291 | 40% | 🟢 +28.6% | 0.2325 |
| heavy_dog | 1 | 100% | 🟢 +380.0% | 0.4511 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 336 | 36.5% | 35.7% | ⚪ -0.8% |
| [0.4–0.5] | 497 | 45.2% | 46.1% | ⚪ +0.9% |
| [0.5–0.6] | 525 | 54.8% | 57.9% | ⚪ +3.1% |
| [0.6–0.7] | 324 | 64.6% | 70.4% | 🟢 +5.8% |
| [0.7–0.8] | 170 | 74.7% | 81.2% | 🟢 +6.5% |
| [0.8–0.9] | 85 | 84.3% | 91.8% | 🟢 +7.5% |
| [0.9–1.0] | 11 | 91.7% | 100.0% | 🟢 +8.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 126 | 63% | 🟢 +5.4% | 0.2275 |
| `eng.2` | 107 | 57% | 🟢 +25.1% | 0.2449 |
| `eng.4` | 101 | 52% | 🟢 +22.5% | 0.2371 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `eng.3` | 90 | 48% | 🟢 +4.9% | 0.2339 |
| `esp.2` | 74 | 50% | 🟢 +6.7% | 0.2051 |
| `jpn.1` | 68 | 53% | 🟢 +7.2% | 0.2199 |
| `esp.1` | 67 | 58% | 🟢 +6.4% | 0.2046 |
| `eng.1` | 62 | 53% | 🟢 +12.5% | 0.227 |
| `ita.1` | 61 | 69% | 🟢 +34.3% | 0.2014 |
