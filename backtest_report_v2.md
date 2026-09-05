# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-05T07:53:52Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 600 picks sur 2026-08-15T14:00Z → 2026-09-04T19:45Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 184659.46u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **600 picks** · 375 gagnés / 225 perdus · WR **62.5%**
- ROI flat (1u/pick) : **+29.41%** (+176.45u cumulé)
- Kelly 0.25× cap 10% : cumulé **+184559.46u**
- Cote moyenne : 2.12 · Pick prob moyenne : 53.6%
- **Brier** : 0.2265 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6422 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1846594.63€** (+184559.5%) · DD max 23.0% · Sharpe/pick +0.354

## Séries

- Streak courante : 🔥 **3** wins consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **5**
- Top run win : 10 picks (2026-08-31T17:30Z → 2026-08-31T19:30Z)
- Top run lose : 5 picks (2026-08-19T17:10Z → 2026-08-19T21:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 600 | 62% | 59–66% | 🟢 +29.4% | +184559.46u | 0.2265 | +2.2pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 600 | 0.0887 | 0.755 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 540 | 64% | 🟢 +34.0% | +184559.46u | 0.2243 |
| baseball | 53 | 47% | 🔴 -18.5% | +0.00u | 0.2553 |
| basketball | 7 | 86% | 🟢 +35.9% | +0.00u | 0.1808 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 452 | 63% | 🟢 +34.4% | 0.2252 |
| `football:top5` | 88 | 66% | 🟢 +32.1% | 0.2198 |
| `baseball:all` | 53 | 47% | 🔴 -18.5% | 0.2553 |
| `basketball:all` | 7 | 86% | 🟢 +35.9% | 0.1808 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 94 | 80% | 🟢 +7.0% | 0.147 |
| fav | 237 | 59% | 🟢 +4.0% | 0.2242 |
| toss_up | 165 | 61% | 🟢 +42.2% | 0.2494 |
| dog | 103 | 55% | 🟢 +81.3% | 0.2646 |
| heavy_dog | 1 | 100% | 🟢 +700.0% | 0.57 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.2–0.3] | 1 | 24.5% | 100.0% | 🟢 +75.5% |
| [0.3–0.4] | 87 | 36.7% | 55.2% | 🟢 +18.5% |
| [0.4–0.5] | 178 | 45.3% | 50.6% | 🟢 +5.3% |
| [0.5–0.6] | 173 | 55.0% | 60.1% | 🟢 +5.1% |
| [0.6–0.7] | 84 | 64.2% | 75.0% | 🟢 +10.8% |
| [0.7–0.8] | 52 | 74.4% | 86.5% | 🟢 +12.2% |
| [0.8–0.9] | 21 | 83.8% | 95.2% | 🟢 +11.4% |
| [0.9–1.0] | 4 | 92.2% | 100.0% | 🟢 +7.8% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 53 | 47% | 🔴 -18.5% | 0.2553 |
| `eng.4` | 34 | 68% | 🟢 +70.9% | 0.2568 |
| `eng.2` | 33 | 67% | 🟢 +70.2% | 0.2376 |
| `eng.3` | 32 | 69% | 🟢 +65.0% | 0.2345 |
| `bel.1` | 21 | 62% | 🟢 +15.7% | 0.1906 |
| `eng.1` | 21 | 62% | 🟢 +18.5% | 0.2395 |
| `esp.2` | 21 | 62% | 🟢 +47.3% | 0.2093 |
| `fra.1` | 20 | 65% | 🟢 +68.8% | 0.253 |
| `jpn.1` | 20 | 60% | 🟢 +29.5% | 0.2319 |
| `ita.1` | 19 | 74% | 🟢 +22.3% | 0.1869 |
