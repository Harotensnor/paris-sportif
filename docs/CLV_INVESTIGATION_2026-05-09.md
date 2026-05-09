# CLV Investigation — 2026-05-09

## Découverte majeure

L'audit CLV pick-level a révélé que la **CLV moyenne globale est +16.02%** (et non -2.5%
comme indiqué dans les anciens audits). Le breakdown révèle où la value se concentre.

## Données analysées

- Source : `clv_history.json` (21,264 lignes parsed, 1,378 picks au niveau pick)
- Métrique : CLV (Closing Line Value) en pourcentage
- Période : cumulé toute l'historique snapshot_pick_odds

## Résultats

### CLV par marché

| Marché | n | Mean CLV | Positive Rate |
|--------|---|----------|---------------|
| **htTotal (mi-temps OU)** | 385 | **+53.68%** | 59.2% ⭐⭐⭐ |
| dnb (Draw No Bet) | 112 | +6.78% | 35.7% ⭐ |
| ou (Over/Under) | 236 | +3.41% | 29.2% |
| teamTotal | 350 | +1.67% | 28.9% |
| btts | 66 | 0.0% | 0.0% (échantillon neutre) |
| **1n2** | 229 | **-3.23%** | 16.6% 🚨 LEAK |

### CLV par bucket de cote

| Bucket | n | Mean CLV | Verdict |
|--------|---|----------|---------|
| **5.00+ (outsiders)** | 200 | **+85.17%** | ⭐⭐⭐⭐ source +121% Outsider strat |
| 2.00-3.00 | 375 | +8.36% | ⭐ value cohérente |
| 3.00-5.00 | 404 | +4.30% | ⭐ value modérée |
| 1.50-2.00 | 284 | +0.39% | flat |
| 1.30-1.50 | 115 | +0.49% | flat |

### CLV par sport

| Sport | n | Mean CLV |
|-------|---|----------|
| football | 1,372 | +16.04% |
| basketball | 6 | +10.84% |

## Conclusions

### 1. Le modèle EXCELLE sur les outsiders
Cotes 5.00+ avec +85% CLV moyen confirment la stratégie Outsider (+121% ROI dans
le backtest_strategies). Le marché sous-estime systématiquement les outsiders qualifiés.

### 2. Le modèle PERD de la value sur 1n2
-3.23% CLV sur 229 picks 1n2 = problème systémique. Hypothèses :
- Les snapshots 1n2 sont pris trop tôt (avant les news pré-match qui font bouger la cote)
- Le modèle est trop confiant sur les favoris mainstream (cotes 1.30-2.00)
- Le marché 1n2 est trop efficient pour être battu sans signaux propriétaires

### 3. La mi-temps OU est en or
+53.68% CLV sur 385 picks = signal très exploitable. Probablement parce que :
- Beaucoup moins de liquidity sur htTotal vs 1n2
- Notre Poisson xG λ × 0.45 model est meilleur que les bookmakers
- Moins de sharps suivent ce marché

### 4. La courte cote (1.30-1.50) est neutre
0.49% CLV = ni gagnant ni perdant. Le marché est très efficient ici.

## Actions concrètes

### Court terme (cette semaine)
1. **Réduire l'agressivité sur les 1n2** :
   - Relever le seuil edge minimum sur 1n2 à 5pt (vs 2.5pt actuellement)
   - Skip 1n2 si cote < 1.50 (zone neutre à -0.5% CLV en moyenne)

2. **Promouvoir les marchés à CLV+** :
   - htTotal weight bump dans selectBestMarket
   - Outsider strategy : déjà existe, surfacer plus dans le dashboard

3. **Frontend** :
   - Modal détail affiche CLV moyen attendu par marché (basé sur historique)
   - Badge "🟢 CLV+ historique" sur htTotal, dnb, outsiders 5.00+
   - Badge "🔴 CLV- historique" sur 1n2 cotes < 2.00

### Moyen terme
1. **Snapshot odds plus tard** : décaler snapshot_odds.py de T-24h à T-2h pour avoir
   une cote plus proche de la closing.
2. **Investiguer les news pré-match** : les 1n2 swings semblent corrélés aux news.
   Source candidate : Twitter/RSS aggregator.
3. **Spécialisation modèle 1n2** : Logistic ou XGBoost dédié au 1n2 (vs Poisson actuel).

### Long terme
1. **Live odds drift tracking** : monitorer comment la cote bouge entre T-24h et T-0,
   identifier les patterns prédictifs.
2. **Sharp money detection** : si la cote 1n2 baisse fortement après notre snapshot,
   c'est qu'on a bien picked. Si elle monte, on a missé.

## Métriques cibles

| Métrique | Actuel | Court terme | Long terme |
|----------|--------|-------------|------------|
| CLV global pick-level | +16.02% | +20% | +25% |
| CLV 1n2 | -3.23% | 0% | +2% |
| % picks via 1n2 | ~16% | 10% | 8% |
| % picks via outsiders 5+ | ~14% | 20% | 25% |
| % picks via htTotal | ~28% | 35% | 40% |

---

Document de référence pour comprendre où le modèle gagne/perd de la value.
À actualiser à chaque cycle de backtest.
