# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-12T11:24:24Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1715 picks sur 2026-08-21T18:45Z → 2026-10-11T21:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 31890618.71u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1715 picks** · 983 gagnés / 732 perdus · WR **57.3%**
- ROI flat (1u/pick) : **+13.15%** (+225.48u cumulé)
- Kelly 0.25× cap 10% : cumulé **+31890518.71u**
- Cote moyenne : 2.08 · Pick prob moyenne : 53.9%
- **Brier** : 0.2224 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6336 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **318906187.08€** (+31890518.7%) · DD max 39.9% · Sharpe/pick +0.248

## Séries

- Streak courante : 🔥 **1** wins consécutifs
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
| `skip` | 1715 | 57% | 55–60% | 🟢 +13.2% | +31890518.71u | 0.2224 | +1.4pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1715 | 0.0343 | 0.086 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1573 | 57% | 🟢 +14.0% | +31890518.71u | 0.2222 |
| baseball | 125 | 63% | 🟢 +4.9% | +0.00u | 0.2276 |
| basketball | 13 | 62% | 🔴 -14.5% | +0.00u | 0.2032 |
| hockey | 4 | 75% | 🟢 +17.4% | +0.00u | 0.1789 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1301 | 56% | 🟢 +11.4% | 0.2227 |
| `football:top5` | 272 | 62% | 🟢 +26.6% | 0.22 |
| `baseball:all` | 125 | 63% | 🟡 +4.9% | 0.2276 |
| `basketball:all` | 13 | 62% | 🔴 -14.5% | 0.2032 |
| `hockey:all` | 4 | 75% | 🟢 +17.4% | 0.1789 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 300 | 78% | 🟢 +1.7% | 0.1591 |
| fav | 667 | 57% | 🔴 -1.8% | 0.2283 |
| toss_up | 488 | 52% | 🟢 +19.9% | 0.2394 |
| dog | 258 | 46% | 🟢 +49.4% | 0.2466 |
| heavy_dog | 2 | 100% | 🟢 +385.0% | 0.454 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 299 | 36.6% | 39.5% | ⚪ +2.9% |
| [0.4–0.5] | 438 | 45.2% | 45.4% | ⚪ +0.2% |
| [0.5–0.6] | 472 | 54.8% | 58.1% | ⚪ +3.3% |
| [0.6–0.7] | 277 | 64.4% | 70.8% | 🟢 +6.4% |
| [0.7–0.8] | 145 | 74.7% | 80.7% | 🟢 +6.0% |
| [0.8–0.9] | 72 | 84.5% | 93.1% | 🟢 +8.6% |
| [0.9–1.0] | 12 | 91.6% | 100.0% | 🟢 +8.4% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 125 | 63% | 🟢 +4.9% | 0.2276 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `eng.4` | 89 | 53% | 🟢 +25.2% | 0.2409 |
| `eng.2` | 84 | 58% | 🟢 +33.2% | 0.2402 |
| `eng.3` | 78 | 47% | 🟢 +9.2% | 0.2383 |
| `esp.2` | 66 | 53% | 🟢 +15.3% | 0.2284 |
| `esp.1` | 63 | 63% | 🟢 +22.6% | 0.2111 |
| `eng.1` | 59 | 58% | 🟢 +28.9% | 0.2437 |
| `jpn.1` | 59 | 54% | 🟢 +12.3% | 0.2208 |
| `ita.1` | 56 | 68% | 🟢 +33.6% | 0.1958 |
