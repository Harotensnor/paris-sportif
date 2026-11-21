# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-21T11:52:55Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 22 picks sur 2026-11-18T00:30Z → 2026-11-20T20:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 109.46u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **22 picks** · 9 gagnés / 13 perdus · WR **40.9%**
- ROI flat (1u/pick) : **-22.68%** (-4.99u cumulé)
- Kelly 0.25× cap 10% : cumulé **+9.46u**
- Cote moyenne : 1.71 · Pick prob moyenne : 54.9%
- **Brier** : 0.2833 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.7682 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1094.60€** (+9.5%) · DD max 0.0% · Sharpe/pick +0.393

## Séries

- Streak courante : ❄️ **1** loses consécutifs
- Plus longue série gagnante : **2**
- Plus longue série perdante : **4**
- Top run win : 2 picks (2026-11-18T00:30Z → 2026-11-18T01:00Z)
- Top run lose : 4 picks (2026-11-20T10:00Z → 2026-11-20T17:30Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 22 | 41% | 23–61% | 🔴 -22.7% | +9.46u | 0.2833 | -6.1pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 22 | 0.207 | 0.814 | en apprentissage |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 15 | 40% | 🔴 -17.8% | +9.46u | 0.2821 |
| basketball | 5 | 60% | 🔴 -6.5% | +0.00u | 0.2811 |
| hockey | 2 | 0% | 🔴 -100.0% | +0.00u | 0.2969 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 12 | 42% | 🔴 -15.9% | 0.2499 |
| `basketball:all` | 5 | 60% | 🔴 -6.5% | 0.2811 |
| `football:top5` | 3 | 33% | 🔴 -25.0% | 0.411 |
| `hockey:all` | 2 | 0% | 🔴 -100.0% | 0.2969 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 8 | 12% | 🔴 -83.2% | 0.3695 |
| fav | 9 | 44% | 🔴 -25.4% | 0.2275 |
| toss_up | 5 | 80% | 🟢 +79.0% | 0.2457 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 1 | 39.8% | 0.0% | 🔴 -39.8% |
| [0.4–0.5] | 5 | 45.3% | 60.0% | 🟢 +14.7% |
| [0.5–0.6] | 12 | 55.4% | 41.7% | 🔴 -13.7% |
| [0.6–0.7] | 3 | 65.4% | 33.3% | 🔴 -32.1% |
| [0.8–0.9] | 1 | 81.4% | 0.0% | 🔴 -81.4% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `nba` | 5 | 60% | 🔴 -6.5% | 0.2811 |
| `fra.2` | 4 | 75% | 🟢 +58.5% | 0.2178 |
| `jleague` | 3 | 0% | 🔴 -100.0% | 0.3318 |
| `nhl` | 2 | 0% | 🔴 -100.0% | 0.2969 |
