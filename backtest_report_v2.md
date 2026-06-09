# Backtest ROI — VRAI modèle (v2)

Généré : 2026-06-09T07:35:45Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 262 picks sur 2026-05-24T15:00Z → 2026-06-08T00:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 107.22u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **262 picks** · 147 gagnés / 115 perdus · WR **56.1%**
- ROI flat (1u/pick) : **-0.37%** (-0.97u cumulé)
- Kelly 0.25× cap 10% : cumulé **+7.22u**
- Cote moyenne : 1.83 · Pick prob moyenne : 53.8%
- **Brier** : 0.2381 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6683 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1072.19€** (+7.2%) · DD max 5.1% · Sharpe/pick +0.042

## Séries

- Streak courante : ❄️ **1** loses consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **4**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 4 picks (2026-05-24T18:10Z → 2026-05-24T18:45Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 262 | 56% | 50–62% | 🔴 -0.4% | +7.22u | 0.2381 | -2.8pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 262 | 0.0383 | 0.27 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 178 | 57% | 🔴 -2.7% | +0.00u | 0.2396 |
| football | 64 | 48% | 🟢 +3.1% | +7.22u | 0.239 |
| basketball | 14 | 71% | 🟢 +8.1% | +0.00u | 0.2133 |
| hockey | 6 | 67% | 🟢 +13.3% | +0.00u | 0.2428 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 178 | 57% | 🔴 -2.7% | 0.2396 |
| `football:other` | 58 | 47% | 🟡 +1.1% | 0.2345 |
| `basketball:all` | 14 | 71% | 🟢 +8.1% | 0.2133 |
| `football:top5` | 6 | 67% | 🟢 +21.8% | 0.2822 |
| `hockey:all` | 6 | 67% | 🟢 +13.3% | 0.2428 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 26 | 77% | 🟢 +6.7% | 0.1734 |
| fav | 199 | 55% | 🔴 -4.5% | 0.2463 |
| toss_up | 22 | 50% | 🟢 +11.6% | 0.2419 |
| dog | 15 | 40% | 🟢 +24.7% | 0.2362 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 22 | 36.2% | 27.3% | 🔴 -9.0% |
| [0.4–0.5] | 28 | 46.1% | 64.3% | 🟢 +18.2% |
| [0.5–0.6] | 171 | 54.5% | 55.0% | ⚪ +0.5% |
| [0.6–0.7] | 34 | 63.7% | 64.7% | ⚪ +1.0% |
| [0.7–0.8] | 6 | 73.0% | 100.0% | 🟢 +27.0% |
| [0.8–0.9] | 1 | 84.4% | 100.0% | 🟢 +15.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 178 | 57% | 🔴 -2.7% | 0.2396 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `wnba` | 9 | 78% | 🟢 +14.0% | 0.1908 |
| `esp.2` | 7 | 86% | 🟢 +38.0% | 0.1635 |
| `allsvenskan` | 6 | 17% | 🔴 -46.7% | 0.2172 |
| `nhl` | 6 | 67% | 🟢 +13.3% | 0.2428 |
| `ita.1` | 5 | 60% | 🔴 -4.8% | 0.2735 |
| `laliga2` | 5 | 0% | 🔴 -100.0% | 0.1578 |
| `nba` | 5 | 60% | 🔴 -2.7% | 0.2538 |
