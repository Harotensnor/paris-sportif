# Paris-Sportif

Site statique de pronostics sportifs (foot, tennis, NBA, NHL, MLB) avec
agent IA cagnotte modèle (Kelly fractionné). Modèle multi-signaux
calibré, backtest hebdomadaire vérifiable, déployé sur GitHub Pages.

🌐 **Live** : https://harotensnor.github.io/paris-sportif/

## Promesse produit

- **Winamax-only** : recommandations actionnables uniquement quand le
  match est exactement bookable chez Winamax (match_id + markets)
- **Honnête** : promesse zéro garanties, ROI long terme via Kelly
  discipliné, calibration vérifiable hebdo
- **Sans tracker** : pas d'analytics tiers (Plausible opt-in seulement),
  pas de cookies, pas de serveur user-side
- **18+ · jouer comporte des risques** : disclaimer permanent

## Stack technique

- **Frontend** : pronostics.html shell + app.js (~1MB IIFE) + app.css
  + sw.js (PWA). Pas de bundler, pas de TypeScript, pas de framework.
- **Backend pipeline** : 30+ scripts Python qui scrapent ESPN /
  Sofascore / Sackmann / Winamax / etc. et regenèrent data.js
- **CI/CD** : GitHub Actions cron 5min refresh + workflow tests/lint
- **Hosting** : GitHub Pages (CDN global)

## Setup local

```bash
git clone https://github.com/Harotensnor/paris-sportif.git
cd paris-sportif

# Run le pipeline data localement (équivalent du cron prod)
python scripts/fetch_v3.py
python scripts/patch_winamax.py
python scripts/patch_team_stats.py
# (voir refresh.yml pour la liste complète)

# Serve le site en dev
python serveur.py    # port 8765, ouvre pronostics.html
# ou
python -m http.server 8765
```

## Structure

```
paris-sportif/
├── pronostics.html         # SPA shell + LITE blob inline
├── app.js                  # ~1MB IIFE : SPA logic, predictMatch, render*
├── app.css                 # ~190KB : design tokens, components, mobile
├── sw.js                   # Service Worker PWA + offline
├── data.js                 # 1.3MB : full archive 14 jours (auto-généré)
├── data_today.json         # snapshot du jour (refresh fréquent)
├── health.json             # status pipeline (auto-généré)
├── *.html                  # pages éditoriales (auto-générées)
├── scripts/                # pipeline Python
│   ├── fetch_*.py          # scrapers (ESPN, Sofascore, Sackmann, etc.)
│   ├── patch_*.py          # apply sidecars sur data.js
│   ├── build_*.py          # regénère pages HTML statiques
│   ├── backtest_v2.py      # backtest hebdo via mini-racer V8
│   ├── ab_test_*.py        # A/B test framework predictMatch
│   ├── cv_backtest.py      # cross-validation temporelle
│   ├── check_*.py          # health checks CI
│   └── _*.py               # helpers (logger, retry, metrics)
├── tests/                  # Playwright (critical-flows, a11y, visual, units)
├── .github/workflows/      # cron refresh, e2e, lighthouse, backtest
├── ARCHITECTURE.md         # vue d'ensemble du système
├── DECISIONS.md            # ADR : pourquoi telle ou telle décision
└── CLAUDE.md               # guide complet pour Claude Code
```

## Comment contribuer

### Ajouter un signal au modèle

1. Lire `ARCHITECTURE.md` section "Source de vérité unique"
2. `predictMatch` vit dans `app.js`. Ajouter un composant qui calcule
   un signal (ex: weatherStats, congestionStats, refStats, etc.)
3. Avant de merger : run le framework analytique
   ```bash
   python scripts/ab_test_predictmatch.py snapshot
   # ... edit app.js predictMatch ...
   python scripts/ab_test_predictmatch.py compare
   ```
   Verifier que le ROI delta est ≥0 avec p-value <0.05 sur Wilcoxon.

### Ajouter une nouvelle source data

1. Créer `scripts/fetch_<source>.py` qui scrape et écrit `<source>.json`
2. Créer `scripts/patch_<source>.py` qui applique le sidecar sur data.js
3. Wirer dans `auto_refresh.py` (dev local) ET `.github/workflows/refresh.yml`
   (CI prod). `scripts/check_pipeline_drift.py` bloque la CI si drift.
4. Ajouter le tracking dans `scripts/build_health.py` (count + age)

### Ajouter une page SPA

1. Ajouter le slug dans `VALID_PAGES` const en tête de app.js
2. Créer `function render<Page>Page(wrap) {...}` dans app.js
3. Wirer dans `applyPageView()` :
   ```js
   const isMyPage = currentPage === 'mypage';
   let myPageWrap = document.getElementById('mypage-wrap');
   if (!myPageWrap) { /* create div */ }
   myPageWrap.style.display = isMyPage ? '' : 'none';
   if (isMyPage) renderMyPage(myPageWrap);
   ```
4. Ajouter le bouton dans le menu nav `pronostics.html`

### Conventions importantes

- **Pas de bundler** : ne jamais introduire webpack/vite/rollup
- **`m.competitors[].name`** : les noms vivent là, jamais `m.home/m.away`
  → toujours passer par `getSides(m)`
- **`Number(x) || 0`** : préférer à `x || 0` (gère les strings corrompues)
- **`prompt()` / `confirm()` interdits** (PWA installée Safari iOS) →
  utiliser `_showStakePrompt` / `_showConfirm` async modals
- **TDZ discipline** : `let`/`const` en scope IIFE, hisser les
  déclarations utilisées avant leur ligne
- **CSS `!important`** : éviter sauf override d'inline styles en média
  query mobile

## Tests

```bash
npx playwright test                    # full suite
npx playwright test tests/critical-flows.spec.js
npx playwright test --update-snapshots  # rebuild visual regression
```

Workflow CI `.github/workflows/e2e.yml` tourne :
1. Pipeline drift check (`check_pipeline_drift.py`)
2. Bundle size budget (`check_bundle_size.py`)
3. Health quality_checks (`check_health_quality.py`)
4. Playwright critical flows + a11y axe + units + visual

## Documentation détaillée

- **`ARCHITECTURE.md`** : vue d'ensemble système, conventions, schémas data
- **`DECISIONS.md`** : ADR records (pourquoi `lc:tid`, pourquoi Wilson CI, etc.)
- **`CLAUDE.md`** : guide complet pour Claude Code (sprints, choix produit)

## Roadmap

Voir `CLAUDE.md` section "Backlog dette technique restante" pour les
chantiers en cours/futurs.

Historique des évolutions : 40+ sprints exécutés, ~200 versions
v31.7.x. Voir `git log --oneline` ou les commits feat/fix/chore.

## Licence

Site personnel, code source public à titre éducatif. Ne pas réutiliser
en production sans audit + adaptation. Aucune affiliation Winamax.
