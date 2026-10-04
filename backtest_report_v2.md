# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-04T10:16:21Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1457 picks sur 2026-08-19T11:35Z → 2026-10-03T21:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 14608051.42u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1457 picks** · 836 gagnés / 621 perdus · WR **57.4%**
- ROI flat (1u/pick) : **+13.58%** (+197.82u cumulé)
- Kelly 0.25× cap 10% : cumulé **+14607951.42u**
- Cote moyenne : 2.08 · Pick prob moyenne : 54.1%
- **Brier** : 0.2226 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6339 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **146080514.23€** (+14607951.4%) · DD max 34.1% · Sharpe/pick +0.264

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
| `skip` | 1457 | 57% | 55–60% | 🟢 +13.6% | +14607951.42u | 0.2226 | +1.4pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1457 | 0.0422 | 0.124 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1317 | 57% | 🟢 +14.8% | +14607951.42u | 0.2221 |
| baseball | 130 | 62% | 🟢 +2.1% | +0.00u | 0.2297 |
| basketball | 10 | 70% | 🔴 -4.6% | +0.00u | 0.1943 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1087 | 56% | 🟢 +11.9% | 0.2236 |
| `football:top5` | 230 | 62% | 🟢 +28.7% | 0.2153 |
| `baseball:all` | 130 | 62% | 🟡 +2.1% | 0.2297 |
| `basketball:all` | 10 | 70% | 🔴 -4.6% | 0.1943 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 257 | 77% | 🟢 +1.0% | 0.1596 |
| fav | 575 | 56% | 🔴 -2.8% | 0.227 |
| toss_up | 405 | 53% | 🟢 +22.5% | 0.2422 |
| dog | 216 | 47% | 🟢 +52.9% | 0.2479 |
| heavy_dog | 4 | 50% | 🟢 +142.5% | 0.2824 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 229 | 36.7% | 42.4% | 🟢 +5.7% |
| [0.4–0.5] | 400 | 45.3% | 43.8% | ⚪ -1.6% |
| [0.5–0.6] | 404 | 55.0% | 58.4% | ⚪ +3.5% |
| [0.6–0.7] | 232 | 64.4% | 69.8% | 🟢 +5.5% |
| [0.7–0.8] | 118 | 74.6% | 80.5% | 🟢 +5.9% |
| [0.8–0.9] | 64 | 84.4% | 96.9% | 🟢 +12.4% |
| [0.9–1.0] | 10 | 91.8% | 90.0% | ⚪ -1.8% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 130 | 62% | 🟢 +2.1% | 0.2297 |
| `eng.4` | 77 | 56% | 🟢 +34.4% | 0.2386 |
| `uefa.nations` | 75 | 59% | 🟢 +2.9% | 0.2099 |
| `eng.2` | 73 | 55% | 🟢 +18.6% | 0.2318 |
| `eng.3` | 66 | 42% | 🔴 -2.1% | 0.2412 |
| `esp.1` | 55 | 60% | 🟢 +16.9% | 0.2075 |
| `esp.2` | 55 | 56% | 🟢 +22.2% | 0.2184 |
| `eng.1` | 50 | 56% | 🟢 +25.4% | 0.2408 |
| `jpn.1` | 49 | 51% | 🟢 +0.5% | 0.2161 |
| `ita.1` | 48 | 71% | 🟢 +44.9% | 0.1951 |
