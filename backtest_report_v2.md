# Backtest ROI — VRAI modèle (v2)

Généré : 2026-06-28T07:42:02Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 489 picks sur 2026-05-24T15:00Z → 2026-06-27T20:40Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 88.4u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **489 picks** · 274 gagnés / 215 perdus · WR **56.0%**
- ROI flat (1u/pick) : **-1.91%** (-9.34u cumulé)
- Kelly 0.25× cap 10% : cumulé **-11.60u**
- Cote moyenne : 1.79 · Pick prob moyenne : 54.8%
- **Brier** : 0.2419 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6767 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **883.98€** (-11.6%) · DD max 21.4% · Sharpe/pick -0.031

## Séries

- Streak courante : ❄️ **1** loses consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **6**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 6 picks (2026-06-10T22:35Z → 2026-06-10T23:40Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 9 | 33% | 12–65% | 🔴 -34.8% | -15.75u | 0.2989 | +5.6pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 480 | 56% | 52–61% | 🔴 -1.3% | +4.15u | 0.2409 | -2.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 9 | 0.2384 | 0.632 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 480 | 0.0199 | 0.266 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 380 | 55% | 🔴 -5.6% | -15.52u | 0.2446 |
| football | 68 | 50% | 🟢 +9.7% | +3.92u | 0.2423 |
| basketball | 33 | 73% | 🟢 +9.2% | +0.00u | 0.2124 |
| hockey | 8 | 75% | 🟢 +28.5% | +0.00u | 0.2336 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 380 | 55% | 🔴 -5.6% | 0.2446 |
| `football:other` | 67 | 51% | 🟢 +11.3% | 0.2443 |
| `basketball:all` | 33 | 73% | 🟢 +9.2% | 0.2124 |
| `hockey:all` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `football:top5` | 1 | 0% | 🔴 -100.0% | 0.1135 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 48 | 71% | 🔴 -2.8% | 0.1969 |
| fav | 397 | 55% | 🔴 -4.5% | 0.2461 |
| toss_up | 28 | 50% | 🟢 +12.0% | 0.2533 |
| dog | 16 | 44% | 🟢 +40.3% | 0.2533 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 24 | 36.2% | 37.5% | ⚪ +1.3% |
| [0.4–0.5] | 39 | 46.9% | 61.5% | 🟢 +14.7% |
| [0.5–0.6] | 339 | 54.3% | 54.0% | ⚪ -0.3% |
| [0.6–0.7] | 73 | 63.4% | 61.6% | ⚪ -1.7% |
| [0.7–0.8] | 11 | 73.4% | 100.0% | 🟢 +26.6% |
| [0.8–0.9] | 3 | 85.2% | 66.7% | 🔴 -18.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 380 | 55% | 🔴 -5.6% | 0.2446 |
| `wnba` | 26 | 77% | 🟢 +13.2% | 0.2018 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `chn.1` | 10 | 80% | 🟢 +90.8% | 0.2689 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `esp.2` | 9 | 67% | 🟢 +7.3% | 0.1828 |
| `nhl` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `nba` | 7 | 57% | 🔴 -5.6% | 0.2515 |
| `allsvenskan` | 6 | 17% | 🔴 -46.7% | 0.2172 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
