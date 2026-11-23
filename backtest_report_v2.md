# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-23T13:46:25Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 170 picks sur 2026-11-20T03:00Z → 2026-11-22T20:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 158.56u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **170 picks** · 95 gagnés / 75 perdus · WR **55.9%**
- ROI flat (1u/pick) : **+3.77%** (+6.40u cumulé)
- Kelly 0.25× cap 10% : cumulé **+58.56u**
- Cote moyenne : 1.91 · Pick prob moyenne : 51.5%
- **Brier** : 0.2322 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6567 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1585.62€** (+58.6%) · DD max 7.8% · Sharpe/pick +0.181

## Séries

- Streak courante : 🔥 **2** wins consécutifs
- Plus longue série gagnante : **7**
- Plus longue série perdante : **6**
- Top run win : 7 picks (2026-11-22T16:00Z → 2026-11-22T18:15Z)
- Top run lose : 6 picks (2026-11-21T19:45Z → 2026-11-21T20:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 5 | 60% | 23–88% | 🟢 +9.2% | -1.61u | 0.2137 | +3.5pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 165 | 56% | 48–63% | 🟢 +3.6% | +60.17u | 0.2328 | -5.3pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 5 | 0.049 | 0.049 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 165 | 0.0523 | 0.314 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 146 | 55% | 🟢 +4.7% | +59.93u | 0.2353 |
| hockey | 15 | 53% | 🔴 -8.8% | -1.61u | 0.2368 |
| basketball | 9 | 78% | 🟢 +9.8% | +0.24u | 0.1742 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 106 | 55% | 🟢 +8.5% | 0.2369 |
| `football:top5` | 40 | 55% | 🔴 -5.5% | 0.2311 |
| `hockey:all` | 15 | 53% | 🔴 -8.8% | 0.2368 |
| `basketball:all` | 9 | 78% | 🟢 +9.8% | 0.1742 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 46 | 67% | 🔴 -10.3% | 0.2082 |
| fav | 62 | 53% | 🔴 -9.6% | 0.2322 |
| toss_up | 47 | 47% | 🟢 +7.8% | 0.2382 |
| dog | 15 | 60% | 🟢 +89.7% | 0.287 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 32 | 36.3% | 40.6% | ⚪ +4.3% |
| [0.4–0.5] | 42 | 45.5% | 45.2% | ⚪ -0.3% |
| [0.5–0.6] | 62 | 54.7% | 59.7% | 🟢 +5.0% |
| [0.6–0.7] | 24 | 64.0% | 70.8% | 🟢 +6.8% |
| [0.7–0.8] | 8 | 74.7% | 100.0% | 🟢 +25.3% |
| [0.8–0.9] | 2 | 81.4% | 50.0% | 🔴 -31.4% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `nhl` | 15 | 53% | 🔴 -8.8% | 0.2368 |
| `championship` | 12 | 75% | 🟢 +65.5% | 0.2567 |
| `jleague` | 10 | 30% | 🔴 -35.1% | 0.2763 |
| `eng.1` | 9 | 44% | 🔴 -14.1% | 0.255 |
| `nba` | 9 | 78% | 🟢 +9.8% | 0.1742 |
| `eredivisie` | 8 | 50% | 🔴 -29.9% | 0.2187 |
| `esp.1` | 8 | 62% | 🔴 -2.5% | 0.1751 |
| `fra.1` | 8 | 38% | 🔴 -37.6% | 0.2523 |
| `ger.1` | 8 | 75% | 🟢 +41.6% | 0.2757 |
| `bundesliga2` | 7 | 57% | 🔴 -3.6% | 0.2118 |
