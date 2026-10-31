# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-31T10:00:01Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 2106 picks sur 2026-09-02T10:00Z → 2026-10-30T19:00Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 26025769.06u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **2106 picks** · 1205 gagnés / 901 perdus · WR **57.2%**
- ROI flat (1u/pick) : **+9.87%** (+207.78u cumulé)
- Kelly 0.25× cap 10% : cumulé **+26025669.06u**
- Cote moyenne : 2.04 · Pick prob moyenne : 54.4%
- **Brier** : 0.2205 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6299 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **260257690.62€** (+26025669.1%) · DD max 35.1% · Sharpe/pick +0.217

## Séries

- Streak courante : 🔥 **3** wins consécutifs
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
| `skip` | 2106 | 57% | 55–59% | 🟢 +9.9% | +26025669.06u | 0.2205 | +1.1pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 2106 | 0.0383 | 0.074 | validé |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1976 | 57% | 🟢 +10.0% | +26006830.38u | 0.2204 |
| baseball | 106 | 66% | 🟢 +9.5% | +0.00u | 0.2264 |
| basketball | 14 | 57% | 🔴 -16.2% | +18838.68u | 0.2271 |
| hockey | 10 | 80% | 🟢 +23.6% | +0.00u | 0.1709 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1681 | 56% | 🟢 +9.7% | 0.2205 |
| `football:top5` | 295 | 58% | 🟢 +11.9% | 0.2193 |
| `baseball:all` | 106 | 66% | 🟢 +9.5% | 0.2264 |
| `basketball:all` | 14 | 57% | 🔴 -16.2% | 0.2271 |
| `hockey:all` | 10 | 80% | 🟢 +23.6% | 0.1709 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 404 | 78% | 🟢 +3.2% | 0.1601 |
| fav | 817 | 57% | 🔴 -1.2% | 0.2283 |
| toss_up | 606 | 51% | 🟢 +18.9% | 0.2413 |
| dog | 277 | 40% | 🟢 +31.6% | 0.2393 |
| heavy_dog | 2 | 50% | 🟢 +135.0% | 0.2876 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 350 | 36.4% | 39.4% | ⚪ +3.0% |
| [0.4–0.5] | 528 | 45.3% | 43.2% | ⚪ -2.1% |
| [0.5–0.6] | 563 | 54.6% | 57.4% | ⚪ +2.8% |
| [0.6–0.7] | 350 | 64.6% | 71.4% | 🟢 +6.8% |
| [0.7–0.8] | 195 | 74.3% | 81.5% | 🟢 +7.3% |
| [0.8–0.9] | 107 | 83.9% | 87.9% | ⚪ +4.0% |
| [0.9–1.0] | 13 | 92.6% | 100.0% | 🟢 +7.4% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 106 | 66% | 🟢 +9.5% | 0.2264 |
| `eng.4` | 101 | 52% | 🟢 +22.8% | 0.244 |
| `eng.2` | 100 | 53% | 🟢 +13.7% | 0.2515 |
| `eng.3` | 99 | 49% | 🟢 +2.3% | 0.2246 |
| `uefa.nations` | 93 | 59% | 🔴 -0.3% | 0.2039 |
| `jpn.1` | 79 | 53% | 🟢 +6.8% | 0.2229 |
| `esp.2` | 77 | 57% | 🟢 +21.3% | 0.2222 |
| `ita.2` | 70 | 51% | 🟢 +18.3% | 0.2397 |
| `esp.1` | 67 | 60% | 🟢 +13.7% | 0.2214 |
| `ita.1` | 66 | 65% | 🟢 +26.9% | 0.1981 |
