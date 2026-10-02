# Backtest ROI — VRAI modèle (v2)

Généré : 2026-10-02T10:06:36Z
Source modèle : `pronostics.html` via `scripts/model_loader.py` (V8 embarqué, zéro duplication)
Univers : 1416 picks sur 2026-08-18T22:00Z → 2026-10-01T18:45Z
Bankroll simulée (Kelly 0.25× cap 10%) : **100u → 16684111.47u**

> 📊 **v2** évalue la vraie fonction `predictMatch` qui vit dans `pronostics.html`. Les chiffres ci-dessous reflètent ce que le dashboard aurait fait si tu avais parié flat 1u chaque pick. La baseline marché reste dans `backtest_baselines.py` / `backtest_report.md`.

## 🟢 Vue d'ensemble

- **1416 picks** · 815 gagnés / 601 perdus · WR **57.6%**
- ROI flat (1u/pick) : **+14.21%** (+201.23u cumulé)
- Kelly 0.25× cap 10% : cumulé **+16684011.47u**
- Cote moyenne : 2.08 · Pick prob moyenne : 54.2%
- **Brier** : 0.2227 (0 = parfait, 0.25 = pile/face)
- **Log-loss** : 0.6341 (plus bas = mieux calibré)
- Bankroll simulée 1000€ : **166841114.69€** (+16684011.5%) · DD max 37.5% · Sharpe/pick +0.271

## Séries

- Streak courante : ❄️ **3** loses consécutifs
- Plus longue série gagnante : **13**
- Plus longue série perdante : **9**
- Top run win : 13 picks (2026-09-11T18:00Z → 2026-09-11T19:00Z)
- Top run lose : 9 picks (2026-09-12T12:00Z → 2026-09-12T13:30Z)

## Par tier de fiabilité

| Tier | N | WR | Wilson 95% | ROI flat | Kelly cumul | Brier | Edge moy. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `big_bet` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lock` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `standard` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `lowconf` | 0 | 0% | 0–0% | ⚪ +0.0% | +0.00u | 0.0 | +0.0pt |
| `skip` | 1416 | 58% | 55–60% | 🟢 +14.2% | +16684011.47u | 0.2227 | +1.5pt |

## Calibration par tier

| Tier | N | ECE | Gap max | Statut |
|---|---:|---:|---:|---|
| `big_bet` | 0 | — | — | en apprentissage |
| `lock` | 0 | — | — | en apprentissage |
| `standard` | 0 | — | — | en apprentissage |
| `lowconf` | 0 | — | — | en apprentissage |
| `skip` | 1416 | 0.0505 | 0.123 | à surveiller |

> ⚠️ Big Bets en apprentissage : pas assez de paris réglés pour valider la calibration.

## Par sport

| Sport | N | WR | ROI flat | Kelly cumul | Brier |
|---|---:|---:|---:|---:|---:|
| football | 1278 | 57% | 🟢 +15.5% | +16684011.47u | 0.2222 |
| baseball | 128 | 62% | 🟢 +2.6% | +0.00u | 0.2298 |
| basketball | 10 | 70% | 🔴 -4.6% | +0.00u | 0.1943 |

## Calibration par segment sport/ligue

| Segment | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `football:other` | 1048 | 56% | 🟢 +12.6% | 0.2237 |
| `football:top5` | 230 | 62% | 🟢 +28.7% | 0.2153 |
| `baseball:all` | 128 | 62% | 🟡 +2.6% | 0.2298 |
| `basketball:all` | 10 | 70% | 🔴 -4.6% | 0.1943 |

## Par range de cote

| Bucket | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| heavy_fav | 248 | 77% | 🟢 +1.4% | 0.1574 |
| fav | 560 | 56% | 🔴 -2.6% | 0.2268 |
| toss_up | 394 | 52% | 🟢 +21.1% | 0.2416 |
| dog | 210 | 49% | 🟢 +58.8% | 0.2523 |
| heavy_dog | 4 | 50% | 🟢 +142.5% | 0.2824 |

## Calibration (diagramme de fiabilité)

`prob_moyenne` doit approcher `win_rate`. `gap > 0` = modèle sous-estime ; `gap < 0` = sur-estime. Le diagramme UI en live est dans la page Santé de pronostics.html.

| Bin | N | Prob moy | WR observé | Gap |
|---|---:|---:|---:|---:|
| [0.3–0.4] | 220 | 36.7% | 44.1% | 🟢 +7.4% |
| [0.4–0.5] | 383 | 45.3% | 42.3% | ⚪ -3.0% |
| [0.5–0.6] | 398 | 54.9% | 58.5% | ⚪ +3.6% |
| [0.6–0.7] | 228 | 64.3% | 70.2% | 🟢 +5.9% |
| [0.7–0.8] | 115 | 74.6% | 81.7% | 🟢 +7.1% |
| [0.8–0.9] | 62 | 84.4% | 96.8% | 🟢 +12.3% |
| [0.9–1.0] | 10 | 91.8% | 90.0% | ⚪ -1.8% |

## Top ligues (par volume)

| Ligue | N | WR | ROI flat | Brier |
|---|---:|---:|---:|---:|
| `mlb` | 128 | 62% | 🟢 +2.6% | 0.2298 |
| `eng.2` | 73 | 55% | 🟢 +18.6% | 0.2318 |
| `eng.4` | 69 | 59% | 🟢 +46.1% | 0.2443 |
| `eng.3` | 63 | 40% | 🔴 -7.5% | 0.2332 |
| `uefa.nations` | 58 | 59% | 🟢 +3.5% | 0.2201 |
| `esp.1` | 55 | 60% | 🟢 +16.9% | 0.2075 |
| `esp.2` | 51 | 55% | 🟢 +19.1% | 0.2162 |
| `eng.1` | 50 | 56% | 🟢 +25.4% | 0.2408 |
| `jpn.1` | 49 | 51% | 🟢 +0.5% | 0.2161 |
| `ita.1` | 48 | 71% | 🟢 +44.9% | 0.1951 |
