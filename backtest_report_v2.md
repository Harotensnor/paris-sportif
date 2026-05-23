# Backtest ROI — VRAI modèle (v2)

Généré : 2026-05-23T06:27:22Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 4 picks sur 2026-05-22T17:30Z → 2026-05-22T19:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 100.78u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **4 picks** · 3 gagnés / 1 perdus · WR **75.0%**
- ROI flat (1u/pick) : **+82.25%** (+3.29u cumulé)
- Kelly 0.25× cap 10% : cumulé **+0.78u**
- Cote moyenne : 2.24 · Pick prob moyenne : 51.9%
- **Brier** : 0.3455 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.891 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1007.85€** (+0.8%) · DD max 4.7% · Sharpe/pick +0.073

## Séries

- Streak courante : 🔥 **2** wins consécutifs
- Plus longue série gagnante : **2**
- Plus longue série perdante : **1**
- Top run win : 2 picks (2026-05-22T18:45Z → 2026-05-22T19:00Z)
- Top run lose : 1 picks (2026-05-22T18:20Z → 2026-05-22T18:20Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 1 | 0% | 0–79% | 🔴 -100.0% | -4.69u | 0.4584 | +7.5pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 3 | 100% | 44–100% | 🟢 +143.0% | +5.48u | 0.3079 | +0.2pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 1 | 0.677 | 0.677 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 3 | 0.534 | 0.641 | en apprentissage |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 3 | 100% | 🟢 +143.0% | +5.48u | 0.3079 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 2 | 100% | 🟢 +89.5% | 0.2488 |
| `baseball:all` | 1 | 0% | 🔴 -100.0% | 0.4584 |
| `football:top5` | 1 | 100% | 🟢 +250.0% | 0.4259 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 1 | 100% | 🟢 +49.0% | 0.1023 |
| fav | 1 | 0% | 🔴 -100.0% | 0.4584 |
| toss_up | 1 | 100% | 🟢 +130.0% | 0.3953 |
| dog | 1 | 100% | 🟢 +250.0% | 0.4259 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 2 | 35.9% | 100.0% | 🟢 +64.1% |
| [0.6–0.7] | 2 | 67.9% | 50.0% | 🔴 -17.9% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
