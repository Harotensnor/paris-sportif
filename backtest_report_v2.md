# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-03T08:20:52Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 588 picks sur 2026-08-15T09:00Z → 2026-09-02T19:40Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 30720.55u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **588 picks** · 348 gagnés / 240 perdus · WR **59.2%**
- ROI flat (1u/pick) : **+20.76%** (+122.07u cumulé)
- Kelly 0.25× cap 10% : cumulé **+30620.55u**
- Cote moyenne : 2.16 · Pick prob moyenne : 53.1%
- **Brier** : 0.2234 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6365 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **307205.46€** (+30620.5%) · DD max 22.8% · Sharpe/pick +0.279

## Séries

- Streak courante : ❄️ **2** loses consécutifs
- Plus longue série gagnante : **9**
- Plus longue série perdante : **8**
- Top run win : 9 picks (2026-08-15T19:30Z → 2026-08-15T21:30Z)
- Top run lose : 8 picks (2026-09-01T18:45Z → 2026-09-01T18:45Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 588 | 59% | 55–63% | 🟢 +20.8% | +30620.55u | 0.2234 | +2.5pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 588 | 0.0614 | 0.263 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 532 | 60% | 🟢 +24.9% | +30620.55u | 0.2207 |
| baseball | 49 | 43% | 🔴 -25.9% | +0.00u | 0.2597 |
| basketball | 7 | 86% | 🟢 +35.9% | +0.00u | 0.1808 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 452 | 60% | 🟢 +25.5% | 0.2206 |
| `football:top5` | 80 | 64% | 🟢 +21.1% | 0.2208 |
| `baseball:all` | 49 | 43% | 🔴 -25.9% | 0.2597 |
| `basketball:all` | 7 | 86% | 🟢 +35.9% | 0.1808 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 84 | 81% | 🟢 +8.7% | 0.1493 |
| fav | 227 | 60% | 🟢 +5.2% | 0.2258 |
| toss_up | 166 | 57% | 🟢 +33.5% | 0.2501 |
| dog | 110 | 45% | 🟢 +44.0% | 0.2363 |
| heavy_dog | 1 | 0% | 🔴 -100.0% | 0.0691 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.2–0.3] | 1 | 26.3% | 0.0% | 🔴 -26.3% |
| [0.3–0.4] | 92 | 36.7% | 38.0% | ⚪ +1.4% |
| [0.4–0.5] | 178 | 45.4% | 52.8% | 🟢 +7.4% |
| [0.5–0.6] | 160 | 54.9% | 58.1% | ⚪ +3.2% |
| [0.6–0.7] | 90 | 64.3% | 75.6% | 🟢 +11.2% |
| [0.7–0.8] | 46 | 74.3% | 82.6% | 🟢 +8.3% |
| [0.8–0.9] | 20 | 83.5% | 95.0% | 🟢 +11.5% |
| [0.9–1.0] | 1 | 93.5% | 100.0% | 🟢 +6.5% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 49 | 43% | 🔴 -25.9% | 0.2597 |
| `eng.4` | 36 | 58% | 🟢 +51.8% | 0.2386 |
| `eng.3` | 35 | 49% | 🟢 +9.6% | 0.2049 |
| `eng.2` | 34 | 59% | 🟢 +49.6% | 0.2385 |
| `jpn.1` | 29 | 59% | 🟢 +18.0% | 0.2342 |
| `eng.1` | 20 | 60% | 🟢 +16.3% | 0.2442 |
| `esp.2` | 20 | 60% | 🟢 +38.7% | 0.206 |
| `bel.1` | 18 | 56% | 🟢 +10.9% | 0.188 |
| `ita.1` | 18 | 72% | 🟢 +20.0% | 0.1936 |
| `ned.1` | 18 | 72% | 🟢 +21.7% | 0.2118 |
