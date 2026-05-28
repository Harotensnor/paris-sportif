# Backtest ROI — VRAI modèle (v2)

Généré : 2026-05-28T07:45:57Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 97 picks sur 2026-05-23T20:30Z → 2026-05-27T20:10Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 111.66u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **97 picks** · 51 gagnés / 46 perdus · WR **52.6%**
- ROI flat (1u/pick) : **-5.67%** (-5.50u cumulé)
- Kelly 0.25× cap 10% : cumulé **+11.66u**
- Cote moyenne : 1.85 · Pick prob moyenne : 54.5%
- **Brier** : 0.2462 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6853 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1116.60€** (+11.7%) · DD max 3.9% · Sharpe/pick +0.122

## Séries

- Streak courante : 🔥 **5** wins consécutifs
- Plus longue série gagnante : **9**
- Plus longue série perdante : **6**
- Top run win : 9 picks (2026-05-26T22:40Z → 2026-05-27T00:05Z)
- Top run lose : 6 picks (2026-05-24T05:00Z → 2026-05-24T11:35Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 1 | 100% | 21–100% | 🟢 +100.0% | +2.27u | 0.2067 | +4.5pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 96 | 52% | 42–62% | 🔴 -6.8% | +9.39u | 0.2466 | -2.6pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 1 | 0.455 | 0.455 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 96 | 0.066 | 0.225 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 47 | 62% | 🟢 +4.9% | +2.86u | 0.2316 |
| football | 40 | 42% | 🔴 -12.9% | +8.80u | 0.2649 |
| basketball | 7 | 43% | 🔴 -39.8% | +0.00u | 0.2516 |
| hockey | 3 | 67% | 🟢 +4.4% | +0.00u | 0.2142 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 47 | 62% | 🟡 +4.9% | 0.2316 |
| `football:other` | 25 | 32% | 🔴 -35.2% | 0.2557 |
| `football:top5` | 15 | 60% | 🟢 +24.3% | 0.2801 |
| `basketball:all` | 7 | 43% | 🔴 -39.8% | 0.2516 |
| `hockey:all` | 3 | 67% | 🟡 +4.4% | 0.2142 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 19 | 63% | 🔴 -11.0% | 0.2305 |
| fav | 62 | 53% | 🔴 -6.1% | 0.2569 |
| toss_up | 10 | 40% | 🔴 -6.0% | 0.2261 |
| dog | 6 | 33% | 🟢 +15.8% | 0.2193 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 9 | 35.0% | 22.2% | 🔴 -12.8% |
| [0.4–0.5] | 12 | 45.4% | 58.3% | 🟢 +12.9% |
| [0.5–0.6] | 47 | 53.7% | 55.3% | ⚪ +1.6% |
| [0.6–0.7] | 26 | 64.2% | 53.8% | 🔴 -10.4% |
| [0.7–0.8] | 2 | 72.5% | 50.0% | 🔴 -22.5% |
| [0.8–0.9] | 1 | 84.4% | 100.0% | 🟢 +15.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 47 | 62% | 🟢 +4.9% | 0.2316 |
| `eng.1` | 8 | 50% | 🟢 +24.3% | 0.3013 |
| `ita.1` | 6 | 67% | 🟢 +3.4% | 0.2529 |
| `chn.1` | 5 | 0% | 🔴 -100.0% | 0.3478 |
| `eliteserien` | 5 | 20% | 🔴 -55.0% | 0.248 |
| `allsvenskan` | 4 | 50% | 🟢 +22.9% | 0.2896 |
| `wnba` | 4 | 50% | 🔴 -35.8% | 0.2465 |
| `nba` | 3 | 33% | 🔴 -45.2% | 0.2584 |
| `nhl` | 3 | 67% | 🟢 +4.4% | 0.2142 |
| `esp.2` | 2 | 50% | 🔴 -2.4% | 0.3226 |
