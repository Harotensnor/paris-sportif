# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-14T09:05:42Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1750 picks sur 2026-08-21T18:45Z → 2026-10-13T19:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 31573782.31u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1750 picks** · 1003 gagnés / 747 perdus · WR **57.3%**
- ROI flat (1u/pick) : **+12.93%** (+226.29u cumulé)
- Kelly 0.25× cap 10% : cumulé **+31573682.31u**
- Cote moyenne : 2.08 · Pick prob moyenne : 54.0%
- **Brier** : 0.223 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6352 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **315737823.08€** (+31573682.3%) · DD max 39.9% · Sharpe/pick +0.245

## Séries

- Streak courante : 🔥 **3** wins consécutifs
- Plus longue série gagnante : **13**
- Plus longue série perdante : **8**
- Top run win : 13 picks (2026-09-09T16:45Z → 2026-09-09T19:00Z)
- Top run lose : 8 picks (2026-10-11T11:35Z → 2026-10-11T12:30Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 1750 | 57% | 55–60% | 🟢 +12.9% | +31573682.31u | 0.223 | +1.3pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1750 | 0.0338 | 0.084 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1608 | 57% | 🟢 +13.8% | +31573682.31u | 0.2229 |
| baseball | 125 | 63% | 🟢 +4.9% | +0.00u | 0.2276 |
| basketball | 13 | 62% | 🔴 -14.5% | +0.00u | 0.2032 |
| hockey | 4 | 75% | 🟢 +17.4% | +0.00u | 0.1789 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1335 | 56% | 🟢 +11.1% | 0.2236 |
| `football:top5` | 273 | 63% | 🟢 +26.6% | 0.2195 |
| `baseball:all` | 125 | 63% | 🟡 +4.9% | 0.2276 |
| `basketball:all` | 13 | 62% | 🔴 -14.5% | 0.2032 |
| `hockey:all` | 4 | 75% | 🟢 +17.4% | 0.1789 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 310 | 77% | 🟢 +1.0% | 0.1637 |
| fav | 681 | 57% | 🔴 -1.3% | 0.2283 |
| toss_up | 495 | 51% | 🟢 +19.1% | 0.2392 |
| dog | 262 | 46% | 🟢 +49.5% | 0.2469 |
| heavy_dog | 2 | 100% | 🟢 +385.0% | 0.454 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 304 | 36.6% | 39.5% | ⚪ +2.9% |
| [0.4–0.5] | 446 | 45.2% | 45.5% | ⚪ +0.3% |
| [0.5–0.6] | 479 | 54.7% | 58.0% | ⚪ +3.3% |
| [0.6–0.7] | 285 | 64.4% | 71.2% | 🟢 +6.9% |
| [0.7–0.8] | 149 | 74.7% | 79.9% | 🟢 +5.2% |
| [0.8–0.9] | 75 | 84.4% | 90.7% | 🟢 +6.3% |
| [0.9–1.0] | 12 | 91.6% | 100.0% | 🟢 +8.4% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 125 | 63% | 🟢 +4.9% | 0.2276 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `eng.2` | 90 | 57% | 🟢 +27.8% | 0.2402 |
| `eng.4` | 89 | 53% | 🟢 +25.2% | 0.2409 |
| `eng.3` | 78 | 47% | 🟢 +9.2% | 0.2383 |
| `esp.2` | 69 | 52% | 🟢 +13.0% | 0.2267 |
| `esp.1` | 63 | 63% | 🟢 +22.6% | 0.2111 |
| `eng.1` | 59 | 58% | 🟢 +28.9% | 0.2437 |
| `jpn.1` | 59 | 54% | 🟢 +12.3% | 0.2208 |
| `ita.1` | 57 | 68% | 🟢 +33.9% | 0.1943 |
