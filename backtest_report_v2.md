# Backtest ROI — VRAI modèle (v2)

Généré : 2026-06-21T08:19:56Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 424 picks sur 2026-05-24T15:00Z → 2026-06-20T20:10Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 86.38u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **424 picks** · 244 gagnés / 180 perdus · WR **57.5%**
- ROI flat (1u/pick) : **+0.20%** (+0.86u cumulé)
- Kelly 0.25× cap 10% : cumulé **-13.62u**
- Cote moyenne : 1.79 · Pick prob moyenne : 54.5%
- **Brier** : 0.2376 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6672 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **863.84€** (-13.6%) · DD max 21.0% · Sharpe/pick -0.048

## Séries

- Streak courante : 🔥 **3** wins consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **6**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 6 picks (2026-06-10T22:35Z → 2026-06-10T23:40Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 8 | 38% | 14–69% | 🔴 -28.1% | -10.44u | 0.2816 | +4.8pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 416 | 58% | 53–63% | 🟢 +0.8% | -3.18u | 0.2368 | -3.0pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 8 | 0.1895 | 0.611 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 416 | 0.0443 | 0.261 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 320 | 58% | 🔴 -1.2% | -10.44u | 0.2426 |
| football | 69 | 45% | 🔴 -5.2% | -3.18u | 0.2378 |
| basketball | 27 | 81% | 🟢 +22.2% | +0.00u | 0.1793 |
| hockey | 8 | 75% | 🟢 +28.5% | +0.00u | 0.2336 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 320 | 58% | 🔴 -1.2% | 0.2426 |
| `football:other` | 63 | 44% | 🔴 -3.7% | 0.2369 |
| `basketball:all` | 27 | 81% | 🟢 +22.2% | 0.1793 |
| `hockey:all` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `football:top5` | 6 | 50% | 🔴 -20.7% | 0.2468 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 44 | 77% | 🟢 +6.5% | 0.1721 |
| fav | 337 | 57% | 🔴 -0.5% | 0.2462 |
| toss_up | 28 | 39% | 🔴 -14.2% | 0.2367 |
| dog | 15 | 40% | 🟢 +24.7% | 0.2384 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 22 | 36.4% | 27.3% | 🔴 -9.2% |
| [0.4–0.5] | 39 | 46.7% | 61.5% | 🟢 +14.8% |
| [0.5–0.6] | 292 | 54.3% | 56.5% | ⚪ +2.2% |
| [0.6–0.7] | 60 | 63.6% | 63.3% | ⚪ -0.2% |
| [0.7–0.8] | 9 | 73.9% | 100.0% | 🟢 +26.1% |
| [0.8–0.9] | 2 | 84.7% | 100.0% | 🟢 +15.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 320 | 58% | 🔴 -1.2% | 0.2426 |
| `wnba` | 20 | 90% | 🟢 +31.9% | 0.154 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `esp.2` | 9 | 67% | 🟢 +7.3% | 0.1828 |
| `nhl` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `nba` | 7 | 57% | 🔴 -5.6% | 0.2515 |
| `allsvenskan` | 6 | 17% | 🔴 -46.7% | 0.2172 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `ita.1` | 5 | 60% | 🔴 -4.8% | 0.2735 |
