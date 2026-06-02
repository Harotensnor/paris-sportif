# Backtest ROI — VRAI modèle (v2)

Généré : 2026-06-02T08:18:49Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 179 picks sur 2026-05-24T09:00Z → 2026-06-01T18:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 115.68u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **179 picks** · 101 gagnés / 78 perdus · WR **56.4%**
- ROI flat (1u/pick) : **+2.48%** (+4.43u cumulé)
- Kelly 0.25× cap 10% : cumulé **+15.68u**
- Cote moyenne : 1.89 · Pick prob moyenne : 53.2%
- **Brier** : 0.2377 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6678 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1156.84€** (+15.7%) · DD max 4.1% · Sharpe/pick +0.087

## Séries

- Streak courante : ❄️ **1** loses consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **4**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 4 picks (2026-05-24T09:00Z → 2026-05-24T11:35Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 179 | 56% | 49–63% | 🟢 +2.5% | +15.68u | 0.2377 | -2.5pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 179 | 0.0731 | 0.156 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 95 | 60% | 🟢 +2.7% | +0.00u | 0.2357 |
| football | 71 | 48% | 🔴 -0.4% | +15.68u | 0.2472 |
| basketball | 10 | 80% | 🟢 +18.7% | +0.00u | 0.1917 |
| hockey | 3 | 67% | 🟢 +9.7% | +0.00u | 0.2302 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 95 | 60% | 🟡 +2.7% | 0.2357 |
| `football:other` | 56 | 45% | 🔴 -7.0% | 0.2384 |
| `football:top5` | 15 | 60% | 🟢 +24.3% | 0.2801 |
| `basketball:all` | 10 | 80% | 🟢 +18.7% | 0.1917 |
| `hockey:all` | 3 | 67% | 🟢 +9.7% | 0.2302 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 23 | 70% | 🔴 -3.0% | 0.2027 |
| fav | 121 | 59% | 🟢 +1.9% | 0.2464 |
| toss_up | 21 | 38% | 🔴 -12.1% | 0.2209 |
| dog | 14 | 43% | 🟢 +37.9% | 0.2451 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 22 | 36.3% | 27.3% | 🔴 -9.0% |
| [0.4–0.5] | 20 | 45.2% | 60.0% | 🟢 +14.8% |
| [0.5–0.6] | 103 | 54.1% | 60.2% | 🟢 +6.1% |
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
| `allsvenskan` | 8 | 25% | 🔴 -38.6% | 0.2385 |
| `eng.1` | 8 | 50% | 🟢 +24.3% | 0.3013 |
| `jpn.1` | 7 | 57% | 🟢 +48.6% | 0.2756 |
| `wnba` | 7 | 71% | 🟢 +0.0% | 0.1955 |
| `ita.1` | 6 | 67% | 🟢 +3.4% | 0.2529 |
| `laliga2` | 3 | 0% | 🔴 -100.0% | 0.1412 |
