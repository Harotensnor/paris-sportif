# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-22T12:05:18Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 51 picks sur 2026-11-18T00:30Z → 2026-11-21T20:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 139.33u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **51 picks** · 26 gagnés / 25 perdus · WR **51.0%**
- ROI flat (1u/pick) : **-3.01%** (-1.54u cumulé)
- Kelly 0.25× cap 10% : cumulé **+39.33u**
- Cote moyenne : 1.80 · Pick prob moyenne : 55.7%
- **Brier** : 0.2666 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.7311 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1393.29€** (+39.3%) · DD max 7.3% · Sharpe/pick +0.339

## Séries

- Streak courante : ❄️ **1** loses consécutifs
- Plus longue série gagnante : **8**
- Plus longue série perdante : **3**
- Top run win : 8 picks (2026-11-21T13:00Z → 2026-11-21T14:30Z)
- Top run lose : 3 picks (2026-11-18T01:00Z → 2026-11-18T03:30Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 51 | 51% | 38–64% | 🔴 -3.0% | +39.33u | 0.2666 | -3.6pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 51 | 0.1285 | 0.814 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 44 | 52% | 🟢 +1.8% | +39.33u | 0.264 |
| basketball | 5 | 60% | 🔴 -6.5% | +0.00u | 0.2811 |
| hockey | 2 | 0% | 🔴 -100.0% | +0.00u | 0.288 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:top5` | 27 | 63% | 🟢 +19.6% | 0.2469 |
| `football:other` | 17 | 35% | 🔴 -26.6% | 0.2911 |
| `basketball:all` | 5 | 60% | 🔴 -6.5% | 0.2811 |
| `hockey:all` | 2 | 0% | 🔴 -100.0% | 0.288 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 20 | 45% | 🔴 -37.7% | 0.3027 |
| fav | 15 | 47% | 🔴 -19.3% | 0.2251 |
| toss_up | 13 | 62% | 🟢 +41.9% | 0.2499 |
| dog | 3 | 67% | 🟢 +115.0% | 0.3066 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 4 | 36.1% | 75.0% | 🟢 +38.9% |
| [0.4–0.5] | 12 | 45.6% | 50.0% | ⚪ +4.4% |
| [0.5–0.6] | 19 | 54.7% | 47.4% | 🔴 -7.3% |
| [0.6–0.7] | 9 | 65.0% | 55.6% | 🔴 -9.5% |
| [0.7–0.8] | 6 | 73.6% | 50.0% | 🔴 -23.6% |
| [0.8–0.9] | 1 | 81.4% | 0.0% | 🔴 -81.4% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `eng.1` | 7 | 43% | 🔴 -14.9% | 0.2489 |
| `ger.1` | 7 | 71% | 🟢 +23.2% | 0.2561 |
| `fra.1` | 6 | 50% | 🟢 +13.9% | 0.2716 |
| `fra.2` | 6 | 67% | 🟢 +40.7% | 0.2462 |
| `nba` | 5 | 60% | 🔴 -6.5% | 0.2811 |
| `esp.1` | 4 | 75% | 🟢 +65.1% | 0.2801 |
| `ita.1` | 3 | 100% | 🟢 +42.6% | 0.1269 |
| `jpn.1` | 3 | 0% | 🔴 -100.0% | 0.522 |
| `eng.2` | 2 | 0% | 🔴 -100.0% | 0.1835 |
| `nhl` | 2 | 0% | 🔴 -100.0% | 0.288 |
