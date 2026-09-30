# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-30T10:03:28Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1408 picks sur 2026-08-18T22:00Z → 2026-09-29T20:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 14450982.15u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1408 picks** · 811 gagnés / 597 perdus · WR **57.6%**
- ROI flat (1u/pick) : **+14.46%** (+203.55u cumulé)
- Kelly 0.25× cap 10% : cumulé **+14450882.15u**
- Cote moyenne : 2.08 · Pick prob moyenne : 54.1%
- **Brier** : 0.2223 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.633 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **144509821.53€** (+14450882.2%) · DD max 37.5% · Sharpe/pick +0.268

## Séries

- Streak courante : 🔥 **8** wins consécutifs
- Plus longue série gagnante : **13**
- Plus longue série perdante : **9**
- Top run win : 13 picks (2026-09-11T18:00Z → 2026-09-11T19:00Z)
- Top run lose : 9 picks (2026-09-12T12:00Z → 2026-09-12T13:30Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 1408 | 58% | 55–60% | 🟢 +14.5% | +14450882.15u | 0.2223 | +1.6pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1408 | 0.0552 | 0.14 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1270 | 57% | 🟢 +15.8% | +14450882.15u | 0.2217 |
| baseball | 128 | 62% | 🟢 +2.6% | +0.00u | 0.2298 |
| basketball | 10 | 70% | 🔴 -4.6% | +0.00u | 0.1943 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1040 | 56% | 🟢 +13.0% | 0.2231 |
| `football:top5` | 230 | 62% | 🟢 +28.7% | 0.2153 |
| `baseball:all` | 128 | 62% | 🟡 +2.6% | 0.2298 |
| `basketball:all` | 10 | 70% | 🔴 -4.6% | 0.1943 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 244 | 78% | 🟢 +2.6% | 0.1531 |
| fav | 559 | 56% | 🔴 -2.8% | 0.2269 |
| toss_up | 385 | 52% | 🟢 +21.6% | 0.242 |
| dog | 216 | 48% | 🟢 +57.4% | 0.2521 |
| heavy_dog | 4 | 50% | 🟢 +142.5% | 0.2824 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 225 | 36.7% | 44.4% | 🟢 +7.8% |
| [0.4–0.5] | 371 | 45.3% | 41.5% | ⚪ -3.8% |
| [0.5–0.6] | 398 | 54.9% | 58.8% | ⚪ +3.9% |
| [0.6–0.7] | 230 | 64.3% | 70.0% | 🟢 +5.7% |
| [0.7–0.8] | 112 | 74.6% | 82.1% | 🟢 +7.6% |
| [0.8–0.9] | 62 | 84.4% | 98.4% | 🟢 +14.0% |
| [0.9–1.0] | 10 | 91.8% | 90.0% | ⚪ -1.8% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 128 | 62% | 🟢 +2.6% | 0.2298 |
| `eng.2` | 73 | 55% | 🟢 +18.6% | 0.2318 |
| `eng.4` | 69 | 59% | 🟢 +46.1% | 0.2443 |
| `eng.3` | 63 | 40% | 🔴 -7.5% | 0.2332 |
| `esp.1` | 55 | 60% | 🟢 +16.9% | 0.2075 |
| `esp.2` | 51 | 47% | 🟢 +2.6% | 0.2055 |
| `eng.1` | 50 | 56% | 🟢 +25.4% | 0.2408 |
| `uefa.nations` | 50 | 64% | 🟢 +13.8% | 0.2055 |
| `jpn.1` | 49 | 51% | 🟢 +0.5% | 0.2161 |
| `ita.1` | 48 | 71% | 🟢 +44.9% | 0.1951 |
