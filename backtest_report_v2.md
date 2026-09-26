# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-26T08:52:57Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1324 picks sur 2026-08-18T11:35Z → 2026-09-25T19:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 12862482.84u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1324 picks** · 766 gagnés / 558 perdus · WR **57.9%**
- ROI flat (1u/pick) : **+15.54%** (+205.70u cumulé)
- Kelly 0.25× cap 10% : cumulé **+12862382.84u**
- Cote moyenne : 2.09 · Pick prob moyenne : 54.2%
- **Brier** : 0.2228 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6341 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **128624828.44€** (+12862382.8%) · DD max 37.7% · Sharpe/pick +0.276

## Séries

- Streak courante : 🔥 **2** wins consécutifs
- Plus longue série gagnante : **13**
- Plus longue série perdante : **9**
- Top run win : 13 picks (2026-09-11T18:00Z → 2026-09-11T19:00Z)
- Top run lose : 9 picks (2026-09-12T12:00Z → 2026-09-12T13:30Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 1324 | 58% | 55–60% | 🟢 +15.5% | +12862382.84u | 0.2228 | +1.8pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1324 | 0.0536 | 0.139 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1206 | 58% | 🟢 +17.1% | +12862382.84u | 0.2223 |
| baseball | 110 | 60% | 🔴 -0.1% | +0.00u | 0.233 |
| basketball | 8 | 75% | 🔴 -0.2% | +0.00u | 0.1622 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 976 | 57% | 🟢 +14.3% | 0.2239 |
| `football:top5` | 230 | 62% | 🟢 +28.7% | 0.2153 |
| `baseball:all` | 110 | 60% | 🔴 -0.1% | 0.233 |
| `basketball:all` | 8 | 75% | 🔴 -0.2% | 0.1622 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 229 | 78% | 🟢 +2.6% | 0.1532 |
| fav | 522 | 55% | 🔴 -3.5% | 0.2268 |
| toss_up | 363 | 54% | 🟢 +25.6% | 0.2436 |
| dog | 206 | 48% | 🟢 +57.8% | 0.2523 |
| heavy_dog | 4 | 50% | 🟢 +142.5% | 0.2824 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 203 | 36.5% | 45.8% | 🟢 +9.3% |
| [0.4–0.5] | 358 | 45.3% | 42.2% | ⚪ -3.1% |
| [0.5–0.6] | 373 | 55.0% | 59.0% | ⚪ +4.0% |
| [0.6–0.7] | 216 | 64.3% | 68.5% | ⚪ +4.2% |
| [0.7–0.8] | 105 | 74.6% | 82.9% | 🟢 +8.2% |
| [0.8–0.9] | 59 | 84.4% | 98.3% | 🟢 +13.9% |
| [0.9–1.0] | 10 | 91.8% | 90.0% | ⚪ -1.8% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 110 | 60% | 🔴 -0.1% | 0.233 |
| `eng.2` | 73 | 55% | 🟢 +18.6% | 0.2318 |
| `eng.3` | 59 | 44% | 🟢 +4.3% | 0.2414 |
| `eng.4` | 59 | 59% | 🟢 +45.0% | 0.2406 |
| `esp.1` | 55 | 60% | 🟢 +16.9% | 0.2075 |
| `eng.1` | 50 | 56% | 🟢 +25.4% | 0.2408 |
| `jpn.1` | 49 | 51% | 🟢 +0.5% | 0.2161 |
| `ita.1` | 48 | 71% | 🟢 +44.9% | 0.1951 |
| `fra.1` | 44 | 61% | 🟢 +38.5% | 0.2315 |
| `esp.2` | 42 | 52% | 🟢 +15.5% | 0.2072 |
