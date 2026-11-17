# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-17T12:34:43Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 210 picks sur 2026-11-07T10:30Z → 2026-11-17T02:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 144.1u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **210 picks** · 123 gagnés / 87 perdus · WR **58.6%**
- ROI flat (1u/pick) : **+3.45%** (+7.25u cumulé)
- Kelly 0.25× cap 10% : cumulé **+44.10u**
- Cote moyenne : 1.97 · Pick prob moyenne : 54.2%
- **Brier** : 0.2066 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.598 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1441.03€** (+44.1%) · DD max 25.1% · Sharpe/pick +0.113

## Séries

- Streak courante : ❄️ **2** loses consécutifs
- Plus longue série gagnante : **11**
- Plus longue série perdante : **6**
- Top run win : 11 picks (2026-11-15T18:00Z → 2026-11-16T01:00Z)
- Top run lose : 6 picks (2026-11-08T03:10Z → 2026-11-08T06:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 4 | 50% | 15–85% | 🟢 +25.0% | +6.72u | 0.2713 | +6.6pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 206 | 59% | 52–65% | 🟢 +3.0% | +37.39u | 0.2054 | -1.7pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 4 | 0.0315 | 0.046 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 206 | 0.0695 | 0.208 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 189 | 57% | 🟢 +2.7% | +36.52u | 0.2072 |
| hockey | 11 | 45% | 🔴 -19.9% | -1.10u | 0.2808 |
| basketball | 10 | 100% | 🟢 +44.2% | +8.68u | 0.1141 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 149 | 55% | 🔴 -1.7% | 0.2065 |
| `football:top5` | 40 | 65% | 🟢 +18.9% | 0.21 |
| `hockey:all` | 11 | 45% | 🔴 -19.9% | 0.2808 |
| `basketball:all` | 10 | 100% | 🟢 +44.2% | 0.1141 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 53 | 87% | 🟢 +9.7% | 0.1134 |
| fav | 80 | 60% | 🟢 +8.2% | 0.2476 |
| toss_up | 50 | 46% | 🟢 +5.9% | 0.2519 |
| dog | 27 | 22% | 🔴 -27.4% | 0.1846 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 37 | 35.7% | 29.7% | 🔴 -6.0% |
| [0.4–0.5] | 60 | 45.6% | 51.7% | 🟢 +6.1% |
| [0.5–0.6] | 41 | 54.8% | 53.7% | ⚪ -1.1% |
| [0.6–0.7] | 37 | 63.6% | 67.6% | ⚪ +4.0% |
| [0.7–0.8] | 25 | 75.2% | 96.0% | 🟢 +20.8% |
| [0.8–0.9] | 8 | 84.2% | 100.0% | 🟢 +15.8% |
| [0.9–1.0] | 2 | 93.0% | 100.0% | 🟢 +7.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `uefa.nations` | 20 | 65% | 🔴 -2.5% | 0.1683 |
| `championship` | 11 | 45% | 🔴 -10.9% | 0.2793 |
| `nhl` | 11 | 45% | 🔴 -19.9% | 0.2808 |
| `eng.4` | 10 | 80% | 🟢 +66.6% | 0.2883 |
| `eng.1` | 9 | 56% | 🟢 +3.6% | 0.228 |
| `laliga2` | 9 | 44% | 🔴 -8.3% | 0.2541 |
| `nba` | 9 | 100% | 🟢 +49.0% | 0.1265 |
| `chn.1` | 8 | 88% | 🟢 +40.7% | 0.1813 |
| `esp.1` | 8 | 50% | 🔴 -9.6% | 0.208 |
| `ger.1` | 8 | 88% | 🟢 +31.9% | 0.1329 |
