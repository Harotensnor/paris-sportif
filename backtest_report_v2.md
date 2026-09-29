# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-29T10:11:41Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1397 picks sur 2026-08-18T22:00Z → 2026-09-28T20:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 14332703.55u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1397 picks** · 801 gagnés / 596 perdus · WR **57.3%**
- ROI flat (1u/pick) : **+14.18%** (+198.13u cumulé)
- Kelly 0.25× cap 10% : cumulé **+14332603.55u**
- Cote moyenne : 2.08 · Pick prob moyenne : 54.1%
- **Brier** : 0.2226 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6337 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **143327035.51€** (+14332603.6%) · DD max 37.5% · Sharpe/pick +0.269

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
| `skip` | 1397 | 57% | 55–60% | 🟢 +14.2% | +14332603.55u | 0.2226 | +1.6pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1397 | 0.0531 | 0.14 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1260 | 57% | 🟢 +15.5% | +14332603.55u | 0.222 |
| baseball | 127 | 61% | 🟢 +2.2% | +0.00u | 0.2305 |
| basketball | 10 | 70% | 🔴 -4.6% | +0.00u | 0.1943 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1030 | 56% | 🟢 +12.6% | 0.2235 |
| `football:top5` | 230 | 62% | 🟢 +28.7% | 0.2153 |
| `baseball:all` | 127 | 61% | 🟡 +2.2% | 0.2305 |
| `basketball:all` | 10 | 70% | 🔴 -4.6% | 0.1943 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 240 | 78% | 🟢 +2.3% | 0.1549 |
| fav | 554 | 56% | 🔴 -3.1% | 0.227 |
| toss_up | 383 | 52% | 🟢 +20.9% | 0.2413 |
| dog | 216 | 48% | 🟢 +57.4% | 0.2521 |
| heavy_dog | 4 | 50% | 🟢 +142.5% | 0.2824 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 223 | 36.7% | 43.9% | 🟢 +7.3% |
| [0.4–0.5] | 371 | 45.3% | 41.5% | ⚪ -3.8% |
| [0.5–0.6] | 394 | 54.9% | 58.6% | ⚪ +3.7% |
| [0.6–0.7] | 229 | 64.3% | 69.9% | 🟢 +5.6% |
| [0.7–0.8] | 109 | 74.5% | 81.7% | 🟢 +7.1% |
| [0.8–0.9] | 61 | 84.3% | 98.4% | 🟢 +14.0% |
| [0.9–1.0] | 10 | 91.8% | 90.0% | ⚪ -1.8% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 127 | 61% | 🟢 +2.2% | 0.2305 |
| `eng.2` | 73 | 55% | 🟢 +18.6% | 0.2318 |
| `eng.4` | 69 | 59% | 🟢 +46.1% | 0.2443 |
| `eng.3` | 63 | 40% | 🔴 -7.5% | 0.2332 |
| `esp.1` | 55 | 60% | 🟢 +16.9% | 0.2075 |
| `esp.2` | 51 | 47% | 🟢 +2.6% | 0.2055 |
| `eng.1` | 50 | 56% | 🟢 +25.4% | 0.2408 |
| `jpn.1` | 49 | 51% | 🟢 +0.5% | 0.2161 |
| `ita.1` | 48 | 71% | 🟢 +44.9% | 0.1951 |
| `fra.1` | 44 | 61% | 🟢 +38.5% | 0.2315 |
