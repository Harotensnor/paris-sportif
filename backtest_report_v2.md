# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-09T12:16:11Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 186 picks sur 2026-11-05T17:45Z → 2026-11-08T20:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 123.88u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🔴 Vue d'ensemble

- **186 picks** · 97 gagnés / 89 perdus · WR **52.2%**
- ROI flat (1u/pick) : **-5.36%** (-9.98u cumulé)
- Kelly 0.25× cap 10% : cumulé **+23.88u**
- Cote moyenne : 2.05 · Pick prob moyenne : 50.3%
- **Brier** : 0.2126 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6154 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **1238.78€** (+23.9%) · DD max 8.9% · Sharpe/pick +0.094

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **7**
- Plus longue série perdante : **8**
- Top run win : 7 picks (2026-11-08T07:30Z → 2026-11-08T08:00Z)
- Top run lose : 8 picks (2026-11-07T01:00Z → 2026-11-07T06:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 1 | 100% | 21–100% | 🟢 +105.0% | +1.64u | 0.2332 | +2.9pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 185 | 52% | 45–59% | 🔴 -6.0% | +22.23u | 0.2125 | -3.6pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 1 | 0.483 | 0.483 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 185 | 0.0717 | 0.176 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 185 | 52% | 🔴 -5.6% | +23.88u | 0.2131 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 142 | 49% | 🔴 -11.8% | 0.2129 |
| `football:top5` | 43 | 63% | 🟢 +15.0% | 0.2137 |
| `basketball:all` | 1 | 100% | 🟢 +30.9% | 0.1155 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 41 | 80% | 🟢 +4.0% | 0.1666 |
| fav | 69 | 58% | 🟢 +3.5% | 0.246 |
| toss_up | 48 | 38% | 🔴 -12.3% | 0.2236 |
| dog | 28 | 21% | 🔴 -29.1% | 0.1786 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 48 | 35.5% | 27.1% | 🔴 -8.5% |
| [0.4–0.5] | 57 | 45.1% | 43.9% | ⚪ -1.3% |
| [0.5–0.6] | 35 | 53.8% | 60.0% | 🟢 +6.2% |
| [0.6–0.7] | 28 | 64.6% | 82.1% | 🟢 +17.6% |
| [0.7–0.8] | 13 | 73.6% | 84.6% | 🟢 +11.0% |
| [0.8–0.9] | 4 | 83.2% | 75.0% | 🔴 -8.2% |
| [0.9–1.0] | 1 | 91.0% | 100.0% | 🟢 +9.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `europaleague` | 15 | 40% | 🔴 -33.7% | 0.2668 |
| `championship` | 12 | 42% | 🔴 -18.4% | 0.2462 |
| `conferenceleague` | 12 | 67% | 🔴 -3.4% | 0.2033 |
| `eng.1` | 10 | 60% | 🟢 +9.7% | 0.2 |
| `jleague` | 10 | 40% | 🔴 -5.0% | 0.2204 |
| `esp.1` | 9 | 67% | 🟢 +54.2% | 0.2877 |
| `chn.1` | 8 | 88% | 🟢 +40.7% | 0.2134 |
| `eredivisie` | 8 | 12% | 🔴 -82.5% | 0.1614 |
| `fra.1` | 8 | 50% | 🔴 -14.6% | 0.1956 |
| `fra.2` | 8 | 50% | 🟢 +2.4% | 0.2118 |
