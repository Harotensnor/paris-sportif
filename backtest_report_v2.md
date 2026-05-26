# Backtest ROI — VRAI modèle (v2)

Généré : 2026-05-26T07:34:33Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 76 picks sur 2026-05-23T18:45Z → 2026-05-25T21:05Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 100.71u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **76 picks** · 36 gagnés / 40 perdus · WR **47.4%**
- ROI flat (1u/pick) : **-12.51%** (-9.51u cumulé)
- Kelly 0.25× cap 10% : cumulé **+0.71u**
- Cote moyenne : 1.88 · Pick prob moyenne : 53.7%
- **Brier** : 0.258 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.7105 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1007.11€** (+0.7%) · DD max 7.5% · Sharpe/pick +0.014

## Séries

- Streak courante : ❄️ **2** loses consécutifs
- Plus longue série gagnante : **9**
- Plus longue série perdante : **6**
- Top run win : 9 picks (2026-05-24T16:00Z → 2026-05-24T18:10Z)
- Top run lose : 6 picks (2026-05-24T05:00Z → 2026-05-24T11:35Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 2 | 0% | 0–66% | 🔴 -100.0% | -7.97u | 0.278 | +9.2pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 74 | 49% | 38–60% | 🔴 -10.2% | +8.68u | 0.2575 | -2.8pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 2 | 0.5265 | 0.555 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 74 | 0.0845 | 0.72 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 40 | 45% | 🔴 -9.8% | +8.98u | 0.2655 |
| baseball | 29 | 55% | 🔴 -5.2% | -2.94u | 0.245 |
| basketball | 5 | 20% | 🔴 -71.1% | +0.00u | 0.2895 |
| hockey | 2 | 50% | 🔴 -25.6% | -5.33u | 0.2193 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 29 | 55% | 🔴 -5.2% | 0.245 |
| `football:other` | 25 | 36% | 🔴 -30.3% | 0.2567 |
| `football:top5` | 15 | 60% | 🟢 +24.3% | 0.2801 |
| `basketball:all` | 5 | 20% | 🔴 -71.1% | 0.2895 |
| `hockey:all` | 2 | 50% | 🔴 -25.6% | 0.2193 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 15 | 47% | 🔴 -32.6% | 0.2803 |
| fav | 45 | 53% | 🔴 -6.4% | 0.2601 |
| toss_up | 11 | 27% | 🔴 -33.6% | 0.2289 |
| dog | 5 | 40% | 🟢 +39.0% | 0.2368 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 8 | 34.9% | 25.0% | 🔴 -9.9% |
| [0.4–0.5] | 12 | 45.8% | 41.7% | ⚪ -4.1% |
| [0.5–0.6] | 34 | 53.8% | 55.9% | ⚪ +2.0% |
| [0.6–0.7] | 21 | 64.2% | 47.6% | 🔴 -16.6% |
| [0.7–0.8] | 1 | 72.0% | 0.0% | 🔴 -72.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 29 | 55% | 🔴 -5.2% | 0.245 |
| `eng.1` | 8 | 50% | 🟢 +24.3% | 0.3013 |
| `ita.1` | 6 | 67% | 🟢 +3.4% | 0.2529 |
| `chn.1` | 5 | 0% | 🔴 -100.0% | 0.3478 |
| `eliteserien` | 5 | 20% | 🔴 -55.0% | 0.248 |
| `allsvenskan` | 4 | 50% | 🟢 +22.9% | 0.2896 |
| `usa.1` | 3 | 67% | 🟢 +10.1% | 0.1954 |
| `wnba` | 3 | 33% | 🔴 -51.9% | 0.2886 |
| `esp.2` | 2 | 50% | 🔴 -2.4% | 0.3226 |
| `jpn.1` | 2 | 0% | 🔴 -100.0% | 0.124 |
