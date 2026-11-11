# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-11T11:31:00Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 192 picks sur 2026-11-05T17:45Z → 2026-11-10T18:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 143.16u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **192 picks** · 102 gagnés / 90 perdus · WR **53.1%**
- ROI flat (1u/pick) : **-4.05%** (-7.78u cumulé)
- Kelly 0.25× cap 10% : cumulé **+43.16u**
- Cote moyenne : 2.01 · Pick prob moyenne : 53.4%
- **Brier** : 0.2132 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6141 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1431.63€** (+43.2%) · DD max 25.1% · Sharpe/pick +0.117

## Séries

- Streak courante : 🔥 **3** wins consécutifs
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
| `skip` | 192 | 53% | 46–60% | 🔴 -4.0% | +43.16u | 0.2132 | -1.1pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 192 | 0.0571 | 0.151 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 191 | 53% | 🔴 -4.2% | +43.16u | 0.2137 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 148 | 49% | 🔴 -11.2% | 0.2152 |
| `football:top5` | 43 | 65% | 🟢 +19.7% | 0.2087 |
| `basketball:all` | 1 | 100% | 🟢 +30.9% | 0.1155 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 43 | 81% | 🟢 +4.8% | 0.1455 |
| fav | 73 | 58% | 🟢 +3.0% | 0.2413 |
| toss_up | 52 | 37% | 🔴 -14.6% | 0.2392 |
| dog | 24 | 25% | 🔴 -18.3% | 0.1928 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 39 | 36.0% | 33.3% | ⚪ -2.7% |
| [0.4–0.5] | 55 | 45.6% | 40.0% | 🔴 -5.6% |
| [0.5–0.6] | 36 | 54.5% | 50.0% | ⚪ -4.5% |
| [0.6–0.7] | 33 | 63.9% | 69.7% | 🟢 +5.8% |
| [0.7–0.8] | 20 | 74.9% | 90.0% | 🟢 +15.1% |
| [0.8–0.9] | 7 | 84.3% | 85.7% | ⚪ +1.4% |
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
