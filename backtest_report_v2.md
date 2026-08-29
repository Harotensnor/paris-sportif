# Backtest ROI — VRAI modèle (v2)

Généré : 2026-08-29T10:31:55Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 316 picks sur 2026-08-14T10:00Z → 2026-08-28T19:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 339.68u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **316 picks** · 184 gagnés / 132 perdus · WR **58.2%**
- ROI flat (1u/pick) : **+13.42%** (+42.42u cumulé)
- Kelly 0.25× cap 10% : cumulé **+239.68u**
- Cote moyenne : 2.10 · Pick prob moyenne : 51.8%
- **Brier** : 0.223 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6357 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **3396.84€** (+239.7%) · DD max 12.7% · Sharpe/pick +0.159

## Séries

- Streak courante : 🔥 **1** wins consécutifs
- Plus longue série gagnante : **9**
- Plus longue série perdante : **7**
- Top run win : 9 picks (2026-08-15T19:30Z → 2026-08-15T21:30Z)
- Top run lose : 7 picks (2026-08-15T14:00Z → 2026-08-15T14:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 316 | 58% | 53–64% | 🟢 +13.4% | +239.68u | 0.223 | +0.2pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 316 | 0.0649 | 0.18 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 285 | 59% | 🟢 +16.7% | +239.68u | 0.2193 |
| baseball | 27 | 41% | 🔴 -27.8% | +0.00u | 0.2714 |
| basketball | 4 | 100% | 🟢 +59.8% | +0.00u | 0.1629 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 247 | 58% | 🟢 +16.4% | 0.221 |
| `football:top5` | 38 | 66% | 🟢 +18.7% | 0.2077 |
| `baseball:all` | 27 | 41% | 🔴 -27.8% | 0.2714 |
| `basketball:all` | 4 | 100% | 🟢 +59.8% | 0.1629 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 49 | 82% | 🟢 +10.1% | 0.1482 |
| fav | 123 | 65% | 🟢 +13.7% | 0.2284 |
| toss_up | 91 | 49% | 🟢 +14.0% | 0.2567 |
| dog | 53 | 36% | 🟢 +15.0% | 0.2217 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 66 | 36.6% | 40.9% | ⚪ +4.3% |
| [0.4–0.5] | 92 | 45.0% | 47.8% | ⚪ +2.9% |
| [0.5–0.6] | 80 | 55.0% | 63.7% | 🟢 +8.8% |
| [0.6–0.7] | 49 | 64.6% | 73.5% | 🟢 +8.9% |
| [0.7–0.8] | 20 | 75.1% | 85.0% | 🟢 +9.9% |
| [0.8–0.9] | 9 | 82.0% | 100.0% | 🟢 +18.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 27 | 41% | 🔴 -27.8% | 0.2714 |
| `eng.league_cup` | 17 | 65% | 🟢 +21.1% | 0.2203 |
| `ita.coppa_italia` | 16 | 88% | 🟢 +43.6% | 0.2023 |
| `fra.2` | 14 | 50% | 🟢 +34.5% | 0.2567 |
| `chn.1` | 13 | 46% | 🔴 -7.3% | 0.2544 |
| `eng.3` | 12 | 58% | 🟢 +36.7% | 0.2553 |
| `eng.4` | 12 | 58% | 🟢 +36.8% | 0.2743 |
| `esp.2` | 12 | 50% | 🔴 -10.3% | 0.2237 |
| `eng.1` | 11 | 64% | 🟢 +16.8% | 0.2315 |
| `eng.2` | 11 | 18% | 🔴 -46.4% | 0.197 |
