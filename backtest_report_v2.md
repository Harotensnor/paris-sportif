# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-26T13:19:08Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 226 picks sur 2026-11-20T17:30Z → 2026-11-26T00:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 307.69u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **226 picks** · 134 gagnés / 92 perdus · WR **59.3%**
- ROI flat (1u/pick) : **+8.23%** (+18.61u cumulé)
- Kelly 0.25× cap 10% : cumulé **+207.69u**
- Cote moyenne : 1.90 · Pick prob moyenne : 54.7%
- **Brier** : 0.2224 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6346 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **3076.86€** (+207.7%) · DD max 8.6% · Sharpe/pick +0.270

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **9**
- Plus longue série perdante : **5**
- Top run win : 9 picks (2026-11-21T17:45Z → 2026-11-21T19:45Z)
- Top run lose : 5 picks (2026-11-21T19:45Z → 2026-11-21T20:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 1 | 100% | 21–100% | 🟢 +76.9% | +0.23u | 0.1849 | +0.5pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 225 | 59% | 53–65% | 🟢 +7.9% | +207.45u | 0.2226 | -2.7pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 1 | 0.43 | 0.43 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 225 | 0.0485 | 0.145 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 201 | 58% | 🟢 +7.9% | +207.45u | 0.2234 |
| hockey | 15 | 67% | 🟢 +12.8% | +0.23u | 0.2421 |
| basketball | 10 | 80% | 🟢 +8.9% | +0.00u | 0.1729 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 158 | 58% | 🟢 +7.7% | 0.2224 |
| `football:top5` | 43 | 58% | 🟢 +8.5% | 0.2273 |
| `hockey:all` | 15 | 67% | 🟢 +12.8% | 0.2421 |
| `basketball:all` | 10 | 80% | 🟢 +8.9% | 0.1729 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 67 | 73% | 🔴 -4.9% | 0.1836 |
| fav | 78 | 55% | 🔴 -5.7% | 0.2275 |
| toss_up | 58 | 52% | 🟢 +17.5% | 0.2402 |
| dog | 23 | 52% | 🟢 +70.4% | 0.2736 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 39 | 36.5% | 43.6% | 🟢 +7.1% |
| [0.4–0.5] | 49 | 44.6% | 44.9% | ⚪ +0.3% |
| [0.5–0.6] | 62 | 55.0% | 56.5% | ⚪ +1.5% |
| [0.6–0.7] | 43 | 64.5% | 79.1% | 🟢 +14.5% |
| [0.7–0.8] | 21 | 73.8% | 71.4% | ⚪ -2.4% |
| [0.8–0.9] | 11 | 84.3% | 90.9% | 🟢 +6.6% |
| [0.9–1.0] | 1 | 95.0% | 100.0% | 🟢 +5.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `championship` | 22 | 59% | 🟢 +16.8% | 0.2422 |
| `championsleague` | 17 | 65% | 🔴 -4.0% | 0.2059 |
| `nhl` | 15 | 67% | 🟢 +12.8% | 0.2421 |
| `ita.2` | 14 | 43% | 🔴 -14.2% | 0.2207 |
| `eng.1` | 10 | 50% | 🔴 -1.7% | 0.2318 |
| `esp.1` | 9 | 56% | 🔴 -13.3% | 0.1744 |
| `ligamx` | 9 | 33% | 🔴 -18.3% | 0.2128 |
| `nba` | 9 | 78% | 🟢 +9.8% | 0.1918 |
| `eredivisie` | 8 | 50% | 🔴 -29.9% | 0.2176 |
| `fra.1` | 8 | 50% | 🟢 +1.7% | 0.2814 |
