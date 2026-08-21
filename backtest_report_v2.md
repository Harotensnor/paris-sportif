# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-21T04:26:34Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 317 picks sur 2026-08-09T09:00Z → 2026-08-19T21:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 176.52u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **317 picks** · 169 gagnés / 148 perdus · WR **53.3%**
- ROI flat (1u/pick) : **+2.39%** (+7.56u cumulé)
- Kelly 0.25× cap 10% : cumulé **+76.52u**
- Cote moyenne : 2.03 · Pick prob moyenne : 51.7%
- **Brier** : 0.2348 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6628 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1765.22€** (+76.5%) · DD max 12.8% · Sharpe/pick +0.118

## Séries

- Streak courante : ❄️ **5** loses consécutifs
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
| `skip` | 317 | 53% | 48–59% | 🟢 +2.4% | +76.52u | 0.2348 | -1.0pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 317 | 0.0332 | 0.076 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 263 | 54% | 🟢 +5.4% | +76.52u | 0.2321 |
| baseball | 47 | 47% | 🔴 -19.1% | +0.00u | 0.2603 |
| basketball | 7 | 86% | 🟢 +32.0% | +0.00u | 0.167 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 263 | 54% | 🟢 +5.4% | 0.2321 |
| `baseball:all` | 47 | 47% | 🔴 -19.1% | 0.2603 |
| `basketball:all` | 7 | 86% | 🟢 +32.0% | 0.167 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 47 | 68% | 🔴 -6.6% | 0.2201 |
| fav | 147 | 59% | 🟢 +4.3% | 0.2375 |
| toss_up | 83 | 43% | 🔴 -0.4% | 0.2427 |
| dog | 40 | 35% | 🟢 +11.9% | 0.2259 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 64 | 36.5% | 37.5% | ⚪ +1.0% |
| [0.4–0.5] | 87 | 44.9% | 43.7% | ⚪ -1.2% |
| [0.5–0.6] | 91 | 55.0% | 62.6% | 🟢 +7.6% |
| [0.6–0.7] | 49 | 64.6% | 65.3% | ⚪ +0.7% |
| [0.7–0.8] | 22 | 74.0% | 68.2% | 🔴 -5.8% |
| [0.8–0.9] | 4 | 82.5% | 75.0% | 🔴 -7.5% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 47 | 47% | 🔴 -19.1% | 0.2603 |
| `ita.coppa_italia` | 18 | 89% | 🟢 +48.9% | 0.2079 |
| `swe.1` | 14 | 57% | 🟢 +10.0% | 0.2659 |
| `chn.1` | 13 | 38% | 🔴 -26.2% | 0.2079 |
| `por.1` | 13 | 46% | 🔴 -30.4% | 0.2248 |
| `arg.1` | 12 | 67% | 🟢 +47.5% | 0.256 |
| `eng.3` | 12 | 58% | 🟢 +36.7% | 0.2553 |
| `eng.4` | 12 | 58% | 🟢 +36.8% | 0.2743 |
| `jpn.1` | 12 | 50% | 🟢 +3.0% | 0.2099 |
| `bel.1` | 11 | 64% | 🟢 +26.4% | 0.2355 |
