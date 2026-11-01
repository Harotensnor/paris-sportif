# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-01T10:52:02Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 2172 picks sur 2026-09-04T16:30Z → 2026-10-31T20:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 25825776.3u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **2172 picks** · 1246 gagnés / 926 perdus · WR **57.4%**
- ROI flat (1u/pick) : **+10.26%** (+222.75u cumulé)
- Kelly 0.25× cap 10% : cumulé **+25825676.30u**
- Cote moyenne : 2.04 · Pick prob moyenne : 54.4%
- **Brier** : 0.221 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6311 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **258257762.97€** (+25825676.3%) · DD max 35.1% · Sharpe/pick +0.212

## Séries

- Streak courante : 🔥 **3** wins consécutifs
- Plus longue série gagnante : **12**
- Plus longue série perdante : **8**
- Top run win : 12 picks (2026-09-08T18:45Z → 2026-09-08T19:00Z)
- Top run lose : 8 picks (2026-09-06T13:00Z → 2026-09-06T14:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 2172 | 57% | 55–59% | 🟢 +10.3% | +25825676.30u | 0.221 | +1.1pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 2172 | 0.0385 | 0.073 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 2043 | 57% | 🟢 +10.3% | +25810387.12u | 0.221 |
| baseball | 99 | 67% | 🟢 +10.5% | +0.00u | 0.2249 |
| basketball | 15 | 60% | 🔴 -13.2% | +15289.18u | 0.22 |
| hockey | 15 | 80% | 🟢 +27.6% | +0.00u | 0.1891 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1728 | 57% | 🟢 +10.1% | 0.2216 |
| `football:top5` | 315 | 58% | 🟢 +11.4% | 0.2177 |
| `baseball:all` | 99 | 67% | 🟢 +10.5% | 0.2249 |
| `basketball:all` | 15 | 60% | 🔴 -13.2% | 0.22 |
| `hockey:all` | 15 | 80% | 🟢 +27.6% | 0.1891 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 416 | 79% | 🟢 +3.5% | 0.1602 |
| fav | 838 | 57% | 🔴 -0.8% | 0.2293 |
| toss_up | 625 | 52% | 🟢 +19.9% | 0.2415 |
| dog | 291 | 40% | 🟢 +30.3% | 0.2396 |
| heavy_dog | 2 | 50% | 🟢 +135.0% | 0.2876 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 362 | 36.4% | 39.8% | ⚪ +3.4% |
| [0.4–0.5] | 545 | 45.3% | 43.5% | ⚪ -1.8% |
| [0.5–0.6] | 581 | 54.5% | 57.7% | ⚪ +3.1% |
| [0.6–0.7] | 362 | 64.6% | 71.5% | 🟢 +6.9% |
| [0.7–0.8] | 198 | 74.3% | 81.3% | 🟢 +7.0% |
| [0.8–0.9] | 110 | 83.9% | 87.3% | ⚪ +3.4% |
| [0.9–1.0] | 14 | 92.7% | 100.0% | 🟢 +7.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `eng.4` | 110 | 54% | 🟢 +23.8% | 0.2451 |
| `eng.2` | 107 | 56% | 🟢 +17.2% | 0.2432 |
| `eng.3` | 105 | 50% | 🟢 +4.4% | 0.2295 |
| `mlb` | 99 | 67% | 🟢 +10.5% | 0.2249 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `esp.2` | 80 | 56% | 🟢 +21.3% | 0.2258 |
| `ita.2` | 75 | 49% | 🟢 +15.0% | 0.2407 |
| `jpn.1` | 75 | 59% | 🟢 +18.1% | 0.2179 |
| `esp.1` | 70 | 61% | 🟢 +14.4% | 0.2138 |
| `ita.1` | 69 | 67% | 🟢 +31.1% | 0.1994 |
