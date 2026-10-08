# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-08T10:59:38Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1489 picks sur 2026-08-19T11:35Z → 2026-10-06T18:45Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 12766176.03u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1489 picks** · 853 gagnés / 636 perdus · WR **57.3%**
- ROI flat (1u/pick) : **+13.32%** (+198.39u cumulé)
- Kelly 0.25× cap 10% : cumulé **+12766076.03u**
- Cote moyenne : 2.07 · Pick prob moyenne : 54.1%
- **Brier** : 0.223 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6348 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **127661760.33€** (+12766076.0%) · DD max 36.7% · Sharpe/pick +0.257

## Séries

- Streak courante : 🔥 **1** wins consécutifs
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
| `skip` | 1489 | 57% | 55–60% | 🟢 +13.3% | +12766076.03u | 0.223 | +1.4pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1489 | 0.044 | 0.108 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1347 | 57% | 🟢 +14.6% | +12766076.03u | 0.2225 |
| baseball | 130 | 62% | 🟢 +2.1% | +0.00u | 0.2297 |
| basketball | 11 | 73% | 🟢 +1.0% | +0.00u | 0.191 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1117 | 56% | 🟢 +11.7% | 0.224 |
| `football:top5` | 230 | 62% | 🟢 +28.7% | 0.2153 |
| `baseball:all` | 130 | 62% | 🟡 +2.1% | 0.2297 |
| `basketball:all` | 11 | 73% | 🟡 +1.0% | 0.191 |
| `hockey:all` | 1 | 0% | 🔴 -100.0% | 0.2557 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 264 | 77% | 🟢 +1.0% | 0.1596 |
| fav | 590 | 55% | 🔴 -3.6% | 0.2272 |
| toss_up | 406 | 52% | 🟢 +21.6% | 0.2421 |
| dog | 225 | 48% | 🟢 +55.0% | 0.2506 |
| heavy_dog | 4 | 50% | 🟢 +142.5% | 0.2824 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 234 | 36.6% | 43.2% | 🟢 +6.5% |
| [0.4–0.5] | 402 | 45.3% | 43.0% | ⚪ -2.2% |
| [0.5–0.6] | 420 | 54.9% | 58.1% | ⚪ +3.2% |
| [0.6–0.7] | 237 | 64.4% | 70.0% | 🟢 +5.6% |
| [0.7–0.8] | 120 | 74.7% | 80.8% | 🟢 +6.2% |
| [0.8–0.9] | 66 | 84.6% | 95.5% | 🟢 +10.8% |
| [0.9–1.0] | 10 | 91.8% | 90.0% | ⚪ -1.8% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 130 | 62% | 🟢 +2.1% | 0.2297 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `eng.4` | 77 | 56% | 🟢 +34.4% | 0.2386 |
| `eng.2` | 73 | 55% | 🟢 +18.6% | 0.2318 |
| `eng.3` | 66 | 42% | 🔴 -2.1% | 0.2412 |
| `esp.2` | 60 | 52% | 🟢 +14.8% | 0.2318 |
| `esp.1` | 55 | 60% | 🟢 +16.9% | 0.2075 |
| `eng.1` | 50 | 56% | 🟢 +25.4% | 0.2408 |
| `jpn.1` | 49 | 51% | 🟢 +0.5% | 0.2161 |
| `ita.1` | 48 | 71% | 🟢 +44.9% | 0.1951 |
