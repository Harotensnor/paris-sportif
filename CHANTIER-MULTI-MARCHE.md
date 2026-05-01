# Chantier D — Multi-marché Winamax (backend)

## État actuel

- `fetch_winamax_catalog.py` scrape **uniquement** le catalogue Winamax (liste des matchs bookables via `PRELOADED_STATE`). Il ne récupère **pas** les cotes des marchés secondaires (Over/Under 2.5, BTTS, handicap).
- `match.odds[]` dans `data.js` ne contient que les cotes 1N2 + les *lines* spread/total (pas les cotes O/U ou BTTS elles-mêmes).
- `pred.markets.ou` et `pred.markets.btts` dans `pronostics.html` sont **des probabilités modèle (Poisson)**, pas des cotes bookmaker. On ne peut pas miser dessus sans cote en face.

## Ce qu'il faut ajouter

### 1. Nouveau fetcher `scripts/fetch_winamax_markets.py`

Pour chaque match bookable dans `winamax_catalog.json`, fetcher la page détail du match sur Winamax et extraire de `PRELOADED_STATE` les cotes des marchés :

- **Football** : 1N2, Over/Under 2.5, BTTS (Oui/Non), handicap asiatique ±1
- **Tennis** : 1N2 (2-way), Over/Under games, set betting
- **Basket** : Moneyline, handicap total, O/U points
- **Hockey** : Moneyline, O/U buts

Structure de sortie `winamax_markets.json` :

```json
{
  "generated_at": "2026-04-23T21:20:00Z",
  "matches": {
    "<match_id>": {
      "winamax_match_id": "70965902",
      "odds": {
        "1n2":  { "home": 1.65, "draw": 3.80, "away": 4.50 },
        "ou25": { "over": 1.85, "under": 1.95, "line": 2.5 },
        "btts": { "yes": 1.72, "no": 2.05 },
        "handicap": [
          { "line": -1.5, "home": 2.40, "away": 1.55 },
          { "line": -1.0, "home": 1.90, "away": 1.90 }
        ]
      },
      "fetched_at": "2026-04-23T21:19:55Z"
    }
  }
}
```

### 2. Modifier `scripts/patch_winamax.py` (ou créer `patch_winamax_markets.py`)

Injecter ces marchés dans chaque match de `data.js` sous la clé `match.winamax.markets`. Garder séparé de `match.odds[]` (qui reste les cotes ESPN multi-books) pour éviter de casser le code existant.

### 3. Mise à jour du workflow `.github/workflows/refresh-data.yml`

Ajouter l'étape `fetch_winamax_markets` après `fetch_winamax_catalog`, avec une cadence séparée (ex: toutes les 10 min — les cotes bougent plus vite que le catalogue).

### 4. Côté frontend (`pronostics.html`) — à faire APRÈS que le backend soit en place

Dans `_agentReplay` et dans les positions du jour, au lieu de ne regarder que le 1N2, boucler sur tous les marchés disponibles de `match.winamax.markets`, calculer l'edge pour chaque, et **choisir le marché avec le meilleur edge** comme pari. Pseudo-code :

```js
function pickBestMarket(match, pred) {
  const candidates = [];
  // 1N2
  if (pred.pick && pred.odds) {
    const p = pred.reliability;
    const c = pred.odds[pred.pick.key === '1' ? 'home' : pred.pick.key === '2' ? 'away' : 'draw'];
    if (c) candidates.push({ market: '1n2', key: pred.pick.key, prob: p, odd: c, edge: p - 1/c });
  }
  // O/U 2.5 (foot uniquement, nécessite pred.markets.ou)
  if (pred.markets && pred.markets.ou && match.winamax && match.winamax.markets && match.winamax.markets.ou25) {
    const m = match.winamax.markets.ou25;
    const pick = pred.markets.ou;
    const odd = pick.side === 'over' ? m.over : m.under;
    if (odd) candidates.push({ market: 'ou25', key: pick.key, prob: pick.prob, odd, edge: pick.prob - 1/odd });
  }
  // BTTS idem
  // ...
  candidates.sort((a, b) => b.edge - a.edge);
  return candidates[0]; // ou null si tous les edges sont ≤0
}
```

Et utiliser `pickBestMarket` au lieu de regarder `pred.pick`/`pred.odds` directement.

## Ordre d'exécution recommandé

1. **Local d'abord** : tester `fetch_winamax_markets.py` sur 2-3 matchs pour vérifier que `curl_cffi` + regex `PRELOADED_STATE` extrait bien les cotes multi-marché
2. **Patch** : injecter dans `data.js` et vérifier qu'un match ouvert en console affiche bien `match.winamax.markets.ou25`
3. **Workflow** : intégrer à GitHub Actions, observer 2-3 cycles
4. **Frontend** : activer `pickBestMarket` dans l'agent

## Estimation

- Fetcher + patch : ~2-3h (le plus long = comprendre le schema `PRELOADED_STATE` des pages match Winamax, qui diffère de celui du catalogue)
- Workflow : 15 min
- Frontend : ~1h (intégration dans `_agentReplay` + live positions)

Total : **½ journée** pour un modèle qui pariera sur le **meilleur marché** de chaque match, pas juste le 1N2.
