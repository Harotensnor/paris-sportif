# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-16T12:10:13Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 235 picks sur 2026-11-06T17:00Z → 2026-11-16T02:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 158.46u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **235 picks** · 135 gagnés / 100 perdus · WR **57.4%**
- ROI flat (1u/pick) : **+2.04%** (+4.79u cumulé)
- Kelly 0.25× cap 10% : cumulé **+58.46u**
- Cote moyenne : 1.99 · Pick prob moyenne : 53.8%
- **Brier** : 0.2047 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.5946 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1584.59€** (+58.5%) · DD max 25.1% · Sharpe/pick +0.116

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **8**
- Plus longue série perdante : **8**
- Top run win : 8 picks (2026-11-15T18:00Z → 2026-11-16T00:30Z)
- Top run lose : 8 picks (2026-11-07T01:00Z → 2026-11-07T06:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 3 | 33% | 6–79% | 🔴 -5.0% | +0.87u | 0.2928 | +9.4pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 232 | 58% | 51–64% | 🟢 +2.1% | +57.59u | 0.2036 | -1.4pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 3 | 0.5403 | 0.546 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 232 | 0.0786 | 0.208 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 216 | 56% | 🟢 +0.7% | +56.79u | 0.2074 |
| basketball | 11 | 100% | 🟢 +43.0% | +8.68u | 0.1122 |
| hockey | 8 | 50% | 🔴 -16.7% | -7.00u | 0.2596 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 173 | 53% | 🔴 -4.1% | 0.2071 |
| `football:top5` | 43 | 65% | 🟢 +19.7% | 0.2087 |
| `basketball:all` | 11 | 100% | 🟢 +43.0% | 0.1122 |
| `hockey:all` | 8 | 50% | 🔴 -16.7% | 0.2596 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 54 | 91% | 🟢 +14.9% | 0.101 |
| fav | 91 | 58% | 🟢 +5.0% | 0.2462 |
| toss_up | 59 | 44% | 🟢 +1.3% | 0.2479 |
| dog | 31 | 23% | 🔴 -27.6% | 0.1817 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 43 | 35.8% | 27.9% | 🔴 -7.9% |
| [0.4–0.5] | 67 | 45.6% | 50.7% | 🟢 +5.2% |
| [0.5–0.6] | 48 | 54.7% | 50.0% | ⚪ -4.7% |
| [0.6–0.7] | 41 | 63.8% | 73.2% | 🟢 +9.4% |
| [0.7–0.8] | 26 | 75.3% | 96.2% | 🟢 +20.8% |
| [0.8–0.9] | 8 | 84.2% | 100.0% | 🟢 +15.8% |
| [0.9–1.0] | 2 | 93.0% | 100.0% | 🟢 +7.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `uefa.nations` | 20 | 65% | 🔴 -2.5% | 0.1683 |
| `championship` | 12 | 42% | 🔴 -18.4% | 0.2655 |
| `eng.1` | 10 | 60% | 🟢 +9.7% | 0.2173 |
| `eng.4` | 10 | 80% | 🟢 +66.6% | 0.2883 |
| `nba` | 10 | 100% | 🟢 +47.2% | 0.1232 |
| `esp.1` | 9 | 44% | 🔴 -19.7% | 0.2127 |
| `jpn.1` | 9 | 33% | 🔴 -32.2% | 0.2163 |
| `laliga2` | 9 | 44% | 🔴 -8.3% | 0.2541 |
| `chn.1` | 8 | 88% | 🟢 +40.7% | 0.1813 |
| `eredivisie` | 8 | 25% | 🔴 -53.1% | 0.2096 |
