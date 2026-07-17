# Backtest ROI — VRAI modèle (v2)

Généré : 2026-07-17T06:07:38Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 693 picks sur 2026-05-27T19:00Z → 2026-07-16T17:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 126.64u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **693 picks** · 405 gagnés / 288 perdus · WR **58.4%**
- ROI flat (1u/pick) : **+1.52%** (+10.51u cumulé)
- Kelly 0.25× cap 10% : cumulé **+26.64u**
- Cote moyenne : 1.76 · Pick prob moyenne : 55.1%
- **Brier** : 0.2416 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6763 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1266.43€** (+26.6%) · DD max 6.4% · Sharpe/pick +0.057

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **7**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 7 picks (2026-07-10T23:50Z → 2026-07-11T02:15Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 693 | 58% | 55–62% | 🟢 +1.5% | +26.64u | 0.2416 | -3.0pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 693 | 0.04 | 0.24 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 549 | 57% | 🔴 -1.8% | +0.00u | 0.2444 |
| football | 94 | 57% | 🟢 +17.1% | +26.64u | 0.239 |
| basketball | 44 | 70% | 🟢 +4.1% | +0.00u | 0.2136 |
| hockey | 6 | 83% | 🟢 +43.9% | +0.00u | 0.2262 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 549 | 57% | 🔴 -1.8% | 0.2444 |
| `football:other` | 94 | 57% | 🟢 +17.1% | 0.239 |
| `basketball:all` | 44 | 70% | 🟡 +4.1% | 0.2136 |
| `hockey:all` | 6 | 83% | 🟢 +43.9% | 0.2262 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 72 | 65% | 🔴 -10.4% | 0.2218 |
| fav | 573 | 58% | 🟢 +0.3% | 0.2434 |
| toss_up | 34 | 59% | 🟢 +34.3% | 0.2526 |
| dog | 14 | 43% | 🟢 +33.2% | 0.2406 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 25 | 36.3% | 32.0% | ⚪ -4.3% |
| [0.4–0.5] | 61 | 47.3% | 65.6% | 🟢 +18.3% |
| [0.5–0.6] | 482 | 54.4% | 56.4% | ⚪ +2.1% |
| [0.6–0.7] | 106 | 63.8% | 66.0% | ⚪ +2.3% |
| [0.7–0.8] | 14 | 73.6% | 85.7% | 🟢 +12.1% |
| [0.8–0.9] | 5 | 84.0% | 60.0% | 🔴 -24.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 549 | 57% | 🔴 -1.8% | 0.2444 |
| `wnba` | 39 | 74% | 🟢 +8.9% | 0.2054 |
| `chn.1` | 22 | 68% | 🟢 +41.1% | 0.2214 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `allsvenskan` | 12 | 50% | 🔴 -10.7% | 0.2183 |
| `eliteserien` | 10 | 90% | 🟢 +71.0% | 0.2383 |
| `esp.2` | 9 | 78% | 🟢 +31.8% | 0.1901 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `nhl` | 6 | 83% | 🟢 +43.9% | 0.2262 |
| `nba` | 5 | 40% | 🔴 -33.1% | 0.2782 |
