# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-08T08:23:17Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 759 picks sur 2026-08-16T10:15Z → 2026-09-07T19:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 1187942.69u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **759 picks** · 449 gagnés / 310 perdus · WR **59.2%**
- ROI flat (1u/pick) : **+21.93%** (+166.47u cumulé)
- Kelly 0.25× cap 10% : cumulé **+1187842.69u**
- Cote moyenne : 2.16 · Pick prob moyenne : 53.8%
- **Brier** : 0.2197 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6282 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **11879426.93€** (+1187842.7%) · DD max 12.2% · Sharpe/pick +0.336

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **9**
- Plus longue série perdante : **5**
- Top run win : 9 picks (2026-09-03T16:00Z → 2026-09-03T18:45Z)
- Top run lose : 5 picks (2026-08-19T17:10Z → 2026-08-19T21:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 759 | 59% | 56–63% | 🟢 +21.9% | +1187842.69u | 0.2197 | +2.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 759 | 0.0537 | 0.755 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 684 | 60% | 🟢 +25.3% | +1187842.69u | 0.2173 |
| baseball | 69 | 51% | 🔴 -13.2% | +0.00u | 0.2447 |
| basketball | 6 | 83% | 🟢 +37.7% | +0.00u | 0.2012 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 556 | 58% | 🟢 +19.1% | 0.2169 |
| `football:top5` | 128 | 68% | 🟢 +52.6% | 0.219 |
| `baseball:all` | 69 | 51% | 🔴 -13.2% | 0.2447 |
| `basketball:all` | 6 | 83% | 🟢 +37.7% | 0.2012 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 112 | 79% | 🟢 +5.3% | 0.1522 |
| fav | 303 | 59% | 🟢 +3.1% | 0.2213 |
| toss_up | 203 | 60% | 🟢 +37.6% | 0.2386 |
| dog | 138 | 43% | 🟢 +44.8% | 0.2387 |
| heavy_dog | 3 | 67% | 🟢 +433.3% | 0.4169 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.2–0.3] | 2 | 24.5% | 100.0% | 🟢 +75.5% |
| [0.3–0.4] | 123 | 36.7% | 37.4% | ⚪ +0.7% |
| [0.4–0.5] | 190 | 45.4% | 46.3% | ⚪ +0.9% |
| [0.5–0.6] | 231 | 54.9% | 60.2% | 🟢 +5.2% |
| [0.6–0.7] | 120 | 63.8% | 77.5% | 🟢 +13.7% |
| [0.7–0.8] | 62 | 74.8% | 82.3% | 🟢 +7.5% |
| [0.8–0.9] | 27 | 84.3% | 96.3% | 🟢 +12.0% |
| [0.9–1.0] | 4 | 91.7% | 100.0% | 🟢 +8.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 69 | 51% | 🔴 -13.2% | 0.2447 |
| `eng.2` | 39 | 62% | 🟢 +44.5% | 0.2237 |
| `eng.4` | 36 | 64% | 🟢 +59.2% | 0.2427 |
| `eng.3` | 35 | 46% | 🟢 +0.8% | 0.2041 |
| `eng.1` | 30 | 60% | 🟢 +41.2% | 0.2092 |
| `jpn.1` | 30 | 50% | 🟢 +0.6% | 0.217 |
| `ita.1` | 28 | 93% | 🟢 +102.8% | 0.2066 |
| `esp.1` | 27 | 59% | 🟢 +17.1% | 0.1929 |
| `esp.2` | 27 | 56% | 🟢 +23.2% | 0.1977 |
| `fra.1` | 26 | 69% | 🟢 +86.7% | 0.2525 |
