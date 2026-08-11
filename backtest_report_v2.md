# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-11T04:56:21Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 502 picks sur 2026-07-06T17:00Z → 2026-08-10T21:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 224.24u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **502 picks** · 285 gagnés / 217 perdus · WR **56.8%**
- ROI flat (1u/pick) : **+3.28%** (+16.45u cumulé)
- Kelly 0.25× cap 10% : cumulé **+124.24u**
- Cote moyenne : 1.90 · Pick prob moyenne : 54.0%
- **Brier** : 0.2358 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6644 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **2242.44€** (+124.2%) · DD max 19.7% · Sharpe/pick +0.108

## Séries

- Streak courante : ❄️ **2** loses consécutifs
- Plus longue série gagnante : **7**
- Plus longue série perdante : **7**
- Top run win : 7 picks (2026-07-07T02:10Z → 2026-07-07T22:40Z)
- Top run lose : 7 picks (2026-07-10T23:50Z → 2026-07-11T02:15Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 502 | 57% | 52–61% | 🟢 +3.3% | +124.24u | 0.2358 | -1.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 502 | 0.0386 | 0.052 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 325 | 56% | 🟢 +6.3% | +124.24u | 0.2317 |
| baseball | 156 | 58% | 🔴 -1.2% | +0.00u | 0.2451 |
| basketball | 21 | 62% | 🔴 -10.6% | +0.00u | 0.2311 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 325 | 56% | 🟢 +6.3% | 0.2317 |
| `baseball:all` | 156 | 58% | 🔴 -1.2% | 0.2451 |
| `basketball:all` | 21 | 62% | 🔴 -10.6% | 0.2311 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 88 | 61% | 🔴 -17.6% | 0.2306 |
| fav | 284 | 60% | 🟢 +4.3% | 0.2345 |
| toss_up | 91 | 53% | 🟢 +23.1% | 0.258 |
| dog | 38 | 32% | 🔴 -0.9% | 0.2079 |
| heavy_dog | 1 | 0% | 🔴 -100.0% | 0.1078 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 53 | 36.4% | 34.0% | ⚪ -2.4% |
| [0.4–0.5] | 113 | 45.3% | 50.4% | 🟢 +5.2% |
| [0.5–0.6] | 217 | 54.7% | 59.4% | ⚪ +4.7% |
| [0.6–0.7] | 73 | 64.8% | 63.0% | ⚪ -1.7% |
| [0.7–0.8] | 36 | 73.3% | 75.0% | ⚪ +1.7% |
| [0.8–0.9] | 10 | 82.0% | 80.0% | ⚪ -2.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 156 | 58% | 🔴 -1.2% | 0.2451 |
| `chn.1` | 32 | 53% | 🟢 +5.2% | 0.2683 |
| `football.cup` | 28 | 61% | 🟢 +0.2% | 0.1687 |
| `nor.1` | 26 | 58% | 🟢 +9.7% | 0.2414 |
| `swe.1` | 21 | 52% | 🔴 -7.5% | 0.2708 |
| `wnba` | 21 | 62% | 🔴 -10.6% | 0.2311 |
| `ligamx` | 18 | 39% | 🔴 -33.2% | 0.2361 |
| `uru.1` | 17 | 24% | 🔴 -63.2% | 0.2068 |
| `arg.1` | 16 | 44% | 🟢 +2.0% | 0.21 |
| `per.1` | 15 | 67% | 🟢 +44.5% | 0.2654 |
