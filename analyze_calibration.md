# Calibration analysis

_Généré depuis backtest_report_v2.json — 2026-04-26T21:20:06Z_

**Sample global** : 264 picks · WR 55.7% · ROI flat 3.34% · Brier 0.224

## 🟢 Buckets bien calibrés (top performers)

### Sports rentables (≥10 picks)

| Sport | N | WR | ROI flat | Brier |
|---|--:|--:|--:|--:|
| football | 234 | 57% | +6.6% | 0.220 |
| baseball | 13 | 38% | -36.7% | 0.256 |

### Top 10 ligues par Kelly cumul (≥5 picks)

| Ligue | N | WR | Kelly | Brier |
|---|--:|--:|--:|--:|
| tha.1 | 5 | 80% | +45.7u | 0.234 |
| nor.1 | 8 | 62% | +23.7u | 0.177 |
| ven.1 | 6 | 67% | +19.4u | 0.207 |
| nhl | 8 | 62% | +17.2u | 0.233 |
| jpn.1 | 8 | 75% | +12.6u | 0.244 |
| ita.2 | 8 | 50% | +10.5u | 0.185 |
| tur.1 | 5 | 80% | +10.4u | 0.246 |
| eng.2 | 10 | 50% | +9.9u | 0.225 |
| esp.1 | 9 | 67% | +8.2u | 0.196 |
| ger.2 | 6 | 67% | +6.9u | 0.248 |

## 🔴 Buckets MAL calibrés (à tuner)

### Sports avec Brier élevé (modèle peu calibré)

| Sport | N | Brier | Suggestion |
|---|--:|--:|---|
| baseball | 13 | 0.256 | Investiguer signaux disponibles |

### Ligues à éviter (ROI flat < -10%, ≥5 picks)

| Ligue | N | WR | ROI flat | Action |
|---|--:|--:|--:|---|
| col.1 | 5 | 20% | -63.3% | Skip ou raise threshold |
| nba | 9 | 33% | -49.4% | Skip ou raise threshold |
| mlb | 13 | 38% | -36.7% | Skip ou raise threshold |
| fra.1 | 9 | 44% | -32.5% | Skip ou raise threshold |
| chi.1 | 6 | 33% | -27.5% | Skip ou raise threshold |
| fra.2 | 8 | 38% | -24.4% | Skip ou raise threshold |
| aut.1 | 5 | 40% | -22.2% | Skip ou raise threshold |
| eng.3 | 12 | 50% | -17.2% | Skip ou raise threshold |
| ned.1 | 6 | 50% | -13.4% | Skip ou raise threshold |
| ita.2 | 8 | 50% | -12.9% | Skip ou raise threshold |

## 📊 Performance par bucket de cote

| Bucket | N | WR | ROI flat | Conseil |
|---|--:|--:|--:|---|
| heavy_fav | 42 | 74% | -2.1% | ⚠ Surveiller |
| fav | 110 | 63% | +9.8% | ✓ Conserver |
| toss_up | 94 | 46% | +4.9% | ✓ Conserver |
| dog | 17 | 24% | -27.4% | 🔴 Filtrer |
| heavy_dog | 1 | 0% | -100.0% | 🔴 Filtrer |

---

_Tuning manuel : modifier les poids dans `app.js` (search "components.push") en s'inspirant des observations ci-dessus._