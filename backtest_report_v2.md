# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-30T10:30:43Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 2195 picks sur 2026-08-30T16:30Z → 2026-10-29T19:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 67597898.41u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **2195 picks** · 1260 gagnés / 935 perdus · WR **57.4%**
- ROI flat (1u/pick) : **+10.36%** (+227.47u cumulé)
- Kelly 0.25× cap 10% : cumulé **+67597798.41u**
- Cote moyenne : 2.04 · Pick prob moyenne : 54.5%
- **Brier** : 0.2205 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6301 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **675978984.10€** (+67597798.4%) · DD max 35.1% · Sharpe/pick +0.223

## Séries

- Streak courante : 🔥 **5** wins consécutifs
- Plus longue série gagnante : **12**
- Plus longue série perdante : **8**
- Top run win : 12 picks (2026-09-08T18:45Z → 2026-09-08T19:00Z)
- Top run lose : 8 picks (2026-09-06T13:00Z → 2026-09-06T14:00Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 2195 | 57% | 55–59% | 🟢 +10.4% | +67597798.41u | 0.2205 | +1.1pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 2195 | 0.0431 | 0.075 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 2055 | 57% | 🟢 +10.5% | +67549014.86u | 0.2204 |
| baseball | 114 | 67% | 🟢 +10.8% | +0.00u | 0.2257 |
| basketball | 16 | 56% | 🔴 -15.0% | +48783.55u | 0.2334 |
| hockey | 10 | 80% | 🟢 +23.6% | +0.00u | 0.1709 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1751 | 56% | 🟢 +9.9% | 0.2208 |
| `football:top5` | 304 | 59% | 🟢 +13.7% | 0.218 |
| `baseball:all` | 114 | 67% | 🟢 +10.8% | 0.2257 |
| `basketball:all` | 16 | 56% | 🔴 -15.0% | 0.2334 |
| `hockey:all` | 10 | 80% | 🟢 +23.6% | 0.1709 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 417 | 79% | 🟢 +3.9% | 0.1585 |
| fav | 859 | 57% | 🔴 -1.5% | 0.2282 |
| toss_up | 631 | 51% | 🟢 +18.5% | 0.241 |
| dog | 286 | 42% | 🟢 +36.5% | 0.2426 |
| heavy_dog | 2 | 50% | 🟢 +135.0% | 0.2876 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 362 | 36.5% | 40.3% | ⚪ +3.9% |
| [0.4–0.5] | 546 | 45.3% | 42.5% | ⚪ -2.8% |
| [0.5–0.6] | 593 | 54.6% | 57.7% | ⚪ +3.0% |
| [0.6–0.7] | 371 | 64.6% | 72.0% | 🟢 +7.4% |
| [0.7–0.8] | 200 | 74.3% | 81.5% | 🟢 +7.2% |
| [0.8–0.9] | 108 | 83.9% | 88.0% | ⚪ +4.1% |
| [0.9–1.0] | 15 | 92.5% | 100.0% | 🟢 +7.5% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 114 | 67% | 🟢 +10.8% | 0.2257 |
| `eng.4` | 113 | 52% | 🟢 +23.6% | 0.2483 |
| `eng.2` | 108 | 55% | 🟢 +19.2% | 0.252 |
| `eng.3` | 106 | 51% | 🟢 +8.0% | 0.2291 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `esp.2` | 81 | 56% | 🟢 +17.1% | 0.2216 |
| `jpn.1` | 79 | 53% | 🟢 +6.8% | 0.2229 |
| `ita.2` | 74 | 53% | 🟢 +19.9% | 0.2355 |
| `esp.1` | 71 | 61% | 🟢 +15.8% | 0.2177 |
| `ita.1` | 71 | 66% | 🟢 +27.8% | 0.1949 |
