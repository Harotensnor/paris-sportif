# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-21T08:56:30Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 2056 picks sur 2026-08-23T11:00Z → 2026-10-20T19:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 49848038.89u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **2056 picks** · 1177 gagnés / 879 perdus · WR **57.2%**
- ROI flat (1u/pick) : **+11.45%** (+235.32u cumulé)
- Kelly 0.25× cap 10% : cumulé **+49847938.89u**
- Cote moyenne : 2.07 · Pick prob moyenne : 54.0%
- **Brier** : 0.2208 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6306 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **498480388.86€** (+49847938.9%) · DD max 22.5% · Sharpe/pick +0.229

## Séries

- Streak courante : 🔥 **4** wins consécutifs
- Plus longue série gagnante : **12**
- Plus longue série perdante : **7**
- Top run win : 12 picks (2026-10-10T16:30Z → 2026-10-10T17:30Z)
- Top run lose : 7 picks (2026-08-29T14:30Z → 2026-08-29T16:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 2056 | 57% | 55–59% | 🟢 +11.4% | +49847938.89u | 0.2208 | +1.2pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 2056 | 0.0376 | 0.083 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1908 | 57% | 🟢 +11.9% | +49739780.55u | 0.2207 |
| baseball | 126 | 63% | 🟢 +5.4% | +0.00u | 0.2275 |
| basketball | 15 | 67% | 🔴 -0.8% | +108158.33u | 0.2066 |
| hockey | 7 | 86% | 🟢 +32.6% | +0.00u | 0.1632 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1604 | 56% | 🟢 +10.0% | 0.2218 |
| `football:top5` | 304 | 62% | 🟢 +21.8% | 0.215 |
| `baseball:all` | 126 | 63% | 🟢 +5.4% | 0.2275 |
| `basketball:all` | 15 | 67% | 🔴 -0.8% | 0.2066 |
| `hockey:all` | 7 | 86% | 🟢 +32.6% | 0.1632 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 373 | 78% | 🟢 +2.4% | 0.1595 |
| fav | 801 | 57% | 🔴 -1.0% | 0.2266 |
| toss_up | 582 | 53% | 🟢 +23.0% | 0.2437 |
| dog | 299 | 41% | 🟢 +32.4% | 0.2366 |
| heavy_dog | 1 | 100% | 🟢 +380.0% | 0.4511 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 379 | 36.6% | 39.8% | ⚪ +3.2% |
| [0.4–0.5] | 500 | 45.4% | 44.4% | ⚪ -1.0% |
| [0.5–0.6] | 561 | 54.8% | 58.6% | ⚪ +3.9% |
| [0.6–0.7] | 334 | 64.6% | 69.5% | ⚪ +4.9% |
| [0.7–0.8] | 183 | 74.8% | 83.1% | 🟢 +8.3% |
| [0.8–0.9] | 87 | 84.1% | 90.8% | 🟢 +6.7% |
| [0.9–1.0] | 12 | 91.7% | 100.0% | 🟢 +8.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 126 | 63% | 🟢 +5.4% | 0.2275 |
| `eng.4` | 113 | 49% | 🟢 +13.8% | 0.2417 |
| `eng.2` | 107 | 53% | 🟢 +14.2% | 0.2356 |
| `eng.3` | 101 | 51% | 🟢 +10.2% | 0.2317 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `esp.2` | 79 | 56% | 🟢 +22.5% | 0.217 |
| `esp.1` | 72 | 62% | 🟢 +17.5% | 0.2079 |
| `jpn.1` | 69 | 57% | 🟢 +13.7% | 0.2193 |
| `ita.1` | 64 | 64% | 🟢 +26.9% | 0.189 |
| `eng.1` | 63 | 56% | 🟢 +17.8% | 0.2308 |
