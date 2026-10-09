# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-09T10:58:37Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1490 picks sur 2026-08-19T11:35Z → 2026-10-08T18:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 12441026.79u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1490 picks** · 853 gagnés / 637 perdus · WR **57.2%**
- ROI flat (1u/pick) : **+13.24%** (+197.29u cumulé)
- Kelly 0.25× cap 10% : cumulé **+12440926.79u**
- Cote moyenne : 2.07 · Pick prob moyenne : 54.1%
- **Brier** : 0.2229 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6346 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **124410267.92€** (+12440926.8%) · DD max 36.7% · Sharpe/pick +0.256

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
| `skip` | 1490 | 57% | 55–60% | 🟢 +13.2% | +12440926.79u | 0.2229 | +1.4pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1490 | 0.0445 | 0.108 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1348 | 57% | 🟢 +14.5% | +12440926.79u | 0.2224 |
| baseball | 130 | 62% | 🟢 +2.1% | +0.00u | 0.2297 |
| basketball | 11 | 73% | 🟢 +1.0% | +0.00u | 0.191 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1118 | 56% | 🟢 +11.6% | 0.2239 |
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
| dog | 226 | 47% | 🟢 +54.3% | 0.25 |
| heavy_dog | 4 | 50% | 🟢 +142.5% | 0.2824 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 235 | 36.6% | 43.0% | 🟢 +6.3% |
| [0.4–0.5] | 401 | 45.3% | 42.9% | ⚪ -2.4% |
| [0.5–0.6] | 421 | 54.9% | 58.2% | ⚪ +3.3% |
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
