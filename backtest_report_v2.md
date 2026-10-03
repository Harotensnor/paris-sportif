# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-03T09:29:04Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1427 picks sur 2026-08-18T22:00Z → 2026-10-02T18:45Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 16241392.93u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1427 picks** · 819 gagnés / 608 perdus · WR **57.4%**
- ROI flat (1u/pick) : **+13.79%** (+196.76u cumulé)
- Kelly 0.25× cap 10% : cumulé **+16241292.93u**
- Cote moyenne : 2.08 · Pick prob moyenne : 54.1%
- **Brier** : 0.2225 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6338 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **162413929.29€** (+16241292.9%) · DD max 37.5% · Sharpe/pick +0.269

## Séries

- Streak courante : ❄️ **1** loses consécutifs
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
| `skip` | 1427 | 57% | 55–60% | 🟢 +13.8% | +16241292.93u | 0.2225 | +1.5pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1427 | 0.0493 | 0.123 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1289 | 57% | 🟢 +15.1% | +16241292.93u | 0.222 |
| baseball | 128 | 62% | 🟢 +2.6% | +0.00u | 0.2298 |
| basketball | 10 | 70% | 🔴 -4.6% | +0.00u | 0.1943 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1059 | 56% | 🟢 +12.1% | 0.2235 |
| `football:top5` | 230 | 62% | 🟢 +28.7% | 0.2153 |
| `baseball:all` | 128 | 62% | 🟡 +2.6% | 0.2298 |
| `basketball:all` | 10 | 70% | 🔴 -4.6% | 0.1943 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 251 | 77% | 🟢 +1.3% | 0.1582 |
| fav | 564 | 56% | 🔴 -2.6% | 0.227 |
| toss_up | 396 | 52% | 🟢 +20.5% | 0.2411 |
| dog | 212 | 48% | 🟢 +57.3% | 0.2512 |
| heavy_dog | 4 | 50% | 🟢 +142.5% | 0.2824 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 223 | 36.7% | 43.5% | 🟢 +6.8% |
| [0.4–0.5] | 385 | 45.3% | 42.3% | ⚪ -3.0% |
| [0.5–0.6] | 401 | 54.9% | 58.4% | ⚪ +3.5% |
| [0.6–0.7] | 231 | 64.3% | 70.1% | 🟢 +5.9% |
| [0.7–0.8] | 115 | 74.6% | 81.7% | 🟢 +7.1% |
| [0.8–0.9] | 62 | 84.4% | 96.8% | 🟢 +12.3% |
| [0.9–1.0] | 10 | 91.8% | 90.0% | ⚪ -1.8% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 128 | 62% | 🟢 +2.6% | 0.2298 |
| `eng.2` | 73 | 55% | 🟢 +18.6% | 0.2318 |
| `eng.4` | 69 | 59% | 🟢 +46.1% | 0.2443 |
| `uefa.nations` | 68 | 56% | 🔴 -2.1% | 0.2183 |
| `eng.3` | 63 | 40% | 🔴 -7.5% | 0.2332 |
| `esp.1` | 55 | 60% | 🟢 +16.9% | 0.2075 |
| `esp.2` | 52 | 54% | 🟢 +16.8% | 0.2148 |
| `eng.1` | 50 | 56% | 🟢 +25.4% | 0.2408 |
| `jpn.1` | 49 | 51% | 🟢 +0.5% | 0.2161 |
| `ita.1` | 48 | 71% | 🟢 +44.9% | 0.1951 |
