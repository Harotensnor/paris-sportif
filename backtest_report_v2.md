# Backtest ROI — VRAI modèle (v2)

Généré : 2026-06-06T06:45:11Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 223 picks sur 2026-05-24T11:00Z → 2026-06-05T18:20Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 124.06u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **223 picks** · 120 gagnés / 103 perdus · WR **53.8%**
- ROI flat (1u/pick) : **-2.59%** (-5.77u cumulé)
- Kelly 0.25× cap 10% : cumulé **+24.06u**
- Cote moyenne : 1.85 · Pick prob moyenne : 54.0%
- **Brier** : 0.2453 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6833 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1240.65€** (+24.1%) · DD max 4.1% · Sharpe/pick +0.099

## Séries

- Streak courante : ❄️ **1** loses consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **4**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 4 picks (2026-05-24T18:10Z → 2026-05-24T18:45Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 2 | 50% | 9–91% | 🟢 +20.0% | +5.20u | 0.3159 | +7.4pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 221 | 54% | 47–60% | 🔴 -2.8% | +18.86u | 0.2447 | -2.6pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 2 | 0.5545 | 0.646 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 221 | 0.0358 | 0.158 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 137 | 54% | 🔴 -8.2% | -2.00u | 0.2449 |
| football | 70 | 50% | 🟢 +5.5% | +18.86u | 0.252 |
| basketball | 11 | 73% | 🟢 +7.9% | +0.00u | 0.2052 |
| hockey | 5 | 60% | 🟢 +13.8% | +7.20u | 0.2501 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 137 | 54% | 🔴 -8.2% | 0.2449 |
| `football:other` | 55 | 47% | 🟡 +0.4% | 0.2448 |
| `football:top5` | 15 | 60% | 🟢 +24.3% | 0.2785 |
| `basketball:all` | 11 | 73% | 🟢 +7.9% | 0.2052 |
| `hockey:all` | 5 | 60% | 🟢 +13.8% | 0.2501 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 29 | 69% | 🔴 -3.2% | 0.2065 |
| fav | 159 | 53% | 🔴 -8.3% | 0.2536 |
| toss_up | 20 | 45% | 🟢 +4.2% | 0.2269 |
| dog | 15 | 47% | 🟢 +49.7% | 0.2576 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 22 | 36.1% | 31.8% | ⚪ -4.3% |
| [0.4–0.5] | 21 | 46.1% | 61.9% | 🟢 +15.8% |
| [0.5–0.6] | 137 | 54.4% | 54.7% | ⚪ +0.3% |
| [0.6–0.7] | 37 | 64.2% | 54.1% | 🔴 -10.2% |
| [0.7–0.8] | 5 | 72.9% | 80.0% | 🟢 +7.1% |
| [0.8–0.9] | 1 | 84.4% | 100.0% | 🟢 +15.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 137 | 54% | 🔴 -8.2% | 0.2449 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `esp.2` | 9 | 78% | 🟢 +29.0% | 0.1981 |
| `allsvenskan` | 8 | 25% | 🔴 -38.6% | 0.2385 |
| `chn.1` | 8 | 25% | 🔴 -35.6% | 0.3103 |
| `eng.1` | 8 | 50% | 🟢 +24.3% | 0.3013 |
| `jpn.1` | 8 | 62% | 🟢 +69.4% | 0.2953 |
| `wnba` | 7 | 71% | 🟢 +0.0% | 0.1955 |
| `ita.1` | 6 | 67% | 🟢 +3.4% | 0.2489 |
| `nhl` | 5 | 60% | 🟢 +13.8% | 0.2501 |
