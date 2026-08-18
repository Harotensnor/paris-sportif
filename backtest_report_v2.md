# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-18T04:23:03Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 483 picks sur 2026-07-26T20:15Z → 2026-08-17T20:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 251.79u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **483 picks** · 267 gagnés / 216 perdus · WR **55.3%**
- ROI flat (1u/pick) : **+3.68%** (+17.77u cumulé)
- Kelly 0.25× cap 10% : cumulé **+151.79u**
- Cote moyenne : 2.02 · Pick prob moyenne : 52.2%
- **Brier** : 0.2269 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.646 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **2517.94€** (+151.8%) · DD max 14.3% · Sharpe/pick +0.120

## Séries

- Streak courante : ❄️ **1** loses consécutifs
- Plus longue série gagnante : **7**
- Plus longue série perdante : **9**
- Top run win : 7 picks (2026-08-09T15:00Z → 2026-08-09T17:00Z)
- Top run lose : 9 picks (2026-08-15T13:00Z → 2026-08-15T14:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 483 | 55% | 51–60% | 🟢 +3.7% | +151.79u | 0.2269 | -1.0pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 483 | 0.0533 | 0.126 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 407 | 54% | 🟢 +4.0% | +151.79u | 0.224 |
| baseball | 65 | 58% | 🟢 +0.5% | +0.00u | 0.2493 |
| basketball | 11 | 73% | 🟢 +11.6% | +0.00u | 0.1987 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 407 | 54% | 🟡 +4.0% | 0.224 |
| `baseball:all` | 65 | 58% | 🟡 +0.5% | 0.2493 |
| `basketball:all` | 11 | 73% | 🟢 +11.6% | 0.1987 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 79 | 70% | 🔴 -5.4% | 0.2069 |
| fav | 216 | 64% | 🟢 +12.1% | 0.2311 |
| toss_up | 130 | 42% | 🔴 -2.3% | 0.2377 |
| dog | 57 | 32% | 🔴 -0.2% | 0.2159 |
| heavy_dog | 1 | 0% | 🔴 -100.0% | 0.1078 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 96 | 36.7% | 34.4% | ⚪ -2.3% |
| [0.4–0.5] | 120 | 44.6% | 42.5% | ⚪ -2.1% |
| [0.5–0.6] | 145 | 55.0% | 67.6% | 🟢 +12.6% |
| [0.6–0.7] | 76 | 64.7% | 65.8% | ⚪ +1.1% |
| [0.7–0.8] | 39 | 73.9% | 76.9% | ⚪ +3.1% |
| [0.8–0.9] | 7 | 81.7% | 71.4% | 🔴 -10.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 65 | 58% | 🟢 +0.5% | 0.2493 |
| `eng.league_cup` | 34 | 59% | 🔴 -5.2% | 0.1802 |
| `arg.1` | 21 | 52% | 🟢 +19.3% | 0.2257 |
| `swe.1` | 21 | 52% | 🔴 -4.2% | 0.2533 |
| `chn.1` | 20 | 50% | 🔴 -3.6% | 0.226 |
| `ita.coppa_italia` | 18 | 89% | 🟢 +48.9% | 0.2079 |
| `ned.1` | 18 | 56% | 🔴 -9.0% | 0.2455 |
| `bel.1` | 16 | 69% | 🟢 +26.4% | 0.211 |
| `ger.2` | 16 | 38% | 🔴 -16.6% | 0.23 |
| `nor.1` | 16 | 56% | 🟢 +1.5% | 0.2199 |
