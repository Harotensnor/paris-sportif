# Plan de découpe `legacy-app.js` — proposition concrète

**Status** : Plan détaillé, prêt à exécuter sur sprint dédié 1-2 jours.
**Auteur** : Audit complet 2026-05-09, Phase 7 (dette technique).

## Contexte

`legacy-app.js` pèse **1.93 MB** et fait **34 000 lignes** dans une seule
IIFE. C'est un goulot pour :

- **LCP mobile** : ~1.5-2s sur 3G pour parse+exec
- **Code review** : impossible de revoir l'ensemble en PR
- **Tree-shaking** : zéro (tout est inclus que tu le veuilles ou non)
- **TDZ debugging** : `let`/`const` en scope IIFE = ReferenceError obscurs

## Convention "no build step" préservée

L'objectif est de garder le déploiement sans bundler/npm/Astro. Solution :
**ESM natif** dans le navigateur via `<script type="module">`. Tous les
browsers cibles (Chrome 70+, Safari 11+, Firefox 60+) supportent ESM
nativement. Pas de transpilation nécessaire.

## Architecture cible

```
src/
├── core/
│   ├── config.js          # SUPPORTED_SPORTS, MODEL_PROB_CAP, etc.
│   ├── data-access.js     # PRONOSTICS_DATA helpers, getMatchById, etc.
│   ├── errors.js          # swallowError, sanitizeError, error tracking
│   └── storage.js         # localStorage wrappers (load/save/migrate)
├── model/
│   ├── predict.js         # predictMatch + cache
│   ├── calibration.js     # _applyCalibration, _calibrateProb, _v45LeagueOffset
│   ├── markets.js         # buildMarketCandidates, selectBestMarket
│   ├── poisson.js         # poissonMarketsExtended, Dixon-Coles τ
│   ├── verdict.js         # _classifyVerdict (bet/bet-light/watch/skip)
│   └── quality.js         # detectOddsAnomaly, _arePicksContradictory
├── ui/
│   ├── badges.js          # BetStrengthBadge, DataQualityBadge, sport icons
│   ├── modal.js           # detail modal renderer + tabs logic
│   ├── cards.js           # renderRow, renderCoverageRow, miniMatch
│   ├── pages/
│   │   ├── dashboard.js   # renderDashboardPage (currently 700 lines)
│   │   ├── tous.js        # renderTousPage (currently 600 lines)
│   │   ├── performance.js # renderPerformancePage
│   │   ├── modal-detail.js
│   │   └── ...
│   └── trust-strip.js     # _populateTrustStrip + CLV widget
├── workers/               # déjà séparés, juste déplacer
│   ├── quality-worker.js
│   ├── backtest-worker.js
│   └── bayesian-worker.js
└── main.js                # boot, route, dispatch click events
```

## Migration step-by-step

### Phase 1 : préparation (1 jour)

1. **Audit dépendances** : pour chaque fonction principale, lister les
   variables/fonctions utilisées depuis l'extérieur. Outil :
   `grep -nE "function (\w+)|const (\w+)" legacy-app.js | wc -l` →
   identifier les ~100 noms top-level.

2. **Cartographier les `try { window.X = X; } catch(e) {}` exposes** :
   ce sont les "exports" de fait. Ils définissent la surface API
   inter-module.

3. **Créer les fichiers cibles vides** avec stubs `import/export`.

4. **Wrapper de transition** : `legacy-app.js` reste, mais en haut on
   ajoute `import * as core from './src/core/index.js';` et on
   remplace progressivement les fonctions inline par des appels au
   module.

### Phase 2 : extraction "feuilles" (1-2 jours)

Commencer par les fonctions **sans dépendance interne** :

- `errors.js` (swallowError, sanitizeError) → 50 lignes, très utilisé
- `storage.js` (load/save localStorage helpers) → 100 lignes
- `badges.js` (BetStrengthBadge, sport emoji map) → 200 lignes

Pour chaque module :

1. Copier les fonctions dans le nouveau fichier
2. Ajouter `export` devant chaque
3. Dans `legacy-app.js`, remplacer la définition inline par un import
4. Test Playwright pour valider que rien ne casse

### Phase 3 : extraction "cœur modèle" (2-3 jours)

Les fonctions `predictMatch`, `_applyCalibration`, etc. ont beaucoup
de dépendances. Il faut :

1. Identifier toutes les références au scope IIFE (variables fermées)
2. Promouvoir ces variables en module-scope dans le nouveau fichier
3. Vérifier que `__predCache` reste un singleton partagé
4. Tester le backtest_v2.py qui appelle `predictMatch` via mini-racer

### Phase 4 : pages (3-5 jours)

Les `renderXxxPage()` font 500-1500 lignes chacune. Extraction par page :

1. `dashboard.js` (le plus gros) → en dernier
2. `tous.js` (deuxième le plus gros)
3. `performance.js`, `bilan.js`, `combines.js`, etc.

Chaque page doit exporter `render(wrap, deps)` où `deps` contient les
fonctions/data dont la page a besoin.

### Phase 5 : main.js + boot (1 jour)

Remplacer `legacy-app.js` par un `main.js` minimal :

```js
import { boot } from './src/core/boot.js';
import { setupRouter } from './src/core/router.js';
import { setupClickDispatch } from './src/ui/dispatch.js';

document.addEventListener('DOMContentLoaded', () => {
  boot();
  setupRouter();
  setupClickDispatch();
});
```

Et dans `pronostics.html` :

```html
<script type="module" src="main.js"></script>
```

(au lieu de `<script defer src="legacy-app.js">`)

## Risques

- **Variables fermées invisibles** : certaines `let` sont mutées depuis
  plusieurs fonctions (ex: `currentPage`). Il faut les promouvoir en
  state singleton ou les passer en paramètre.

- **Ordre de chargement** : ESM est asynchrone. Si une page essaie
  d'accéder à `window.predictMatch` avant que le module soit chargé,
  TypeError. Solution : `await import('./src/...')` au démarrage.

- **Service worker** : doit pre-cacher les nouveaux modules. Mettre à
  jour `sw.js` PRECACHE_ASSETS ou LAZY_CACHE_FIRST.

- **mini-racer / backtest_v2.py** : le script Python charge
  `legacy-app.js` via `script_v8.eval()`. Si on splitte en modules,
  mini-racer ne suit pas les imports. Solution :
  - Soit garder un bundle pour mini-racer (concat des fichiers)
  - Soit utiliser un wrapper `legacy-app-flat.js` généré par concat

## Métriques de succès

- LCP mobile sur Slow 3G : avant ~2.5s, après ciblé ≤1.5s
- Cache hit ratio (modules cachés indépendamment) : avant 0%, après ~70%
- Time to readability (PR) : 1 module = ~500 lignes vs 34000

## Estimation totale

- Phase 1 : 1 jour
- Phase 2 : 2 jours
- Phase 3 : 3 jours
- Phase 4 : 5 jours
- Phase 5 : 1 jour
- Tests + ajustements : 2 jours

**Total : ~14 jours-développeur** (3 semaines à temps plein)

Pas faisable en autopilote court. Doit faire l'objet d'un sprint dédié
avec couverture test E2E avant/après.
