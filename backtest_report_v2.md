# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-11T10:23:15Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1631 picks sur 2026-08-21T18:45Z → 2026-10-10T20:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 16556561.41u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1631 picks** · 932 gagnés / 699 perdus · WR **57.1%**
- ROI flat (1u/pick) : **+12.95%** (+211.29u cumulé)
- Kelly 0.25× cap 10% : cumulé **+16556461.41u**
- Cote moyenne : 2.08 · Pick prob moyenne : 54.0%
- **Brier** : 0.2235 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.636 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **165565614.09€** (+16556461.4%) · DD max 36.7% · Sharpe/pick +0.240

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
| `skip` | 1631 | 57% | 55–60% | 🟢 +12.9% | +16556461.41u | 0.2235 | +1.4pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1631 | 0.0407 | 0.112 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1490 | 57% | 🟢 +13.8% | +16556461.41u | 0.2235 |
| baseball | 125 | 63% | 🟢 +4.9% | +0.00u | 0.2276 |
| basketball | 12 | 67% | 🔴 -7.4% | +0.00u | 0.1966 |
| hockey | 4 | 75% | 🟢 +17.4% | +0.00u | 0.1789 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1235 | 56% | 🟢 +11.4% | 0.2248 |
| `football:top5` | 255 | 61% | 🟢 +25.2% | 0.2174 |
| `baseball:all` | 125 | 63% | 🟡 +4.9% | 0.2276 |
| `basketball:all` | 12 | 67% | 🔴 -7.4% | 0.1966 |
| `hockey:all` | 4 | 75% | 🟢 +17.4% | 0.1789 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 290 | 77% | 🟢 +0.9% | 0.1609 |
| fav | 635 | 56% | 🔴 -3.0% | 0.2293 |
| toss_up | 453 | 52% | 🟢 +20.7% | 0.2414 |
| dog | 249 | 47% | 🟢 +51.6% | 0.2483 |
| heavy_dog | 4 | 50% | 🟢 +142.5% | 0.2824 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 261 | 36.6% | 42.1% | 🟢 +5.5% |
| [0.4–0.5] | 442 | 45.3% | 43.4% | ⚪ -1.8% |
| [0.5–0.6] | 456 | 54.9% | 59.2% | ⚪ +4.3% |
| [0.6–0.7] | 253 | 64.5% | 69.2% | ⚪ +4.7% |
| [0.7–0.8] | 137 | 74.6% | 78.1% | ⚪ +3.5% |
| [0.8–0.9] | 70 | 84.5% | 95.7% | 🟢 +11.2% |
| [0.9–1.0] | 12 | 91.6% | 91.7% | ⚪ +0.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 125 | 63% | 🟢 +4.9% | 0.2276 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `eng.4` | 89 | 53% | 🟢 +27.7% | 0.2419 |
| `eng.2` | 83 | 55% | 🟢 +23.4% | 0.2391 |
| `eng.3` | 78 | 46% | 🟢 +2.8% | 0.2392 |
| `esp.2` | 62 | 53% | 🟢 +18.4% | 0.2327 |
| `esp.1` | 59 | 61% | 🟢 +16.1% | 0.2036 |
| `eng.1` | 56 | 57% | 🟢 +27.5% | 0.2439 |
| `jpn.1` | 55 | 51% | 🔴 -0.7% | 0.2074 |
| `ita.1` | 51 | 71% | 🟢 +41.6% | 0.1911 |
