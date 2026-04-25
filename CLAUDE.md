# Paris Sportif — Guide Claude

Site statique de pronostics sportifs (foot, tennis, basket, hockey, …) avec
un agent IA qui gère une "cagnotte modèle" (Kelly fractionné, cap 10%),
des pronostics simples/combinés, et une vue bilan. Déployé sur GitHub Pages.
Client = navigateur ; données = fichier `data.js` régénéré en continu.

## Architecture

```
┌────────────────────┐       cron 5 min       ┌──────────────────┐
│ .github/workflows/ │  ───────────────────▶  │   GitHub Pages   │
│   refresh.yml      │    commit data.js      │  (déploiement)   │
└─────────┬──────────┘                        └──────────────────┘
          │ exécute scripts/*.py                        │
          ▼                                             ▼
   ┌─────────────┐    scrape ESPN / Sofascore /    ┌──────────────┐
   │ scripts/    │    Winamax / BetExplorer /  ──▶ │ data.js +    │
   │  fetch_*.py │    ClubElo / OpenMeteo / RdJ    │ JSON sidecars│
   │  patch_*.py │                                 └──────────────┘
   └─────────────┘                                         │
                                                           ▼
                                         ┌────────────────────────┐
                                         │  pronostics.html       │
                                         │   (SPA ~14700 lignes)  │
                                         │  + sw.js (offline)     │
                                         └────────────────────────┘
```

En local : `python serveur.py` lance un HTTP server (port 8765), ouvre
`pronostics.html`, et démarre `auto_refresh.py` en arrière-plan pour
rejouer la pipeline GitHub Actions toutes les 60 s (cadences par script).

## Fichiers clés

- **`pronostics.html`** (~16500 l) — SPA : toute l'app (HTML + CSS + JS).
  Regroupe ~15 pages (dashboard, simples, combinés, locks, mes paris,
  buteurs, bilan, alertes, historique, académie, profil, backtest, top,
  crédibilité…) via `applyPageView()` et un dispatcher click sur `.page-btn`.
  Fonctions critiques :
  - `renderDashboardPage(wrap)` — vue Accueil, la plus riche.
    Contient maintenant : daily P&L chip, streak banner, activité récente
    (5 derniers paris), top picks avec countdown timer + pulse imminent,
    prochaines opportunités, cards aside live/upcoming cliquables.
  - `predictMatch(m)` — modèle de scoring, mémoïsé via `__predCache`.
  - `_agentReplay()`, `_agentPauseStatus()`, `_agentBestPick()` —
    gestion cagnotte + règles auto-tuning + Kelly.
  - `renderCredibilitePage(wrap)` — calibration plot SVG + perf par sport/cote/tier,
    lit `window.__backtestReportV2` depuis `_loadModelCalibration`.
  - Storage local : `localStorage`. Préfixes connus : `agent*`, `bilan.*`,
    `paris_sportif_*`. Clés notables : `currentPage`, `userBankroll`,
    `agentResetTs`, `tousFilters`, `tousSort`, `tousTab`, `userPrefs.theme`
    (3-state dark/light/auto), `userPrefs.pushNotifs`, `pwaInstallSnoozeUntil`,
    `notifiedPickIds`, `paris_sportif_tracked_bets`, `seenLockIds`,
    `paris_sportif_user_lessons_v1`, `paris_sportif_js_errors_v1`.

- **`data.js`** (~1.3 MB, généré) — export `PRONOSTICS_DATA = {generated_at,
  today, days: {ISO: [events]}}`. Chaque event a : id, sport, league_code,
  competitors[], odds[], winamax?, injuries?, lineups?, referee?, weather?,
  clubelo?, live?…

- **`sw.js`** — service worker, cache offline. S'enregistre sur page load.

- **Scripts Python** (`scripts/`) :
  - `fetch_v3.py` (full sweep ~5 min) — pipeline principale multi-sport.
  - `fetch_live.py` (~15 s) — refresh rapide "today only" via ESPN.
  - `fetch_{forebet,tips,winamax_catalog,tennis_odds,rus_odds}.py` — sources.
  - `fetch_{injuries,injuries_soccer,lineups_soccer,referees_soccer,
    team_stats,clubelo,weather,h2h}.py` — enrichissements.
  - `patch_*.py` — appliquent les JSON sidecars sur `data.js` (ordre
    important, voir `.github/workflows/refresh.yml`).
  - `winamax_map.py` — **module partagé** (import par 7 scripts),
    `_norm`/`_name_tokens`/`lookup` pour matching équipes ↔ Winamax.
  - `snapshot_odds.py` → `odds_history.jsonl` (freeze pre-match odds).
  - `backtest_baselines.py` — évaluation, **baselines marché uniquement** (pas le
    modèle prod) — chantier ouvert.

- **`auto_refresh.py`** — orchestrateur local, miroir de `refresh.yml`
  avec cadences par script (1/5/10/15/120/240 ticks). Doit rester
  synchrone avec le workflow.

- **`.github/workflows/refresh.yml`** — cron `*/5 10-23 * * *` jour /
  `*/30 0-9 * * *` nuit, exécute la pipeline, commit `data.js` + sidecars.
  Inclut `build_health.py` qui produit `health.json` à chaque tick.

- **`.github/workflows/e2e.yml`** — déclenche les tests Playwright
  (14 tests dans `tests/critical-flows.spec.js`) sur push main + PR
  qui touchent `pronostics.html` / `tests/`. CI catch les régressions
  nav, modale, theme, filter bar, hash navigation, etc.

- **`scripts/build_health.py`** — produit `health.json` lu par le
  health indicator topbar (`window._refreshHealthIndicator`). Statut
  vert/orange/rouge selon âge data + warnings sources.

## Conventions

- **UN SEUL FICHIER HTML** : `pronostics.html` contient tout. Pas de bundler,
  pas de build step. Modifier directement.
- **`index.html`** redirige vers `pronostics.html` (pour GitHub Pages).
- **`.gitattributes`** force LF eol partout — sans ça les édits Windows
  produisent des diffs phantoms à chaque commit (CRLF/LF flip-flop).
- **Variables `let`/`const` en scope IIFE** — attention TDZ : une `const`
  utilisée avant sa ligne de déclaration, même conditionnellement, lève
  `ReferenceError: Cannot access X before initialization`. Toujours hisser
  les déclarations au début de la fonction.
- **Cadence data** : si `data.generated_at` > 4h, `_dataIsStale = true`
  désactive les picks (éviter de recommander des matchs finis). Si > 6h,
  auto force-refresh 1× par session.
- **Pipeline patch** : `patch_winamax` doit tourner **avant** tous les
  autres patchs (établit `ev.winamax.match_id` utilisé par les enrichisseurs).
- **Noms équipes** : `m.home` / `m.away` n'existent PAS sur les events
  PRONOSTICS_DATA. Les noms vivent dans `m.competitors[].name`. Toujours
  passer par `getSides(m)` qui retourne `{home: {name, short, logo, ...}, away: {...}}`.
  Ne JAMAIS interpoler `${m.home}` direct — on a déjà chassé 7 occurrences
  de cette régression v24.3.
- **Garde `Number(x) || 0`** : préférer `Number(x) || 0` à `x || 0` quand
  x peut être une string corrompue ('abc'). 'abc' || 0 → 'abc' (truthy)
  qui casse les `.toFixed()` ensuite. Helper `_normNum` partout dans
  renderBet et co.
- **`location.hash`** : 4 valeurs supportées au boot (#dashboard, #locks,
  #bilan, #combines, etc.) pour les PWA shortcuts du manifest. Listener
  hashchange pour back/forward.
- **Théme 3-state** : `userPrefs.theme` ∈ {dark, light, auto}. `auto`
  résout via `prefers-color-scheme` au boot pré-body + écoute le change
  en live. Cycle Maj+T = dark → light → auto → dark.

## Dev local

```bash
python serveur.py          # port 8765, ouvre pronostics.html, auto_refresh bg
# ou
python -m http.server 8765  # sans auto_refresh
```

Logs auto_refresh : `auto_refresh.log` (racine).

## Déploiement

```bash
./deploy.sh                 # commit + push (GitHub Pages auto-deploy ~1 min)
```

Ou attendre le cron `refresh-data` de `.github/workflows/refresh.yml` qui
push `data: auto-refresh <UTC>` toutes les 5 min.

## Fichiers trackés à la racine (générés)

`data.js`, `odds_history.jsonl`, `clubelo.json`, `injuries_soccer.json`,
`lineups_soccer.json`, `referees_soccer.json`, `team_stats.json`,
`weather.json`, `weather_geo_cache.json`, `winamax_catalog.json`,
`winamax_markets.json`, `backtest_report.json`, `backtest_report.md`,
`backtest_report_v2.json`, `backtest_report_v2.md`, `health.json`.
Tous commités car c'est la "base de données" du site statique.

## Tests

- `tests/critical-flows.spec.js` — 14 tests Playwright (boot, hubs nav,
  theme cycle, Tous filter, date nav, calibration, footer, mes paris
  empty, help modal, Reims regression, hash navigation, daily P&L
  resilience, notif btn, health indicator).
- `playwright.config.js` — 2 projets (chromium-desktop + Pixel 5).
  webServer python http.server port 8765.
- Run local : `npx playwright test`. CI : `.github/workflows/e2e.yml`.

## Zones fragiles connues

- **`renderDashboardPage`** : ~700 lignes, chiffon de dépendances ; les
  ajouts de features (pauseStatus, _dataIsStale, etc.) doivent déclarer
  leurs `const` tout en haut de la fonction pour éviter les TDZ.
- **Synchronisation `auto_refresh.py` ↔ `refresh.yml`** : toute nouvelle
  source ou patch doit être ajouté aux deux endroits (sinon dev local ≠ prod).
- **`backtest_baselines.py` vs `backtest_v2.py`** : `backtest_baselines.py` évalue des stratégies
  marché (fav/dog/draw/value), PAS `predictMatch` — ne pas l'utiliser pour
  juger la perf du modèle prod. `backtest_v2.py` appelle la vraie fonction
  `predictMatch` via `model_loader.py` (V8 embarqué, une seule source de
  vérité dans `pronostics.html`). Cron hebdo dans `backtest.yml`, sortie
  `backtest_report_v2.{json,md}`.
