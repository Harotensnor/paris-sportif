# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-13T11:40:13Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 203 picks sur 2026-11-05T17:45Z → 2026-11-12T19:45Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 149.23u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **203 picks** · 111 gagnés / 92 perdus · WR **54.7%**
- ROI flat (1u/pick) : **-2.91%** (-5.91u cumulé)
- Kelly 0.25× cap 10% : cumulé **+49.23u**
- Cote moyenne : 1.99 · Pick prob moyenne : 54.0%
- **Brier** : 0.2078 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6023 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1492.30€** (+49.2%) · DD max 25.1% · Sharpe/pick +0.124

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **7**
- Plus longue série perdante : **8**
- Top run win : 7 picks (2026-11-08T07:30Z → 2026-11-08T08:00Z)
- Top run lose : 8 picks (2026-11-07T01:00Z → 2026-11-07T06:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 203 | 55% | 48–61% | 🔴 -2.9% | +49.23u | 0.2078 | -1.1pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 203 | 0.0657 | 0.169 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 201 | 54% | 🔴 -3.3% | +49.23u | 0.2089 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 158 | 51% | 🔴 -9.5% | 0.209 |
| `football:top5` | 43 | 65% | 🟢 +19.7% | 0.2087 |
| `basketball:all` | 1 | 100% | 🟢 +30.9% | 0.1155 |
| `hockey:all` | 1 | 100% | 🟢 +32.8% | 0.0813 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 49 | 84% | 🟢 +6.8% | 0.1343 |
| fav | 74 | 58% | 🟢 +3.5% | 0.2385 |
| toss_up | 56 | 38% | 🔴 -13.3% | 0.2381 |
| dog | 24 | 25% | 🔴 -18.3% | 0.1928 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 40 | 36.0% | 32.5% | ⚪ -3.5% |
| [0.4–0.5] | 57 | 45.6% | 40.4% | 🔴 -5.2% |
| [0.5–0.6] | 36 | 54.5% | 50.0% | ⚪ -4.5% |
| [0.6–0.7] | 35 | 63.8% | 71.4% | 🟢 +7.7% |
| [0.7–0.8] | 24 | 74.7% | 91.7% | 🟢 +16.9% |
| [0.8–0.9] | 9 | 84.3% | 88.9% | ⚪ +4.6% |
| [0.9–1.0] | 2 | 90.9% | 100.0% | 🟢 +9.1% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `europaleague` | 15 | 40% | 🔴 -33.7% | 0.2668 |
| `championship` | 12 | 42% | 🔴 -18.4% | 0.2655 |
| `conferenceleague` | 12 | 67% | 🔴 -3.4% | 0.2033 |
| `eng.1` | 10 | 60% | 🟢 +9.7% | 0.2173 |
| `esp.1` | 9 | 44% | 🔴 -19.7% | 0.2127 |
| `jpn.1` | 9 | 33% | 🔴 -32.2% | 0.2163 |
| `chn.1` | 8 | 88% | 🟢 +40.7% | 0.1813 |
| `eredivisie` | 8 | 25% | 🔴 -53.1% | 0.2096 |
| `fra.1` | 8 | 75% | 🟢 +49.8% | 0.2166 |
| `fra.2` | 8 | 62% | 🟢 +40.6% | 0.2491 |
