# Backtest ROI — VRAI modèle (v2)

Généré : 2026-11-06T11:39:52Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1238 picks sur 2026-10-10T05:00Z → 2026-11-05T20:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 407817.03u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1238 picks** · 742 gagnés / 496 perdus · WR **59.9%**
- ROI flat (1u/pick) : **+14.03%** (+173.65u cumulé)
- Kelly 0.25× cap 10% : cumulé **+407717.03u**
- Cote moyenne : 2.02 · Pick prob moyenne : 55.0%
- **Brier** : 0.217 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6221 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **4078170.25€** (+407717.0%) · DD max 36.2% · Sharpe/pick +0.250

## Séries

- Streak courante : 🔥 **5** wins consécutifs
- Plus longue série gagnante : **18**
- Plus longue série perdante : **8**
- Top run win : 18 picks (2026-10-30T17:30Z → 2026-10-31T12:00Z)
- Top run lose : 8 picks (2026-10-24T14:00Z → 2026-10-24T14:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 1 | 100% | 21–100% | 🟢 +145.0% | +6.75u | 0.232 | +11.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 1237 | 60% | 57–63% | 🟢 +13.9% | +407710.28u | 0.217 | +1.2pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 1 | 0.482 | 0.482 | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1237 | 0.0485 | 0.117 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1193 | 59% | 🟢 +13.8% | +407679.80u | 0.2172 |
| basketball | 25 | 64% | 🔴 -5.9% | +30.06u | 0.2275 |
| hockey | 19 | 89% | 🟢 +49.8% | +7.16u | 0.1875 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1017 | 59% | 🟢 +13.9% | 0.2201 |
| `football:top5` | 176 | 61% | 🟢 +13.2% | 0.2005 |
| `basketball:all` | 25 | 64% | 🔴 -5.9% | 0.2275 |
| `hockey:all` | 19 | 89% | 🟢 +49.8% | 0.1875 |
| `baseball:all` | 1 | 100% | 🟢 +74.6% | 0.21 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 265 | 80% | 🟢 +5.6% | 0.1518 |
| fav | 448 | 59% | 🟢 +3.0% | 0.2264 |
| toss_up | 373 | 56% | 🟢 +29.2% | 0.2457 |
| dog | 151 | 38% | 🟢 +25.0% | 0.2331 |
| heavy_dog | 1 | 0% | 🔴 -100.0% | 0.1138 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 200 | 36.3% | 36.5% | ⚪ +0.2% |
| [0.4–0.5] | 298 | 45.1% | 50.0% | ⚪ +4.9% |
| [0.5–0.6] | 318 | 54.6% | 59.7% | 🟢 +5.2% |
| [0.6–0.7] | 216 | 64.8% | 69.4% | ⚪ +4.6% |
| [0.7–0.8] | 139 | 74.6% | 86.3% | 🟢 +11.7% |
| [0.8–0.9] | 59 | 84.1% | 88.1% | ⚪ +4.0% |
| [0.9–1.0] | 8 | 92.0% | 100.0% | 🟢 +8.0% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `eng.2` | 68 | 60% | 🟢 +27.2% | 0.2406 |
| `eng.3` | 65 | 57% | 🟢 +12.6% | 0.2111 |
| `eng.4` | 58 | 50% | 🟢 +15.2% | 0.247 |
| `ita.2` | 49 | 49% | 🟢 +14.0% | 0.2556 |
| `jpn.1` | 48 | 58% | 🟢 +19.7% | 0.2206 |
| `uefa.champions` | 45 | 76% | 🟢 +37.9% | 0.2074 |
| `ita.1` | 43 | 67% | 🟢 +16.5% | 0.163 |
| `eng.1` | 38 | 53% | 🟢 +7.4% | 0.2055 |
| `swe.1` | 37 | 46% | 🔴 -27.2% | 0.2074 |
| `uefa.europa` | 36 | 64% | 🟢 +2.9% | 0.1808 |
