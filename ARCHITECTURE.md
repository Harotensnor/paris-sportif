# Architecture Paris-Sportif

> Document vivant. Mis à jour à chaque grosse refonte.
> Dernière maj : 2026-04-27 (post-audit Codex + 12 sprints).

## Vue d'ensemble

Site statique de pronostics sportifs (foot, tennis, basket, hockey, baseball)
avec un agent IA qui gère une "cagnotte modèle". Déployé sur GitHub Pages
sans build step ni bundler. Données régénérées toutes les 5 minutes via
GitHub Actions cron.

## Stack technique

```
┌──────────────────────────────────────────────────────────────────┐
│  CLIENT (navigateur)                                             │
│  - pronostics.html : SPA shell + LITE blob inline               │
│  - app.js (~1 MB IIFE)                                          │
│  - app.css (~170 KB)                                            │
│  - sw.js (Service Worker, PWA + offline)                        │
│  - data.js (~1.3 MB) : full archive 14 jours                    │
│  - data_today.json : data du jour, refresh fréquent             │
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
│  - scripts/fetch_*.py : scrape ESPN, Sofascore, Sackmann, ...   │
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
- Les `<script type="module">` sont OK (browsers ESM nativement)
- Pas de TypeScript (JSDoc pour les types si besoin)

## Pipeline data

Ordre d'exécution dans `refresh.yml` (= `auto_refresh.py` en local) :

1. **Fetch sources** (parallel quand possible) :
   - `fetch_v3.py` — ESPN principal
   - `fetch_winamax_catalog.py` — tournois Winamax
   - `fetch_team_stats.py` — last5 stats par équipe (CACHE clé `lc:tid`)
   - `fetch_clubelo.py`, `fetch_h2h.py`, `fetch_weather.py`, etc.
2. **Patch sidecars sur data.js** (ordre IMPORTANT) :
   - `patch_winamax.py` AVANT tous les autres (établit `match_id`)
   - `patch_winamax_markets.py` (cotes Winamax exactes, garde-fous)
   - `patch_team_stats.py` (avec garde-fous anti-contamination)
   - `patch_*.py` enrichissements
3. **Build pages** :
   - `build_health.py` — health.json + quality_checks
   - `build_backtest_page.py`, `build_credibilite_page.py`, etc.
   - `finalize_inline.py` — inline LITE blob dans pronostics.html
   - `check_data_integrity.py` — vérifie ≥50% events vs précédent
4. **Commit + push** par le bot GitHub Actions.

## Source de vérité unique

`predictMatch` vit DANS `app.js` (IIFE). C'est la seule source de vérité.

- Frontend : appelle `predictMatch(match)` direct
- Backend backtest : `scripts/model_loader.py` extrait l'IIFE et l'évalue
  via mini-racer (V8 embarqué) → garantit que le backtest mesure la
  VRAIE fonction prod, pas une duplication Python qui dériverait.

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

- `tests/critical-flows.spec.js` — 14 tests Playwright (boot, nav, theme, ...)
- `tests/unit-helpers.spec.js` — helpers purs via `window.__testAPI`
- `tests/visual-regression.spec.js` — snapshots SVG/CSS structures
- `tests/a11y-axe.spec.js` — WCAG 2.1 AA via axe-core
- `tests/smoke-buttons.spec.js` — clic chaque bouton sans error JS

## CI workflows

- `e2e.yml` — Playwright + drift check + bundle size + quality_checks
- `backtest.yml` — weekly cron dimanche, écrit backtest_report_v2
- `backtest-pr.yml` — PR fail si ROI baisse > 2pt vs main
- `lighthouse.yml` — perf budget LCP/TBT/CLS
- `refresh.yml` — cron 5min data refresh

## Backlog dette technique

- Découpage `app.js` (~1 MB IIFE) en modules ESM
- Migration inline → utility classes V3 (~250 occurrences)
- Audit `!important` CSS (107 occurrences, 60 à reviewer)
- Bundle size optimisation (95% du budget app.js déjà consommé)

## Décisions architecturales (ADR-style)

Voir `DECISIONS.md` pour les choix structurants documentés :
- Pourquoi `winamax.match_id` requis pour actionnable (vs juste `available`)
- Pourquoi Wilson + Bootstrap CI (vs normal-approx)
- Pourquoi clé composite `lc:tid` dans team_stats.json
- Pourquoi pas de bundler / TypeScript
