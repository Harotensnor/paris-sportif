# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-24T08:48:48Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1301 picks sur 2026-08-18T11:35Z → 2026-09-23T20:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 11891184.7u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1301 picks** · 749 gagnés / 552 perdus · WR **57.6%**
- ROI flat (1u/pick) : **+15.25%** (+198.41u cumulé)
- Kelly 0.25× cap 10% : cumulé **+11891084.70u**
- Cote moyenne : 2.09 · Pick prob moyenne : 54.2%
- **Brier** : 0.2231 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6347 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **118911847.00€** (+11891084.7%) · DD max 37.7% · Sharpe/pick +0.277

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
| `skip` | 1301 | 58% | 55–60% | 🟢 +15.2% | +11891084.70u | 0.2231 | +1.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1301 | 0.0518 | 0.139 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1188 | 57% | 🟢 +16.9% | +11891084.70u | 0.2225 |
| baseball | 105 | 59% | 🔴 -1.7% | +0.00u | 0.2346 |
| basketball | 8 | 75% | 🔴 -0.2% | +0.00u | 0.1622 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 958 | 56% | 🟢 +14.0% | 0.2242 |
| `football:top5` | 230 | 62% | 🟢 +28.7% | 0.2153 |
| `baseball:all` | 105 | 59% | 🔴 -1.7% | 0.2346 |
| `basketball:all` | 8 | 75% | 🔴 -0.2% | 0.1622 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 222 | 78% | 🟢 +2.2% | 0.1536 |
| fav | 513 | 55% | 🔴 -4.0% | 0.2273 |
| toss_up | 358 | 54% | 🟢 +25.4% | 0.2431 |
| dog | 204 | 48% | 🟢 +57.6% | 0.252 |
| heavy_dog | 4 | 50% | 🟢 +142.5% | 0.2824 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 198 | 36.5% | 45.5% | 🟢 +9.0% |
| [0.4–0.5] | 356 | 45.3% | 42.1% | ⚪ -3.2% |
| [0.5–0.6] | 365 | 55.0% | 58.6% | ⚪ +3.7% |
| [0.6–0.7] | 212 | 64.3% | 68.4% | ⚪ +4.1% |
| [0.7–0.8] | 102 | 74.7% | 82.4% | 🟢 +7.6% |
| [0.8–0.9] | 58 | 84.4% | 98.3% | 🟢 +13.9% |
| [0.9–1.0] | 10 | 91.8% | 90.0% | ⚪ -1.8% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 105 | 59% | 🔴 -1.7% | 0.2346 |
| `eng.2` | 73 | 55% | 🟢 +18.6% | 0.2318 |
| `eng.3` | 59 | 44% | 🟢 +4.3% | 0.2414 |
| `eng.4` | 59 | 59% | 🟢 +45.0% | 0.2406 |
| `esp.1` | 55 | 60% | 🟢 +16.9% | 0.2075 |
| `eng.1` | 50 | 56% | 🟢 +25.4% | 0.2408 |
| `jpn.1` | 49 | 51% | 🟢 +0.5% | 0.2161 |
| `ita.1` | 48 | 71% | 🟢 +44.9% | 0.1951 |
| `fra.1` | 44 | 61% | 🟢 +38.5% | 0.2315 |
| `esp.2` | 41 | 51% | 🟢 +14.4% | 0.2106 |
