# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-27T13:15:18Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 241 picks sur 2026-11-21T00:00Z → 2026-11-26T20:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 275.15u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **241 picks** · 146 gagnés / 95 perdus · WR **60.6%**
- ROI flat (1u/pick) : **+8.00%** (+19.28u cumulé)
- Kelly 0.25× cap 10% : cumulé **+175.15u**
- Cote moyenne : 1.87 · Pick prob moyenne : 55.4%
- **Brier** : 0.2188 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6253 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **2751.52€** (+175.2%) · DD max 9.8% · Sharpe/pick +0.235

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
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 241 | 61% | 54–67% | 🟢 +8.0% | +175.15u | 0.2188 | -2.8pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 241 | 0.0519 | 0.161 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 216 | 59% | 🟢 +7.6% | +175.15u | 0.2192 |
| hockey | 15 | 67% | 🟢 +12.8% | +0.00u | 0.2439 |
| basketball | 10 | 80% | 🟢 +8.9% | +0.00u | 0.1729 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 176 | 59% | 🟡 +5.0% | 0.2192 |
| `football:top5` | 40 | 62% | 🟢 +19.2% | 0.2193 |
| `hockey:all` | 15 | 67% | 🟢 +12.8% | 0.2439 |
| `basketball:all` | 10 | 80% | 🟢 +8.9% | 0.1729 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 76 | 72% | 🔴 -6.3% | 0.1808 |
| fav | 87 | 60% | 🟢 +2.1% | 0.2235 |
| toss_up | 55 | 49% | 🟢 +10.9% | 0.2411 |
| dog | 23 | 52% | 🟢 +70.4% | 0.2735 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 38 | 36.4% | 42.1% | 🟢 +5.7% |
| [0.4–0.5] | 51 | 44.3% | 45.1% | ⚪ +0.8% |
| [0.5–0.6] | 64 | 54.7% | 59.4% | ⚪ +4.7% |
| [0.6–0.7] | 48 | 64.5% | 75.0% | 🟢 +10.5% |
| [0.7–0.8] | 28 | 74.8% | 75.0% | ⚪ +0.2% |
| [0.8–0.9] | 11 | 83.9% | 100.0% | 🟢 +16.1% |
| [0.9–1.0] | 1 | 95.0% | 100.0% | 🟢 +5.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `championship` | 22 | 50% | 🔴 -9.2% | 0.2255 |
| `championsleague` | 16 | 69% | 🟢 +3.5% | 0.2117 |
| `nhl` | 15 | 67% | 🟢 +12.8% | 0.2439 |
| `europaleague` | 14 | 71% | 🟢 +13.3% | 0.2595 |
| `ita.2` | 13 | 46% | 🔴 -7.7% | 0.2187 |
| `conferenceleague` | 12 | 67% | 🟢 +5.7% | 0.1802 |
| `eng.1` | 10 | 50% | 🔴 -1.7% | 0.2427 |
| `ligamx` | 9 | 33% | 🔴 -18.3% | 0.2128 |
| `nba` | 9 | 78% | 🟢 +9.8% | 0.1918 |
| `eredivisie` | 8 | 50% | 🔴 -29.9% | 0.2199 |
