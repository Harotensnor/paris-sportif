# Backtest ROI — VRAI modèle (v2)

Généré : 2026-06-29T08:47:45Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 517 picks sur 2026-05-24T21:00Z → 2026-06-28T23:20Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 102.03u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **517 picks** · 293 gagnés / 224 perdus · WR **56.7%**
- ROI flat (1u/pick) : **-1.01%** (-5.22u cumulé)
- Kelly 0.25× cap 10% : cumulé **+2.03u**
- Cote moyenne : 1.78 · Pick prob moyenne : 54.8%
- **Brier** : 0.241 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6746 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1020.34€** (+2.0%) · DD max 12.8% · Sharpe/pick +0.009

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
| `standard` | 4 | 0% | 0–49% | 🔴 -100.0% | -9.20u | 0.3215 | +4.6pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 513 | 57% | 53–61% | 🔴 -0.2% | +11.23u | 0.2403 | -2.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 4 | 0.567 | 0.567 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 513 | 0.026 | 0.267 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 405 | 55% | 🔴 -5.6% | -9.20u | 0.245 |
| football | 69 | 51% | 🟢 +11.8% | +11.23u | 0.2432 |
| basketball | 35 | 80% | 🟢 +20.0% | +0.00u | 0.1918 |
| hockey | 8 | 75% | 🟢 +28.5% | +0.00u | 0.2336 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 405 | 55% | 🔴 -5.6% | 0.245 |
| `football:other` | 69 | 51% | 🟢 +11.8% | 0.2432 |
| `basketball:all` | 35 | 80% | 🟢 +20.0% | 0.1918 |
| `hockey:all` | 8 | 75% | 🟢 +28.5% | 0.2336 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 51 | 73% | 🔴 -0.3% | 0.1899 |
| fav | 423 | 56% | 🔴 -3.8% | 0.2458 |
| toss_up | 28 | 50% | 🟢 +13.4% | 0.2499 |
| dog | 15 | 47% | 🟢 +49.7% | 0.2606 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 24 | 36.3% | 37.5% | ⚪ +1.2% |
| [0.4–0.5] | 44 | 47.1% | 59.1% | 🟢 +12.0% |
| [0.5–0.6] | 359 | 54.3% | 54.6% | ⚪ +0.3% |
| [0.6–0.7] | 75 | 63.4% | 64.0% | ⚪ +0.6% |
| [0.7–0.8] | 12 | 73.3% | 100.0% | 🟢 +26.7% |
| [0.8–0.9] | 3 | 85.2% | 66.7% | 🔴 -18.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 405 | 55% | 🔴 -5.6% | 0.245 |
| `wnba` | 28 | 86% | 🟢 +26.4% | 0.1769 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `chn.1` | 12 | 75% | 🟢 +80.2% | 0.2586 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `esp.2` | 9 | 67% | 🟢 +7.3% | 0.1828 |
| `nhl` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `nba` | 7 | 57% | 🔴 -5.6% | 0.2515 |
| `allsvenskan` | 6 | 17% | 🔴 -46.7% | 0.2172 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
