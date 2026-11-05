# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-05T11:41:07Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1768 picks sur 2026-09-14T13:45Z → 2026-11-05T02:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 6768770.92u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1768 picks** · 1045 gagnés / 723 perdus · WR **59.1%**
- ROI flat (1u/pick) : **+12.73%** (+224.99u cumulé)
- Kelly 0.25× cap 10% : cumulé **+6768670.92u**
- Cote moyenne : 2.02 · Pick prob moyenne : 54.8%
- **Brier** : 0.219 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6265 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **67687709.23€** (+6768670.9%) · DD max 34.6% · Sharpe/pick +0.234

## Séries

- Streak courante : 🔥 **2** wins consécutifs
- Plus longue série gagnante : **18**
- Plus longue série perdante : **8**
- Top run win : 18 picks (2026-10-30T17:30Z → 2026-10-31T12:00Z)
- Top run lose : 8 picks (2026-10-24T14:00Z → 2026-10-24T14:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 1 | 100% | 21–100% | 🟢 +145.0% | +5.84u | 0.2465 | +9.5pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 1767 | 59% | 57–61% | 🟢 +12.7% | +6768665.08u | 0.2189 | +0.9pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 1 | 0.497 | 0.497 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1767 | 0.0429 | 0.107 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1666 | 58% | 🟢 +12.6% | +6768103.94u | 0.2192 |
| baseball | 54 | 74% | 🟢 +21.8% | +0.00u | 0.213 |
| basketball | 30 | 60% | 🔴 -12.7% | +561.14u | 0.2337 |
| hockey | 18 | 83% | 🟢 +36.3% | +5.84u | 0.1856 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1427 | 58% | 🟢 +12.6% | 0.2221 |
| `football:top5` | 239 | 61% | 🟢 +13.1% | 0.2023 |
| `baseball:all` | 54 | 74% | 🟢 +21.8% | 0.213 |
| `basketball:all` | 30 | 60% | 🔴 -12.7% | 0.2337 |
| `hockey:all` | 18 | 83% | 🟢 +36.3% | 0.1856 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 368 | 79% | 🟢 +4.0% | 0.1579 |
| fav | 653 | 59% | 🟢 +1.8% | 0.2261 |
| toss_up | 528 | 53% | 🟢 +23.6% | 0.2448 |
| dog | 218 | 41% | 🟢 +31.9% | 0.2369 |
| heavy_dog | 1 | 100% | 🟢 +370.0% | 0.4452 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 284 | 36.4% | 37.0% | ⚪ +0.6% |
| [0.4–0.5] | 445 | 45.2% | 48.5% | ⚪ +3.3% |
| [0.5–0.6] | 454 | 54.6% | 59.7% | 🟢 +5.1% |
| [0.6–0.7] | 305 | 64.7% | 69.2% | ⚪ +4.5% |
| [0.7–0.8] | 184 | 74.6% | 85.3% | 🟢 +10.7% |
| [0.8–0.9] | 83 | 84.0% | 86.7% | ⚪ +2.7% |
| [0.9–1.0] | 13 | 92.1% | 100.0% | 🟢 +7.9% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `eng.4` | 88 | 52% | 🟢 +20.2% | 0.2442 |
| `eng.3` | 84 | 50% | 🟢 +0.5% | 0.2158 |
| `eng.2` | 82 | 56% | 🟢 +17.8% | 0.2555 |
| `esp.2` | 63 | 59% | 🟢 +30.2% | 0.2348 |
| `ita.2` | 60 | 52% | 🟢 +16.3% | 0.244 |
| `jpn.1` | 59 | 59% | 🟢 +20.0% | 0.217 |
| `ita.1` | 56 | 64% | 🟢 +9.9% | 0.164 |
| `esp.1` | 54 | 65% | 🟢 +20.1% | 0.2068 |
| `mlb` | 54 | 74% | 🟢 +21.8% | 0.213 |
