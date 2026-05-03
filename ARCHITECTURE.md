# Architecture Paris-Sportif

> Document vivant. Mis à jour à chaque grosse refonte.
> Dernière maj : 2026-05-03 (Phase 11, polish ultra-final + extensions).

## Vue d'ensemble

Site statique de pronostics sportifs (foot, tennis, basket, hockey, baseball,
rugby et marchés niche quand la data est disponible) avec un agent IA qui gère
une "cagnotte modèle". Déployé sur GitHub Pages sans build step ni bundler.
Données régénérées toutes les 5 minutes en période active via GitHub Actions.

## Stack technique

```
┌──────────────────────────────────────────────────────────────────┐
│  CLIENT (navigateur)                                             │
│  - pronostics.html : shell SPA + boot data_lite                 │
│  - app.js (~1.6 MB IIFE, logique produit + rendu)               │
│  - app.css (~300 KB, design system + layouts)                   │
│  - app-i18n.js : dictionnaire FR/EN léger                       │
│  - app-enhancements.js : surcouche progressive non critique     │
│  - sw.js (Service Worker, PWA + offline)                        │
│  - data_lite.js : boot rapide des picks immédiats               │
│  - data_today.json / data.js : data jour puis archive complète   │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼ fetch
┌──────────────────────────────────────────────────────────────────┐
│  GITHUB PAGES (CDN GitHub global)                               │
│  - assets statiques servis depuis main branch                    │
│  - cron toutes les 5 min push de nouvelles versions de data.js   │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼ regenere
┌──────────────────────────────────────────────────────────────────┐
│  GITHUB ACTIONS (cron */5 *)                                    │
│  - .github/workflows/refresh.yml                                │
│  - scripts/fetch_*.py : ESPN, Sofascore, Winamax, ClubElo, ...  │
│  - scripts/patch_*.py : applique les sidecars sur data.js        │
│  - scripts/build_*.py : génère les pages statiques + health     │
│  - scripts/backtest_v2.py : weekly cron (dimanche)               │
└──────────────────────────────────────────────────────────────────┘
```

## Convention "no build step"

**Ne JAMAIS introduire un bundler** (webpack, vite, rollup, esbuild).
Les raisons :
- Site personnel, pas d'équipe → pas de gain à compiler
- GitHub Pages dépose juste les fichiers tels quels
- Debug en prod : code lisible directement dans DevTools
- Contributions occasionnelles ne nécessitent pas de toolchain Node

Conséquence :
- `app.js` reste une IIFE classique (`(function(){...})()`)
- Les `<script type="module">` sont OK pour les helpers progressifs natifs
- Pas de TypeScript (JSDoc pour les types si besoin)

## Pipeline data

Ordre d'exécution dans `refresh.yml` (= `auto_refresh.py` en local) :

1. **Fetch sources** (parallel quand possible) :
   - `fetch_v3.py` — ESPN principal
   - `fetch_winamax_catalog.py` — tournois Winamax
   - `fetch_winamax_match_details.py` — marchés détaillés Winamax
   - `fetch_team_stats.py` — last5 stats par équipe (CACHE clé `lc:tid`)
   - `fetch_clubelo.py`, `fetch_h2h.py`, `fetch_weather.py`, etc.
   - `fetch_thesportsdb_meta.py`, `fetch_openligadb.py` — sources publiques
     self-throttled pour logos, métadonnées et foot allemand
2. **Patch sidecars sur data.js** (ordre IMPORTANT) :
   - `patch_winamax.py` AVANT tous les autres (établit `match_id`)
   - `patch_winamax_markets.py` (cotes Winamax exactes, garde-fous)
   - `patch_team_stats.py` (avec garde-fous anti-contamination)
   - `patch_*.py` enrichissements
3. **Build pages** :
   - `build_health.py` — health.json + quality_checks
   - `build_backtest_page.py`, `build_credibilite_page.py`, etc.
   - `finalize_inline.py` — construit `data_lite.js`, `data_today.json`
     et garde le shell HTML léger
   - `check_data_integrity.py` — vérifie ≥50% events vs précédent
4. **Commit + push** par le bot GitHub Actions.

## Source de vérité unique

`predictMatch` vit DANS `app.js` (IIFE). C'est la seule source de vérité.

- Frontend : appelle `predictMatch(match)` direct
- Backend backtest : `scripts/model_loader.py` extrait l'IIFE et l'évalue
  via mini-racer (V8 embarqué) → garantit que le backtest mesure la
  VRAIE fonction prod, pas une duplication Python qui dériverait.
- Phase 10+ : l'IIFE expose aussi l'ensemble model, calibration par marché,
  abstain renforcé, IC95, sharp-money nudge et contributions de features.

**Ne jamais** dupliquer la logique de `predictMatch` ailleurs.

## Schémas data clés

### `winamax`

```json
{
  "available": true,         // tournoi/sport disponible (peut être fallback)
  "match_id": 123456789,     // null si pas de match exact
  "markets": {
    "1n2": { "home": 1.92, "draw": 3.40, "away": 4.50,
             "home_name": "...", "away_name": "..." },
    "ou": { "line": 2.5, "over": 1.85, "under": 1.95 },
    "btts": { "yes": 1.78, "no": 2.05 }
  },
  "url": "...",
  "tournament": "..."
}
```

**Règle** (audit Sprint 1 #2) : pour les recos actionnables, exiger
`isWinamaxBookable(m)` = `available && match_id && markets['1n2']`.
`available === true` seul ne suffit pas (peut être fallback tournoi).

### `team_stats.json`

Schema v2 (clé composite anti-contamination cross-sport) :

```json
{
  "schema_version": 2,
  "key_format": "league_code:team_id",
  "teams": {
    "eng.1:18847": {
      "name": "Crystal Palace",
      "team_id": "18847",
      "league_code": "eng.1",
      "sport": "soccer",
      "played5": 5, "wins5": 3, ...,
      "last5": [...]
    }
  }
}
```

### `health.json`

```json
{
  "generated_at": "...",
  "data_age_min": 3,
  "sources": { "winamax_catalog": { "age_min": 3, ... }, ... },
  "warnings": ["..."],
  "quality_checks": {           // semantic, pas juste age (Sprint 1 #4)
    "winamax_exact_ratio": 0.55,
    "actionable_external_odds": 187,
    "football_invalid_form": 0,
    "model_drift_ks": 0.08,    // Sprint 7 #3
    ...
  }
}
```

### `data_lite.js`

Boot payload compact pour rendre l'accueil avant le chargement complet :

```js
window.PRONOSTICS_DATA_LITE = {
  generated_at: "...",
  days: { "YYYY-MM-DD": [/* events actionnables proches */] },
  lite: true,
  source: "finalize_inline"
}
```

Le shell charge ensuite `data.js` en arrière-plan pour les pages profondes,
les historiques et les marchés longs. Le Service Worker garde les deux chemins
cacheables, mais le cache versionné doit être bumpé à chaque changement UI.

### Préférences locales

Les réglages utilisateur restent côté navigateur :

- `userBankroll`, `oddMinUser`, `paris_sportif_strategy_prefs_v1`
- `paris_sportif_focus_bigbets_v1`
- `paris_sportif_locale_v1`
- `paris_sportif_accessibility_prefs_v1`
- `paris_sportif_tracked_bets`

Ces clés ne doivent jamais être supprimées pendant une refonte.

## Conventions code

- `const`/`let` en scope IIFE → attention TDZ (hisser les déclarations
  utilisées avant leur ligne, ex: `isCalendrier`, `isMontante`).
- `m.home` / `m.away` n'existent PAS sur les events. Les noms vivent
  dans `m.competitors[].name`. Toujours passer par `getSides(m)`.
- Garde `Number(x) || 0` plutôt que `x || 0` pour les valeurs string corrompues.
- `prompt()` / `confirm()` interdits (PWA installée n'a pas accès) — utiliser
  les modals custom `_showStakePrompt` / `_showConfirm`.
- `location.hash` synchronisé sur la nav SPA (Sprint 6 #6).

## Tests

- `tests/critical-flows.spec.js` — boot, nav, theme, data freshness
- `tests/unit-helpers.spec.js` — helpers purs via `window.__testAPI`
- `tests/visual-regression.spec.js` — snapshots SVG/CSS structures
- `tests/a11y-axe.spec.js` — WCAG 2.1 AA via axe-core
- `tests/smoke-buttons.spec.js` — clic chaque bouton sans error JS
- `tests/market-consistency.spec.js` — empêche les contradictions type
  score exact 1-0 + BTTS Oui.
- `tests/click-everything.spec.js`, `tests/modal-tabs.spec.js`,
  `tests/user-flow.spec.js` — parcours Big Bet → modal → CTA → tracking.

## CI workflows

- `e2e.yml` — Playwright + drift check + bundle size + quality_checks
- `backtest.yml` — weekly cron dimanche, écrit backtest_report_v2
- `backtest-pr.yml` — PR fail si ROI baisse > 2pt vs main
- `lighthouse.yml` — perf budget LCP/TBT/CLS
- `refresh.yml` — cron 5min data refresh

## Backlog dette technique

- Découpage `app.js` (~1.6 MB IIFE) en modules ESM ciblés
- Migration inline → utility classes V3 (~250 occurrences)
- Audit `!important` CSS (107 occurrences, 60 à reviewer)
- Bundle size optimisation : app.js reste proche du budget, app.css est
  volontairement gelé autour de 300 KB tant qu'aucune purge sûre n'est faite.

## Phase 11 — Etat opérationnel

- Accueil desktop : layout 3 colonnes, sidebar gauche, main Big Bets, right rail.
- Accueil mobile : sections secondaires compactées, bottom nav avec marge dédiée.
- Modèle : high-odds first, anti-handicap, cohérence inter-marchés, abstain.
- Marchés visibles : 1N2, O/U, BTTS, scores exacts, mi-temps, quart-temps,
  sets tennis, totals hockey/baseball, combinés et outsiders multi-marchés.
- Qualité : Lighthouse cible 95+, a11y 0 violation sur audits locaux, CLS < 0.05
  sur desktop après réservation des rails.

## Décisions architecturales (ADR-style)

Voir `DECISIONS.md` pour les choix structurants documentés :
- Pourquoi `winamax.match_id` requis pour actionnable (vs juste `available`)
- Pourquoi Wilson + Bootstrap CI (vs normal-approx)
- Pourquoi clé composite `lc:tid` dans team_stats.json
- Pourquoi pas de bundler / TypeScript
