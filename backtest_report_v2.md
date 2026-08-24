# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-24T04:33:24Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 263 picks sur 2026-08-12T17:40Z → 2026-08-23T18:45Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 262.29u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **263 picks** · 152 gagnés / 111 perdus · WR **57.8%**
- ROI flat (1u/pick) : **+14.14%** (+37.18u cumulé)
- Kelly 0.25× cap 10% : cumulé **+162.29u**
- Cote moyenne : 2.11 · Pick prob moyenne : 51.6%
- **Brier** : 0.229 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6485 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **2622.87€** (+162.3%) · DD max 14.8% · Sharpe/pick +0.160

## Séries

- Streak courante : 🔥 **3** wins consécutifs
- Plus longue série gagnante : **9**
- Plus longue série perdante : **7**
- Top run win : 9 picks (2026-08-15T19:30Z → 2026-08-15T21:30Z)
- Top run lose : 7 picks (2026-08-15T14:00Z → 2026-08-15T14:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 263 | 58% | 52–64% | 🟢 +14.1% | +162.29u | 0.229 | +0.2pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 263 | 0.0621 | 0.177 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 227 | 59% | 🟢 +18.5% | +162.29u | 0.2243 |
| baseball | 33 | 45% | 🔴 -19.9% | +0.00u | 0.2669 |
| basketball | 3 | 100% | 🟢 +61.7% | +0.00u | 0.1682 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 203 | 58% | 🟢 +16.4% | 0.2238 |
| `baseball:all` | 33 | 45% | 🔴 -19.9% | 0.2669 |
| `football:top5` | 24 | 71% | 🟢 +36.2% | 0.2284 |
| `basketball:all` | 3 | 100% | 🟢 +61.7% | 0.1682 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 39 | 79% | 🟢 +8.8% | 0.1629 |
| fav | 108 | 64% | 🟢 +12.4% | 0.2336 |
| toss_up | 72 | 46% | 🟢 +5.9% | 0.2508 |
| dog | 44 | 43% | 🟢 +36.5% | 0.2404 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 51 | 36.5% | 43.1% | 🟢 +6.6% |
| [0.4–0.5] | 80 | 44.7% | 50.0% | 🟢 +5.3% |
| [0.5–0.6] | 67 | 54.9% | 61.2% | 🟢 +6.3% |
| [0.6–0.7] | 42 | 64.3% | 71.4% | 🟢 +7.1% |
| [0.7–0.8] | 18 | 74.3% | 77.8% | ⚪ +3.5% |
| [0.8–0.9] | 5 | 82.3% | 100.0% | 🟢 +17.7% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 33 | 45% | 🔴 -19.9% | 0.2669 |
| `ita.coppa_italia` | 16 | 88% | 🟢 +43.6% | 0.2023 |
| `eng.3` | 12 | 58% | 🟢 +36.7% | 0.2553 |
| `eng.4` | 12 | 58% | 🟢 +36.8% | 0.2743 |
| `chn.1` | 10 | 40% | 🔴 -24.6% | 0.2095 |
| `esp.2` | 10 | 60% | 🟢 +7.6% | 0.2353 |
| `jpn.1` | 10 | 60% | 🟢 +17.6% | 0.21 |
| `arg.1` | 9 | 67% | 🟢 +52.6% | 0.2587 |
| `bel.1` | 9 | 44% | 🔴 -22.4% | 0.2178 |
| `eng.1` | 9 | 56% | 🟢 +2.0% | 0.2373 |
