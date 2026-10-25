# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-25T08:46:48Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 2211 picks sur 2026-08-28T18:30Z → 2026-10-25T06:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 65623916.57u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **2211 picks** · 1245 gagnés / 966 perdus · WR **56.3%**
- ROI flat (1u/pick) : **+10.09%** (+223.09u cumulé)
- Kelly 0.25× cap 10% : cumulé **+65623816.57u**
- Cote moyenne : 2.07 · Pick prob moyenne : 54.1%
- **Brier** : 0.2236 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6365 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **656239165.74€** (+65623816.6%) · DD max 65.0% · Sharpe/pick +0.214

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **12**
- Plus longue série perdante : **7**
- Top run win : 12 picks (2026-09-08T18:45Z → 2026-09-08T19:00Z)
- Top run lose : 7 picks (2026-08-29T14:30Z → 2026-08-29T16:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 2211 | 56% | 54–58% | 🟢 +10.1% | +65623816.57u | 0.2236 | +1.3pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 2211 | 0.0222 | 0.079 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 2061 | 56% | 🟢 +10.5% | +65361976.79u | 0.2235 |
| baseball | 125 | 64% | 🟢 +6.3% | +0.00u | 0.2271 |
| basketball | 16 | 56% | 🔴 -16.7% | +261839.79u | 0.2283 |
| hockey | 9 | 78% | 🟢 +20.3% | +0.00u | 0.1735 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1751 | 55% | 🟢 +9.1% | 0.224 |
| `football:top5` | 310 | 60% | 🟢 +18.3% | 0.2209 |
| `baseball:all` | 125 | 64% | 🟢 +6.3% | 0.2271 |
| `basketball:all` | 16 | 56% | 🔴 -16.7% | 0.2283 |
| `hockey:all` | 9 | 78% | 🟢 +20.3% | 0.1735 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 402 | 77% | 🟢 +1.3% | 0.1644 |
| fav | 854 | 55% | 🔴 -3.7% | 0.2301 |
| toss_up | 633 | 51% | 🟢 +19.1% | 0.2426 |
| dog | 320 | 42% | 🟢 +39.1% | 0.2426 |
| heavy_dog | 2 | 50% | 🟢 +140.0% | 0.2906 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 392 | 36.5% | 39.0% | ⚪ +2.5% |
| [0.4–0.5] | 544 | 45.2% | 45.6% | ⚪ +0.3% |
| [0.5–0.6] | 597 | 54.7% | 55.6% | ⚪ +0.9% |
| [0.6–0.7] | 372 | 64.6% | 68.0% | ⚪ +3.4% |
| [0.7–0.8] | 201 | 74.5% | 82.1% | 🟢 +7.6% |
| [0.8–0.9] | 89 | 84.3% | 87.6% | ⚪ +3.4% |
| [0.9–1.0] | 16 | 92.1% | 100.0% | 🟢 +7.9% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 125 | 64% | 🟢 +6.3% | 0.2271 |
| `eng.4` | 124 | 52% | 🟢 +25.8% | 0.2514 |
| `eng.2` | 120 | 50% | 🟢 +6.7% | 0.2377 |
| `eng.3` | 112 | 49% | 🟢 +7.2% | 0.2278 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `jpn.1` | 87 | 53% | 🟢 +7.4% | 0.2274 |
| `esp.2` | 83 | 54% | 🟢 +18.2% | 0.2165 |
| `esp.1` | 71 | 63% | 🟢 +22.9% | 0.218 |
| `ita.2` | 68 | 53% | 🟢 +23.6% | 0.2429 |
| `eng.1` | 64 | 55% | 🟢 +18.3% | 0.2445 |
