# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-19T12:17:37Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 9 picks sur 2026-11-17T00:30Z → 2026-11-18T04:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 100.0u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **9 picks** · 5 gagnés / 4 perdus · WR **55.6%**
- ROI flat (1u/pick) : **-7.03%** (-0.63u cumulé)
- Kelly 0.25× cap 10% : cumulé **+0.00u**
- Cote moyenne : 1.56 · Pick prob moyenne : 60.1%
- **Brier** : 0.2763 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.7516 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1000.00€** (+0.0%) · DD max 0.0% · Sharpe/pick +0.000

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **2**
- Plus longue série perdante : **3**
- Top run win : 2 picks (2026-11-17T00:30Z → 2026-11-17T01:00Z)
- Top run lose : 3 picks (2026-11-18T01:00Z → 2026-11-18T03:30Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 9 | 56% | 27–81% | 🔴 -7.0% | +0.00u | 0.2763 | -5.5pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 9 | 0.1188 | 0.74 | en apprentissage |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| basketball | 6 | 67% | 🟢 +6.9% | +0.00u | 0.2327 |
| hockey | 3 | 33% | 🔴 -34.9% | +0.00u | 0.3635 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `basketball:all` | 6 | 67% | 🟢 +6.9% | 0.2327 |
| `hockey:all` | 3 | 33% | 🔴 -34.9% | 0.3635 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 4 | 25% | 🔴 -66.3% | 0.3507 |
| fav | 5 | 80% | 🟢 +40.4% | 0.2168 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.5–0.6] | 5 | 54.8% | 60.0% | 🟢 +5.2% |
| [0.6–0.7] | 3 | 64.4% | 66.7% | ⚪ +2.3% |
| [0.7–0.8] | 1 | 74.0% | 0.0% | 🔴 -74.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `nba` | 6 | 67% | 🟢 +6.9% | 0.2327 |
| `nhl` | 3 | 33% | 🔴 -34.9% | 0.3635 |
