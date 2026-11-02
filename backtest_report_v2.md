# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-02T11:45:26Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 2227 picks sur 2026-09-05T10:00Z → 2026-11-01T21:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 25505107.75u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **2227 picks** · 1275 gagnés / 952 perdus · WR **57.3%**
- ROI flat (1u/pick) : **+10.08%** (+224.58u cumulé)
- Kelly 0.25× cap 10% : cumulé **+25505007.75u**
- Cote moyenne : 2.04 · Pick prob moyenne : 54.4%
- **Brier** : 0.2211 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6312 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **255051077.51€** (+25505007.8%) · DD max 35.1% · Sharpe/pick +0.207

## Séries

- Streak courante : ❄️ **1** loses consécutifs
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
| `skip` | 2227 | 57% | 55–59% | 🟢 +10.1% | +25505007.75u | 0.2211 | +1.1pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 2227 | 0.0352 | 0.073 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 2096 | 57% | 🟢 +10.2% | +25488010.48u | 0.2211 |
| baseball | 98 | 66% | 🟢 +9.8% | +0.00u | 0.225 |
| basketball | 17 | 59% | 🔴 -16.1% | +16997.27u | 0.2282 |
| hockey | 16 | 81% | 🟢 +28.2% | +0.00u | 0.183 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1775 | 56% | 🟢 +10.0% | 0.2221 |
| `football:top5` | 321 | 58% | 🟢 +11.0% | 0.2155 |
| `baseball:all` | 98 | 66% | 🟢 +9.8% | 0.225 |
| `basketball:all` | 17 | 59% | 🔴 -16.1% | 0.2282 |
| `hockey:all` | 16 | 81% | 🟢 +28.2% | 0.183 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 428 | 79% | 🟢 +3.7% | 0.1591 |
| fav | 853 | 57% | 🔴 -0.8% | 0.2298 |
| toss_up | 644 | 51% | 🟢 +18.9% | 0.2419 |
| dog | 300 | 40% | 🟢 +30.5% | 0.2397 |
| heavy_dog | 2 | 50% | 🟢 +135.0% | 0.2876 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 376 | 36.4% | 39.6% | ⚪ +3.2% |
| [0.4–0.5] | 558 | 45.3% | 43.9% | ⚪ -1.4% |
| [0.5–0.6] | 587 | 54.5% | 57.2% | ⚪ +2.7% |
| [0.6–0.7] | 371 | 64.7% | 70.9% | 🟢 +6.2% |
| [0.7–0.8] | 207 | 74.3% | 81.2% | 🟢 +6.9% |
| [0.8–0.9] | 114 | 83.9% | 87.7% | ⚪ +3.9% |
| [0.9–1.0] | 14 | 92.7% | 100.0% | 🟢 +7.3% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `eng.4` | 110 | 54% | 🟢 +23.8% | 0.2451 |
| `eng.2` | 107 | 56% | 🟢 +17.2% | 0.2432 |
| `eng.3` | 106 | 50% | 🟢 +3.4% | 0.2315 |
| `mlb` | 98 | 66% | 🟢 +9.8% | 0.225 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `esp.2` | 82 | 55% | 🟢 +18.3% | 0.2232 |
| `ita.2` | 80 | 51% | 🟢 +19.4% | 0.2429 |
| `jpn.1` | 79 | 57% | 🟢 +16.1% | 0.2236 |
| `esp.1` | 72 | 61% | 🟢 +12.9% | 0.2107 |
| `ita.1` | 72 | 67% | 🟢 +29.9% | 0.1961 |
