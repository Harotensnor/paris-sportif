# Backtest ROI — VRAI modèle (v2)

Généré : 2026-06-20T07:40:33Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 401 picks sur 2026-05-24T15:00Z → 2026-06-19T18:20Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 98.54u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **401 picks** · 231 gagnés / 170 perdus · WR **57.6%**
- ROI flat (1u/pick) : **+0.56%** (+2.24u cumulé)
- Kelly 0.25× cap 10% : cumulé **-1.46u**
- Cote moyenne : 1.79 · Pick prob moyenne : 54.5%
- **Brier** : 0.2377 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6673 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **985.40€** (-1.5%) · DD max 10.0% · Sharpe/pick -0.003

## Séries

- Streak courante : 🔥 **4** wins consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **6**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 6 picks (2026-06-10T22:35Z → 2026-06-10T23:40Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 1 | 100% | 21–100% | 🟢 +74.0% | +1.40u | 0.1546 | +3.2pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 400 | 57% | 53–62% | 🟢 +0.4% | -2.86u | 0.2379 | -2.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 1 | 0.393 | 0.393 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 400 | 0.0406 | 0.257 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 300 | 58% | 🔴 -0.7% | +1.40u | 0.2423 |
| football | 68 | 46% | 🔴 -3.8% | -2.86u | 0.2379 |
| basketball | 25 | 80% | 🟢 +18.8% | +0.00u | 0.1833 |
| hockey | 8 | 75% | 🟢 +28.5% | +0.00u | 0.2336 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 300 | 58% | 🔴 -0.7% | 0.2423 |
| `football:other` | 62 | 45% | 🔴 -2.2% | 0.237 |
| `basketball:all` | 25 | 80% | 🟢 +18.8% | 0.1833 |
| `hockey:all` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `football:top5` | 6 | 50% | 🔴 -20.7% | 0.2468 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 41 | 76% | 🟢 +4.2% | 0.1766 |
| fav | 321 | 57% | 🔴 -0.4% | 0.2458 |
| toss_up | 24 | 42% | 🔴 -8.3% | 0.2336 |
| dog | 15 | 40% | 🟢 +24.7% | 0.2384 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 22 | 36.4% | 27.3% | 🔴 -9.2% |
| [0.4–0.5] | 37 | 46.6% | 64.9% | 🟢 +18.2% |
| [0.5–0.6] | 274 | 54.2% | 55.8% | ⚪ +1.6% |
| [0.6–0.7] | 58 | 63.5% | 65.5% | ⚪ +2.0% |
| [0.7–0.8] | 8 | 74.3% | 100.0% | 🟢 +25.7% |
| [0.8–0.9] | 2 | 84.7% | 100.0% | 🟢 +15.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 300 | 58% | 🔴 -0.7% | 0.2423 |
| `wnba` | 18 | 89% | 🟢 +28.4% | 0.1567 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `esp.2` | 8 | 75% | 🟢 +20.7% | 0.1767 |
| `nhl` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `nba` | 7 | 57% | 🔴 -5.6% | 0.2515 |
| `allsvenskan` | 6 | 17% | 🔴 -46.7% | 0.2172 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `ita.1` | 5 | 60% | 🔴 -4.8% | 0.2735 |
