# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-10T11:54:39Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 188 picks sur 2026-11-05T17:45Z → 2026-11-09T18:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 109.35u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **188 picks** · 98 gagnés / 90 perdus · WR **52.1%**
- ROI flat (1u/pick) : **-9.82%** (-18.46u cumulé)
- Kelly 0.25× cap 10% : cumulé **+9.35u**
- Cote moyenne : 1.95 · Pick prob moyenne : 50.3%
- **Brier** : 0.2114 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6127 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1093.49€** (+9.3%) · DD max 11.0% · Sharpe/pick +0.052

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
| `skip` | 188 | 52% | 45–59% | 🔴 -9.8% | +9.35u | 0.2114 | -5.6pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 188 | 0.0724 | 0.153 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 187 | 52% | 🔴 -10.0% | +9.35u | 0.2119 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 144 | 49% | 🔴 -13.8% | 0.2141 |
| `football:top5` | 43 | 60% | 🟡 +2.4% | 0.2044 |
| `basketball:all` | 1 | 100% | 🟢 +30.9% | 0.1155 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 45 | 78% | 🔴 -1.0% | 0.1714 |
| fav | 74 | 55% | 🔴 -3.1% | 0.238 |
| toss_up | 47 | 36% | 🔴 -20.0% | 0.2221 |
| dog | 22 | 23% | 🔴 -28.9% | 0.1807 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 52 | 36.1% | 26.9% | 🔴 -9.1% |
| [0.4–0.5] | 60 | 45.3% | 46.7% | ⚪ +1.3% |
| [0.5–0.6] | 31 | 54.8% | 61.3% | 🟢 +6.5% |
| [0.6–0.7] | 25 | 64.7% | 80.0% | 🟢 +15.3% |
| [0.7–0.8] | 15 | 74.3% | 86.7% | 🟢 +12.3% |
| [0.8–0.9] | 4 | 83.3% | 75.0% | 🔴 -8.3% |
| [0.9–1.0] | 1 | 91.0% | 100.0% | 🟢 +9.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `europaleague` | 15 | 40% | 🔴 -33.7% | 0.2668 |
| `championship` | 12 | 33% | 🔴 -39.8% | 0.2376 |
| `conferenceleague` | 12 | 67% | 🔴 -3.4% | 0.2033 |
| `eng.1` | 10 | 60% | 🟢 +3.4% | 0.1962 |
| `jleague` | 10 | 40% | 🔴 -9.9% | 0.2269 |
| `esp.1` | 9 | 56% | 🟢 +10.9% | 0.2539 |
| `chn.1` | 8 | 88% | 🟢 +32.1% | 0.1702 |
| `eredivisie` | 8 | 25% | 🔴 -56.1% | 0.1994 |
| `fra.1` | 8 | 50% | 🔴 -13.1% | 0.2047 |
| `fra.2` | 8 | 62% | 🟢 +37.2% | 0.2524 |
