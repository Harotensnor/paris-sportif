# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-22T04:20:15Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 305 picks sur 2026-08-09T14:00Z → 2026-08-21T19:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 178.33u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **305 picks** · 164 gagnés / 141 perdus · WR **53.8%**
- ROI flat (1u/pick) : **+3.17%** (+9.66u cumulé)
- Kelly 0.25× cap 10% : cumulé **+78.33u**
- Cote moyenne : 2.03 · Pick prob moyenne : 51.8%
- **Brier** : 0.2342 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6615 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1783.28€** (+78.3%) · DD max 12.8% · Sharpe/pick +0.123

## Séries

- Streak courante : 🔥 **3** wins consécutifs
- Plus longue série gagnante : **7**
- Plus longue série perdante : **9**
- Top run win : 7 picks (2026-08-14T19:15Z → 2026-08-15T09:00Z)
- Top run lose : 9 picks (2026-08-15T13:00Z → 2026-08-15T14:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 305 | 54% | 48–59% | 🟢 +3.2% | +78.33u | 0.2342 | -1.0pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 305 | 0.0335 | 0.081 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 251 | 54% | 🟢 +6.5% | +78.33u | 0.2312 |
| baseball | 47 | 47% | 🔴 -19.1% | +0.00u | 0.2603 |
| basketball | 7 | 86% | 🟢 +32.0% | +0.00u | 0.167 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 248 | 54% | 🟢 +5.8% | 0.232 |
| `baseball:all` | 47 | 47% | 🔴 -19.1% | 0.2603 |
| `basketball:all` | 7 | 86% | 🟢 +32.0% | 0.167 |
| `football:top5` | 3 | 100% | 🟢 +69.2% | 0.1688 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 46 | 70% | 🔴 -5.0% | 0.2134 |
| fav | 142 | 59% | 🟢 +4.3% | 0.2378 |
| toss_up | 78 | 44% | 🟢 +0.2% | 0.2429 |
| dog | 39 | 36% | 🟢 +14.7% | 0.2285 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 62 | 36.5% | 37.1% | ⚪ +0.6% |
| [0.4–0.5] | 83 | 45.0% | 44.6% | ⚪ -0.5% |
| [0.5–0.6] | 87 | 55.1% | 63.2% | 🟢 +8.1% |
| [0.6–0.7] | 47 | 64.5% | 66.0% | ⚪ +1.5% |
| [0.7–0.8] | 21 | 74.1% | 66.7% | 🔴 -7.5% |
| [0.8–0.9] | 5 | 82.1% | 80.0% | ⚪ -2.1% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 47 | 47% | 🔴 -19.1% | 0.2603 |
| `ita.coppa_italia` | 18 | 89% | 🟢 +48.9% | 0.2079 |
| `por.1` | 13 | 46% | 🔴 -30.4% | 0.2248 |
| `arg.1` | 12 | 67% | 🟢 +47.5% | 0.256 |
| `eng.3` | 12 | 58% | 🟢 +36.7% | 0.2553 |
| `eng.4` | 12 | 58% | 🟢 +36.8% | 0.2743 |
| `swe.1` | 12 | 58% | 🟢 +15.6% | 0.2643 |
| `chn.1` | 10 | 40% | 🔴 -24.6% | 0.2044 |
| `esp.2` | 10 | 60% | 🟢 +7.6% | 0.2353 |
| `jpn.1` | 10 | 60% | 🟢 +23.6% | 0.2194 |
