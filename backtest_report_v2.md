# Backtest ROI — VRAI modèle (v2)

Généré : 2026-06-14T08:06:11Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 328 picks sur 2026-05-24T15:00Z → 2026-06-13T20:10Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 119.08u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **328 picks** · 183 gagnés / 145 perdus · WR **55.8%**
- ROI flat (1u/pick) : **-0.90%** (-2.96u cumulé)
- Kelly 0.25× cap 10% : cumulé **+19.08u**
- Cote moyenne : 1.82 · Pick prob moyenne : 54.0%
- **Brier** : 0.2406 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6735 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1190.78€** (+19.1%) · DD max 14.1% · Sharpe/pick +0.062

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **6**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 6 picks (2026-06-10T22:35Z → 2026-06-10T23:40Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 1 | 100% | 21–100% | 🟢 +79.4% | +4.41u | 0.118 | +9.9pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 10 | 60% | 31–83% | 🟢 +17.0% | +8.63u | 0.2253 | +6.8pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 317 | 56% | 50–61% | 🔴 -1.7% | +6.04u | 0.2415 | -3.0pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 1 | 0.343 | 0.343 | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 10 | 0.1286 | 0.395 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 317 | 0.0397 | 0.27 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 239 | 56% | 🔴 -3.8% | +12.20u | 0.2422 |
| football | 65 | 49% | 🟢 +4.6% | +6.88u | 0.2411 |
| basketball | 16 | 69% | 🟢 +5.4% | +0.00u | 0.2174 |
| hockey | 8 | 75% | 🟢 +28.5% | +0.00u | 0.2336 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 239 | 56% | 🔴 -3.8% | 0.2422 |
| `football:other` | 59 | 47% | 🟡 +2.8% | 0.2369 |
| `basketball:all` | 16 | 69% | 🟢 +5.4% | 0.2174 |
| `hockey:all` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `football:top5` | 6 | 67% | 🟢 +21.8% | 0.2822 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 30 | 77% | 🟢 +6.8% | 0.1816 |
| fav | 256 | 55% | 🔴 -4.1% | 0.2469 |
| toss_up | 28 | 46% | 🟢 +2.6% | 0.2426 |
| dog | 14 | 43% | 🟢 +33.6% | 0.2473 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 21 | 36.6% | 28.6% | 🔴 -8.0% |
| [0.4–0.5] | 35 | 46.5% | 65.7% | 🟢 +19.2% |
| [0.5–0.6] | 221 | 54.3% | 54.3% | ⚪ -0.0% |
| [0.6–0.7] | 44 | 63.3% | 61.4% | ⚪ -1.9% |
| [0.7–0.8] | 6 | 73.0% | 100.0% | 🟢 +27.0% |
| [0.8–0.9] | 1 | 84.4% | 100.0% | 🟢 +15.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 239 | 56% | 🔴 -3.8% | 0.2422 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `wnba` | 9 | 78% | 🟢 +14.0% | 0.1908 |
| `nhl` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `esp.2` | 7 | 86% | 🟢 +38.0% | 0.1635 |
| `nba` | 7 | 57% | 🔴 -5.6% | 0.2515 |
| `allsvenskan` | 6 | 17% | 🔴 -46.7% | 0.2172 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `ita.1` | 5 | 60% | 🔴 -4.8% | 0.2735 |
