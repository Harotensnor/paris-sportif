# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-10T10:11:12Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1512 picks sur 2026-08-19T18:20Z → 2026-10-09T19:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 14738970.5u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1512 picks** · 864 gagnés / 648 perdus · WR **57.1%**
- ROI flat (1u/pick) : **+13.03%** (+196.96u cumulé)
- Kelly 0.25× cap 10% : cumulé **+14738870.50u**
- Cote moyenne : 2.08 · Pick prob moyenne : 54.0%
- **Brier** : 0.2225 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6339 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **147389705.00€** (+14738870.5%) · DD max 36.7% · Sharpe/pick +0.255

## Séries

- Streak courante : ❄️ **4** loses consécutifs
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
| `skip` | 1512 | 57% | 55–60% | 🟢 +13.0% | +14738870.50u | 0.2225 | +1.4pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1512 | 0.0447 | 0.108 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1372 | 57% | 🟢 +14.2% | +14738870.50u | 0.2221 |
| baseball | 127 | 62% | 🟢 +3.2% | +0.00u | 0.2295 |
| basketball | 12 | 67% | 🔴 -7.4% | +0.00u | 0.1966 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1139 | 56% | 🟢 +11.6% | 0.223 |
| `football:top5` | 233 | 61% | 🟢 +27.0% | 0.2174 |
| `baseball:all` | 127 | 62% | 🟡 +3.2% | 0.2295 |
| `basketball:all` | 12 | 67% | 🔴 -7.4% | 0.1966 |
| `hockey:all` | 1 | 0% | 🔴 -100.0% | 0.2557 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 268 | 77% | 🟢 +1.0% | 0.1608 |
| fav | 594 | 56% | 🔴 -3.1% | 0.2268 |
| toss_up | 415 | 52% | 🟢 +20.7% | 0.2415 |
| dog | 231 | 47% | 🟢 +52.3% | 0.2479 |
| heavy_dog | 4 | 50% | 🟢 +142.5% | 0.2824 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 240 | 36.6% | 42.1% | 🟢 +5.5% |
| [0.4–0.5] | 409 | 45.3% | 42.8% | ⚪ -2.5% |
| [0.5–0.6] | 426 | 54.9% | 58.7% | ⚪ +3.8% |
| [0.6–0.7] | 239 | 64.5% | 70.3% | 🟢 +5.8% |
| [0.7–0.8] | 122 | 74.7% | 80.3% | 🟢 +5.6% |
| [0.8–0.9] | 66 | 84.6% | 95.5% | 🟢 +10.8% |
| [0.9–1.0] | 10 | 91.8% | 90.0% | ⚪ -1.8% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 127 | 62% | 🟢 +3.2% | 0.2295 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `eng.4` | 77 | 56% | 🟢 +34.4% | 0.2386 |
| `eng.2` | 74 | 54% | 🟢 +16.9% | 0.2343 |
| `eng.3` | 66 | 42% | 🔴 -2.1% | 0.2412 |
| `esp.2` | 60 | 52% | 🟢 +14.8% | 0.2318 |
| `esp.1` | 56 | 59% | 🟢 +14.8% | 0.2076 |
| `jpn.1` | 51 | 51% | 🔴 -0.2% | 0.2119 |
| `eng.1` | 50 | 56% | 🟢 +25.4% | 0.2408 |
| `ita.1` | 48 | 71% | 🟢 +44.9% | 0.1951 |
