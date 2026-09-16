# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-16T08:53:47Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1011 picks sur 2026-08-17T16:00Z → 2026-09-15T19:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 1882874.14u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1011 picks** · 586 gagnés / 425 perdus · WR **58.0%**
- ROI flat (1u/pick) : **+17.21%** (+173.99u cumulé)
- Kelly 0.25× cap 10% : cumulé **+1882774.14u**
- Cote moyenne : 2.12 · Pick prob moyenne : 54.1%
- **Brier** : 0.2211 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6304 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **18828741.41€** (+1882774.1%) · DD max 33.4% · Sharpe/pick +0.280

## Séries

- Streak courante : 🔥 **5** wins consécutifs
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
| `skip` | 1011 | 58% | 55–61% | 🟢 +17.2% | +1882774.14u | 0.2211 | +2.3pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1011 | 0.039 | 0.755 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 929 | 58% | 🟢 +19.4% | +1882774.14u | 0.2195 |
| baseball | 78 | 54% | 🔴 -9.4% | +0.00u | 0.2411 |
| basketball | 4 | 75% | 🟢 +16.6% | +0.00u | 0.1903 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 751 | 57% | 🟢 +15.9% | 0.2205 |
| `football:top5` | 178 | 62% | 🟢 +34.6% | 0.2154 |
| `baseball:all` | 78 | 54% | 🔴 -9.4% | 0.2411 |
| `basketball:all` | 4 | 75% | 🟢 +16.6% | 0.1903 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 172 | 79% | 🟢 +3.8% | 0.148 |
| fav | 392 | 55% | 🔴 -3.2% | 0.2269 |
| toss_up | 262 | 57% | 🟢 +32.3% | 0.2439 |
| dog | 182 | 45% | 🟢 +46.9% | 0.242 |
| heavy_dog | 3 | 67% | 🟢 +330.0% | 0.3792 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.2–0.3] | 1 | 24.5% | 100.0% | 🟢 +75.5% |
| [0.3–0.4] | 179 | 36.7% | 41.3% | ⚪ +4.6% |
| [0.4–0.5] | 244 | 45.2% | 45.1% | ⚪ -0.1% |
| [0.5–0.6] | 289 | 54.9% | 58.1% | ⚪ +3.2% |
| [0.6–0.7] | 158 | 64.3% | 69.0% | ⚪ +4.7% |
| [0.7–0.8] | 83 | 74.7% | 83.1% | 🟢 +8.5% |
| [0.8–0.9] | 48 | 84.9% | 97.9% | 🟢 +13.0% |
| [0.9–1.0] | 9 | 91.2% | 88.9% | ⚪ -2.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 78 | 54% | 🔴 -9.4% | 0.2411 |
| `eng.2` | 61 | 57% | 🟢 +28.4% | 0.2241 |
| `eng.3` | 47 | 51% | 🟢 +19.8% | 0.2536 |
| `eng.4` | 47 | 57% | 🟢 +38.3% | 0.2396 |
| `eng.1` | 40 | 62% | 🟢 +58.2% | 0.2493 |
| `esp.1` | 40 | 48% | 🔴 -14.8% | 0.1931 |
| `jpn.1` | 40 | 52% | 🟢 +10.4% | 0.2233 |
| `ita.1` | 38 | 79% | 🟢 +61.4% | 0.1937 |
| `fra.1` | 35 | 60% | 🟢 +40.5% | 0.2322 |
| `esp.2` | 32 | 53% | 🟢 +19.8% | 0.2171 |
