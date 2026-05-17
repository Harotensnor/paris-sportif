# Backtest ROI — VRAI modèle (v2)

Généré : 2026-05-17T06:38:32Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1 picks sur 2026-05-17T04:00Z → 2026-05-17T04:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 100.0u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **1 picks** · 0 gagnés / 1 perdus · WR **0.0%**
- ROI flat (1u/pick) : **-100.00%** (-1.00u cumulé)
- Kelly 0.25× cap 10% : cumulé **+0.00u**
- Cote moyenne : 1.69 · Pick prob moyenne : 55.9%
- **Brier** : 0.3122 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.8182 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1000.00€** (+0.0%) · DD max 0.0% · Sharpe/pick +0.000

## Séries

- Streak courante : ❄️ **1** loses consécutifs
- Plus longue série gagnante : **0**
- Plus longue série perdante : **1**
- Top run lose : 1 picks (2026-05-17T04:00Z → 2026-05-17T04:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 1 | 0% | 0–79% | 🔴 -100.0% | +0.00u | 0.3122 | -3.3pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1 | 0.559 | 0.559 | en apprentissage |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1 | 0% | 🔴 -100.0% | 0.3122 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| fav | 1 | 0% | 🔴 -100.0% | 0.3122 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.5–0.6] | 1 | 55.9% | 0.0% | 🔴 -55.9% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
