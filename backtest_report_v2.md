# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-15T09:01:20Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 987 picks sur 2026-08-17T16:00Z → 2026-09-14T19:45Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 2602494.28u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **987 picks** · 573 gagnés / 414 perdus · WR **58.1%**
- ROI flat (1u/pick) : **+18.10%** (+178.61u cumulé)
- Kelly 0.25× cap 10% : cumulé **+2602394.28u**
- Cote moyenne : 2.13 · Pick prob moyenne : 53.9%
- **Brier** : 0.2209 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6302 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **26024942.83€** (+2602394.3%) · DD max 33.4% · Sharpe/pick +0.295

## Séries

- Streak courante : 🔥 **1** wins consécutifs
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
| `skip` | 987 | 58% | 55–61% | 🟢 +18.1% | +2602394.28u | 0.2209 | +2.4pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 987 | 0.0425 | 0.755 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 905 | 58% | 🟢 +20.5% | +2602394.28u | 0.2193 |
| baseball | 78 | 54% | 🔴 -9.4% | +0.00u | 0.2411 |
| basketball | 4 | 75% | 🟢 +16.6% | +0.00u | 0.1903 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 730 | 57% | 🟢 +16.7% | 0.2203 |
| `football:top5` | 175 | 63% | 🟢 +36.2% | 0.215 |
| `baseball:all` | 78 | 54% | 🔴 -9.4% | 0.2411 |
| `basketball:all` | 4 | 75% | 🟢 +16.6% | 0.1903 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 160 | 79% | 🟢 +4.4% | 0.1456 |
| fav | 384 | 56% | 🔴 -2.6% | 0.2252 |
| toss_up | 261 | 57% | 🟢 +31.9% | 0.2433 |
| dog | 179 | 45% | 🟢 +49.3% | 0.2437 |
| heavy_dog | 3 | 67% | 🟢 +330.0% | 0.3792 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.2–0.3] | 1 | 24.5% | 100.0% | 🟢 +75.5% |
| [0.3–0.4] | 176 | 36.8% | 41.5% | ⚪ +4.7% |
| [0.4–0.5] | 240 | 45.1% | 45.0% | ⚪ -0.1% |
| [0.5–0.6] | 288 | 54.9% | 58.3% | ⚪ +3.4% |
| [0.6–0.7] | 150 | 64.2% | 69.3% | 🟢 +5.1% |
| [0.7–0.8] | 78 | 74.7% | 85.9% | 🟢 +11.2% |
| [0.8–0.9] | 47 | 84.9% | 97.9% | 🟢 +13.0% |
| [0.9–1.0] | 7 | 91.3% | 85.7% | 🔴 -5.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 78 | 54% | 🔴 -9.4% | 0.2411 |
| `eng.2` | 59 | 59% | 🟢 +32.8% | 0.219 |
| `eng.3` | 47 | 51% | 🟢 +19.8% | 0.2536 |
| `eng.4` | 47 | 57% | 🟢 +38.3% | 0.2396 |
| `eng.1` | 40 | 62% | 🟢 +58.2% | 0.2493 |
| `jpn.1` | 40 | 52% | 🟢 +10.4% | 0.2233 |
| `ita.1` | 38 | 79% | 🟢 +61.4% | 0.1937 |
| `esp.1` | 37 | 49% | 🔴 -11.2% | 0.1895 |
| `fra.1` | 35 | 60% | 🟢 +40.5% | 0.2322 |
| `esp.2` | 32 | 53% | 🟢 +19.8% | 0.2171 |
