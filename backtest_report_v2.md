# Backtest ROI — VRAI modèle (v2)

Généré : 2026-06-04T08:11:03Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 208 picks sur 2026-05-24T09:00Z → 2026-06-03T19:40Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 119.02u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **208 picks** · 115 gagnés / 93 perdus · WR **55.3%**
- ROI flat (1u/pick) : **+0.53%** (+1.10u cumulé)
- Kelly 0.25× cap 10% : cumulé **+19.02u**
- Cote moyenne : 1.87 · Pick prob moyenne : 53.5%
- **Brier** : 0.2414 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6752 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1190.22€** (+19.0%) · DD max 4.6% · Sharpe/pick +0.089

## Séries

- Streak courante : ❄️ **4** loses consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **4**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 4 picks (2026-05-24T09:00Z → 2026-05-24T11:35Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 5 | 60% | 23–88% | 🟢 +6.4% | +0.93u | 0.2084 | +4.4pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 203 | 55% | 48–62% | 🟢 +0.4% | +18.09u | 0.2422 | -2.6pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 5 | 0.1002 | 0.293 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 203 | 0.0461 | 0.156 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 123 | 57% | 🔴 -2.4% | +4.40u | 0.2394 |
| football | 71 | 49% | 🟢 +4.0% | +18.09u | 0.2511 |
| basketball | 10 | 80% | 🟢 +18.7% | +0.00u | 0.1917 |
| hockey | 4 | 50% | 🔴 -17.8% | -3.47u | 0.2544 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 123 | 57% | 🔴 -2.4% | 0.2394 |
| `football:other` | 56 | 46% | 🔴 -1.4% | 0.2434 |
| `football:top5` | 15 | 60% | 🟢 +24.3% | 0.2801 |
| `basketball:all` | 10 | 80% | 🟢 +18.7% | 0.1917 |
| `hockey:all` | 4 | 50% | 🔴 -17.8% | 0.2544 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 26 | 69% | 🔴 -2.8% | 0.2053 |
| fav | 146 | 56% | 🔴 -2.1% | 0.2484 |
| toss_up | 21 | 38% | 🔴 -12.1% | 0.2256 |
| dog | 15 | 47% | 🟢 +49.7% | 0.2576 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 22 | 36.1% | 31.8% | ⚪ -4.3% |
| [0.4–0.5] | 24 | 45.9% | 58.3% | 🟢 +12.4% |
| [0.5–0.6] | 125 | 54.4% | 56.8% | ⚪ +2.4% |
| [0.6–0.7] | 31 | 64.4% | 58.1% | 🔴 -6.3% |
| [0.7–0.8] | 5 | 73.0% | 80.0% | 🟢 +7.0% |
| [0.8–0.9] | 1 | 84.4% | 100.0% | 🟢 +15.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 123 | 57% | 🔴 -2.4% | 0.2394 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `chn.1` | 9 | 22% | 🔴 -42.8% | 0.2941 |
| `esp.2` | 9 | 78% | 🟢 +29.0% | 0.1981 |
| `allsvenskan` | 8 | 25% | 🔴 -38.6% | 0.2385 |
| `eng.1` | 8 | 50% | 🟢 +24.3% | 0.3013 |
| `jpn.1` | 8 | 62% | 🟢 +69.4% | 0.2953 |
| `wnba` | 7 | 71% | 🟢 +0.0% | 0.1955 |
| `ita.1` | 6 | 67% | 🟢 +3.4% | 0.2529 |
| `nhl` | 4 | 50% | 🔴 -17.8% | 0.2544 |
