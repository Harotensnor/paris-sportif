# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-20T04:24:26Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 360 picks sur 2026-08-08T11:00Z → 2026-08-19T21:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 167.38u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **360 picks** · 193 gagnés / 167 perdus · WR **53.6%**
- ROI flat (1u/pick) : **+0.95%** (+3.43u cumulé)
- Kelly 0.25× cap 10% : cumulé **+67.38u**
- Cote moyenne : 2.01 · Pick prob moyenne : 51.9%
- **Brier** : 0.2307 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6546 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1673.83€** (+67.4%) · DD max 12.8% · Sharpe/pick +0.100

## Séries

- Streak courante : ❄️ **5** loses consécutifs
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
| `skip` | 360 | 54% | 48–59% | 🟢 +0.9% | +67.38u | 0.2307 | -1.3pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 360 | 0.0443 | 0.221 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 306 | 54% | 🟢 +3.3% | +67.38u | 0.2276 |
| baseball | 47 | 47% | 🔴 -19.1% | +0.00u | 0.2603 |
| basketball | 7 | 86% | 🟢 +32.0% | +0.00u | 0.167 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 306 | 54% | 🟡 +3.3% | 0.2276 |
| `baseball:all` | 47 | 47% | 🔴 -19.1% | 0.2603 |
| `basketball:all` | 7 | 86% | 🟢 +32.0% | 0.167 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 58 | 71% | 🔴 -3.2% | 0.2126 |
| fav | 165 | 61% | 🟢 +6.2% | 0.2361 |
| toss_up | 94 | 40% | 🔴 -7.2% | 0.238 |
| dog | 43 | 33% | 🟢 +4.1% | 0.2186 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 73 | 36.6% | 35.6% | ⚪ -0.9% |
| [0.4–0.5] | 95 | 44.9% | 42.1% | ⚪ -2.7% |
| [0.5–0.6] | 102 | 55.0% | 63.7% | 🟢 +8.7% |
| [0.6–0.7] | 60 | 64.6% | 68.3% | ⚪ +3.8% |
| [0.7–0.8] | 25 | 73.8% | 72.0% | ⚪ -1.8% |
| [0.8–0.9] | 5 | 82.1% | 60.0% | 🔴 -22.1% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 47 | 47% | 🔴 -19.1% | 0.2603 |
| `eng.league_cup` | 29 | 62% | 🟢 +1.1% | 0.1816 |
| `ita.coppa_italia` | 18 | 89% | 🟢 +48.9% | 0.2079 |
| `ned.1` | 17 | 59% | 🔴 -3.6% | 0.2532 |
| `bel.1` | 15 | 67% | 🟢 +26.9% | 0.2222 |
| `ger.2` | 15 | 40% | 🔴 -11.1% | 0.2333 |
| `swe.1` | 14 | 57% | 🟢 +10.0% | 0.2659 |
| `chn.1` | 13 | 38% | 🔴 -26.2% | 0.2079 |
| `por.1` | 13 | 46% | 🔴 -30.4% | 0.2248 |
| `arg.1` | 12 | 67% | 🟢 +47.5% | 0.256 |
