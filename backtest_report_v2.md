# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-28T10:06:03Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 2206 picks sur 2026-08-30T10:15Z → 2026-10-27T21:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 62258627.74u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **2206 picks** · 1259 gagnés / 947 perdus · WR **57.1%**
- ROI flat (1u/pick) : **+9.87%** (+217.72u cumulé)
- Kelly 0.25× cap 10% : cumulé **+62258527.74u**
- Cote moyenne : 2.04 · Pick prob moyenne : 54.4%
- **Brier** : 0.2206 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6304 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **622586277.41€** (+62258527.7%) · DD max 35.1% · Sharpe/pick +0.219

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
| `skip` | 2206 | 57% | 55–59% | 🟢 +9.9% | +62258527.74u | 0.2206 | +1.2pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 2206 | 0.0401 | 0.076 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 2062 | 56% | 🟢 +10.1% | +62212694.82u | 0.2205 |
| baseball | 119 | 66% | 🟢 +8.8% | +0.00u | 0.2255 |
| basketball | 15 | 53% | 🔴 -19.5% | +45832.92u | 0.2396 |
| hockey | 10 | 80% | 🟢 +23.6% | +0.00u | 0.1709 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1753 | 56% | 🟢 +9.6% | 0.2214 |
| `football:top5` | 309 | 59% | 🟢 +13.1% | 0.215 |
| `baseball:all` | 119 | 66% | 🟢 +8.8% | 0.2255 |
| `basketball:all` | 15 | 53% | 🔴 -19.5% | 0.2396 |
| `hockey:all` | 10 | 80% | 🟢 +23.6% | 0.1709 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 416 | 79% | 🟢 +3.6% | 0.1603 |
| fav | 863 | 57% | 🔴 -1.6% | 0.2283 |
| toss_up | 633 | 51% | 🟢 +17.8% | 0.2403 |
| dog | 292 | 41% | 🟢 +34.8% | 0.2409 |
| heavy_dog | 2 | 50% | 🟢 +135.0% | 0.2876 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 368 | 36.5% | 39.4% | ⚪ +2.9% |
| [0.4–0.5] | 548 | 45.3% | 42.5% | ⚪ -2.8% |
| [0.5–0.6] | 593 | 54.6% | 57.3% | ⚪ +2.7% |
| [0.6–0.7] | 373 | 64.5% | 71.8% | 🟢 +7.3% |
| [0.7–0.8] | 201 | 74.3% | 81.6% | 🟢 +7.3% |
| [0.8–0.9] | 107 | 83.8% | 86.9% | ⚪ +3.1% |
| [0.9–1.0] | 16 | 92.4% | 100.0% | 🟢 +7.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 119 | 66% | 🟢 +8.8% | 0.2255 |
| `eng.4` | 113 | 52% | 🟢 +23.6% | 0.2483 |
| `eng.2` | 108 | 55% | 🟢 +19.2% | 0.252 |
| `eng.3` | 108 | 51% | 🟢 +8.8% | 0.2288 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `esp.2` | 82 | 55% | 🟢 +15.6% | 0.2202 |
| `jpn.1` | 79 | 53% | 🟢 +6.8% | 0.2229 |
| `esp.1` | 72 | 61% | 🟢 +15.7% | 0.2148 |
| `ita.2` | 71 | 54% | 🟢 +22.0% | 0.2381 |
| `ita.1` | 67 | 66% | 🟢 +26.5% | 0.1919 |
