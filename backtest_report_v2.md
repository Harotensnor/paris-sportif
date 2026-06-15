# Backtest ROI — VRAI modèle (v2)

Généré : 2026-06-15T09:50:23Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 351 picks sur 2026-05-24T15:00Z → 2026-06-14T20:07Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 104.52u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **351 picks** · 196 gagnés / 155 perdus · WR **55.8%**
- ROI flat (1u/pick) : **-1.24%** (-4.35u cumulé)
- Kelly 0.25× cap 10% : cumulé **+4.52u**
- Cote moyenne : 1.81 · Pick prob moyenne : 54.1%
- **Brier** : 0.2412 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6746 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1045.25€** (+4.5%) · DD max 8.3% · Sharpe/pick +0.024

## Séries

- Streak courante : 🔥 **2** wins consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **6**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 6 picks (2026-06-10T22:35Z → 2026-06-10T23:40Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 351 | 56% | 51–61% | 🔴 -1.2% | +4.52u | 0.2412 | -2.8pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 351 | 0.0335 | 0.27 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 257 | 56% | 🔴 -3.1% | -0.28u | 0.2448 |
| football | 68 | 47% | 🔴 -0.1% | +4.80u | 0.2396 |
| basketball | 18 | 72% | 🟢 +7.6% | +0.00u | 0.1999 |
| hockey | 8 | 75% | 🟢 +28.5% | +0.00u | 0.2336 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 257 | 56% | 🔴 -3.1% | 0.2448 |
| `football:other` | 62 | 45% | 🔴 -2.2% | 0.2355 |
| `basketball:all` | 18 | 72% | 🟢 +7.6% | 0.1999 |
| `hockey:all` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `football:top5` | 6 | 67% | 🟢 +21.8% | 0.2822 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 33 | 76% | 🟢 +4.6% | 0.1752 |
| fav | 279 | 55% | 🔴 -3.6% | 0.2494 |
| toss_up | 25 | 44% | 🔴 -1.8% | 0.2343 |
| dog | 14 | 43% | 🟢 +33.6% | 0.2473 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 21 | 36.6% | 28.6% | 🔴 -8.0% |
| [0.4–0.5] | 37 | 46.3% | 62.2% | 🟢 +15.9% |
| [0.5–0.6] | 241 | 54.3% | 54.8% | ⚪ +0.5% |
| [0.6–0.7] | 44 | 63.7% | 61.4% | ⚪ -2.4% |
| [0.7–0.8] | 6 | 73.0% | 100.0% | 🟢 +27.0% |
| [0.8–0.9] | 2 | 84.7% | 100.0% | 🟢 +15.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 257 | 56% | 🔴 -3.1% | 0.2448 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `wnba` | 11 | 82% | 🟢 +16.0% | 0.167 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `nhl` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `esp.2` | 7 | 86% | 🟢 +38.0% | 0.1635 |
| `laliga2` | 7 | 14% | 🔴 -71.4% | 0.1913 |
| `nba` | 7 | 57% | 🔴 -5.6% | 0.2515 |
| `allsvenskan` | 6 | 17% | 🔴 -46.7% | 0.2172 |
| `ita.1` | 5 | 60% | 🔴 -4.8% | 0.2735 |
