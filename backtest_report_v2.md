# Backtest ROI — VRAI modèle (v2)

Généré : 2026-05-31T07:37:03Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 146 picks sur 2026-05-24T05:00Z → 2026-05-30T20:10Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 132.74u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **146 picks** · 81 gagnés / 65 perdus · WR **55.5%**
- ROI flat (1u/pick) : **+4.57%** (+6.67u cumulé)
- Kelly 0.25× cap 10% : cumulé **+32.74u**
- Cote moyenne : 1.90 · Pick prob moyenne : 53.6%
- **Brier** : 0.2472 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6873 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1327.40€** (+32.7%) · DD max 7.4% · Sharpe/pick +0.162

## Séries

- Streak courante : ❄️ **4** loses consécutifs
- Plus longue série gagnante : **8**
- Plus longue série perdante : **6**
- Top run win : 8 picks (2026-05-26T23:07Z → 2026-05-27T01:40Z)
- Top run lose : 6 picks (2026-05-24T05:00Z → 2026-05-24T11:35Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 13 | 62% | 36–82% | 🟢 +15.1% | +13.82u | 0.2235 | +5.1pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 133 | 55% | 46–63% | 🟢 +3.5% | +18.92u | 0.2495 | -2.3pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 13 | 0.0279 | 0.043 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 133 | 0.0663 | 0.16 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 75 | 57% | 🟢 +0.0% | +14.28u | 0.2357 |
| football | 59 | 49% | 🟢 +8.7% | +18.46u | 0.271 |
| basketball | 9 | 78% | 🟢 +13.6% | +0.00u | 0.1931 |
| hockey | 3 | 67% | 🟢 +9.7% | +0.00u | 0.2302 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 75 | 57% | 🟡 +0.0% | 0.2357 |
| `football:other` | 44 | 45% | 🟡 +3.4% | 0.2678 |
| `football:top5` | 15 | 60% | 🟢 +24.3% | 0.2801 |
| `basketball:all` | 9 | 78% | 🟢 +13.6% | 0.1931 |
| `hockey:all` | 3 | 67% | 🟢 +9.7% | 0.2302 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 19 | 63% | 🔴 -12.2% | 0.2251 |
| fav | 96 | 55% | 🔴 -3.1% | 0.2487 |
| toss_up | 20 | 50% | 🟢 +15.8% | 0.2389 |
| dog | 11 | 55% | 🟢 +80.0% | 0.2871 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 17 | 35.4% | 41.2% | 🟢 +5.7% |
| [0.4–0.5] | 18 | 45.1% | 61.1% | 🟢 +16.0% |
| [0.5–0.6] | 76 | 54.4% | 56.6% | ⚪ +2.2% |
| [0.6–0.7] | 31 | 63.8% | 54.8% | 🔴 -8.9% |
| [0.7–0.8] | 3 | 73.4% | 66.7% | 🔴 -6.7% |
| [0.8–0.9] | 1 | 84.4% | 100.0% | 🟢 +15.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 75 | 57% | 🟢 +0.0% | 0.2357 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `eng.1` | 8 | 50% | 🟢 +24.3% | 0.3013 |
| `jleague` | 8 | 88% | 🟢 +133.1% | 0.3499 |
| `chn.1` | 7 | 14% | 🔴 -67.1% | 0.3153 |
| `ita.1` | 6 | 67% | 🟢 +3.4% | 0.2529 |
| `wnba` | 6 | 67% | 🔴 -10.7% | 0.1983 |
| `allsvenskan` | 5 | 40% | 🔴 -1.7% | 0.2904 |
| `laliga2` | 3 | 0% | 🔴 -100.0% | 0.1412 |
| `nba` | 3 | 100% | 🟢 +62.1% | 0.1828 |
