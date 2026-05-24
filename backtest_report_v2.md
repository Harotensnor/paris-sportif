# Backtest ROI — VRAI modèle (v2)

Généré : 2026-05-24T06:52:39Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 41 picks sur 2026-05-23T00:00Z → 2026-05-23T20:30Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 107.76u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **41 picks** · 23 gagnés / 18 perdus · WR **56.1%**
- ROI flat (1u/pick) : **+2.04%** (+0.84u cumulé)
- Kelly 0.25× cap 10% : cumulé **+7.76u**
- Cote moyenne : 1.84 · Pick prob moyenne : 54.7%
- **Brier** : 0.2457 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6864 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1077.56€** (+7.8%) · DD max 4.5% · Sharpe/pick +0.121

## Séries

- Streak courante : ❄️ **3** loses consécutifs
- Plus longue série gagnante : **5**
- Plus longue série perdante : **3**
- Top run win : 5 picks (2026-05-23T09:00Z → 2026-05-23T09:00Z)
- Top run lose : 3 picks (2026-05-23T17:10Z → 2026-05-23T18:45Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 7 | 71% | 36–92% | 🟢 +47.0% | +6.39u | 0.2329 | +6.6pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 34 | 53% | 37–69% | 🔴 -7.2% | +1.37u | 0.2484 | -4.7pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 7 | 0.1657 | 0.504 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 34 | 0.0967 | 0.343 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 25 | 68% | 🟢 +20.2% | +9.71u | 0.2076 |
| baseball | 13 | 38% | 🔴 -23.2% | +2.03u | 0.3155 |
| basketball | 2 | 50% | 🔴 -10.0% | +0.00u | 0.2396 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 16 | 69% | 🟢 +15.8% | 0.2144 |
| `baseball:all` | 13 | 38% | 🔴 -23.2% | 0.3155 |
| `football:top5` | 9 | 67% | 🟢 +28.1% | 0.1955 |
| `basketball:all` | 2 | 50% | 🔴 -10.0% | 0.2396 |
| `hockey:all` | 1 | 0% | 🔴 -100.0% | 0.3027 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 9 | 67% | 🔴 -14.0% | 0.239 |
| fav | 19 | 53% | 🔴 -4.7% | 0.2476 |
| toss_up | 12 | 58% | 🟢 +33.3% | 0.2585 |
| dog | 1 | 0% | 🔴 -100.0% | 0.1174 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 1 | 34.3% | 0.0% | 🔴 -34.3% |
| [0.4–0.5] | 14 | 45.0% | 57.1% | 🟢 +12.1% |
| [0.5–0.6] | 17 | 54.5% | 52.9% | ⚪ -1.5% |
| [0.6–0.7] | 4 | 65.3% | 75.0% | 🟢 +9.7% |
| [0.7–0.8] | 4 | 75.7% | 50.0% | 🔴 -25.7% |
| [0.8–0.9] | 1 | 86.0% | 100.0% | 🟢 +14.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 13 | 38% | 🔴 -23.2% | 0.3155 |
| `esp.1` | 7 | 71% | 🟢 +40.6% | 0.205 |
| `idn.1` | 5 | 80% | 🔴 -3.7% | 0.1819 |
| `jleague` | 5 | 80% | 🟢 +49.9% | 0.2266 |
| `bel.1` | 2 | 50% | 🟢 +5.0% | 0.2412 |
| `ita.1` | 2 | 50% | 🔴 -15.5% | 0.1623 |
| `usa.1` | 2 | 50% | 🔴 -14.3% | 0.2115 |
