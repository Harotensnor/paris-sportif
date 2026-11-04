# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-04T11:40:41Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 2255 picks sur 2026-09-05T10:00Z → 2026-11-03T20:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 18600902.78u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **2255 picks** · 1287 gagnés / 968 perdus · WR **57.1%**
- ROI flat (1u/pick) : **+9.68%** (+218.18u cumulé)
- Kelly 0.25× cap 10% : cumulé **+18600802.78u**
- Cote moyenne : 2.05 · Pick prob moyenne : 54.4%
- **Brier** : 0.2209 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6308 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **186009027.84€** (+18600802.8%) · DD max 40.5% · Sharpe/pick +0.200

## Séries

- Streak courante : 🔥 **3** wins consécutifs
- Plus longue série gagnante : **12**
- Plus longue série perdante : **8**
- Top run win : 12 picks (2026-09-08T18:45Z → 2026-09-08T19:00Z)
- Top run lose : 8 picks (2026-09-06T13:00Z → 2026-09-06T14:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 2255 | 57% | 55–59% | 🟢 +9.7% | +18600802.78u | 0.2209 | +1.1pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 2255 | 0.0345 | 0.073 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 2124 | 56% | 🟢 +9.7% | +18585456.65u | 0.2209 |
| baseball | 98 | 66% | 🟢 +9.8% | +0.00u | 0.225 |
| basketball | 17 | 59% | 🔴 -16.1% | +15346.13u | 0.2282 |
| hockey | 16 | 81% | 🟢 +28.2% | +0.00u | 0.183 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1803 | 56% | 🟢 +9.5% | 0.2219 |
| `football:top5` | 321 | 58% | 🟢 +11.0% | 0.2155 |
| `baseball:all` | 98 | 66% | 🟢 +9.8% | 0.225 |
| `basketball:all` | 17 | 59% | 🔴 -16.1% | 0.2282 |
| `hockey:all` | 16 | 81% | 🟢 +28.2% | 0.183 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 431 | 79% | 🟢 +4.2% | 0.1572 |
| fav | 864 | 57% | 🔴 -0.8% | 0.2306 |
| toss_up | 651 | 51% | 🟢 +18.0% | 0.2418 |
| dog | 307 | 39% | 🟢 +28.6% | 0.2382 |
| heavy_dog | 2 | 50% | 🟢 +135.0% | 0.2876 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 385 | 36.4% | 39.2% | ⚪ +2.8% |
| [0.4–0.5] | 566 | 45.3% | 43.8% | ⚪ -1.5% |
| [0.5–0.6] | 590 | 54.5% | 57.1% | ⚪ +2.6% |
| [0.6–0.7] | 377 | 64.6% | 70.6% | 🟢 +5.9% |
| [0.7–0.8] | 207 | 74.3% | 81.6% | 🟢 +7.3% |
| [0.8–0.9] | 116 | 83.9% | 87.9% | ⚪ +4.1% |
| [0.9–1.0] | 14 | 92.7% | 100.0% | 🟢 +7.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `eng.2` | 115 | 55% | 🟢 +15.6% | 0.244 |
| `eng.4` | 111 | 53% | 🟢 +22.7% | 0.2447 |
| `eng.3` | 108 | 49% | 🟢 +1.5% | 0.2329 |
| `mlb` | 98 | 66% | 🟢 +9.8% | 0.225 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `esp.2` | 82 | 55% | 🟢 +18.3% | 0.2232 |
| `ita.2` | 80 | 51% | 🟢 +19.4% | 0.2429 |
| `jpn.1` | 79 | 57% | 🟢 +16.1% | 0.2236 |
| `esp.1` | 72 | 61% | 🟢 +12.9% | 0.2107 |
| `ita.1` | 72 | 67% | 🟢 +29.9% | 0.1961 |
