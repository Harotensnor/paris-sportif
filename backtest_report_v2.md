# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-20T08:58:01Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 2022 picks sur 2026-08-23T11:00Z → 2026-10-19T19:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 47976353.38u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **2022 picks** · 1159 gagnés / 863 perdus · WR **57.3%**
- ROI flat (1u/pick) : **+11.57%** (+234.00u cumulé)
- Kelly 0.25× cap 10% : cumulé **+47976253.38u**
- Cote moyenne : 2.07 · Pick prob moyenne : 54.0%
- **Brier** : 0.2204 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6298 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **479763533.79€** (+47976253.4%) · DD max 22.5% · Sharpe/pick +0.233

## Séries

- Streak courante : 🔥 **5** wins consécutifs
- Plus longue série gagnante : **12**
- Plus longue série perdante : **7**
- Top run win : 12 picks (2026-10-10T16:30Z → 2026-10-10T17:30Z)
- Top run lose : 7 picks (2026-08-29T14:30Z → 2026-08-29T16:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 2022 | 57% | 55–59% | 🟢 +11.6% | +47976253.38u | 0.2204 | +1.2pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 2022 | 0.0371 | 0.084 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1875 | 57% | 🟢 +12.1% | +47976253.38u | 0.2203 |
| baseball | 126 | 63% | 🟢 +5.4% | +0.00u | 0.2275 |
| basketball | 14 | 64% | 🔴 -8.2% | +0.00u | 0.2034 |
| hockey | 7 | 86% | 🟢 +32.6% | +0.00u | 0.1632 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1571 | 56% | 🟢 +10.2% | 0.2213 |
| `football:top5` | 304 | 62% | 🟢 +21.8% | 0.215 |
| `baseball:all` | 126 | 63% | 🟢 +5.4% | 0.2275 |
| `basketball:all` | 14 | 64% | 🔴 -8.2% | 0.2034 |
| `hockey:all` | 7 | 86% | 🟢 +32.6% | 0.1632 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 368 | 78% | 🟢 +2.8% | 0.1587 |
| fav | 788 | 57% | 🔴 -0.8% | 0.2263 |
| toss_up | 570 | 53% | 🟢 +22.7% | 0.2434 |
| dog | 295 | 41% | 🟢 +33.0% | 0.2365 |
| heavy_dog | 1 | 100% | 🟢 +380.0% | 0.4511 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 372 | 36.6% | 39.5% | ⚪ +2.9% |
| [0.4–0.5] | 493 | 45.4% | 44.6% | ⚪ -0.7% |
| [0.5–0.6] | 554 | 54.8% | 58.5% | ⚪ +3.7% |
| [0.6–0.7] | 327 | 64.6% | 70.3% | 🟢 +5.7% |
| [0.7–0.8] | 179 | 74.8% | 83.2% | 🟢 +8.4% |
| [0.8–0.9] | 85 | 84.1% | 90.6% | 🟢 +6.5% |
| [0.9–1.0] | 12 | 91.7% | 100.0% | 🟢 +8.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 126 | 63% | 🟢 +5.4% | 0.2275 |
| `eng.2` | 106 | 54% | 🟢 +15.2% | 0.2345 |
| `eng.4` | 101 | 51% | 🟢 +18.6% | 0.2367 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `eng.3` | 90 | 49% | 🟢 +6.6% | 0.2324 |
| `esp.2` | 79 | 56% | 🟢 +22.5% | 0.217 |
| `esp.1` | 72 | 62% | 🟢 +17.5% | 0.2079 |
| `jpn.1` | 69 | 57% | 🟢 +13.7% | 0.2193 |
| `ita.1` | 64 | 64% | 🟢 +26.9% | 0.189 |
| `eng.1` | 63 | 56% | 🟢 +17.8% | 0.2308 |
