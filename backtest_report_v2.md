# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-19T08:20:22Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1080 picks sur 2026-08-17T16:00Z → 2026-09-18T21:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 5744484.24u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1080 picks** · 629 gagnés / 451 perdus · WR **58.2%**
- ROI flat (1u/pick) : **+17.25%** (+186.26u cumulé)
- Kelly 0.25× cap 10% : cumulé **+5744384.24u**
- Cote moyenne : 2.11 · Pick prob moyenne : 54.4%
- **Brier** : 0.2203 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6287 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **57444842.43€** (+5744384.2%) · DD max 33.7% · Sharpe/pick +0.296

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **13**
- Plus longue série perdante : **6**
- Top run win : 13 picks (2026-09-09T16:45Z → 2026-09-09T19:00Z)
- Top run lose : 6 picks (2026-09-12T14:00Z → 2026-09-12T14:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 1080 | 58% | 55–61% | 🟢 +17.2% | +5744384.24u | 0.2203 | +2.2pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1080 | 0.0516 | 0.755 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 990 | 58% | 🟢 +19.5% | +5744384.24u | 0.2188 |
| baseball | 86 | 55% | 🔴 -8.8% | +0.00u | 0.239 |
| basketball | 4 | 75% | 🟢 +16.6% | +0.00u | 0.1903 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 802 | 57% | 🟢 +15.3% | 0.2204 |
| `football:top5` | 188 | 64% | 🟢 +37.4% | 0.212 |
| `baseball:all` | 86 | 55% | 🔴 -8.8% | 0.239 |
| `basketball:all` | 4 | 75% | 🟢 +16.6% | 0.1903 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 188 | 79% | 🟢 +3.9% | 0.1463 |
| fav | 422 | 55% | 🔴 -3.1% | 0.2259 |
| toss_up | 283 | 55% | 🟢 +27.8% | 0.2408 |
| dog | 184 | 47% | 🟢 +56.2% | 0.2492 |
| heavy_dog | 3 | 67% | 🟢 +330.0% | 0.3792 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.2–0.3] | 1 | 24.5% | 100.0% | 🟢 +75.5% |
| [0.3–0.4] | 181 | 36.7% | 44.8% | 🟢 +8.1% |
| [0.4–0.5] | 257 | 45.1% | 42.4% | ⚪ -2.7% |
| [0.5–0.6] | 316 | 54.8% | 57.0% | ⚪ +2.2% |
| [0.6–0.7] | 173 | 64.2% | 71.1% | 🟢 +6.9% |
| [0.7–0.8] | 88 | 74.7% | 83.0% | 🟢 +8.3% |
| [0.8–0.9] | 53 | 84.7% | 98.1% | 🟢 +13.4% |
| [0.9–1.0] | 11 | 91.9% | 90.9% | ⚪ -1.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 86 | 55% | 🔴 -8.8% | 0.239 |
| `eng.2` | 63 | 59% | 🟢 +30.1% | 0.2227 |
| `eng.3` | 48 | 52% | 🟢 +27.7% | 0.2569 |
| `eng.4` | 47 | 57% | 🟢 +38.3% | 0.2396 |
| `esp.1` | 46 | 59% | 🟢 +9.3% | 0.2001 |
| `eng.1` | 41 | 61% | 🟢 +52.3% | 0.2368 |
| `jpn.1` | 40 | 52% | 🟢 +10.4% | 0.2233 |
| `ita.1` | 39 | 74% | 🟢 +50.9% | 0.1868 |
| `fra.1` | 36 | 61% | 🟢 +41.7% | 0.229 |
| `esp.2` | 34 | 53% | 🟢 +20.4% | 0.2199 |
