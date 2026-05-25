# Backtest ROI — VRAI modèle (v2)

Généré : 2026-05-25T08:10:03Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 62 picks sur 2026-05-23T17:00Z → 2026-05-24T21:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 120.47u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **62 picks** · 33 gagnés / 29 perdus · WR **53.2%**
- ROI flat (1u/pick) : **-1.58%** (-0.98u cumulé)
- Kelly 0.25× cap 10% : cumulé **+20.47u**
- Cote moyenne : 1.87 · Pick prob moyenne : 54.4%
- **Brier** : 0.257 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.7087 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1204.69€** (+20.5%) · DD max 3.9% · Sharpe/pick +0.234

## Séries

- Streak courante : 🔥 **2** wins consécutifs
- Plus longue série gagnante : **7**
- Plus longue série perdante : **6**
- Top run win : 7 picks (2026-05-24T16:00Z → 2026-05-24T17:40Z)
- Top run lose : 6 picks (2026-05-24T05:00Z → 2026-05-24T11:35Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 3 | 100% | 44–100% | 🟢 +120.3% | +11.64u | 0.2285 | +6.8pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 59 | 51% | 38–63% | 🔴 -7.8% | +8.83u | 0.2584 | -2.6pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 3 | 0.478 | 0.478 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 59 | 0.153 | 0.72 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 32 | 44% | 🔴 -15.3% | +8.83u | 0.2639 |
| baseball | 25 | 60% | 🟢 +7.8% | +8.08u | 0.251 |
| basketball | 4 | 75% | 🟢 +37.1% | +3.56u | 0.2592 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 25 | 60% | 🟢 +7.8% | 0.251 |
| `football:other` | 17 | 29% | 🔴 -50.3% | 0.2496 |
| `football:top5` | 15 | 60% | 🟢 +24.3% | 0.2801 |
| `basketball:all` | 4 | 75% | 🟢 +37.1% | 0.2592 |
| `hockey:all` | 1 | 100% | 🟢 +48.8% | 0.1754 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 13 | 46% | 🔴 -33.3% | 0.2958 |
| fav | 37 | 57% | 🔴 -0.2% | 0.2578 |
| toss_up | 8 | 62% | 🟢 +45.8% | 0.2213 |
| dog | 4 | 25% | 🔴 -6.2% | 0.195 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 6 | 34.7% | 16.7% | 🔴 -18.0% |
| [0.4–0.5] | 7 | 46.0% | 42.9% | ⚪ -3.1% |
| [0.5–0.6] | 30 | 53.8% | 70.0% | 🟢 +16.2% |
| [0.6–0.7] | 18 | 64.4% | 44.4% | 🔴 -19.9% |
| [0.7–0.8] | 1 | 72.0% | 0.0% | 🔴 -72.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 25 | 60% | 🟢 +7.8% | 0.251 |
| `eng.1` | 8 | 50% | 🟢 +24.3% | 0.3013 |
| `ita.1` | 6 | 67% | 🟢 +3.4% | 0.2529 |
| `chn.1` | 5 | 0% | 🔴 -100.0% | 0.3478 |
| `usa.1` | 3 | 67% | 🟢 +10.1% | 0.1954 |
| `wnba` | 3 | 67% | 🟢 +8.1% | 0.2651 |
| `allsvenskan` | 2 | 50% | 🔴 -14.3% | 0.3026 |
| `esp.2` | 2 | 50% | 🔴 -2.4% | 0.3226 |
| `jpn.1` | 2 | 0% | 🔴 -100.0% | 0.124 |
