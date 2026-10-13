# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-13T11:14:35Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1726 picks sur 2026-08-21T18:45Z → 2026-10-12T17:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 32256829.74u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1726 picks** · 990 gagnés / 736 perdus · WR **57.4%**
- ROI flat (1u/pick) : **+13.27%** (+229.10u cumulé)
- Kelly 0.25× cap 10% : cumulé **+32256729.74u**
- Cote moyenne : 2.08 · Pick prob moyenne : 53.9%
- **Brier** : 0.2228 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6345 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **322568297.40€** (+32256729.7%) · DD max 39.9% · Sharpe/pick +0.247

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
| `skip` | 1726 | 57% | 55–60% | 🟢 +13.3% | +32256729.74u | 0.2228 | +1.4pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1726 | 0.0342 | 0.084 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1584 | 57% | 🟢 +14.2% | +32256729.74u | 0.2226 |
| baseball | 125 | 63% | 🟢 +4.9% | +0.00u | 0.2276 |
| basketball | 13 | 62% | 🔴 -14.5% | +0.00u | 0.2032 |
| hockey | 4 | 75% | 🟢 +17.4% | +0.00u | 0.1789 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1311 | 56% | 🟢 +11.6% | 0.2233 |
| `football:top5` | 273 | 63% | 🟢 +26.6% | 0.2195 |
| `baseball:all` | 125 | 63% | 🟡 +4.9% | 0.2276 |
| `basketball:all` | 13 | 62% | 🔴 -14.5% | 0.2032 |
| `hockey:all` | 4 | 75% | 🟢 +17.4% | 0.1789 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 302 | 77% | 🟢 +1.5% | 0.1606 |
| fav | 672 | 57% | 🔴 -1.5% | 0.2283 |
| toss_up | 489 | 52% | 🟢 +19.6% | 0.2394 |
| dog | 261 | 46% | 🟢 +50.1% | 0.2474 |
| heavy_dog | 2 | 100% | 🟢 +385.0% | 0.454 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 302 | 36.6% | 39.7% | ⚪ +3.1% |
| [0.4–0.5] | 439 | 45.2% | 45.6% | ⚪ +0.3% |
| [0.5–0.6] | 475 | 54.8% | 58.1% | ⚪ +3.3% |
| [0.6–0.7] | 279 | 64.4% | 70.6% | 🟢 +6.2% |
| [0.7–0.8] | 146 | 74.7% | 80.8% | 🟢 +6.2% |
| [0.8–0.9] | 73 | 84.5% | 91.8% | 🟢 +7.3% |
| [0.9–1.0] | 12 | 91.6% | 100.0% | 🟢 +8.4% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 125 | 63% | 🟢 +4.9% | 0.2276 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `eng.4` | 89 | 53% | 🟢 +25.2% | 0.2409 |
| `eng.2` | 84 | 58% | 🟢 +33.2% | 0.2402 |
| `eng.3` | 78 | 47% | 🟢 +9.2% | 0.2383 |
| `esp.2` | 69 | 52% | 🟢 +13.0% | 0.2267 |
| `esp.1` | 63 | 63% | 🟢 +22.6% | 0.2111 |
| `eng.1` | 59 | 58% | 🟢 +28.9% | 0.2437 |
| `jpn.1` | 59 | 54% | 🟢 +12.3% | 0.2208 |
| `ita.1` | 57 | 68% | 🟢 +33.9% | 0.1943 |
