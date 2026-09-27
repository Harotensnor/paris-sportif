# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-27T09:37:05Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1354 picks sur 2026-08-18T22:00Z → 2026-09-26T19:07Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 14741902.48u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1354 picks** · 779 gagnés / 575 perdus · WR **57.5%**
- ROI flat (1u/pick) : **+14.87%** (+201.28u cumulé)
- Kelly 0.25× cap 10% : cumulé **+14741802.48u**
- Cote moyenne : 2.09 · Pick prob moyenne : 54.1%
- **Brier** : 0.2228 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6342 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **147419024.79€** (+14741802.5%) · DD max 37.5% · Sharpe/pick +0.276

## Séries

- Streak courante : ❄️ **1** loses consécutifs
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
| `skip` | 1354 | 58% | 55–60% | 🟢 +14.9% | +14741802.48u | 0.2228 | +1.7pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1354 | 0.054 | 0.14 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1233 | 57% | 🟢 +16.3% | +14741802.48u | 0.2222 |
| baseball | 113 | 60% | 🟢 +0.4% | +0.00u | 0.2339 |
| basketball | 8 | 75% | 🔴 -0.2% | +0.00u | 0.1622 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1003 | 56% | 🟢 +13.4% | 0.2238 |
| `football:top5` | 230 | 62% | 🟢 +28.7% | 0.2153 |
| `baseball:all` | 113 | 60% | 🟡 +0.4% | 0.2339 |
| `basketball:all` | 8 | 75% | 🔴 -0.2% | 0.1622 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 234 | 78% | 🟢 +2.5% | 0.153 |
| fav | 536 | 55% | 🔴 -4.0% | 0.2273 |
| toss_up | 371 | 53% | 🟢 +22.3% | 0.2416 |
| dog | 209 | 49% | 🟢 +61.3% | 0.2551 |
| heavy_dog | 4 | 50% | 🟢 +142.5% | 0.2824 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 213 | 36.7% | 45.1% | 🟢 +8.4% |
| [0.4–0.5] | 361 | 45.3% | 41.6% | ⚪ -3.7% |
| [0.5–0.6] | 381 | 54.9% | 58.5% | ⚪ +3.7% |
| [0.6–0.7] | 220 | 64.3% | 69.1% | ⚪ +4.8% |
| [0.7–0.8] | 108 | 74.6% | 82.4% | 🟢 +7.8% |
| [0.8–0.9] | 61 | 84.3% | 98.4% | 🟢 +14.0% |
| [0.9–1.0] | 10 | 91.8% | 90.0% | ⚪ -1.8% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 113 | 60% | 🟢 +0.4% | 0.2339 |
| `eng.2` | 73 | 55% | 🟢 +18.6% | 0.2318 |
| `eng.4` | 69 | 59% | 🟢 +46.1% | 0.2443 |
| `eng.3` | 63 | 40% | 🔴 -7.5% | 0.2332 |
| `esp.1` | 55 | 60% | 🟢 +16.9% | 0.2075 |
| `eng.1` | 50 | 56% | 🟢 +25.4% | 0.2408 |
| `jpn.1` | 49 | 51% | 🟢 +0.5% | 0.2161 |
| `ita.1` | 48 | 71% | 🟢 +44.9% | 0.1951 |
| `esp.2` | 45 | 47% | 🟢 +2.7% | 0.2101 |
| `fra.1` | 44 | 61% | 🟢 +38.5% | 0.2315 |
