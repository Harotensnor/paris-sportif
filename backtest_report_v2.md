# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-23T04:25:26Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 255 picks sur 2026-08-12T17:40Z → 2026-08-22T18:45Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 141.21u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **255 picks** · 137 gagnés / 118 perdus · WR **53.7%**
- ROI flat (1u/pick) : **+4.27%** (+10.89u cumulé)
- Kelly 0.25× cap 10% : cumulé **+41.21u**
- Cote moyenne : 2.09 · Pick prob moyenne : 50.7%
- **Brier** : 0.2291 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6497 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1412.07€** (+41.2%) · DD max 12.8% · Sharpe/pick +0.095

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **7**
- Plus longue série perdante : **9**
- Top run win : 7 picks (2026-08-14T19:15Z → 2026-08-15T09:00Z)
- Top run lose : 9 picks (2026-08-15T13:00Z → 2026-08-15T14:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 255 | 54% | 48–60% | 🟢 +4.3% | +41.21u | 0.2291 | -0.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 255 | 0.0393 | 0.182 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 219 | 54% | 🟢 +7.1% | +41.21u | 0.2243 |
| baseball | 33 | 45% | 🔴 -19.9% | +0.00u | 0.2669 |
| basketball | 3 | 100% | 🟢 +61.7% | +0.00u | 0.1682 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 203 | 54% | 🟢 +7.0% | 0.2245 |
| `baseball:all` | 33 | 45% | 🔴 -19.9% | 0.2669 |
| `football:top5` | 16 | 56% | 🟢 +9.0% | 0.2222 |
| `basketball:all` | 3 | 100% | 🟢 +61.7% | 0.1682 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 37 | 76% | 🟢 +3.6% | 0.1828 |
| fav | 108 | 61% | 🟢 +7.6% | 0.2381 |
| toss_up | 69 | 42% | 🔴 -3.9% | 0.2431 |
| dog | 41 | 34% | 🟢 +9.9% | 0.2239 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 62 | 36.5% | 37.1% | ⚪ +0.6% |
| [0.4–0.5] | 70 | 44.7% | 44.3% | ⚪ -0.5% |
| [0.5–0.6] | 64 | 54.8% | 65.6% | 🟢 +10.8% |
| [0.6–0.7] | 39 | 64.6% | 66.7% | ⚪ +2.1% |
| [0.7–0.8] | 16 | 74.0% | 68.8% | 🔴 -5.2% |
| [0.8–0.9] | 4 | 81.8% | 100.0% | 🟢 +18.2% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 33 | 45% | 🔴 -19.9% | 0.2669 |
| `ita.coppa_italia` | 16 | 88% | 🟢 +43.6% | 0.2023 |
| `eng.3` | 12 | 58% | 🟢 +36.7% | 0.2553 |
| `eng.4` | 12 | 58% | 🟢 +36.8% | 0.2743 |
| `chn.1` | 10 | 40% | 🔴 -24.6% | 0.2044 |
| `eng.2` | 10 | 20% | 🔴 -41.0% | 0.2296 |
| `esp.2` | 10 | 60% | 🟢 +7.6% | 0.2353 |
| `jpn.1` | 10 | 60% | 🟢 +23.6% | 0.2194 |
| `arg.1` | 9 | 67% | 🟢 +52.6% | 0.2578 |
| `bel.1` | 9 | 56% | 🟢 +13.1% | 0.2336 |
