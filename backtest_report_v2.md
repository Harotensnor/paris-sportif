# Backtest ROI — VRAI modèle (v2)

Généré : 2026-05-27T07:54:54Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 77 picks sur 2026-05-23T20:30Z → 2026-05-26T02:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 123.34u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **77 picks** · 39 gagnés / 38 perdus · WR **50.6%**
- ROI flat (1u/pick) : **-6.49%** (-4.99u cumulé)
- Kelly 0.25× cap 10% : cumulé **+23.34u**
- Cote moyenne : 1.89 · Pick prob moyenne : 54.2%
- **Brier** : 0.2535 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.7005 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1233.39€** (+23.3%) · DD max 3.9% · Sharpe/pick +0.214

## Séries

- Streak courante : 🔥 **5** wins consécutifs
- Plus longue série gagnante : **5**
- Plus longue série perdante : **6**
- Top run win : 5 picks (2026-05-24T18:45Z → 2026-05-24T19:00Z)
- Top run lose : 6 picks (2026-05-24T05:00Z → 2026-05-24T11:35Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 3 | 100% | 44–100% | 🟢 +114.7% | +11.94u | 0.2136 | +7.1pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 74 | 49% | 38–60% | 🔴 -11.4% | +11.40u | 0.2552 | -2.5pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 3 | 0.462 | 0.462 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 74 | 0.1174 | 0.72 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 39 | 41% | 🔴 -16.0% | +11.35u | 0.2633 |
| baseball | 29 | 62% | 🟢 +10.1% | +11.98u | 0.2449 |
| basketball | 6 | 50% | 🔴 -29.8% | +0.00u | 0.2479 |
| hockey | 3 | 67% | 🟢 +4.4% | +0.00u | 0.2219 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 29 | 62% | 🟢 +10.1% | 0.2449 |
| `football:other` | 24 | 29% | 🔴 -41.2% | 0.2539 |
| `football:top5` | 15 | 60% | 🟢 +24.3% | 0.2782 |
| `basketball:all` | 6 | 50% | 🔴 -29.8% | 0.2479 |
| `hockey:all` | 3 | 67% | 🟡 +4.4% | 0.2219 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 16 | 56% | 🔴 -21.6% | 0.2608 |
| fav | 43 | 51% | 🔴 -9.8% | 0.2658 |
| toss_up | 12 | 50% | 🟢 +14.5% | 0.2169 |
| dog | 6 | 33% | 🟢 +15.8% | 0.2193 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 9 | 35.0% | 22.2% | 🔴 -12.8% |
| [0.4–0.5] | 10 | 45.0% | 50.0% | 🟢 +5.0% |
| [0.5–0.6] | 35 | 54.3% | 62.9% | 🟢 +8.6% |
| [0.6–0.7] | 21 | 64.5% | 42.9% | 🔴 -21.7% |
| [0.7–0.8] | 1 | 72.0% | 0.0% | 🔴 -72.0% |
| [0.8–0.9] | 1 | 84.4% | 100.0% | 🟢 +15.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 29 | 62% | 🟢 +10.1% | 0.2449 |
| `eng.1` | 8 | 50% | 🟢 +24.3% | 0.2978 |
| `ita.1` | 6 | 67% | 🟢 +3.4% | 0.2529 |
| `chn.1` | 5 | 0% | 🔴 -100.0% | 0.3478 |
| `eliteserien` | 5 | 20% | 🔴 -55.0% | 0.248 |
| `allsvenskan` | 4 | 50% | 🟢 +22.9% | 0.2896 |
| `wnba` | 4 | 50% | 🔴 -35.8% | 0.2465 |
| `nhl` | 3 | 67% | 🟢 +4.4% | 0.2219 |
| `esp.2` | 2 | 50% | 🔴 -2.4% | 0.3226 |
| `jpn.1` | 2 | 0% | 🔴 -100.0% | 0.124 |
