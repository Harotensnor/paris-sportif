# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-05T10:55:54Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1477 picks sur 2026-08-19T11:35Z → 2026-10-04T19:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 14238132.45u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1477 picks** · 846 gagnés / 631 perdus · WR **57.3%**
- ROI flat (1u/pick) : **+13.60%** (+200.93u cumulé)
- Kelly 0.25× cap 10% : cumulé **+14238032.45u**
- Cote moyenne : 2.08 · Pick prob moyenne : 54.1%
- **Brier** : 0.2235 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.636 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **142381324.50€** (+14238032.4%) · DD max 34.1% · Sharpe/pick +0.259

## Séries

- Streak courante : ❄️ **2** loses consécutifs
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
| `skip` | 1477 | 57% | 55–60% | 🟢 +13.6% | +14238032.45u | 0.2235 | +1.4pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1477 | 0.0474 | 0.108 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1335 | 57% | 🟢 +14.9% | +14238032.45u | 0.2231 |
| baseball | 130 | 62% | 🟢 +2.1% | +0.00u | 0.2297 |
| basketball | 11 | 73% | 🟢 +1.0% | +0.00u | 0.191 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1105 | 56% | 🟢 +12.1% | 0.2248 |
| `football:top5` | 230 | 62% | 🟢 +28.7% | 0.2153 |
| `baseball:all` | 130 | 62% | 🟡 +2.1% | 0.2297 |
| `basketball:all` | 11 | 73% | 🟡 +1.0% | 0.191 |
| `hockey:all` | 1 | 0% | 🔴 -100.0% | 0.2557 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 259 | 77% | 🟢 +0.7% | 0.1616 |
| fav | 585 | 56% | 🔴 -3.3% | 0.2272 |
| toss_up | 406 | 53% | 🟢 +22.2% | 0.2426 |
| dog | 223 | 48% | 🟢 +55.0% | 0.2498 |
| heavy_dog | 4 | 50% | 🟢 +142.5% | 0.2824 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 231 | 36.7% | 44.2% | 🟢 +7.5% |
| [0.4–0.5] | 406 | 45.3% | 42.6% | ⚪ -2.7% |
| [0.5–0.6] | 413 | 55.0% | 58.4% | ⚪ +3.4% |
| [0.6–0.7] | 234 | 64.4% | 70.1% | 🟢 +5.7% |
| [0.7–0.8] | 119 | 74.6% | 80.7% | 🟢 +6.1% |
| [0.8–0.9] | 64 | 84.5% | 95.3% | 🟢 +10.8% |
| [0.9–1.0] | 10 | 91.8% | 90.0% | ⚪ -1.8% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 130 | 62% | 🟢 +2.1% | 0.2297 |
| `uefa.nations` | 83 | 58% | 🟢 +0.8% | 0.2087 |
| `eng.4` | 77 | 56% | 🟢 +34.4% | 0.2386 |
| `eng.2` | 73 | 55% | 🟢 +18.6% | 0.2318 |
| `eng.3` | 66 | 42% | 🔴 -2.1% | 0.2412 |
| `esp.2` | 60 | 53% | 🟢 +18.9% | 0.235 |
| `esp.1` | 55 | 60% | 🟢 +16.9% | 0.2075 |
| `eng.1` | 50 | 56% | 🟢 +25.4% | 0.2408 |
| `jpn.1` | 49 | 51% | 🟢 +0.5% | 0.2161 |
| `ita.1` | 48 | 71% | 🟢 +44.9% | 0.1951 |
