# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-26T09:26:34Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 2278 picks sur 2026-08-29T09:00Z → 2026-10-25T20:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 179117912.56u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **2278 picks** · 1289 gagnés / 989 perdus · WR **56.6%**
- ROI flat (1u/pick) : **+10.02%** (+228.25u cumulé)
- Kelly 0.25× cap 10% : cumulé **+179117812.56u**
- Cote moyenne : 2.06 · Pick prob moyenne : 54.2%
- **Brier** : 0.2216 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6324 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1791179125.56€** (+179117812.6%) · DD max 36.7% · Sharpe/pick +0.224

## Séries

- Streak courante : ❄️ **1** loses consécutifs
- Plus longue série gagnante : **12**
- Plus longue série perdante : **8**
- Top run win : 12 picks (2026-09-08T18:45Z → 2026-09-08T19:00Z)
- Top run lose : 8 picks (2026-09-06T13:00Z → 2026-09-06T14:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 2278 | 57% | 55–59% | 🟢 +10.0% | +179117812.56u | 0.2216 | +1.4pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 2278 | 0.0373 | 0.077 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 2127 | 56% | 🟢 +10.4% | +179002997.92u | 0.2215 |
| baseball | 125 | 64% | 🟢 +6.3% | +0.00u | 0.2271 |
| basketball | 16 | 56% | 🔴 -16.7% | +114814.63u | 0.2283 |
| hockey | 10 | 80% | 🟢 +23.6% | +0.00u | 0.1709 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1799 | 56% | 🟢 +10.6% | 0.2223 |
| `football:top5` | 328 | 57% | 🟢 +9.4% | 0.217 |
| `baseball:all` | 125 | 64% | 🟢 +6.3% | 0.2271 |
| `basketball:all` | 16 | 56% | 🔴 -16.7% | 0.2283 |
| `hockey:all` | 10 | 80% | 🟢 +23.6% | 0.1709 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 414 | 78% | 🟢 +2.4% | 0.1626 |
| fav | 883 | 56% | 🔴 -2.7% | 0.228 |
| toss_up | 659 | 52% | 🟢 +19.6% | 0.2407 |
| dog | 320 | 41% | 🟢 +34.4% | 0.2407 |
| heavy_dog | 2 | 50% | 🟢 +135.0% | 0.2876 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 389 | 36.4% | 39.8% | ⚪ +3.5% |
| [0.4–0.5] | 569 | 45.2% | 42.5% | ⚪ -2.7% |
| [0.5–0.6] | 616 | 54.6% | 56.7% | ⚪ +2.0% |
| [0.6–0.7] | 377 | 64.6% | 70.6% | 🟢 +6.0% |
| [0.7–0.8] | 206 | 74.3% | 82.0% | 🟢 +7.7% |
| [0.8–0.9] | 105 | 83.9% | 87.6% | ⚪ +3.7% |
| [0.9–1.0] | 16 | 92.5% | 100.0% | 🟢 +7.5% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 125 | 64% | 🟢 +6.3% | 0.2271 |
| `eng.4` | 124 | 52% | 🟢 +22.2% | 0.2492 |
| `eng.2` | 119 | 55% | 🟢 +20.6% | 0.2502 |
| `eng.3` | 112 | 51% | 🟢 +10.3% | 0.2313 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `jpn.1` | 87 | 57% | 🟢 +16.6% | 0.2243 |
| `esp.2` | 86 | 55% | 🟢 +15.9% | 0.2175 |
| `esp.1` | 75 | 61% | 🟢 +16.1% | 0.2131 |
| `ita.2` | 69 | 54% | 🟢 +24.4% | 0.2388 |
| `eng.1` | 68 | 47% | 🔴 -3.9% | 0.2319 |
