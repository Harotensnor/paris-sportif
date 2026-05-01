# Backtest ROI — VRAI modèle (v2)

Généré : 2026-05-01T23:29:36Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 471 picks sur 2026-04-23T18:45Z → 2026-05-01T20:45Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 310.27u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **471 picks** · 259 gagnés / 212 perdus · WR **55.0%**
- ROI flat (1u/pick) : **+2.88%** (+13.55u cumulé)
- Kelly 0.25× cap 10% : cumulé **+210.27u**
- Cote moyenne : 1.98 · Pick prob moyenne : 52.8%
- **Brier** : 0.2307 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6539 (plus bas = mieux calibré)

## Séries

- Streak courante : ❄️ **3** loses consécutifs
- Plus longue série gagnante : **6**
- Plus longue série perdante : **9**
- Top run win : 6 picks (2026-04-24T02:00Z → 2026-04-24T18:00Z)
- Top run lose : 9 picks (2026-04-25T21:00Z → 2026-04-25T21:30Z)

## Par tier de fiabilité

| Tier | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| `lock` | 24 | 83% | 🟢 +5.7% | +23.78u | 0.1486 |
| `standard` | 7 | 57% | 🟢 +1.3% | +0.45u | 0.2407 |
| `skip` | 440 | 53% | 🟢 +2.8% | +186.03u | 0.235 |

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 385 | 55% | 🟢 +4.5% | +209.04u | 0.2274 |
| baseball | 45 | 58% | 🔴 -0.9% | +0.00u | 0.2456 |
| basketball | 22 | 64% | 🔴 -0.7% | +0.00u | 0.247 |
| hockey | 19 | 47% | 🔴 -15.8% | +1.23u | 0.2425 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 75 | 72% | 🔴 -3.1% | 0.2019 |
| fav | 222 | 59% | 🟢 +3.5% | 0.2342 |
| toss_up | 127 | 46% | 🟢 +5.9% | 0.247 |
| dog | 46 | 33% | 🟢 +3.6% | 0.218 |
| heavy_dog | 1 | 0% | 🔴 -100.0% | 0.122 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 80 | 36.6% | 38.8% | ⚪ +2.1% |
| [0.4–0.5] | 124 | 45.5% | 42.7% | ⚪ -2.8% |
| [0.5–0.6] | 153 | 54.7% | 60.1% | 🟢 +5.4% |
| [0.6–0.7] | 71 | 64.7% | 67.6% | ⚪ +2.9% |
| [0.7–0.8] | 32 | 74.2% | 81.2% | 🟢 +7.1% |
| [0.8–0.9] | 9 | 83.7% | 88.9% | 🟢 +5.2% |
| [0.9–1.0] | 2 | 91.0% | 50.0% | 🔴 -41.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 45 | 58% | 🔴 -0.9% | 0.2456 |
| `nba` | 22 | 64% | 🔴 -0.7% | 0.247 |
| `nhl` | 19 | 47% | 🔴 -15.8% | 0.2425 |
| `ita.2` | 18 | 56% | 🟢 +10.7% | 0.219 |
| `jpn.1` | 18 | 56% | 🟢 +20.8% | 0.2446 |
| `conmebol.libertadores` | 16 | 69% | 🟢 +14.8% | 0.1856 |
| `conmebol.sudamericana` | 15 | 67% | 🟢 +38.4% | 0.2331 |
| `eng.3` | 15 | 60% | 🟢 +23.2% | 0.2375 |
| `chn.1` | 13 | 46% | 🔴 -14.6% | 0.2514 |
| `esp.2` | 13 | 46% | 🔴 -6.2% | 0.2192 |
