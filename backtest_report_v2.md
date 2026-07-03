# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-03T06:52:39Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 554 picks sur 2026-05-25T12:30Z → 2026-07-02T19:10Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 117.19u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **554 picks** · 320 gagnés / 234 perdus · WR **57.8%**
- ROI flat (1u/pick) : **+0.86%** (+4.77u cumulé)
- Kelly 0.25× cap 10% : cumulé **+17.19u**
- Cote moyenne : 1.77 · Pick prob moyenne : 54.8%
- **Brier** : 0.2404 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6735 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1171.90€** (+17.2%) · DD max 6.9% · Sharpe/pick +0.053

## Séries

- Streak courante : ❄️ **4** loses consécutifs
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
| `skip` | 554 | 58% | 54–62% | 🟢 +0.9% | +17.19u | 0.2404 | -2.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 554 | 0.0314 | 0.268 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 446 | 57% | 🔴 -3.1% | +0.00u | 0.2436 |
| football | 68 | 51% | 🟢 +14.3% | +17.19u | 0.2453 |
| basketball | 33 | 79% | 🟢 +17.3% | +0.00u | 0.1915 |
| hockey | 7 | 86% | 🟢 +46.8% | +0.00u | 0.2194 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 446 | 57% | 🔴 -3.1% | 0.2436 |
| `football:other` | 68 | 51% | 🟢 +14.3% | 0.2453 |
| `basketball:all` | 33 | 79% | 🟢 +17.3% | 0.1915 |
| `hockey:all` | 7 | 86% | 🟢 +46.8% | 0.2194 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 54 | 72% | 🔴 -0.5% | 0.1919 |
| fav | 457 | 57% | 🔴 -1.8% | 0.2446 |
| toss_up | 29 | 52% | 🟢 +17.1% | 0.2502 |
| dog | 14 | 50% | 🟢 +60.4% | 0.2695 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 23 | 36.2% | 39.1% | ⚪ +2.9% |
| [0.4–0.5] | 49 | 46.9% | 61.2% | 🟢 +14.3% |
| [0.5–0.6] | 383 | 54.3% | 55.1% | ⚪ +0.8% |
| [0.6–0.7] | 85 | 63.3% | 67.1% | ⚪ +3.7% |
| [0.7–0.8] | 11 | 73.2% | 100.0% | 🟢 +26.8% |
| [0.8–0.9] | 3 | 85.2% | 66.7% | 🔴 -18.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 446 | 57% | 🔴 -3.1% | 0.2436 |
| `wnba` | 27 | 85% | 🟢 +25.0% | 0.1758 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `chn.1` | 12 | 75% | 🟢 +80.2% | 0.2586 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `esp.2` | 9 | 78% | 🟢 +31.8% | 0.1901 |
| `nhl` | 7 | 86% | 🟢 +46.8% | 0.2194 |
| `allsvenskan` | 6 | 17% | 🔴 -46.7% | 0.2172 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `nba` | 6 | 50% | 🔴 -17.3% | 0.2622 |
