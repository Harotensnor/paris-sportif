# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-21T09:22:03Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1295 picks sur 2026-08-18T11:35Z → 2026-09-20T21:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 14079503.24u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1295 picks** · 748 gagnés / 547 perdus · WR **57.8%**
- ROI flat (1u/pick) : **+15.85%** (+205.21u cumulé)
- Kelly 0.25× cap 10% : cumulé **+14079403.24u**
- Cote moyenne : 2.09 · Pick prob moyenne : 54.2%
- **Brier** : 0.2234 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6353 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **140795032.42€** (+14079403.2%) · DD max 37.7% · Sharpe/pick +0.281

## Séries

- Streak courante : 🔥 **3** wins consécutifs
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
| `skip` | 1295 | 58% | 55–60% | 🟢 +15.8% | +14079403.24u | 0.2234 | +1.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1295 | 0.0517 | 0.139 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1186 | 58% | 🟢 +17.6% | +14079403.24u | 0.2229 |
| baseball | 101 | 58% | 🔴 -2.9% | +0.00u | 0.2341 |
| basketball | 8 | 75% | 🔴 -0.2% | +0.00u | 0.1622 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 956 | 57% | 🟢 +14.9% | 0.2247 |
| `football:top5` | 230 | 62% | 🟢 +28.7% | 0.2152 |
| `baseball:all` | 101 | 58% | 🔴 -2.9% | 0.2341 |
| `basketball:all` | 8 | 75% | 🔴 -0.2% | 0.1622 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 222 | 78% | 🟢 +2.2% | 0.1539 |
| fav | 509 | 55% | 🔴 -4.3% | 0.2272 |
| toss_up | 355 | 55% | 🟢 +27.1% | 0.2437 |
| dog | 205 | 48% | 🟢 +58.6% | 0.2529 |
| heavy_dog | 4 | 50% | 🟢 +142.5% | 0.2824 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 197 | 36.4% | 46.2% | 🟢 +9.7% |
| [0.4–0.5] | 354 | 45.3% | 42.4% | ⚪ -2.9% |
| [0.5–0.6] | 363 | 55.0% | 58.4% | ⚪ +3.4% |
| [0.6–0.7] | 210 | 64.3% | 69.0% | ⚪ +4.7% |
| [0.7–0.8] | 103 | 74.7% | 81.6% | 🟢 +6.9% |
| [0.8–0.9] | 58 | 84.4% | 98.3% | 🟢 +13.9% |
| [0.9–1.0] | 10 | 91.8% | 90.0% | ⚪ -1.8% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 101 | 58% | 🔴 -2.9% | 0.2341 |
| `eng.2` | 71 | 55% | 🟢 +18.5% | 0.2311 |
| `eng.3` | 59 | 44% | 🟢 +4.3% | 0.2414 |
| `eng.4` | 59 | 59% | 🟢 +45.0% | 0.2406 |
| `esp.1` | 55 | 60% | 🟢 +16.9% | 0.2078 |
| `eng.1` | 50 | 56% | 🟢 +25.4% | 0.24 |
| `jpn.1` | 49 | 51% | 🟢 +0.5% | 0.2161 |
| `ita.1` | 48 | 71% | 🟢 +44.9% | 0.1951 |
| `fra.1` | 44 | 61% | 🟢 +38.5% | 0.2315 |
| `esp.2` | 41 | 51% | 🟢 +14.4% | 0.2106 |
