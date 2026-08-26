# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-26T04:28:03Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 293 picks sur 2026-08-13T17:10Z → 2026-08-25T21:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 245.42u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **293 picks** · 172 gagnés / 121 perdus · WR **58.7%**
- ROI flat (1u/pick) : **+14.25%** (+41.75u cumulé)
- Kelly 0.25× cap 10% : cumulé **+145.42u**
- Cote moyenne : 2.11 · Pick prob moyenne : 51.4%
- **Brier** : 0.2242 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6385 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **2454.24€** (+145.4%) · DD max 13.4% · Sharpe/pick +0.139

## Séries

- Streak courante : ❄️ **2** loses consécutifs
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
| `skip` | 293 | 59% | 53–64% | 🟢 +14.2% | +145.42u | 0.2242 | -0.0pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 293 | 0.0734 | 0.179 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 261 | 60% | 🟢 +17.6% | +145.42u | 0.2204 |
| baseball | 28 | 43% | 🔴 -23.8% | +0.00u | 0.2689 |
| basketball | 4 | 100% | 🟢 +59.8% | +0.00u | 0.1636 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 231 | 59% | 🟢 +17.2% | 0.2195 |
| `football:top5` | 30 | 63% | 🟢 +20.9% | 0.2267 |
| `baseball:all` | 28 | 43% | 🔴 -23.8% | 0.2689 |
| `basketball:all` | 4 | 100% | 🟢 +59.8% | 0.1636 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 44 | 82% | 🟢 +11.0% | 0.1518 |
| fav | 117 | 67% | 🟢 +17.1% | 0.228 |
| toss_up | 83 | 49% | 🟢 +14.3% | 0.2595 |
| dog | 49 | 35% | 🟢 +10.4% | 0.2205 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 66 | 36.6% | 42.4% | 🟢 +5.8% |
| [0.4–0.5] | 82 | 44.8% | 47.6% | ⚪ +2.8% |
| [0.5–0.6] | 73 | 54.9% | 65.8% | 🟢 +10.8% |
| [0.6–0.7] | 46 | 64.4% | 73.9% | 🟢 +9.5% |
| [0.7–0.8] | 20 | 74.8% | 85.0% | 🟢 +10.2% |
| [0.8–0.9] | 6 | 82.1% | 100.0% | 🟢 +17.9% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 28 | 43% | 🔴 -23.8% | 0.2689 |
| `ita.coppa_italia` | 16 | 88% | 🟢 +43.6% | 0.2023 |
| `eng.league_cup` | 14 | 71% | 🟢 +36.9% | 0.2374 |
| `eng.3` | 12 | 58% | 🟢 +36.7% | 0.2553 |
| `eng.4` | 12 | 58% | 🟢 +36.8% | 0.2743 |
| `esp.2` | 11 | 55% | 🔴 -2.1% | 0.2258 |
| `arg.1` | 10 | 70% | 🟢 +53.8% | 0.2515 |
| `chn.1` | 10 | 40% | 🔴 -24.6% | 0.2095 |
| `eng.1` | 10 | 60% | 🟢 +12.3% | 0.2488 |
| `eng.2` | 10 | 20% | 🔴 -41.0% | 0.2305 |
