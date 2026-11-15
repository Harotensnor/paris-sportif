# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-15T11:36:15Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 243 picks sur 2026-11-05T17:45Z → 2026-11-14T18:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 149.09u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **243 picks** · 135 gagnés / 108 perdus · WR **55.6%**
- ROI flat (1u/pick) : **-1.93%** (-4.70u cumulé)
- Kelly 0.25× cap 10% : cumulé **+49.09u**
- Cote moyenne : 1.98 · Pick prob moyenne : 54.1%
- **Brier** : 0.2089 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.604 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1490.90€** (+49.1%) · DD max 25.1% · Sharpe/pick +0.106

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
| `skip` | 243 | 56% | 49–62% | 🔴 -1.9% | +49.09u | 0.2089 | -1.3pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 243 | 0.0576 | 0.149 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 240 | 55% | 🔴 -2.2% | +49.09u | 0.2106 |
| basketball | 2 | 100% | 🟢 +15.6% | +0.00u | 0.059 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 197 | 53% | 🔴 -7.0% | 0.2111 |
| `football:top5` | 43 | 65% | 🟢 +19.7% | 0.2087 |
| `basketball:all` | 2 | 100% | 🟢 +15.6% | 0.059 |
| `hockey:all` | 1 | 100% | 🟢 +32.8% | 0.0813 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 58 | 84% | 🟢 +7.4% | 0.1309 |
| fav | 92 | 59% | 🟢 +4.7% | 0.2442 |
| toss_up | 63 | 41% | 🔴 -4.6% | 0.2429 |
| dog | 30 | 20% | 🔴 -34.7% | 0.1799 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 47 | 35.9% | 29.8% | 🔴 -6.2% |
| [0.4–0.5] | 66 | 45.3% | 45.5% | ⚪ +0.2% |
| [0.5–0.6] | 48 | 54.8% | 50.0% | ⚪ -4.8% |
| [0.6–0.7] | 40 | 63.8% | 72.5% | 🟢 +8.7% |
| [0.7–0.8] | 29 | 74.8% | 89.7% | 🟢 +14.9% |
| [0.8–0.9] | 10 | 83.9% | 90.0% | 🟢 +6.1% |
| [0.9–1.0] | 3 | 92.3% | 100.0% | 🟢 +7.7% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `uefa.nations` | 20 | 65% | 🔴 -2.5% | 0.1718 |
| `europaleague` | 15 | 40% | 🔴 -33.7% | 0.2668 |
| `championship` | 12 | 42% | 🔴 -18.4% | 0.2655 |
| `conferenceleague` | 12 | 67% | 🔴 -3.4% | 0.2033 |
| `eng.1` | 10 | 60% | 🟢 +9.7% | 0.2173 |
| `eng.4` | 10 | 70% | 🟢 +46.1% | 0.2909 |
| `esp.1` | 9 | 44% | 🔴 -19.7% | 0.2127 |
| `jpn.1` | 9 | 33% | 🔴 -32.2% | 0.2163 |
| `chn.1` | 8 | 88% | 🟢 +40.7% | 0.1813 |
| `eredivisie` | 8 | 25% | 🔴 -53.1% | 0.2096 |
