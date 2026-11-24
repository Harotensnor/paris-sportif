# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-24T14:21:53Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 182 picks sur 2026-11-20T03:00Z → 2026-11-23T20:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 182.9u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **182 picks** · 104 gagnés / 78 perdus · WR **57.1%**
- ROI flat (1u/pick) : **+7.59%** (+13.81u cumulé)
- Kelly 0.25× cap 10% : cumulé **+82.90u**
- Cote moyenne : 1.95 · Pick prob moyenne : 53.1%
- **Brier** : 0.2367 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6676 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1828.96€** (+82.9%) · DD max 10.3% · Sharpe/pick +0.180

## Séries

- Streak courante : ❄️ **1** loses consécutifs
- Plus longue série gagnante : **9**
- Plus longue série perdante : **5**
- Top run win : 9 picks (2026-11-21T17:45Z → 2026-11-21T19:45Z)
- Top run lose : 5 picks (2026-11-21T19:45Z → 2026-11-21T20:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 1 | 100% | 21–100% | 🟢 +110.0% | +2.83u | 0.2307 | +4.3pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 181 | 57% | 50–64% | 🟢 +7.0% | +80.07u | 0.2367 | -2.8pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 1 | 0.48 | 0.48 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 181 | 0.0667 | 0.164 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 158 | 56% | 🟢 +8.1% | +82.90u | 0.2381 |
| hockey | 15 | 60% | 🟢 +1.0% | +0.00u | 0.2483 |
| basketball | 9 | 78% | 🟢 +9.8% | +0.00u | 0.1918 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 115 | 55% | 🟢 +8.0% | 0.2418 |
| `football:top5` | 43 | 58% | 🟢 +8.5% | 0.2283 |
| `hockey:all` | 15 | 60% | 🟡 +1.0% | 0.2483 |
| `basketball:all` | 9 | 78% | 🟢 +9.8% | 0.1918 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 48 | 69% | 🔴 -8.5% | 0.2194 |
| fav | 65 | 55% | 🔴 -5.5% | 0.234 |
| toss_up | 48 | 50% | 🟢 +12.8% | 0.2407 |
| dog | 20 | 55% | 🟢 +81.8% | 0.2843 |
| heavy_dog | 1 | 0% | 🔴 -100.0% | 0.1024 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 33 | 36.0% | 42.4% | 🟢 +6.4% |
| [0.4–0.5] | 42 | 44.9% | 50.0% | 🟢 +5.1% |
| [0.5–0.6] | 54 | 54.4% | 57.4% | ⚪ +3.0% |
| [0.6–0.7] | 28 | 64.1% | 78.6% | 🟢 +14.5% |
| [0.7–0.8] | 22 | 73.5% | 63.6% | 🔴 -9.8% |
| [0.8–0.9] | 3 | 83.1% | 66.7% | 🔴 -16.4% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `nhl` | 15 | 60% | 🟢 +1.0% | 0.2483 |
| `championship` | 10 | 60% | 🟢 +8.5% | 0.2096 |
| `eng.1` | 10 | 50% | 🔴 -1.7% | 0.2495 |
| `esp.1` | 9 | 56% | 🔴 -13.3% | 0.1675 |
| `ligamx` | 9 | 33% | 🔴 -18.3% | 0.2112 |
| `nba` | 9 | 78% | 🟢 +9.8% | 0.1918 |
| `eredivisie` | 8 | 50% | 🔴 -29.9% | 0.2246 |
| `fra.1` | 8 | 50% | 🟢 +1.7% | 0.2758 |
| `fra.2` | 8 | 62% | 🟢 +24.0% | 0.2298 |
| `ger.1` | 8 | 75% | 🟢 +41.6% | 0.2597 |
