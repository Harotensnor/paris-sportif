# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-14T09:19:40Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 978 picks sur 2026-08-16T20:30Z → 2026-09-13T21:05Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 2496609.12u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **978 picks** · 570 gagnés / 408 perdus · WR **58.3%**
- ROI flat (1u/pick) : **+18.94%** (+185.20u cumulé)
- Kelly 0.25× cap 10% : cumulé **+2496509.12u**
- Cote moyenne : 2.14 · Pick prob moyenne : 53.8%
- **Brier** : 0.2217 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.632 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **24966091.24€** (+2496509.1%) · DD max 33.4% · Sharpe/pick +0.295

## Séries

- Streak courante : 🔥 **2** wins consécutifs
- Plus longue série gagnante : **13**
- Plus longue série perdante : **6**
- Top run win : 13 picks (2026-09-09T16:45Z → 2026-09-09T19:00Z)
- Top run lose : 6 picks (2026-09-12T14:00Z → 2026-09-12T14:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 978 | 58% | 55–61% | 🟢 +18.9% | +2496509.12u | 0.2217 | +2.4pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 978 | 0.0454 | 0.755 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 894 | 59% | 🟢 +21.3% | +2496509.12u | 0.2202 |
| baseball | 78 | 54% | 🔴 -9.4% | +0.00u | 0.2411 |
| basketball | 6 | 83% | 🟢 +37.7% | +0.00u | 0.2012 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 724 | 58% | 🟢 +17.7% | 0.2208 |
| `football:top5` | 170 | 62% | 🟢 +36.5% | 0.2175 |
| `baseball:all` | 78 | 54% | 🔴 -9.4% | 0.2411 |
| `basketball:all` | 6 | 83% | 🟢 +37.7% | 0.2012 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 151 | 79% | 🟢 +4.4% | 0.1456 |
| fav | 387 | 57% | 🔴 -0.9% | 0.2257 |
| toss_up | 258 | 57% | 🟢 +32.6% | 0.2433 |
| dog | 179 | 45% | 🟢 +49.3% | 0.2437 |
| heavy_dog | 3 | 67% | 🟢 +330.0% | 0.3792 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.2–0.3] | 1 | 24.5% | 100.0% | 🟢 +75.5% |
| [0.3–0.4] | 176 | 36.8% | 41.5% | ⚪ +4.7% |
| [0.4–0.5] | 237 | 45.2% | 46.0% | ⚪ +0.8% |
| [0.5–0.6] | 290 | 55.0% | 59.3% | ⚪ +4.3% |
| [0.6–0.7] | 148 | 64.3% | 68.9% | ⚪ +4.7% |
| [0.7–0.8] | 75 | 74.7% | 85.3% | 🟢 +10.7% |
| [0.8–0.9] | 44 | 85.0% | 97.7% | 🟢 +12.7% |
| [0.9–1.0] | 7 | 91.3% | 85.7% | 🔴 -5.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 78 | 54% | 🔴 -9.4% | 0.2411 |
| `eng.2` | 59 | 59% | 🟢 +32.8% | 0.219 |
| `eng.3` | 47 | 51% | 🟢 +19.8% | 0.2536 |
| `eng.4` | 47 | 57% | 🟢 +38.3% | 0.2396 |
| `jpn.1` | 40 | 52% | 🟢 +10.4% | 0.2233 |
| `eng.1` | 39 | 62% | 🟢 +56.2% | 0.2475 |
| `esp.1` | 36 | 50% | 🔴 -8.7% | 0.1889 |
| `fra.1` | 35 | 60% | 🟢 +40.5% | 0.2322 |
| `ita.1` | 35 | 77% | 🟢 +64.2% | 0.2069 |
| `esp.2` | 32 | 53% | 🟢 +19.8% | 0.2171 |
