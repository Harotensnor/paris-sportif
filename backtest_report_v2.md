# Backtest ROI — VRAI modèle (v2)

Généré : 2026-05-03T06:10:24Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 647 picks sur 2026-04-23T18:45Z → 2026-05-03T03:15Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 373.17u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## ⚪ Vue d'ensemble

- **647 picks** · 345 gagnés / 302 perdus · WR **53.3%**
- ROI flat (1u/pick) : **+0.00%** (+0.02u cumulé)
- Kelly 0.25× cap 10% : cumulé **+273.17u**
- Cote moyenne : 1.99 · Pick prob moyenne : 52.6%
- **Brier** : 0.2309 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6543 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **3731.73€** (+273.2%) · DD max 20.3% · Sharpe/pick +0.112

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **6**
- Plus longue série perdante : **10**
- Top run win : 6 picks (2026-04-24T02:00Z → 2026-04-24T18:00Z)
- Top run lose : 10 picks (2026-05-02T13:00Z → 2026-05-02T14:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 8 | 88% | 53–98% | 🟢 +68.5% | +10.68u | 0.2055 | +3.6pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 639 | 53% | 49–57% | 🔴 -0.9% | +262.49u | 0.2312 | -1.3pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 8 | 0.3217 | 0.504 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 639 | 0.0341 | 0.41 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 528 | 52% | 🟢 +0.0% | +262.91u | 0.2297 |
| baseball | 74 | 62% | 🟢 +7.0% | +9.48u | 0.2337 |
| basketball | 24 | 58% | 🔴 -12.8% | +0.00u | 0.2424 |
| hockey | 21 | 52% | 🔴 -10.8% | +0.78u | 0.2371 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 459 | 52% | 🟡 +1.2% | 0.2302 |
| `baseball:all` | 74 | 62% | 🟢 +7.0% | 0.2337 |
| `football:top5` | 69 | 51% | 🔴 -7.7% | 0.2261 |
| `basketball:all` | 24 | 58% | 🔴 -12.8% | 0.2424 |
| `hockey:all` | 21 | 52% | 🔴 -10.8% | 0.2371 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 103 | 69% | 🔴 -8.0% | 0.2047 |
| fav | 302 | 58% | 🟢 +1.6% | 0.2341 |
| toss_up | 175 | 44% | 🟢 +0.4% | 0.2456 |
| dog | 67 | 33% | 🟢 +4.0% | 0.2179 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 111 | 36.5% | 33.3% | ⚪ -3.1% |
| [0.4–0.5] | 171 | 45.9% | 43.3% | ⚪ -2.6% |
| [0.5–0.6] | 207 | 54.6% | 57.0% | ⚪ +2.4% |
| [0.6–0.7] | 102 | 64.4% | 70.6% | 🟢 +6.1% |
| [0.7–0.8] | 41 | 74.2% | 80.5% | 🟢 +6.3% |
| [0.8–0.9] | 13 | 83.1% | 76.9% | 🔴 -6.2% |
| [0.9–1.0] | 2 | 91.0% | 50.0% | 🔴 -41.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 74 | 62% | 🟢 +7.0% | 0.2337 |
| `eng.3` | 27 | 59% | 🟢 +17.6% | 0.2401 |
| `eng.4` | 24 | 54% | 🟢 +0.4% | 0.2079 |
| `jpn.1` | 24 | 38% | 🔴 -23.1% | 0.2077 |
| `nba` | 24 | 58% | 🔴 -12.8% | 0.2424 |
| `eng.2` | 23 | 52% | 🟢 +1.3% | 0.2153 |
| `nhl` | 21 | 52% | 🔴 -10.8% | 0.2371 |
| `fra.2` | 18 | 44% | 🔴 -3.8% | 0.259 |
| `ita.2` | 18 | 56% | 🟢 +10.7% | 0.219 |
| `chn.1` | 16 | 44% | 🔴 -16.6% | 0.2482 |
