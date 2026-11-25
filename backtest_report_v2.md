# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-25T13:40:56Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 215 picks sur 2026-11-20T03:00Z → 2026-11-24T20:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 232.72u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **215 picks** · 123 gagnés / 92 perdus · WR **57.2%**
- ROI flat (1u/pick) : **+4.09%** (+8.78u cumulé)
- Kelly 0.25× cap 10% : cumulé **+132.72u**
- Cote moyenne : 1.91 · Pick prob moyenne : 54.9%
- **Brier** : 0.226 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6429 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **2327.25€** (+132.7%) · DD max 8.6% · Sharpe/pick +0.209

## Séries

- Streak courante : ❄️ **1** loses consécutifs
- Plus longue série gagnante : **9**
- Plus longue série perdante : **5**
- Top run win : 9 picks (2026-11-21T17:45Z → 2026-11-21T19:45Z)
- Top run lose : 5 picks (2026-11-21T19:45Z → 2026-11-21T20:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 1 | 100% | 21–100% | 🟢 +110.0% | +2.57u | 0.2307 | +4.3pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 214 | 57% | 50–63% | 🟢 +3.6% | +130.15u | 0.226 | -2.4pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 1 | 0.48 | 0.48 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 214 | 0.0466 | 0.143 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 190 | 56% | 🟢 +4.1% | +132.72u | 0.2271 |
| hockey | 15 | 60% | 🟢 +1.0% | +0.00u | 0.2483 |
| basketball | 10 | 80% | 🟢 +8.9% | +0.00u | 0.1729 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 147 | 55% | 🟡 +2.8% | 0.2279 |
| `football:top5` | 43 | 58% | 🟢 +8.5% | 0.2242 |
| `hockey:all` | 15 | 60% | 🟡 +1.0% | 0.2483 |
| `basketball:all` | 10 | 80% | 🟢 +8.9% | 0.1729 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 65 | 71% | 🔴 -7.3% | 0.2006 |
| fav | 73 | 53% | 🔴 -9.1% | 0.2285 |
| toss_up | 54 | 50% | 🟢 +13.4% | 0.2388 |
| dog | 22 | 50% | 🟢 +63.2% | 0.267 |
| heavy_dog | 1 | 0% | 🔴 -100.0% | 0.1024 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 36 | 36.3% | 38.9% | ⚪ +2.6% |
| [0.4–0.5] | 46 | 44.6% | 43.5% | ⚪ -1.2% |
| [0.5–0.6] | 60 | 54.9% | 56.7% | ⚪ +1.8% |
| [0.6–0.7] | 38 | 64.6% | 78.9% | 🟢 +14.3% |
| [0.7–0.8] | 26 | 73.8% | 65.4% | 🔴 -8.4% |
| [0.8–0.9] | 8 | 84.6% | 87.5% | ⚪ +2.9% |
| [0.9–1.0] | 1 | 95.0% | 100.0% | 🟢 +5.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `championship` | 18 | 56% | 🟢 +7.3% | 0.2307 |
| `nhl` | 15 | 60% | 🟢 +1.0% | 0.2483 |
| `ita.2` | 12 | 42% | 🔴 -13.2% | 0.2327 |
| `eng.1` | 10 | 50% | 🔴 -1.7% | 0.2375 |
| `esp.1` | 9 | 56% | 🔴 -13.3% | 0.1566 |
| `ligamx` | 9 | 33% | 🔴 -18.3% | 0.2128 |
| `nba` | 9 | 78% | 🟢 +9.8% | 0.1918 |
| `championsleague` | 8 | 62% | 🔴 -13.8% | 0.2067 |
| `eredivisie` | 8 | 50% | 🔴 -29.9% | 0.2176 |
| `fra.1` | 8 | 50% | 🟢 +1.7% | 0.2814 |
