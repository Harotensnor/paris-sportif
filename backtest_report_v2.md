# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-17T08:06:15Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1829 picks sur 2026-08-22T11:30Z → 2026-10-17T05:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 18669417.6u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1829 picks** · 1042 gagnés / 787 perdus · WR **57.0%**
- ROI flat (1u/pick) : **+10.62%** (+194.24u cumulé)
- Kelly 0.25× cap 10% : cumulé **+18669317.60u**
- Cote moyenne : 2.07 · Pick prob moyenne : 54.1%
- **Brier** : 0.2191 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.627 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **186694176.04€** (+18669317.6%) · DD max 30.1% · Sharpe/pick +0.230

## Séries

- Streak courante : 🔥 **1** wins consécutifs
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
| `skip` | 1829 | 57% | 55–59% | 🟢 +10.6% | +18669317.60u | 0.2191 | +1.2pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1829 | 0.0294 | 0.083 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1686 | 56% | 🟢 +11.2% | +18669317.60u | 0.2187 |
| baseball | 126 | 63% | 🟢 +5.4% | +0.00u | 0.2275 |
| basketball | 13 | 62% | 🔴 -14.5% | +0.00u | 0.2032 |
| hockey | 4 | 75% | 🟢 +17.4% | +0.00u | 0.1789 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1412 | 56% | 🟢 +9.7% | 0.2197 |
| `football:top5` | 274 | 60% | 🟢 +19.0% | 0.2137 |
| `baseball:all` | 126 | 63% | 🟢 +5.4% | 0.2275 |
| `basketball:all` | 13 | 62% | 🔴 -14.5% | 0.2032 |
| `hockey:all` | 4 | 75% | 🟢 +17.4% | 0.1789 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 334 | 78% | 🟢 +2.8% | 0.1571 |
| fav | 708 | 57% | 🔴 -1.3% | 0.2271 |
| toss_up | 511 | 52% | 🟢 +19.8% | 0.2398 |
| dog | 275 | 41% | 🟢 +32.4% | 0.2344 |
| heavy_dog | 1 | 100% | 🟢 +380.0% | 0.4511 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 319 | 36.5% | 36.4% | ⚪ -0.1% |
| [0.4–0.5] | 460 | 45.2% | 45.2% | ⚪ +0.0% |
| [0.5–0.6] | 496 | 54.8% | 57.9% | ⚪ +3.1% |
| [0.6–0.7] | 302 | 64.6% | 70.9% | 🟢 +6.3% |
| [0.7–0.8] | 158 | 74.7% | 82.3% | 🟢 +7.6% |
| [0.8–0.9] | 83 | 84.3% | 91.6% | 🟢 +7.3% |
| [0.9–1.0] | 11 | 91.7% | 100.0% | 🟢 +8.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 126 | 63% | 🟢 +5.4% | 0.2275 |
| `eng.2` | 98 | 58% | 🟢 +28.5% | 0.244 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `eng.4` | 89 | 53% | 🟢 +25.2% | 0.2409 |
| `eng.3` | 79 | 46% | 🟢 +2.5% | 0.2348 |
| `esp.2` | 70 | 47% | 🔴 -0.1% | 0.2044 |
| `esp.1` | 63 | 59% | 🟢 +8.2% | 0.2015 |
| `jpn.1` | 63 | 54% | 🟢 +9.9% | 0.2179 |
| `eng.1` | 58 | 53% | 🟢 +15.3% | 0.2294 |
| `ita.1` | 58 | 69% | 🟢 +35.9% | 0.2009 |
