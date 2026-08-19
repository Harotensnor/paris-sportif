# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-19T04:24:43Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 462 picks sur 2026-08-01T11:00Z → 2026-08-18T22:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 282.9u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **462 picks** · 258 gagnés / 204 perdus · WR **55.8%**
- ROI flat (1u/pick) : **+4.74%** (+21.89u cumulé)
- Kelly 0.25× cap 10% : cumulé **+182.90u**
- Cote moyenne : 2.02 · Pick prob moyenne : 52.2%
- **Brier** : 0.2251 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6424 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **2828.99€** (+182.9%) · DD max 12.8% · Sharpe/pick +0.139

## Séries

- Streak courante : 🔥 **1** wins consécutifs
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
| `skip` | 462 | 56% | 51–60% | 🟢 +4.7% | +182.90u | 0.2251 | -1.0pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 462 | 0.0654 | 0.15 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 387 | 55% | 🟢 +5.0% | +182.90u | 0.2221 |
| baseball | 64 | 59% | 🟢 +2.1% | +0.00u | 0.2485 |
| basketball | 11 | 73% | 🟢 +11.9% | +0.00u | 0.1973 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 387 | 55% | 🟡 +5.0% | 0.2221 |
| `baseball:all` | 64 | 59% | 🟡 +2.1% | 0.2485 |
| `basketball:all` | 11 | 73% | 🟢 +11.9% | 0.1973 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 76 | 71% | 🔴 -3.4% | 0.2031 |
| fav | 207 | 65% | 🟢 +12.7% | 0.2292 |
| toss_up | 122 | 43% | 🔴 -1.4% | 0.2365 |
| dog | 56 | 32% | 🟢 +1.6% | 0.2173 |
| heavy_dog | 1 | 0% | 🔴 -100.0% | 0.1078 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 93 | 36.6% | 34.4% | ⚪ -2.2% |
| [0.4–0.5] | 114 | 44.7% | 41.2% | ⚪ -3.5% |
| [0.5–0.6] | 136 | 54.9% | 69.9% | 🟢 +15.0% |
| [0.6–0.7] | 75 | 64.7% | 66.7% | ⚪ +1.9% |
| [0.7–0.8] | 37 | 74.0% | 78.4% | ⚪ +4.4% |
| [0.8–0.9] | 7 | 81.7% | 71.4% | 🔴 -10.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 64 | 59% | 🟢 +2.1% | 0.2485 |
| `eng.league_cup` | 34 | 59% | 🔴 -5.2% | 0.1802 |
| `arg.1` | 20 | 55% | 🟢 +25.3% | 0.2293 |
| `chn.1` | 20 | 50% | 🔴 -3.6% | 0.2223 |
| `swe.1` | 20 | 55% | 🟢 +0.6% | 0.2517 |
| `ita.coppa_italia` | 18 | 89% | 🟢 +48.9% | 0.2079 |
| `ned.1` | 18 | 56% | 🔴 -9.0% | 0.2455 |
| `bel.1` | 16 | 69% | 🟢 +26.4% | 0.211 |
| `ger.2` | 16 | 38% | 🔴 -16.6% | 0.23 |
| `nor.1` | 15 | 53% | 🔴 -1.9% | 0.2259 |
