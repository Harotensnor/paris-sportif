# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-29T06:22:31Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 584 picks sur 2026-06-12T22:40Z → 2026-07-29T00:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 107.92u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **584 picks** · 331 gagnés / 253 perdus · WR **56.7%**
- ROI flat (1u/pick) : **-1.69%** (-9.86u cumulé)
- Kelly 0.25× cap 10% : cumulé **+7.92u**
- Cote moyenne : 1.78 · Pick prob moyenne : 55.2%
- **Brier** : 0.239 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6709 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1079.21€** (+7.9%) · DD max 8.8% · Sharpe/pick +0.021

## Séries

- Streak courante : 🔥 **1** wins consécutifs
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
| `skip` | 584 | 57% | 53–61% | 🔴 -1.7% | +7.92u | 0.239 | -2.6pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 584 | 0.0242 | 0.171 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 400 | 57% | 🔴 -2.2% | +0.00u | 0.2444 |
| football | 148 | 52% | 🔴 -1.0% | +7.92u | 0.2297 |
| basketball | 36 | 69% | 🟢 +0.7% | +0.00u | 0.2182 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 400 | 57% | 🔴 -2.2% | 0.2444 |
| `football:other` | 148 | 52% | 🔴 -1.0% | 0.2297 |
| `basketball:all` | 36 | 69% | 🟡 +0.7% | 0.2182 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 75 | 64% | 🔴 -12.8% | 0.2207 |
| fav | 446 | 58% | 🟢 +0.8% | 0.2435 |
| toss_up | 46 | 46% | 🟢 +8.8% | 0.2485 |
| dog | 17 | 18% | 🔴 -46.2% | 0.1779 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 29 | 37.0% | 34.5% | ⚪ -2.5% |
| [0.4–0.5] | 72 | 46.9% | 50.0% | ⚪ +3.1% |
| [0.5–0.6] | 359 | 54.3% | 56.3% | ⚪ +1.9% |
| [0.6–0.7] | 101 | 64.3% | 63.4% | ⚪ -0.9% |
| [0.7–0.8] | 17 | 74.1% | 88.2% | 🟢 +14.1% |
| [0.8–0.9] | 6 | 83.8% | 66.7% | 🔴 -17.1% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 400 | 57% | 🔴 -2.2% | 0.2444 |
| `wnba` | 36 | 69% | 🟢 +0.7% | 0.2182 |
| `chn.1` | 34 | 59% | 🟢 +18.9% | 0.2443 |
| `ligamx` | 18 | 39% | 🔴 -33.2% | 0.2361 |
| `nor.1` | 16 | 56% | 🔴 -4.2% | 0.2151 |
| `allsvenskan` | 13 | 69% | 🟢 +21.4% | 0.2206 |
| `swe.1` | 11 | 45% | 🔴 -17.1% | 0.2627 |
| `conmebol.sudamericana` | 9 | 78% | 🟢 +36.0% | 0.189 |
| `uru.1` | 8 | 38% | 🔴 -6.2% | 0.2378 |
| `ecu.1` | 7 | 29% | 🔴 -41.2% | 0.254 |
