# Backtest ROI — VRAI modèle (v2)

Généré : 2026-06-05T07:58:06Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 222 picks sur 2026-05-24T11:00Z → 2026-06-05T00:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 123.44u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **222 picks** · 120 gagnés / 102 perdus · WR **54.1%**
- ROI flat (1u/pick) : **-2.24%** (-4.97u cumulé)
- Kelly 0.25× cap 10% : cumulé **+23.44u**
- Cote moyenne : 1.85 · Pick prob moyenne : 53.9%
- **Brier** : 0.2444 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6813 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1234.44€** (+23.4%) · DD max 4.1% · Sharpe/pick +0.104

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **4**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 4 picks (2026-05-24T18:10Z → 2026-05-24T18:45Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 1 | 100% | 21–100% | 🟢 +120.0% | +4.68u | 0.212 | +8.5pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 221 | 54% | 47–60% | 🔴 -2.8% | +18.77u | 0.2445 | -2.7pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 1 | 0.46 | 0.46 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 221 | 0.033 | 0.161 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 136 | 54% | 🔴 -7.5% | +0.00u | 0.2435 |
| football | 70 | 50% | 🟢 +5.5% | +18.77u | 0.2524 |
| basketball | 11 | 73% | 🟢 +7.9% | +0.00u | 0.2021 |
| hockey | 5 | 60% | 🟢 +9.8% | +4.68u | 0.2496 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 136 | 54% | 🔴 -7.5% | 0.2435 |
| `football:other` | 55 | 47% | 🟡 +0.4% | 0.2448 |
| `football:top5` | 15 | 60% | 🟢 +24.3% | 0.2801 |
| `basketball:all` | 11 | 73% | 🟢 +7.9% | 0.2021 |
| `hockey:all` | 5 | 60% | 🟢 +9.8% | 0.2496 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 30 | 67% | 🔴 -6.4% | 0.2088 |
| fav | 157 | 54% | 🔴 -7.1% | 0.2521 |
| toss_up | 20 | 45% | 🟢 +3.2% | 0.2267 |
| dog | 15 | 47% | 🟢 +49.7% | 0.2576 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 22 | 36.1% | 31.8% | ⚪ -4.3% |
| [0.4–0.5] | 21 | 45.8% | 61.9% | 🟢 +16.1% |
| [0.5–0.6] | 138 | 54.4% | 54.3% | ⚪ -0.1% |
| [0.6–0.7] | 36 | 64.5% | 58.3% | 🔴 -6.1% |
| [0.7–0.8] | 4 | 73.6% | 75.0% | ⚪ +1.4% |
| [0.8–0.9] | 1 | 84.4% | 100.0% | 🟢 +15.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 136 | 54% | 🔴 -7.5% | 0.2435 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `esp.2` | 9 | 78% | 🟢 +29.0% | 0.1981 |
| `allsvenskan` | 8 | 25% | 🔴 -38.6% | 0.2385 |
| `chn.1` | 8 | 25% | 🔴 -35.6% | 0.3103 |
| `eng.1` | 8 | 50% | 🟢 +24.3% | 0.3013 |
| `jpn.1` | 8 | 62% | 🟢 +69.4% | 0.2953 |
| `wnba` | 7 | 71% | 🟢 +0.0% | 0.1955 |
| `ita.1` | 6 | 67% | 🟢 +3.4% | 0.2529 |
| `nhl` | 5 | 60% | 🟢 +9.8% | 0.2496 |
