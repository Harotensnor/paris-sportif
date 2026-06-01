# Backtest ROI — VRAI modèle (v2)

Généré : 2026-06-01T09:09:19Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 180 picks sur 2026-05-24T05:00Z → 2026-05-31T20:10Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 111.81u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **180 picks** · 99 gagnés / 81 perdus · WR **55.0%**
- ROI flat (1u/pick) : **-1.52%** (-2.73u cumulé)
- Kelly 0.25× cap 10% : cumulé **+11.81u**
- Cote moyenne : 1.88 · Pick prob moyenne : 53.2%
- **Brier** : 0.2347 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6615 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1118.12€** (+11.8%) · DD max 5.9% · Sharpe/pick +0.070

## Séries

- Streak courante : 🔥 **10** wins consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **6**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 6 picks (2026-05-24T05:00Z → 2026-05-24T11:35Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 180 | 55% | 48–62% | 🔴 -1.5% | +11.81u | 0.2347 | -2.7pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 180 | 0.0719 | 0.159 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 95 | 60% | 🟢 +2.7% | +0.00u | 0.2357 |
| football | 72 | 44% | 🔴 -10.3% | +11.81u | 0.2394 |
| basketball | 10 | 80% | 🟢 +18.7% | +0.00u | 0.1917 |
| hockey | 3 | 67% | 🟢 +9.7% | +0.00u | 0.2302 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 95 | 60% | 🟡 +2.7% | 0.2357 |
| `football:other` | 57 | 40% | 🔴 -19.5% | 0.2287 |
| `football:top5` | 15 | 60% | 🟢 +24.3% | 0.2801 |
| `basketball:all` | 10 | 80% | 🟢 +18.7% | 0.1917 |
| `hockey:all` | 3 | 67% | 🟢 +9.7% | 0.2302 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 23 | 70% | 🔴 -3.0% | 0.2027 |
| fav | 124 | 58% | 🟢 +1.1% | 0.2464 |
| toss_up | 20 | 35% | 🔴 -17.0% | 0.2169 |
| dog | 13 | 31% | 🟢 +0.4% | 0.2067 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 20 | 35.9% | 20.0% | 🔴 -15.9% |
| [0.4–0.5] | 24 | 45.4% | 54.2% | 🟢 +8.7% |
| [0.5–0.6] | 102 | 54.1% | 59.8% | 🟢 +5.7% |
| [0.6–0.7] | 29 | 64.3% | 58.6% | 🔴 -5.7% |
| [0.7–0.8] | 4 | 73.6% | 75.0% | ⚪ +1.4% |
| [0.8–0.9] | 1 | 84.4% | 100.0% | 🟢 +15.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 95 | 60% | 🟢 +2.7% | 0.2357 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `chn.1` | 9 | 22% | 🔴 -42.8% | 0.2941 |
| `esp.2` | 9 | 78% | 🟢 +29.0% | 0.1981 |
| `jleague` | 9 | 33% | 🔴 -27.3% | 0.2242 |
| `allsvenskan` | 8 | 25% | 🔴 -38.6% | 0.2385 |
| `eng.1` | 8 | 50% | 🟢 +24.3% | 0.3013 |
| `wnba` | 7 | 71% | 🟢 +0.0% | 0.1955 |
| `ita.1` | 6 | 67% | 🟢 +3.4% | 0.2529 |
| `laliga2` | 3 | 0% | 🔴 -100.0% | 0.1412 |
