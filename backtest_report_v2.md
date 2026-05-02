# Backtest ROI — VRAI modèle (v2)

Généré : 2026-05-02T07:47:58Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 495 picks sur 2026-04-23T18:45Z → 2026-05-02T05:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 280.25u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **495 picks** · 268 gagnés / 227 perdus · WR **54.1%**
- ROI flat (1u/pick) : **+0.53%** (+2.60u cumulé)
- Kelly 0.25× cap 10% : cumulé **+180.25u**
- Cote moyenne : 1.98 · Pick prob moyenne : 52.9%
- **Brier** : 0.229 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6503 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **2802.51€** (+180.2%) · DD max 20.4% · Sharpe/pick +0.111

## Séries

- Streak courante : ❄️ **2** loses consécutifs
- Plus longue série gagnante : **9**
- Plus longue série perdante : **9**
- Top run win : 9 picks (2026-04-30T19:00Z → 2026-05-01T00:00Z)
- Top run lose : 9 picks (2026-04-25T21:00Z → 2026-04-25T21:30Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 2 | 100% | 34–100% | 🟢 +70.5% | +4.53u | 0.1406 | +3.3pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 493 | 54% | 50–58% | 🟢 +0.2% | +175.72u | 0.2294 | -1.1pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 2 | 0.375 | 0.375 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 493 | 0.0356 | 0.41 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 393 | 53% | 🟢 +1.4% | +180.25u | 0.2252 |
| baseball | 58 | 60% | 🟢 +4.4% | +0.00u | 0.2442 |
| basketball | 24 | 58% | 🔴 -11.3% | +0.00u | 0.2429 |
| hockey | 20 | 50% | 🔴 -14.5% | +0.00u | 0.2424 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 345 | 53% | 🟡 +1.4% | 0.2267 |
| `baseball:all` | 58 | 60% | 🟡 +4.4% | 0.2442 |
| `football:top5` | 48 | 56% | 🟡 +1.6% | 0.2147 |
| `basketball:all` | 24 | 58% | 🔴 -11.3% | 0.2429 |
| `hockey:all` | 20 | 50% | 🔴 -14.5% | 0.2424 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 77 | 71% | 🔴 -4.4% | 0.1988 |
| fav | 241 | 59% | 🟢 +4.3% | 0.2349 |
| toss_up | 127 | 43% | 🔴 -1.6% | 0.2437 |
| dog | 49 | 31% | 🔴 -2.8% | 0.2114 |
| heavy_dog | 1 | 0% | 🔴 -100.0% | 0.122 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 82 | 36.4% | 34.1% | ⚪ -2.2% |
| [0.4–0.5] | 126 | 45.7% | 42.9% | ⚪ -2.8% |
| [0.5–0.6] | 164 | 54.7% | 59.1% | ⚪ +4.4% |
| [0.6–0.7] | 78 | 64.4% | 66.7% | ⚪ +2.3% |
| [0.7–0.8] | 34 | 74.4% | 82.4% | 🟢 +8.0% |
| [0.8–0.9] | 9 | 83.7% | 88.9% | 🟢 +5.2% |
| [0.9–1.0] | 2 | 91.0% | 50.0% | 🔴 -41.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 58 | 60% | 🟢 +4.4% | 0.2442 |
| `nba` | 24 | 58% | 🔴 -11.3% | 0.2429 |
| `jpn.1` | 22 | 41% | 🔴 -14.2% | 0.2291 |
| `nhl` | 20 | 50% | 🔴 -14.5% | 0.2424 |
| `ita.2` | 18 | 56% | 🟢 +10.7% | 0.219 |
| `conmebol.libertadores` | 16 | 69% | 🟢 +14.8% | 0.1857 |
| `conmebol.sudamericana` | 15 | 60% | 🟢 +22.1% | 0.218 |
| `eng.3` | 15 | 60% | 🟢 +23.2% | 0.2375 |
| `chn.1` | 13 | 46% | 🔴 -14.6% | 0.2514 |
| `esp.2` | 13 | 46% | 🔴 -6.2% | 0.2192 |
