# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-28T15:44:43Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 293 picks sur 2026-08-14T00:30Z → 2026-08-26T19:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 248.69u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **293 picks** · 172 gagnés / 121 perdus · WR **58.7%**
- ROI flat (1u/pick) : **+13.69%** (+40.12u cumulé)
- Kelly 0.25× cap 10% : cumulé **+148.69u**
- Cote moyenne : 2.11 · Pick prob moyenne : 51.5%
- **Brier** : 0.2217 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6331 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **2486.90€** (+148.7%) · DD max 13.4% · Sharpe/pick +0.142

## Séries

- Streak courante : 🔥 **1** wins consécutifs
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
| `skip` | 293 | 59% | 53–64% | 🟢 +13.7% | +148.69u | 0.2217 | +0.1pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 293 | 0.0718 | 0.177 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 262 | 60% | 🟢 +17.3% | +148.69u | 0.2175 |
| baseball | 27 | 41% | 🔴 -27.8% | +0.00u | 0.2714 |
| basketball | 4 | 100% | 🟢 +59.8% | +0.00u | 0.1629 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 231 | 59% | 🟢 +16.8% | 0.2173 |
| `football:top5` | 31 | 65% | 🟢 +20.9% | 0.219 |
| `baseball:all` | 27 | 41% | 🔴 -27.8% | 0.2714 |
| `basketball:all` | 4 | 100% | 🟢 +59.8% | 0.1629 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 45 | 82% | 🟢 +11.2% | 0.1478 |
| fav | 116 | 67% | 🟢 +17.8% | 0.2274 |
| toss_up | 82 | 49% | 🟢 +12.6% | 0.2566 |
| dog | 50 | 34% | 🟢 +8.2% | 0.2178 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 65 | 36.5% | 40.0% | ⚪ +3.5% |
| [0.4–0.5] | 84 | 44.9% | 48.8% | ⚪ +3.9% |
| [0.5–0.6] | 70 | 54.9% | 65.7% | 🟢 +10.8% |
| [0.6–0.7] | 47 | 64.5% | 74.5% | 🟢 +10.0% |
| [0.7–0.8] | 19 | 74.7% | 84.2% | 🟢 +9.6% |
| [0.8–0.9] | 8 | 82.3% | 100.0% | 🟢 +17.7% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 27 | 41% | 🔴 -27.8% | 0.2714 |
| `ita.coppa_italia` | 16 | 88% | 🟢 +43.6% | 0.2023 |
| `eng.league_cup` | 14 | 71% | 🟢 +36.9% | 0.2374 |
| `eng.3` | 12 | 58% | 🟢 +36.7% | 0.2553 |
| `eng.4` | 12 | 58% | 🟢 +36.8% | 0.2743 |
| `eng.2` | 11 | 18% | 🔴 -46.4% | 0.2199 |
| `esp.2` | 11 | 55% | 🔴 -2.1% | 0.2258 |
| `arg.1` | 10 | 70% | 🟢 +53.8% | 0.2515 |
| `chn.1` | 10 | 40% | 🔴 -24.6% | 0.2095 |
| `eng.1` | 10 | 60% | 🟢 +12.3% | 0.2397 |
