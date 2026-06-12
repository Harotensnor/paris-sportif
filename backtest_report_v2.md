# Backtest ROI — VRAI modèle (v2)

Généré : 2026-06-12T08:14:52Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 303 picks sur 2026-05-24T15:00Z → 2026-06-12T00:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 113.61u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **303 picks** · 168 gagnés / 135 perdus · WR **55.4%**
- ROI flat (1u/pick) : **-1.25%** (-3.80u cumulé)
- Kelly 0.25× cap 10% : cumulé **+13.61u**
- Cote moyenne : 1.82 · Pick prob moyenne : 53.8%
- **Brier** : 0.2413 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6749 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1136.13€** (+13.6%) · DD max 6.1% · Sharpe/pick +0.059

## Séries

- Streak courante : 🔥 **4** wins consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **6**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 6 picks (2026-06-10T22:35Z → 2026-06-10T23:40Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 1 | 100% | 21–100% | 🟢 +135.0% | +7.05u | 0.2065 | +12.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 302 | 55% | 50–61% | 🔴 -1.7% | +6.56u | 0.2414 | -2.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 1 | 0.454 | 0.454 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 302 | 0.0384 | 0.27 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 214 | 56% | 🔴 -4.2% | +0.00u | 0.2431 |
| football | 65 | 49% | 🟢 +4.6% | +6.56u | 0.2411 |
| basketball | 16 | 62% | 🔴 -5.5% | +0.00u | 0.2206 |
| hockey | 8 | 75% | 🟢 +37.3% | +7.05u | 0.2371 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 214 | 56% | 🔴 -4.2% | 0.2431 |
| `football:other` | 59 | 47% | 🟡 +2.8% | 0.2369 |
| `basketball:all` | 16 | 62% | 🔴 -5.5% | 0.2206 |
| `hockey:all` | 8 | 75% | 🟢 +37.3% | 0.2371 |
| `football:top5` | 6 | 67% | 🟢 +21.8% | 0.2822 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 28 | 71% | 🔴 -0.9% | 0.1847 |
| fav | 237 | 55% | 🔴 -4.7% | 0.248 |
| toss_up | 24 | 50% | 🟢 +12.1% | 0.2378 |
| dog | 14 | 43% | 🟢 +33.6% | 0.2473 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 21 | 36.6% | 28.6% | 🔴 -8.0% |
| [0.4–0.5] | 34 | 46.4% | 64.7% | 🟢 +18.3% |
| [0.5–0.6] | 203 | 54.3% | 54.2% | ⚪ -0.1% |
| [0.6–0.7] | 38 | 63.4% | 60.5% | ⚪ -2.9% |
| [0.7–0.8] | 6 | 73.0% | 100.0% | 🟢 +27.0% |
| [0.8–0.9] | 1 | 84.4% | 100.0% | 🟢 +15.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 214 | 56% | 🔴 -4.2% | 0.2431 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `wnba` | 9 | 78% | 🟢 +14.0% | 0.1908 |
| `nhl` | 8 | 75% | 🟢 +37.3% | 0.2371 |
| `esp.2` | 7 | 86% | 🟢 +38.0% | 0.1635 |
| `nba` | 7 | 43% | 🔴 -30.5% | 0.259 |
| `allsvenskan` | 6 | 17% | 🔴 -46.7% | 0.2172 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `ita.1` | 5 | 60% | 🔴 -4.8% | 0.2735 |
