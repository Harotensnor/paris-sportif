# Backtest ROI — VRAI modèle (v2)

Généré : 2026-06-30T07:40:25Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 512 picks sur 2026-05-25T12:30Z → 2026-06-28T20:10Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 111.82u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **512 picks** · 291 gagnés / 221 perdus · WR **56.8%**
- ROI flat (1u/pick) : **-0.67%** (-3.42u cumulé)
- Kelly 0.25× cap 10% : cumulé **+11.82u**
- Cote moyenne : 1.78 · Pick prob moyenne : 54.7%
- **Brier** : 0.2405 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6737 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1118.19€** (+11.8%) · DD max 10.7% · Sharpe/pick +0.039

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **6**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 6 picks (2026-06-10T22:35Z → 2026-06-10T23:40Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 1 | 0% | 0–79% | 🔴 -100.0% | -0.49u | 0.2479 | +1.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 511 | 57% | 53–61% | 🔴 -0.5% | +12.31u | 0.2405 | -2.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 1 | 0.498 | 0.498 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 511 | 0.0239 | 0.264 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 404 | 56% | 🔴 -4.9% | -0.49u | 0.2443 |
| football | 68 | 50% | 🟢 +11.1% | +12.31u | 0.2443 |
| basketball | 33 | 79% | 🟢 +16.7% | +0.00u | 0.1908 |
| hockey | 7 | 86% | 🟢 +46.8% | +0.00u | 0.2194 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 404 | 56% | 🔴 -4.9% | 0.2443 |
| `football:other` | 68 | 50% | 🟢 +11.1% | 0.2443 |
| `basketball:all` | 33 | 79% | 🟢 +16.7% | 0.1908 |
| `hockey:all` | 7 | 86% | 🟢 +46.8% | 0.2194 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 51 | 73% | 🔴 -0.7% | 0.1895 |
| fav | 417 | 56% | 🔴 -3.2% | 0.2454 |
| toss_up | 29 | 48% | 🟢 +9.5% | 0.2498 |
| dog | 15 | 47% | 🟢 +49.7% | 0.2606 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 24 | 36.3% | 37.5% | ⚪ +1.2% |
| [0.4–0.5] | 45 | 47.2% | 57.8% | 🟢 +10.6% |
| [0.5–0.6] | 353 | 54.2% | 55.0% | ⚪ +0.7% |
| [0.6–0.7] | 75 | 63.4% | 64.0% | ⚪ +0.6% |
| [0.7–0.8] | 12 | 73.6% | 100.0% | 🟢 +26.4% |
| [0.8–0.9] | 3 | 85.2% | 66.7% | 🔴 -18.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 404 | 56% | 🔴 -4.9% | 0.2443 |
| `wnba` | 27 | 85% | 🟢 +24.2% | 0.1749 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `chn.1` | 12 | 75% | 🟢 +80.2% | 0.2586 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `esp.2` | 9 | 67% | 🟢 +7.3% | 0.1828 |
| `nhl` | 7 | 86% | 🟢 +46.8% | 0.2194 |
| `allsvenskan` | 6 | 17% | 🔴 -46.7% | 0.2172 |
| `laliga2` | 6 | 17% | 🔴 -66.7% | 0.1908 |
| `nba` | 6 | 50% | 🔴 -17.3% | 0.2622 |
