# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-13T08:35:24Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 911 picks sur 2026-08-16T17:35Z → 2026-09-12T20:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 1692980.95u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **911 picks** · 538 gagnés / 373 perdus · WR **59.1%**
- ROI flat (1u/pick) : **+21.82%** (+198.78u cumulé)
- Kelly 0.25× cap 10% : cumulé **+1692880.95u**
- Cote moyenne : 2.15 · Pick prob moyenne : 53.6%
- **Brier** : 0.2248 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6387 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **16929809.51€** (+1692880.9%) · DD max 33.4% · Sharpe/pick +0.301

## Séries

- Streak courante : 🔥 **4** wins consécutifs
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
| `skip` | 911 | 59% | 56–62% | 🟢 +21.8% | +1692880.95u | 0.2248 | +2.6pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 911 | 0.0552 | 0.755 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 833 | 59% | 🟢 +24.3% | +1692880.95u | 0.2235 |
| baseball | 72 | 54% | 🔴 -8.1% | +0.00u | 0.242 |
| basketball | 6 | 83% | 🟢 +37.7% | +0.00u | 0.2012 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 676 | 58% | 🟢 +19.8% | 0.2226 |
| `football:top5` | 157 | 64% | 🟢 +43.6% | 0.2271 |
| `baseball:all` | 72 | 54% | 🔴 -8.1% | 0.242 |
| `basketball:all` | 6 | 83% | 🟢 +37.7% | 0.2012 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 134 | 78% | 🟢 +3.4% | 0.1524 |
| fav | 361 | 58% | 🟢 +2.6% | 0.2261 |
| toss_up | 242 | 58% | 🟢 +34.9% | 0.2449 |
| dog | 171 | 46% | 🟢 +52.8% | 0.2475 |
| heavy_dog | 3 | 67% | 🟢 +330.0% | 0.3792 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.2–0.3] | 1 | 24.5% | 100.0% | 🟢 +75.5% |
| [0.3–0.4] | 166 | 36.8% | 43.4% | 🟢 +6.5% |
| [0.4–0.5] | 224 | 45.2% | 49.1% | ⚪ +3.9% |
| [0.5–0.6] | 270 | 55.0% | 58.1% | ⚪ +3.2% |
| [0.6–0.7] | 133 | 64.0% | 72.2% | 🟢 +8.1% |
| [0.7–0.8] | 73 | 74.4% | 83.6% | 🟢 +9.2% |
| [0.8–0.9] | 37 | 85.1% | 94.6% | 🟢 +9.5% |
| [0.9–1.0] | 7 | 91.5% | 85.7% | 🔴 -5.8% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 72 | 54% | 🔴 -8.1% | 0.242 |
| `eng.2` | 58 | 59% | 🟢 +31.4% | 0.218 |
| `eng.3` | 47 | 51% | 🟢 +19.8% | 0.2536 |
| `eng.4` | 47 | 57% | 🟢 +38.3% | 0.2396 |
| `jpn.1` | 38 | 55% | 🟢 +16.2% | 0.2264 |
| `eng.1` | 37 | 62% | 🟢 +58.5% | 0.2471 |
| `esp.1` | 32 | 56% | 🟢 +8.0% | 0.2008 |
| `fra.1` | 32 | 62% | 🟢 +53.1% | 0.2487 |
| `ita.1` | 32 | 81% | 🟢 +75.7% | 0.2143 |
| `esp.2` | 30 | 57% | 🟢 +31.0% | 0.2052 |
