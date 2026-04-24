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

- **`pronostics.html`** (~14700 l) — SPA : toute l'app (HTML + CSS + JS).
  Regroupe ~15 pages (dashboard, simples, combinés, locks, mes paris,
  buteurs, bilan, alertes, historique, académie, profil, backtest, top…)
  via `applyPageView()` (l. ~9410) et un dispatcher click sur `.page-btn`.
  Fonctions critiques :
  - `renderDashboardPage(wrap)` (l. ~7669) — vue Accueil, la plus riche.
  - `predictMatch(m)` — modèle de scoring, utilisé par l'agent IA et par
    les pages simples/combinés.
  - `_agentReplay()`, `_agentPauseStatus()`, `_agentBestPick()` —
    gestion cagnotte + règles auto-tuning + Kelly.
  - Storage local : `localStorage` (clés `agent*`, `myBets`, `currentPage`,
    `userBankroll`, `agentResetTs`…).

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

- **`.github/workflows/refresh.yml`** — cron `*/5 * * * *`, exécute la
  pipeline, commit `data.js` + sidecars (~paris après 1 min sur le site).

## Conventions

- **UN SEUL FICHIER HTML** : `pronostics.html` contient tout. Pas de bundler,
  pas de build step. Modifier directement.
- **`index.html`** redirige vers `pronostics.html` (pour GitHub Pages).
- **Variables `let`/`const` en scope IIFE** — attention TDZ : une `const`
  utilisée avant sa ligne de déclaration, même conditionnellement, lève
  `ReferenceError: Cannot access X before initialization`. Toujours hisser
  les déclarations au début de la fonction.
- **Cadence data** : si `data.generated_at` > 4h, `_dataIsStale = true`
  désactive les picks (éviter de recommander des matchs finis). Si > 6h,
  auto force-refresh 1× par session.
- **Pipeline patch** : `patch_winamax` doit tourner **avant** tous les
  autres patchs (établit `ev.winamax.match_id` utilisé par les enrichisseurs).

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
`winamax_markets.json`, `backtest_report.json`, `backtest_report.md`.
Tous commités car c'est la "base de données" du site statique.

## Zones fragiles connues

- **`renderDashboardPage`** : ~700 lignes, chiffon de dépendances ; les
  ajouts de features (pauseStatus, _dataIsStale, etc.) doivent déclarer
  leurs `const` tout en haut de la fonction pour éviter les TDZ.
- **Synchronisation `auto_refresh.py` ↔ `refresh.yml`** : toute nouvelle
  source ou patch doit être ajouté aux deux endroits (sinon dev local ≠ prod).
- **`paris-sportif.html`** : ancien HTML legacy, non référencé par
  `index.html`. Candidat à suppression.
- **`backtest_baselines.py` vs `backtest_v2.py`** : `backtest_baselines.py` évalue des stratégies
  marché (fav/dog/draw/value), PAS `predictMatch` — ne pas l'utiliser pour
  juger la perf du modèle prod. `backtest_v2.py` appelle la vraie fonction
  `predictMatch` via `model_loader.py` (V8 embarqué, une seule source de
  vérité dans `pronostics.html`). Cron hebdo dans `backtest.yml`, sortie
  `backtest_report_v2.{json,md}`.
