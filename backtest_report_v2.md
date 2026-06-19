# Backtest ROI — VRAI modèle (v2)

Généré : 2026-06-19T08:56:38Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 396 picks sur 2026-05-24T15:00Z → 2026-06-18T02:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 99.11u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **396 picks** · 227 gagnés / 169 perdus · WR **57.3%**
- ROI flat (1u/pick) : **+0.36%** (+1.43u cumulé)
- Kelly 0.25× cap 10% : cumulé **-0.89u**
- Cote moyenne : 1.79 · Pick prob moyenne : 54.4%
- **Brier** : 0.2385 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.669 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **991.07€** (-0.9%) · DD max 12.3% · Sharpe/pick -0.001

## Séries

- Streak courante : 🔥 **5** wins consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **6**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 6 picks (2026-06-10T22:35Z → 2026-06-10T23:40Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 1 | 0% | 0–79% | 🔴 -100.0% | -2.56u | 0.2743 | +5.4pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 395 | 57% | 53–62% | 🟢 +0.6% | +1.66u | 0.2384 | -2.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 1 | 0.524 | 0.524 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 395 | 0.039 | 0.257 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 296 | 57% | 🔴 -1.7% | -2.56u | 0.2427 |
| football | 68 | 47% | 🔴 -0.1% | +1.66u | 0.241 |
| basketball | 24 | 79% | 🟢 +17.7% | +0.00u | 0.1818 |
| hockey | 8 | 75% | 🟢 +28.5% | +0.00u | 0.2336 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 296 | 57% | 🔴 -1.7% | 0.2427 |
| `football:other` | 62 | 45% | 🔴 -2.2% | 0.237 |
| `basketball:all` | 24 | 79% | 🟢 +17.7% | 0.1818 |
| `hockey:all` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `football:top5` | 6 | 67% | 🟢 +21.8% | 0.2822 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 39 | 77% | 🟢 +5.8% | 0.1699 |
| fav | 317 | 57% | 🔴 -1.3% | 0.2466 |
| toss_up | 26 | 42% | 🔴 -5.6% | 0.2387 |
| dog | 14 | 43% | 🟢 +33.6% | 0.2473 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 21 | 36.6% | 28.6% | 🔴 -8.0% |
| [0.4–0.5] | 38 | 46.5% | 65.8% | 🟢 +19.3% |
| [0.5–0.6] | 272 | 54.3% | 55.1% | ⚪ +0.9% |
| [0.6–0.7] | 55 | 63.6% | 65.5% | ⚪ +1.9% |
| [0.7–0.8] | 8 | 74.3% | 100.0% | 🟢 +25.7% |
| [0.8–0.9] | 2 | 84.7% | 100.0% | 🟢 +15.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 296 | 57% | 🔴 -1.7% | 0.2427 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `wnba` | 17 | 88% | 🟢 +27.3% | 0.1531 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `esp.2` | 8 | 75% | 🟢 +20.7% | 0.1767 |
| `nhl` | 8 | 75% | 🟢 +28.5% | 0.2336 |
| `nba` | 7 | 57% | 🔴 -5.6% | 0.2515 |
| `allsvenskan` | 6 | 17% | 🔴 -46.7% | 0.2172 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `ita.1` | 5 | 60% | 🔴 -4.8% | 0.2735 |
