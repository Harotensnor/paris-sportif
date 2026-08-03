# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-03T06:49:56Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 482 picks sur 2026-06-27T11:00Z → 2026-08-02T21:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 118.6u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **482 picks** · 275 gagnés / 207 perdus · WR **57.1%**
- ROI flat (1u/pick) : **+1.38%** (+6.66u cumulé)
- Kelly 0.25× cap 10% : cumulé **+18.60u**
- Cote moyenne : 1.83 · Pick prob moyenne : 54.3%
- **Brier** : 0.239 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6705 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1185.96€** (+18.6%) · DD max 13.2% · Sharpe/pick +0.040

## Séries

- Streak courante : ❄️ **1** loses consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **7**
- Top run win : 10 picks (2026-06-30T23:40Z → 2026-07-01T17:10Z)
- Top run lose : 7 picks (2026-07-10T23:50Z → 2026-07-11T02:15Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 482 | 57% | 53–61% | 🟢 +1.4% | +18.60u | 0.239 | -2.5pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 482 | 0.0337 | 0.115 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 246 | 59% | 🟢 +1.6% | +0.00u | 0.2436 |
| football | 213 | 54% | 🟢 +3.3% | +18.60u | 0.233 |
| basketball | 23 | 57% | 🔴 -18.7% | +0.00u | 0.2449 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 246 | 59% | 🟡 +1.6% | 0.2436 |
| `football:other` | 213 | 54% | 🟡 +3.3% | 0.233 |
| `basketball:all` | 23 | 57% | 🔴 -18.7% | 0.2449 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 67 | 63% | 🔴 -15.0% | 0.2214 |
| fav | 325 | 60% | 🟢 +3.5% | 0.2423 |
| toss_up | 67 | 49% | 🟢 +14.8% | 0.2534 |
| dog | 23 | 26% | 🔴 -20.2% | 0.2008 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 42 | 37.2% | 38.1% | ⚪ +0.9% |
| [0.4–0.5] | 80 | 45.9% | 50.0% | ⚪ +4.1% |
| [0.5–0.6] | 262 | 54.6% | 58.0% | ⚪ +3.4% |
| [0.6–0.7] | 73 | 64.7% | 63.0% | ⚪ -1.7% |
| [0.7–0.8] | 20 | 73.5% | 85.0% | 🟢 +11.5% |
| [0.8–0.9] | 5 | 82.4% | 80.0% | ⚪ -2.4% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 246 | 59% | 🟢 +1.6% | 0.2436 |
| `chn.1` | 41 | 59% | 🟢 +17.3% | 0.2612 |
| `wnba` | 23 | 57% | 🔴 -18.7% | 0.2449 |
| `nor.1` | 22 | 64% | 🟢 +13.3% | 0.225 |
| `ligamx` | 18 | 39% | 🔴 -33.2% | 0.2361 |
| `swe.1` | 15 | 47% | 🔴 -13.2% | 0.2896 |
| `conmebol.sudamericana` | 14 | 79% | 🟢 +28.1% | 0.1795 |
| `uru.1` | 14 | 50% | 🟢 +10.4% | 0.2338 |
| `allsvenskan` | 13 | 69% | 🟢 +21.4% | 0.2206 |
| `arg.1` | 12 | 33% | 🔴 -20.4% | 0.215 |
