# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-24T08:27:43Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 2120 picks sur 2026-08-25T18:00Z → 2026-10-24T06:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 124216285.33u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **2120 picks** · 1209 gagnés / 911 perdus · WR **57.0%**
- ROI flat (1u/pick) : **+11.42%** (+242.01u cumulé)
- Kelly 0.25× cap 10% : cumulé **+124216185.33u**
- Cote moyenne : 2.07 · Pick prob moyenne : 54.1%
- **Brier** : 0.222 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.633 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1242162853.34€** (+124216185.3%) · DD max 26.6% · Sharpe/pick +0.235

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **12**
- Plus longue série perdante : **7**
- Top run win : 12 picks (2026-09-08T18:45Z → 2026-09-08T19:00Z)
- Top run lose : 7 picks (2026-08-29T14:30Z → 2026-08-29T16:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 2120 | 57% | 55–59% | 🟢 +11.4% | +124216185.33u | 0.222 | +1.2pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 2120 | 0.0293 | 0.081 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1972 | 56% | 🟢 +11.9% | +123915681.58u | 0.2219 |
| baseball | 126 | 63% | 🟢 +5.4% | +0.00u | 0.2275 |
| basketball | 15 | 60% | 🔴 -11.1% | +300503.75u | 0.2152 |
| hockey | 7 | 86% | 🟢 +32.6% | +0.00u | 0.1632 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1675 | 56% | 🟢 +10.3% | 0.2224 |
| `football:top5` | 297 | 61% | 🟢 +20.8% | 0.2194 |
| `baseball:all` | 126 | 63% | 🟢 +5.4% | 0.2275 |
| `basketball:all` | 15 | 60% | 🔴 -11.1% | 0.2152 |
| `hockey:all` | 7 | 86% | 🟢 +32.6% | 0.1632 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 387 | 77% | 🟢 +1.1% | 0.1633 |
| fav | 822 | 56% | 🔴 -1.8% | 0.2271 |
| toss_up | 605 | 52% | 🟢 +21.4% | 0.242 |
| dog | 304 | 43% | 🟢 +39.6% | 0.2429 |
| heavy_dog | 2 | 50% | 🟢 +140.0% | 0.2906 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 377 | 36.5% | 39.3% | ⚪ +2.7% |
| [0.4–0.5] | 517 | 45.3% | 46.2% | ⚪ +0.9% |
| [0.5–0.6] | 582 | 54.7% | 56.2% | ⚪ +1.5% |
| [0.6–0.7] | 351 | 64.6% | 69.5% | ⚪ +4.9% |
| [0.7–0.8] | 190 | 74.6% | 82.6% | 🟢 +8.1% |
| [0.8–0.9] | 87 | 84.1% | 89.7% | 🟢 +5.5% |
| [0.9–1.0] | 16 | 92.1% | 100.0% | 🟢 +7.9% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 126 | 63% | 🟢 +5.4% | 0.2275 |
| `eng.4` | 113 | 53% | 🟢 +28.7% | 0.2509 |
| `eng.2` | 109 | 52% | 🟢 +11.2% | 0.239 |
| `eng.3` | 102 | 51% | 🟢 +10.9% | 0.2266 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `jpn.1` | 83 | 53% | 🟢 +6.4% | 0.2244 |
| `esp.2` | 79 | 56% | 🟢 +21.4% | 0.2148 |
| `esp.1` | 72 | 65% | 🟢 +26.5% | 0.2183 |
| `ita.2` | 61 | 54% | 🟢 +26.4% | 0.2436 |
| `eng.1` | 60 | 55% | 🟢 +20.0% | 0.2379 |
