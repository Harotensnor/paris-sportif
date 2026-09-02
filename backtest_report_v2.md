# Backtest ROI — VRAI modèle (v2)

Généré : 2026-09-02T08:11:27Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 551 picks sur 2026-08-15T09:00Z → 2026-09-01T20:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 28390.14u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **551 picks** · 328 gagnés / 223 perdus · WR **59.5%**
- ROI flat (1u/pick) : **+21.74%** (+119.78u cumulé)
- Kelly 0.25× cap 10% : cumulé **+28290.14u**
- Cote moyenne : 2.16 · Pick prob moyenne : 53.1%
- **Brier** : 0.2231 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.636 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **283901.43€** (+28290.1%) · DD max 22.8% · Sharpe/pick +0.294

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
| `skip` | 551 | 60% | 55–64% | 🟢 +21.7% | +28290.14u | 0.2231 | +2.5pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 551 | 0.0655 | 0.263 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 499 | 61% | 🟢 +25.6% | +28290.14u | 0.2206 |
| baseball | 45 | 44% | 🔴 -22.9% | +0.00u | 0.2575 |
| basketball | 7 | 86% | 🟢 +35.9% | +0.00u | 0.1808 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 419 | 60% | 🟢 +26.4% | 0.2206 |
| `football:top5` | 80 | 64% | 🟢 +21.1% | 0.2208 |
| `baseball:all` | 45 | 44% | 🔴 -22.9% | 0.2575 |
| `basketball:all` | 7 | 86% | 🟢 +35.9% | 0.1808 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 79 | 80% | 🟢 +7.1% | 0.1534 |
| fav | 212 | 60% | 🟢 +5.7% | 0.2245 |
| toss_up | 153 | 58% | 🟢 +35.6% | 0.2484 |
| dog | 106 | 45% | 🟢 +45.9% | 0.2374 |
| heavy_dog | 1 | 0% | 🔴 -100.0% | 0.0691 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.2–0.3] | 1 | 26.3% | 0.0% | 🔴 -26.3% |
| [0.3–0.4] | 87 | 36.6% | 37.9% | ⚪ +1.3% |
| [0.4–0.5] | 169 | 45.4% | 53.3% | 🟢 +7.9% |
| [0.5–0.6] | 144 | 54.8% | 59.7% | ⚪ +4.9% |
| [0.6–0.7] | 87 | 64.3% | 74.7% | 🟢 +10.4% |
| [0.7–0.8] | 44 | 74.5% | 81.8% | 🟢 +7.3% |
| [0.8–0.9] | 18 | 83.4% | 94.4% | 🟢 +11.0% |
| [0.9–1.0] | 1 | 93.5% | 100.0% | 🟢 +6.5% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 45 | 44% | 🔴 -22.9% | 0.2575 |
| `eng.4` | 36 | 58% | 🟢 +51.8% | 0.2386 |
| `eng.2` | 30 | 63% | 🟢 +62.7% | 0.2365 |
| `eng.3` | 30 | 50% | 🟢 +12.8% | 0.2007 |
| `eng.1` | 20 | 60% | 🟢 +16.3% | 0.2442 |
| `esp.2` | 20 | 60% | 🟢 +38.7% | 0.206 |
| `jpn.1` | 19 | 68% | 🟢 +42.0% | 0.2364 |
| `ita.1` | 18 | 72% | 🟢 +20.0% | 0.1936 |
| `ned.1` | 18 | 72% | 🟢 +21.7% | 0.2118 |
| `bel.1` | 17 | 53% | 🟢 +6.2% | 0.1899 |
