# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-07T07:26:15Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 591 picks sur 2026-05-25T19:40Z → 2026-07-06T18:10Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 116.53u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **591 picks** · 343 gagnés / 248 perdus · WR **58.0%**
- ROI flat (1u/pick) : **+0.71%** (+4.20u cumulé)
- Kelly 0.25× cap 10% : cumulé **+16.53u**
- Cote moyenne : 1.76 · Pick prob moyenne : 55.0%
- **Brier** : 0.2397 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6721 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1165.27€** (+16.5%) · DD max 6.9% · Sharpe/pick +0.044

## Séries

- Streak courante : ❄️ **5** loses consécutifs
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
| `skip` | 591 | 58% | 54–62% | 🟢 +0.7% | +16.53u | 0.2397 | -2.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 591 | 0.039 | 0.267 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 480 | 57% | 🔴 -2.6% | +0.00u | 0.2436 |
| football | 70 | 53% | 🟢 +12.4% | +16.53u | 0.2358 |
| basketball | 34 | 76% | 🟢 +13.8% | +0.00u | 0.197 |
| hockey | 7 | 86% | 🟢 +46.8% | +0.00u | 0.2194 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 480 | 57% | 🔴 -2.6% | 0.2436 |
| `football:other` | 70 | 53% | 🟢 +12.4% | 0.2358 |
| `basketball:all` | 34 | 76% | 🟢 +13.8% | 0.197 |
| `hockey:all` | 7 | 86% | 🟢 +46.8% | 0.2194 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 58 | 71% | 🔴 -2.6% | 0.196 |
| fav | 490 | 57% | 🔴 -1.1% | 0.2446 |
| toss_up | 31 | 55% | 🟢 +23.9% | 0.2449 |
| dog | 12 | 42% | 🟢 +29.2% | 0.2383 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 22 | 36.7% | 27.3% | 🔴 -9.4% |
| [0.4–0.5] | 53 | 47.2% | 66.0% | 🟢 +18.8% |
| [0.5–0.6] | 410 | 54.4% | 55.6% | ⚪ +1.2% |
| [0.6–0.7] | 92 | 63.5% | 66.3% | ⚪ +2.8% |
| [0.7–0.8] | 11 | 73.3% | 100.0% | 🟢 +26.7% |
| [0.8–0.9] | 3 | 85.2% | 66.7% | 🔴 -18.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 480 | 57% | 🔴 -2.6% | 0.2436 |
| `wnba` | 28 | 82% | 🟢 +20.5% | 0.1831 |
| `chn.1` | 18 | 67% | 🟢 +43.8% | 0.2073 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `esp.2` | 9 | 78% | 🟢 +31.8% | 0.1901 |
| `nhl` | 7 | 86% | 🟢 +46.8% | 0.2194 |
| `allsvenskan` | 6 | 17% | 🔴 -68.2% | 0.1911 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `nba` | 6 | 50% | 🔴 -17.3% | 0.2622 |
| `eliteserien` | 5 | 80% | 🟢 +67.1% | 0.2593 |
