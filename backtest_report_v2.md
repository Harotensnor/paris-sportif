# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-12T08:10:59Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 825 picks sur 2026-08-16T12:00Z → 2026-09-11T21:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 1788228.63u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **825 picks** · 496 gagnés / 329 perdus · WR **60.1%**
- ROI flat (1u/pick) : **+22.87%** (+188.66u cumulé)
- Kelly 0.25× cap 10% : cumulé **+1788128.63u**
- Cote moyenne : 2.14 · Pick prob moyenne : 54.1%
- **Brier** : 0.2203 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6297 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **17882286.27€** (+1788128.6%) · DD max 14.8% · Sharpe/pick +0.327

## Séries

- Streak courante : ❄️ **1** loses consécutifs
- Plus longue série gagnante : **13**
- Plus longue série perdante : **5**
- Top run win : 13 picks (2026-09-09T16:45Z → 2026-09-09T19:00Z)
- Top run lose : 5 picks (2026-08-19T17:10Z → 2026-08-19T21:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 825 | 60% | 57–63% | 🟢 +22.9% | +1788128.63u | 0.2203 | +2.6pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 825 | 0.0616 | 0.755 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 744 | 61% | 🟢 +26.1% | +1788128.63u | 0.2179 |
| baseball | 75 | 52% | 🔴 -10.8% | +0.00u | 0.2462 |
| basketball | 6 | 83% | 🟢 +37.7% | +0.00u | 0.2012 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 612 | 59% | 🟢 +20.8% | 0.2179 |
| `football:top5` | 132 | 67% | 🟢 +51.1% | 0.2176 |
| `baseball:all` | 75 | 52% | 🔴 -10.8% | 0.2462 |
| `basketball:all` | 6 | 83% | 🟢 +37.7% | 0.2012 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 125 | 79% | 🟢 +4.8% | 0.1507 |
| fav | 338 | 60% | 🟢 +4.7% | 0.222 |
| toss_up | 212 | 60% | 🟢 +38.2% | 0.2405 |
| dog | 147 | 45% | 🟢 +49.4% | 0.2426 |
| heavy_dog | 3 | 67% | 🟢 +433.3% | 0.4169 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.2–0.3] | 2 | 24.5% | 100.0% | 🟢 +75.5% |
| [0.3–0.4] | 135 | 36.5% | 38.5% | ⚪ +2.1% |
| [0.4–0.5] | 194 | 45.4% | 48.5% | ⚪ +3.0% |
| [0.5–0.6] | 262 | 54.9% | 60.7% | 🟢 +5.7% |
| [0.6–0.7] | 128 | 64.0% | 76.6% | 🟢 +12.6% |
| [0.7–0.8] | 60 | 74.6% | 83.3% | 🟢 +8.7% |
| [0.8–0.9] | 38 | 84.6% | 94.7% | 🟢 +10.2% |
| [0.9–1.0] | 6 | 91.4% | 83.3% | 🔴 -8.1% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 75 | 52% | 🔴 -10.8% | 0.2462 |
| `eng.2` | 49 | 59% | 🟢 +31.4% | 0.2153 |
| `eng.3` | 36 | 50% | 🟢 +16.1% | 0.2165 |
| `eng.4` | 36 | 64% | 🟢 +59.2% | 0.2427 |
| `jpn.1` | 32 | 53% | 🟢 +7.7% | 0.2159 |
| `eng.1` | 30 | 60% | 🟢 +41.2% | 0.2092 |
| `ita.1` | 29 | 86% | 🟢 +83.2% | 0.1982 |
| `esp.1` | 28 | 61% | 🟢 +19.4% | 0.1895 |
| `esp.2` | 28 | 57% | 🟢 +24.5% | 0.196 |
| `fra.1` | 27 | 74% | 🟢 +101.6% | 0.262 |
