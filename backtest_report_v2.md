# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-08T10:49:40Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 130 picks sur 2026-11-05T17:45Z → 2026-11-08T08:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 103.34u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **130 picks** · 68 gagnés / 62 perdus · WR **52.3%**
- ROI flat (1u/pick) : **-4.87%** (-6.33u cumulé)
- Kelly 0.25× cap 10% : cumulé **+3.34u**
- Cote moyenne : 2.06 · Pick prob moyenne : 50.6%
- **Brier** : 0.2133 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6173 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1033.44€** (+3.3%) · DD max 12.4% · Sharpe/pick +0.026

## Séries

- Streak courante : 🔥 **7** wins consécutifs
- Plus longue série gagnante : **7**
- Plus longue série perdante : **5**
- Top run win : 7 picks (2026-11-05T20:00Z → 2026-11-06T17:00Z)
- Top run lose : 5 picks (2026-11-07T13:00Z → 2026-11-07T14:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 2 | 50% | 9–91% | ⚪ +0.0% | -3.56u | 0.2704 | +9.1pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 128 | 52% | 44–61% | 🔴 -4.9% | +6.91u | 0.2124 | -3.5pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 2 | 0.068 | 0.068 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 128 | 0.0863 | 0.157 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 129 | 52% | 🔴 -5.1% | +3.34u | 0.214 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 109 | 50% | 🔴 -10.0% | 0.2179 |
| `football:top5` | 20 | 65% | 🟢 +21.3% | 0.1927 |
| `basketball:all` | 1 | 100% | 🟢 +30.9% | 0.13 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 32 | 78% | 🟢 +0.8% | 0.1807 |
| fav | 42 | 57% | 🟢 +1.8% | 0.2359 |
| toss_up | 34 | 44% | 🟢 +4.7% | 0.2451 |
| dog | 22 | 18% | 🔴 -40.7% | 0.1686 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 34 | 35.4% | 23.5% | 🔴 -11.9% |
| [0.4–0.5] | 39 | 45.0% | 48.7% | ⚪ +3.7% |
| [0.5–0.6] | 23 | 54.8% | 60.9% | 🟢 +6.1% |
| [0.6–0.7] | 20 | 64.3% | 80.0% | 🟢 +15.7% |
| [0.7–0.8] | 9 | 72.5% | 77.8% | 🟢 +5.2% |
| [0.8–0.9] | 4 | 83.2% | 75.0% | 🔴 -8.2% |
| [0.9–1.0] | 1 | 91.0% | 100.0% | 🟢 +9.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `europaleague` | 15 | 40% | 🔴 -33.7% | 0.2668 |
| `championship` | 12 | 42% | 🔴 -18.4% | 0.246 |
| `conferenceleague` | 12 | 67% | 🔴 -3.4% | 0.2033 |
| `chn.1` | 8 | 88% | 🟢 +40.7% | 0.2001 |
| `fra.2` | 8 | 38% | 🔴 -27.6% | 0.1754 |
| `bundesliga2` | 6 | 50% | 🔴 -4.3% | 0.2191 |
| `jleague` | 6 | 33% | 🔴 -31.6% | 0.2015 |
| `eng.1` | 5 | 60% | 🟢 +10.8% | 0.1814 |
| `ger.1` | 5 | 80% | 🟢 +16.2% | 0.1303 |
| `ita.2` | 5 | 40% | 🔴 -22.0% | 0.2167 |
