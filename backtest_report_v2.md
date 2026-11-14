# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-14T11:02:36Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 217 picks sur 2026-11-05T17:45Z → 2026-11-13T20:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 140.76u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **217 picks** · 118 gagnés / 99 perdus · WR **54.4%**
- ROI flat (1u/pick) : **-4.71%** (-10.22u cumulé)
- Kelly 0.25× cap 10% : cumulé **+40.76u**
- Cote moyenne : 1.98 · Pick prob moyenne : 54.4%
- **Brier** : 0.2066 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.5996 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1407.56€** (+40.8%) · DD max 25.1% · Sharpe/pick +0.103

## Séries

- Streak courante : 🔥 **2** wins consécutifs
- Plus longue série gagnante : **7**
- Plus longue série perdante : **8**
- Top run win : 7 picks (2026-11-08T07:30Z → 2026-11-08T08:00Z)
- Top run lose : 8 picks (2026-11-07T01:00Z → 2026-11-07T06:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 217 | 54% | 48–61% | 🔴 -4.7% | +40.76u | 0.2066 | -1.2pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 217 | 0.0728 | 0.145 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 215 | 54% | 🔴 -5.0% | +40.76u | 0.2076 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 172 | 51% | 🔴 -11.2% | 0.2073 |
| `football:top5` | 43 | 65% | 🟢 +19.7% | 0.2087 |
| `basketball:all` | 1 | 100% | 🟢 +30.9% | 0.1155 |
| `hockey:all` | 1 | 100% | 🟢 +32.8% | 0.0813 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 54 | 83% | 🟢 +5.9% | 0.1349 |
| fav | 80 | 57% | 🟢 +1.8% | 0.2397 |
| toss_up | 56 | 38% | 🔴 -13.3% | 0.2381 |
| dog | 27 | 22% | 🔴 -27.4% | 0.1868 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 42 | 36.0% | 31.0% | 🔴 -5.0% |
| [0.4–0.5] | 58 | 45.5% | 39.7% | 🔴 -5.8% |
| [0.5–0.6] | 41 | 54.7% | 48.8% | 🔴 -5.9% |
| [0.6–0.7] | 36 | 63.7% | 72.2% | 🟢 +8.5% |
| [0.7–0.8] | 28 | 74.8% | 89.3% | 🟢 +14.5% |
| [0.8–0.9] | 10 | 83.9% | 90.0% | 🟢 +6.1% |
| [0.9–1.0] | 2 | 90.9% | 100.0% | 🟢 +9.1% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `uefa.nations` | 17 | 65% | 🔴 -5.5% | 0.1607 |
| `europaleague` | 15 | 40% | 🔴 -33.7% | 0.2668 |
| `championship` | 12 | 42% | 🔴 -18.4% | 0.2655 |
| `conferenceleague` | 12 | 67% | 🔴 -3.4% | 0.2033 |
| `eng.1` | 10 | 60% | 🟢 +9.7% | 0.2173 |
| `esp.1` | 9 | 44% | 🔴 -19.7% | 0.2127 |
| `jpn.1` | 9 | 33% | 🔴 -32.2% | 0.2163 |
| `chn.1` | 8 | 88% | 🟢 +40.7% | 0.1813 |
| `eredivisie` | 8 | 25% | 🔴 -53.1% | 0.2096 |
| `fra.1` | 8 | 75% | 🟢 +49.8% | 0.2166 |
