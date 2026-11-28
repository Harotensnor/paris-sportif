# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-28T12:30:56Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 105 picks sur 2026-11-22T15:30Z → 2026-11-27T20:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 166.87u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **105 picks** · 66 gagnés / 39 perdus · WR **62.9%**
- ROI flat (1u/pick) : **+7.80%** (+8.19u cumulé)
- Kelly 0.25× cap 10% : cumulé **+66.87u**
- Cote moyenne : 1.84 · Pick prob moyenne : 57.0%
- **Brier** : 0.2069 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.5971 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1668.73€** (+66.9%) · DD max 3.7% · Sharpe/pick +0.262

## Séries

- Streak courante : ❄️ **1** loses consécutifs
- Plus longue série gagnante : **6**
- Plus longue série perdante : **3**
- Top run win : 6 picks (2026-11-23T15:00Z → 2026-11-23T19:45Z)
- Top run lose : 3 picks (2026-11-22T15:45Z → 2026-11-22T16:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 105 | 63% | 53–71% | 🟢 +7.8% | +66.87u | 0.2069 | -3.0pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 105 | 0.0587 | 0.149 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 103 | 62% | 🟢 +7.2% | +66.87u | 0.2088 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 92 | 63% | 🟢 +5.6% | 0.2057 |
| `football:top5` | 11 | 55% | 🟢 +20.3% | 0.2345 |
| `basketball:all` | 1 | 100% | 🟡 +1.0% | 0.0025 |
| `hockey:all` | 1 | 100% | 🟢 +76.9% | 0.214 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 37 | 73% | 🔴 -8.9% | 0.1686 |
| fav | 38 | 58% | 🔴 -0.3% | 0.2088 |
| toss_up | 19 | 74% | 🟢 +63.2% | 0.2843 |
| dog | 11 | 27% | 🔴 -3.6% | 0.1955 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 18 | 36.3% | 38.9% | ⚪ +2.6% |
| [0.4–0.5] | 19 | 44.6% | 52.6% | 🟢 +8.0% |
| [0.5–0.6] | 26 | 54.8% | 57.7% | ⚪ +2.8% |
| [0.6–0.7] | 19 | 65.4% | 73.7% | 🟢 +8.3% |
| [0.7–0.8] | 15 | 74.8% | 80.0% | 🟢 +5.2% |
| [0.8–0.9] | 7 | 85.1% | 100.0% | 🟢 +14.9% |
| [0.9–1.0] | 1 | 95.0% | 100.0% | 🟢 +5.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `championsleague` | 16 | 69% | 🟢 +15.4% | 0.2216 |
| `europaleague` | 14 | 71% | 🟢 +13.3% | 0.2595 |
| `championship` | 12 | 42% | 🔴 -24.2% | 0.2205 |
| `conferenceleague` | 12 | 67% | 🟢 +5.7% | 0.1802 |
| `afc.champions` | 7 | 71% | 🟢 +4.8% | 0.1441 |
| `ita.2` | 7 | 43% | 🔴 -20.7% | 0.1708 |
| `esp.1` | 4 | 50% | 🔴 -17.2% | 0.1927 |
| `eng.1` | 3 | 100% | 🟢 +110.6% | 0.1752 |
| `eliteserien` | 2 | 0% | 🔴 -100.0% | 0.2461 |
| `fra.1` | 2 | 0% | 🔴 -100.0% | 0.3079 |
