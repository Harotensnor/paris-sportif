# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-07T10:45:07Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 332 picks sur 2026-10-29T16:30Z → 2026-11-07T08:40Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 988.56u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **332 picks** · 206 gagnés / 126 perdus · WR **62.0%**
- ROI flat (1u/pick) : **+16.79%** (+55.73u cumulé)
- Kelly 0.25× cap 10% : cumulé **+888.56u**
- Cote moyenne : 2.00 · Pick prob moyenne : 55.1%
- **Brier** : 0.2132 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6137 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **9885.57€** (+888.6%) · DD max 13.1% · Sharpe/pick +0.268

## Séries

- Streak courante : ❄️ **1** loses consécutifs
- Plus longue série gagnante : **12**
- Plus longue série perdante : **6**
- Top run win : 12 picks (2026-10-30T17:30Z → 2026-10-31T06:00Z)
- Top run lose : 6 picks (2026-10-31T19:00Z → 2026-10-31T19:45Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 3 | 67% | 21–94% | 🟢 +36.7% | +7.48u | 0.2096 | +10.8pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 329 | 62% | 57–67% | 🟢 +16.6% | +881.08u | 0.2133 | +0.4pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 3 | 0.1567 | 0.356 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 329 | 0.0753 | 0.134 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 302 | 61% | 🟢 +17.5% | +888.56u | 0.2138 |
| basketball | 20 | 70% | 🔴 -0.3% | +0.00u | 0.2128 |
| hockey | 10 | 80% | 🟢 +28.7% | +0.00u | 0.1969 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 262 | 60% | 🟢 +17.2% | 0.2198 |
| `football:top5` | 40 | 65% | 🟢 +19.8% | 0.1744 |
| `basketball:all` | 20 | 70% | 🔴 -0.3% | 0.2128 |
| `hockey:all` | 10 | 80% | 🟢 +28.7% | 0.1969 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 76 | 80% | 🟢 +5.1% | 0.1473 |
| fav | 124 | 60% | 🟢 +6.2% | 0.2274 |
| toss_up | 88 | 60% | 🟢 +38.8% | 0.2458 |
| dog | 44 | 39% | 🟢 +22.7% | 0.2221 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 53 | 35.7% | 34.0% | ⚪ -1.7% |
| [0.4–0.5] | 80 | 45.4% | 56.2% | 🟢 +10.8% |
| [0.5–0.6] | 83 | 54.7% | 60.2% | 🟢 +5.5% |
| [0.6–0.7] | 63 | 64.3% | 73.0% | 🟢 +8.8% |
| [0.7–0.8] | 32 | 74.1% | 87.5% | 🟢 +13.4% |
| [0.8–0.9] | 17 | 83.8% | 88.2% | ⚪ +4.5% |
| [0.9–1.0] | 4 | 91.9% | 100.0% | 🟢 +8.1% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `eng.2` | 20 | 65% | 🟢 +29.9% | 0.1917 |
| `nba` | 17 | 71% | 🟢 +1.1% | 0.2079 |
| `europaleague` | 15 | 47% | 🔴 -14.4% | 0.248 |
| `jpn.1` | 15 | 67% | 🟢 +43.3% | 0.2142 |
| `eng.3` | 14 | 43% | 🔴 -17.9% | 0.2267 |
| `conferenceleague` | 12 | 75% | 🟢 +20.4% | 0.2136 |
| `eng.1` | 10 | 70% | 🟢 +51.6% | 0.2187 |
| `eng.4` | 10 | 60% | 🟢 +22.1% | 0.2319 |
| `ita.2` | 10 | 50% | 🟢 +26.9% | 0.238 |
| `nhl` | 10 | 80% | 🟢 +28.7% | 0.1969 |
