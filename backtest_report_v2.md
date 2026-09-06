# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-06T08:10:34Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 641 picks sur 2026-08-15T20:00Z → 2026-09-05T21:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 24586.0u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **641 picks** · 376 gagnés / 265 perdus · WR **58.7%**
- ROI flat (1u/pick) : **+19.62%** (+125.79u cumulé)
- Kelly 0.25× cap 10% : cumulé **+24486.00u**
- Cote moyenne : 2.12 · Pick prob moyenne : 53.5%
- **Brier** : 0.2294 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6487 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **245860.04€** (+24486.0%) · DD max 57.4% · Sharpe/pick +0.252

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **8**
- Top run win : 10 picks (2026-08-31T17:30Z → 2026-08-31T19:30Z)
- Top run lose : 8 picks (2026-09-05T14:00Z → 2026-09-05T15:15Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 641 | 59% | 55–62% | 🟢 +19.6% | +24486.00u | 0.2294 | +1.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 641 | 0.0547 | 0.755 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 586 | 59% | 🟢 +22.6% | +24486.00u | 0.2277 |
| baseball | 49 | 47% | 🔴 -18.6% | +0.00u | 0.2537 |
| basketball | 6 | 83% | 🟢 +37.7% | +0.00u | 0.2012 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 476 | 59% | 🟢 +23.8% | 0.2279 |
| `football:top5` | 110 | 59% | 🟢 +17.5% | 0.227 |
| `baseball:all` | 49 | 47% | 🔴 -18.6% | 0.2537 |
| `basketball:all` | 6 | 83% | 🟢 +37.7% | 0.2012 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 100 | 78% | 🟢 +4.0% | 0.1582 |
| fav | 258 | 57% | 🟢 +1.0% | 0.2341 |
| toss_up | 172 | 58% | 🟢 +34.3% | 0.2493 |
| dog | 110 | 45% | 🟢 +48.3% | 0.2491 |
| heavy_dog | 1 | 100% | 🟢 +700.0% | 0.57 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.2–0.3] | 1 | 24.5% | 100.0% | 🟢 +75.5% |
| [0.3–0.4] | 95 | 36.7% | 51.6% | 🟢 +14.8% |
| [0.4–0.5] | 187 | 45.5% | 44.9% | ⚪ -0.5% |
| [0.5–0.6] | 193 | 54.9% | 58.5% | ⚪ +3.6% |
| [0.6–0.7] | 89 | 64.4% | 73.0% | 🟢 +8.6% |
| [0.7–0.8] | 50 | 74.3% | 78.0% | ⚪ +3.7% |
| [0.8–0.9] | 22 | 83.9% | 95.5% | 🟢 +11.5% |
| [0.9–1.0] | 4 | 92.2% | 100.0% | 🟢 +7.8% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 49 | 47% | 🔴 -18.6% | 0.2537 |
| `eng.2` | 38 | 63% | 🟢 +53.7% | 0.238 |
| `eng.4` | 36 | 58% | 🟢 +40.1% | 0.2397 |
| `eng.3` | 34 | 62% | 🟢 +47.5% | 0.242 |
| `eng.1` | 28 | 54% | 🟢 +5.2% | 0.2379 |
| `fra.1` | 23 | 57% | 🟢 +46.8% | 0.2568 |
| `esp.2` | 22 | 50% | 🟢 +25.2% | 0.2355 |
| `ita.1` | 22 | 73% | 🟢 +20.3% | 0.1877 |
| `esp.1` | 21 | 57% | 🟢 +12.0% | 0.2067 |
| `jpn.1` | 21 | 57% | 🟢 +23.4% | 0.2269 |
