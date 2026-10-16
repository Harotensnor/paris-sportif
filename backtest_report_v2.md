# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-16T08:33:37Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1803 picks sur 2026-08-21T18:45Z → 2026-10-15T19:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 20366577.0u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1803 picks** · 1026 gagnés / 777 perdus · WR **56.9%**
- ROI flat (1u/pick) : **+10.31%** (+185.94u cumulé)
- Kelly 0.25× cap 10% : cumulé **+20366477.00u**
- Cote moyenne : 2.07 · Pick prob moyenne : 54.1%
- **Brier** : 0.2183 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6253 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **203665769.96€** (+20366477.0%) · DD max 29.4% · Sharpe/pick +0.234

## Séries

- Streak courante : 🔥 **3** wins consécutifs
- Plus longue série gagnante : **12**
- Plus longue série perdante : **9**
- Top run win : 12 picks (2026-10-10T16:30Z → 2026-10-10T17:30Z)
- Top run lose : 9 picks (2026-09-12T12:00Z → 2026-09-12T13:30Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 1803 | 57% | 55–59% | 🟢 +10.3% | +20366477.00u | 0.2183 | +1.2pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1803 | 0.0336 | 0.083 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1660 | 56% | 🟢 +10.9% | +20366477.00u | 0.2178 |
| baseball | 126 | 63% | 🟢 +5.4% | +0.00u | 0.2275 |
| basketball | 13 | 62% | 🔴 -14.5% | +0.00u | 0.2032 |
| hockey | 4 | 75% | 🟢 +17.4% | +0.00u | 0.1789 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1387 | 56% | 🟢 +9.3% | 0.2191 |
| `football:top5` | 273 | 60% | 🟢 +18.6% | 0.2112 |
| `baseball:all` | 126 | 63% | 🟢 +5.4% | 0.2275 |
| `basketball:all` | 13 | 62% | 🔴 -14.5% | 0.2032 |
| `hockey:all` | 4 | 75% | 🟢 +17.4% | 0.1789 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 331 | 78% | 🟢 +2.4% | 0.1575 |
| fav | 700 | 57% | 🔴 -1.6% | 0.227 |
| toss_up | 502 | 52% | 🟢 +19.5% | 0.2377 |
| dog | 269 | 41% | 🟢 +32.6% | 0.2335 |
| heavy_dog | 1 | 100% | 🟢 +380.0% | 0.4511 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 318 | 36.5% | 35.5% | ⚪ -1.0% |
| [0.4–0.5] | 456 | 45.4% | 45.0% | ⚪ -0.4% |
| [0.5–0.6] | 484 | 54.9% | 58.5% | ⚪ +3.6% |
| [0.6–0.7] | 293 | 64.5% | 71.3% | 🟢 +6.8% |
| [0.7–0.8] | 160 | 74.7% | 81.2% | 🟢 +6.6% |
| [0.8–0.9] | 81 | 84.3% | 92.6% | 🟢 +8.3% |
| [0.9–1.0] | 11 | 91.7% | 100.0% | 🟢 +8.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 126 | 63% | 🟢 +5.4% | 0.2275 |
| `eng.2` | 97 | 58% | 🟢 +27.5% | 0.2426 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `eng.4` | 89 | 53% | 🟢 +25.2% | 0.2409 |
| `eng.3` | 79 | 46% | 🟢 +2.5% | 0.2348 |
| `esp.2` | 69 | 48% | 🟢 +1.3% | 0.2057 |
| `esp.1` | 63 | 60% | 🟢 +11.6% | 0.1994 |
| `eng.1` | 59 | 54% | 🟢 +15.4% | 0.2261 |
| `jpn.1` | 59 | 54% | 🟢 +12.3% | 0.2208 |
| `ita.1` | 57 | 65% | 🟢 +21.6% | 0.1882 |
