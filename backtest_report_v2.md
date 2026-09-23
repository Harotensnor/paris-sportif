# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-23T08:53:21Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1297 picks sur 2026-08-18T11:35Z → 2026-09-22T17:05Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 11822277.23u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1297 picks** · 747 gagnés / 550 perdus · WR **57.6%**
- ROI flat (1u/pick) : **+15.34%** (+199.00u cumulé)
- Kelly 0.25× cap 10% : cumulé **+11822177.23u**
- Cote moyenne : 2.09 · Pick prob moyenne : 54.2%
- **Brier** : 0.2231 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6348 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **118222772.33€** (+11822177.2%) · DD max 37.7% · Sharpe/pick +0.277

## Séries

- Streak courante : 🔥 **1** wins consécutifs
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
| `skip` | 1297 | 58% | 55–60% | 🟢 +15.3% | +11822177.23u | 0.2231 | +1.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1297 | 0.0511 | 0.139 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1187 | 57% | 🟢 +16.9% | +11822177.23u | 0.2226 |
| baseball | 102 | 59% | 🔴 -2.1% | +0.00u | 0.234 |
| basketball | 8 | 75% | 🔴 -0.2% | +0.00u | 0.1622 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 957 | 56% | 🟢 +14.1% | 0.2243 |
| `football:top5` | 230 | 62% | 🟢 +28.7% | 0.2154 |
| `baseball:all` | 102 | 59% | 🔴 -2.1% | 0.234 |
| `basketball:all` | 8 | 75% | 🔴 -0.2% | 0.1622 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 222 | 78% | 🟢 +2.2% | 0.1539 |
| fav | 510 | 55% | 🔴 -4.2% | 0.2272 |
| toss_up | 357 | 54% | 🟢 +25.8% | 0.2431 |
| dog | 204 | 48% | 🟢 +57.6% | 0.252 |
| heavy_dog | 4 | 50% | 🟢 +142.5% | 0.2824 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 198 | 36.5% | 45.5% | 🟢 +9.0% |
| [0.4–0.5] | 355 | 45.3% | 42.3% | ⚪ -3.0% |
| [0.5–0.6] | 363 | 55.0% | 58.4% | ⚪ +3.4% |
| [0.6–0.7] | 210 | 64.3% | 69.0% | ⚪ +4.8% |
| [0.7–0.8] | 103 | 74.7% | 81.6% | 🟢 +6.9% |
| [0.8–0.9] | 58 | 84.4% | 98.3% | 🟢 +13.9% |
| [0.9–1.0] | 10 | 91.8% | 90.0% | ⚪ -1.8% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 102 | 59% | 🔴 -2.1% | 0.234 |
| `eng.2` | 73 | 55% | 🟢 +18.6% | 0.2318 |
| `eng.3` | 59 | 44% | 🟢 +4.3% | 0.2414 |
| `eng.4` | 59 | 59% | 🟢 +45.0% | 0.2406 |
| `esp.1` | 55 | 60% | 🟢 +16.9% | 0.2078 |
| `eng.1` | 50 | 56% | 🟢 +25.4% | 0.2408 |
| `jpn.1` | 49 | 51% | 🟢 +0.5% | 0.2161 |
| `ita.1` | 48 | 71% | 🟢 +44.9% | 0.1951 |
| `fra.1` | 44 | 61% | 🟢 +38.5% | 0.2315 |
| `esp.2` | 41 | 51% | 🟢 +14.4% | 0.2106 |
