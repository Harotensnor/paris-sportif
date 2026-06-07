# Backtest ROI — VRAI modèle (v2)

Généré : 2026-06-07T07:45:37Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 260 picks sur 2026-05-24T11:00Z → 2026-06-06T20:10Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 119.57u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **260 picks** · 138 gagnés / 122 perdus · WR **53.1%**
- ROI flat (1u/pick) : **-3.73%** (-9.71u cumulé)
- Kelly 0.25× cap 10% : cumulé **+19.57u**
- Cote moyenne : 1.85 · Pick prob moyenne : 54.0%
- **Brier** : 0.2457 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.684 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1195.70€** (+19.6%) · DD max 12.2% · Sharpe/pick +0.066

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **10**
- Plus longue série perdante : **6**
- Top run win : 10 picks (2026-05-31T17:40Z → 2026-05-31T20:10Z)
- Top run lose : 6 picks (2026-06-06T19:00Z → 2026-06-06T20:10Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 18 | 44% | 25–66% | 🔴 -15.7% | +3.50u | 0.2552 | +4.9pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 242 | 54% | 47–60% | 🔴 -2.9% | +16.07u | 0.2449 | -2.7pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 18 | 0.2026 | 0.28 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 242 | 0.0392 | 0.156 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| baseball | 161 | 54% | 🔴 -7.2% | +2.53u | 0.2444 |
| football | 81 | 48% | 🟢 +1.8% | +17.03u | 0.2537 |
| basketball | 13 | 69% | 🟢 +3.9% | +0.00u | 0.2122 |
| hockey | 5 | 60% | 🔴 -1.9% | +0.00u | 0.2412 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `baseball:all` | 161 | 54% | 🔴 -7.2% | 0.2444 |
| `football:other` | 66 | 45% | 🔴 -3.3% | 0.2481 |
| `football:top5` | 15 | 60% | 🟢 +24.3% | 0.2785 |
| `basketball:all` | 13 | 69% | 🟡 +3.9% | 0.2122 |
| `hockey:all` | 5 | 60% | 🔴 -1.9% | 0.2412 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 30 | 67% | 🔴 -6.4% | 0.2097 |
| fav | 186 | 52% | 🔴 -10.7% | 0.2516 |
| toss_up | 28 | 54% | 🟢 +20.5% | 0.2419 |
| dog | 16 | 44% | 🟢 +40.3% | 0.25 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 23 | 36.1% | 30.4% | 🔴 -5.7% |
| [0.4–0.5] | 28 | 45.9% | 60.7% | 🟢 +14.8% |
| [0.5–0.6] | 158 | 54.4% | 52.5% | ⚪ -1.9% |
| [0.6–0.7] | 45 | 64.0% | 57.8% | 🔴 -6.2% |
| [0.7–0.8] | 5 | 72.9% | 80.0% | 🟢 +7.1% |
| [0.8–0.9] | 1 | 84.4% | 100.0% | 🟢 +15.6% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 161 | 54% | 🔴 -7.2% | 0.2444 |
| `jpn.1` | 17 | 47% | 🟢 +17.6% | 0.2774 |
| `eliteserien` | 10 | 50% | 🟢 +6.1% | 0.2537 |
| `esp.2` | 9 | 78% | 🟢 +29.0% | 0.1981 |
| `allsvenskan` | 8 | 25% | 🔴 -38.6% | 0.2385 |
| `chn.1` | 8 | 25% | 🔴 -35.6% | 0.3103 |
| `eng.1` | 8 | 50% | 🟢 +24.3% | 0.3013 |
| `wnba` | 8 | 75% | 🟢 +8.1% | 0.196 |
| `ita.1` | 6 | 67% | 🟢 +3.4% | 0.2489 |
| `nba` | 5 | 60% | 🔴 -2.7% | 0.2382 |
