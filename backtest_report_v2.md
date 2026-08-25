# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-25T04:27:20Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 276 picks sur 2026-08-12T19:40Z → 2026-08-24T22:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 298.53u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **276 picks** · 163 gagnés / 113 perdus · WR **59.1%**
- ROI flat (1u/pick) : **+16.27%** (+44.90u cumulé)
- Kelly 0.25× cap 10% : cumulé **+198.53u**
- Cote moyenne : 2.10 · Pick prob moyenne : 51.8%
- **Brier** : 0.2267 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6434 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **2985.32€** (+198.5%) · DD max 13.4% · Sharpe/pick +0.173

## Séries

- Streak courante : 🔥 **2** wins consécutifs
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
| `skip` | 276 | 59% | 53–65% | 🟢 +16.3% | +198.53u | 0.2267 | +0.2pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 276 | 0.0731 | 0.177 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 243 | 60% | 🟢 +20.6% | +198.53u | 0.2221 |
| baseball | 30 | 43% | 🔴 -23.2% | +0.00u | 0.2694 |
| basketball | 3 | 100% | 🟢 +61.7% | +0.00u | 0.1682 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 214 | 59% | 🟢 +18.5% | 0.2204 |
| `baseball:all` | 30 | 43% | 🔴 -23.2% | 0.2694 |
| `football:top5` | 29 | 69% | 🟢 +36.1% | 0.2348 |
| `basketball:all` | 3 | 100% | 🟢 +61.7% | 0.1682 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 42 | 81% | 🟢 +9.4% | 0.1535 |
| fav | 112 | 65% | 🟢 +14.7% | 0.2299 |
| toss_up | 75 | 48% | 🟢 +11.1% | 0.2547 |
| dog | 47 | 43% | 🟢 +34.3% | 0.2396 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 56 | 36.5% | 44.6% | 🟢 +8.1% |
| [0.4–0.5] | 80 | 44.7% | 48.7% | ⚪ +4.1% |
| [0.5–0.6] | 71 | 54.9% | 64.8% | 🟢 +9.9% |
| [0.6–0.7] | 42 | 64.4% | 71.4% | 🟢 +7.1% |
| [0.7–0.8] | 20 | 74.4% | 80.0% | 🟢 +5.6% |
| [0.8–0.9] | 7 | 82.3% | 100.0% | 🟢 +17.7% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 30 | 43% | 🔴 -23.2% | 0.2694 |
| `ita.coppa_italia` | 16 | 88% | 🟢 +43.6% | 0.2023 |
| `eng.3` | 12 | 58% | 🟢 +36.7% | 0.2553 |
| `eng.4` | 12 | 58% | 🟢 +36.8% | 0.2743 |
| `esp.2` | 11 | 55% | 🔴 -2.1% | 0.2258 |
| `arg.1` | 10 | 70% | 🟢 +53.8% | 0.2511 |
| `chn.1` | 10 | 40% | 🔴 -24.6% | 0.2095 |
| `eng.1` | 10 | 60% | 🟢 +12.3% | 0.2512 |
| `jpn.1` | 10 | 60% | 🟢 +17.6% | 0.21 |
| `tur.1` | 10 | 40% | 🔴 -16.7% | 0.2485 |
