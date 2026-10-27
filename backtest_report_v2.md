# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-27T09:24:16Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 2252 picks sur 2026-08-29T13:00Z → 2026-10-26T18:45Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 123507132.49u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **2252 picks** · 1278 gagnés / 974 perdus · WR **56.7%**
- ROI flat (1u/pick) : **+9.99%** (+225.09u cumulé)
- Kelly 0.25× cap 10% : cumulé **+123507032.49u**
- Cote moyenne : 2.05 · Pick prob moyenne : 54.3%
- **Brier** : 0.2214 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.632 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1235071324.88€** (+123507032.5%) · DD max 35.1% · Sharpe/pick +0.222

## Séries

- Streak courante : 🔥 **2** wins consécutifs
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
| `skip` | 2252 | 57% | 55–59% | 🟢 +10.0% | +123507032.49u | 0.2214 | +1.3pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 2252 | 0.0395 | 0.078 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 2101 | 56% | 🟢 +10.3% | +123426156.31u | 0.2213 |
| baseball | 125 | 64% | 🟢 +6.3% | +0.00u | 0.2271 |
| basketball | 16 | 56% | 🔴 -16.7% | +80876.18u | 0.2283 |
| hockey | 10 | 80% | 🟢 +23.6% | +0.00u | 0.1709 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1780 | 56% | 🟢 +10.1% | 0.2221 |
| `football:top5` | 321 | 58% | 🟢 +11.7% | 0.217 |
| `baseball:all` | 125 | 64% | 🟢 +6.3% | 0.2271 |
| `basketball:all` | 16 | 56% | 🔴 -16.7% | 0.2283 |
| `hockey:all` | 10 | 80% | 🟢 +23.6% | 0.1709 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 415 | 79% | 🟢 +3.5% | 0.16 |
| fav | 879 | 56% | 🔴 -2.9% | 0.2284 |
| toss_up | 650 | 51% | 🟢 +18.8% | 0.241 |
| dog | 306 | 42% | 🟢 +36.5% | 0.2427 |
| heavy_dog | 2 | 50% | 🟢 +135.0% | 0.2876 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 385 | 36.5% | 40.5% | ⚪ +4.0% |
| [0.4–0.5] | 560 | 45.3% | 42.3% | ⚪ -3.0% |
| [0.5–0.6] | 606 | 54.6% | 56.1% | ⚪ +1.5% |
| [0.6–0.7] | 374 | 64.6% | 71.7% | 🟢 +7.1% |
| [0.7–0.8] | 207 | 74.4% | 82.1% | 🟢 +7.8% |
| [0.8–0.9] | 104 | 83.9% | 87.5% | ⚪ +3.6% |
| [0.9–1.0] | 16 | 92.4% | 100.0% | 🟢 +7.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 125 | 64% | 🟢 +6.3% | 0.2271 |
| `eng.4` | 120 | 52% | 🟢 +23.5% | 0.2483 |
| `eng.2` | 115 | 54% | 🟢 +17.3% | 0.2505 |
| `eng.3` | 110 | 51% | 🟢 +10.3% | 0.2325 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `esp.2` | 86 | 55% | 🟢 +15.9% | 0.2175 |
| `jpn.1` | 79 | 53% | 🟢 +6.8% | 0.2229 |
| `esp.1` | 74 | 62% | 🟢 +17.7% | 0.2145 |
| `ita.2` | 69 | 54% | 🟢 +24.4% | 0.2388 |
| `ita.1` | 68 | 65% | 🟢 +28.4% | 0.197 |
