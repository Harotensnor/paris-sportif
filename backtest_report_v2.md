# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-15T08:38:57Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1766 picks sur 2026-08-21T18:45Z → 2026-10-14T19:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 32612747.55u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1766 picks** · 1014 gagnés / 752 perdus · WR **57.4%**
- ROI flat (1u/pick) : **+13.02%** (+229.85u cumulé)
- Kelly 0.25× cap 10% : cumulé **+32612647.55u**
- Cote moyenne : 2.08 · Pick prob moyenne : 53.9%
- **Brier** : 0.2226 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6343 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **326127475.47€** (+32612647.6%) · DD max 39.9% · Sharpe/pick +0.244

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
| `skip` | 1766 | 57% | 55–60% | 🟢 +13.0% | +32612647.55u | 0.2226 | +1.3pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1766 | 0.0349 | 0.084 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1624 | 57% | 🟢 +13.8% | +32612647.55u | 0.2225 |
| baseball | 125 | 63% | 🟢 +4.9% | +0.00u | 0.2276 |
| basketball | 13 | 62% | 🔴 -14.5% | +0.00u | 0.2032 |
| hockey | 4 | 75% | 🟢 +17.4% | +0.00u | 0.1789 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1351 | 56% | 🟢 +11.3% | 0.223 |
| `football:top5` | 273 | 63% | 🟢 +26.6% | 0.2195 |
| `baseball:all` | 125 | 63% | 🟡 +4.9% | 0.2276 |
| `basketball:all` | 13 | 62% | 🔴 -14.5% | 0.2032 |
| `hockey:all` | 4 | 75% | 🟢 +17.4% | 0.1789 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 313 | 77% | 🟢 +1.3% | 0.1628 |
| fav | 688 | 57% | 🔴 -0.7% | 0.2281 |
| toss_up | 497 | 51% | 🟢 +19.0% | 0.2393 |
| dog | 266 | 46% | 🟢 +48.4% | 0.2458 |
| heavy_dog | 2 | 100% | 🟢 +385.0% | 0.454 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 307 | 36.6% | 39.1% | ⚪ +2.5% |
| [0.4–0.5] | 452 | 45.2% | 45.8% | ⚪ +0.6% |
| [0.5–0.6] | 481 | 54.8% | 58.2% | ⚪ +3.5% |
| [0.6–0.7] | 289 | 64.4% | 71.6% | 🟢 +7.2% |
| [0.7–0.8] | 149 | 74.7% | 79.9% | 🟢 +5.2% |
| [0.8–0.9] | 76 | 84.4% | 90.8% | 🟢 +6.4% |
| [0.9–1.0] | 12 | 91.6% | 100.0% | 🟢 +8.4% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 125 | 63% | 🟢 +4.9% | 0.2276 |
| `eng.2` | 94 | 57% | 🟢 +29.3% | 0.2383 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `eng.4` | 89 | 53% | 🟢 +25.2% | 0.2409 |
| `eng.3` | 78 | 47% | 🟢 +9.2% | 0.2383 |
| `esp.2` | 69 | 52% | 🟢 +13.0% | 0.2267 |
| `esp.1` | 63 | 63% | 🟢 +22.6% | 0.2111 |
| `eng.1` | 59 | 58% | 🟢 +28.9% | 0.2437 |
| `jpn.1` | 59 | 54% | 🟢 +12.3% | 0.2208 |
| `ita.1` | 57 | 68% | 🟢 +33.9% | 0.1943 |
