# Paris-Sportif — Projet technique

Site de prédictions de paris sportifs avec agent autonome qui parie sur Winamax. Déployé sur GitHub Pages à `harotensnor.github.io/paris-sportif`.

## Stack

- **Frontend** : un seul fichier `pronostics.html` (~13500 lignes, inline CSS+JS) + `sw.js` (Service Worker) + `manifest.webmanifest` (PWA)
- **Backend** : scripts Python dans `scripts/` (curl_cffi + regex scraping), orchestrés par `.github/workflows/refresh.yml` toutes les 5 min
- **Data** : `data.js` (1.3MB, embed de `window.PRONOSTICS_DATA`), fichiers JSON annexes (`winamax_catalog.json`, `winamax_markets.json`, `injuries_soccer.json`, `weather.json`, `referees_soccer.json`, `lineups_soccer.json`, etc.)
- **Deploy** : push sur `main` → GitHub Pages auto. DEPLOY-V20.bat (Windows) fait le fresh-clone + splice + retry pour pousser depuis ma machine locale

## Architecture frontend (pronostics.html)

Une grosse IIFE avec des sections logiques :
1. `<style>` CSS (lignes 1-1900)
2. `<body>` HTML template (lignes 2000-2200)
3. Embed `window.PRONOSTICS_DATA = {...}` (ligne ~2225, 1.3MB)
4. `<script>` main : helpers + model + render (~lignes 2400-13500)

**Fonctions clés à connaître :**
- `predictMatch(match)` → `{ pick, reliability, odds, markets, contributions, scores, poisson, explain, isLock, skip }` — le cœur du modèle
- `evaluateModelPick(m, pred)` → `'won' | 'lost' | null` — scoring d'un pari réglé
- `kellyFraction(rel, odd, fraction=0.25)` + `kellyStake(rel, odd, bankroll, fraction)` — staking
- `_agentReplay()` → rejoue l'historique des paris scorables avec Kelly 0.25× cap 10% plancher 0.10€ — renvoie `{ nav, series, scorableRaw, ydayStats, perSport7d, start, delta7, deltaPct7 }`
- `_agentBestPick(m, pred)` → choisit le meilleur marché (1N2 / O/U 2.5 / BTTS) par edge
- `_evaluateBestPick(m, best)` → évaluation post-match selon le marché
- `_agentPauseStatus(agent)` → stop-loss -30%/7j et take-profit +10%/jour
- `_loadAgentRules` / `_applyAgentRules` / `_proposedRules` — auto-tuning des règles d'exclusion
- `renderDashboardPage(wrap)` → le feed "one-page" (Accueil) — la page principale
- `renderBilanPage`, `renderHistoriquePage`, `renderCombines`, `renderSimples`, `renderButeursPage`, etc. — vieilles pages encore accessibles via `data-page="..."` des `.page-btn` cachés

## Architecture backend (scripts/)

- `fetch_winamax_catalog.py` — scrape `/paris-sportifs/sports/1` (single request) → `winamax_catalog.json` (64 tournois) + `winamax_markets.json` (~500 matchs avec cotes 1N2 Winamax). **Ne pas revenir à l'ancien scraper multi-requêtes qui échouait sur GHA.**
- `fetch_v3.py` — ESPN sweep multi-sport, produit `data.js`
- `fetch_live.py` — ESPN data du jour (rapide)
- `fetch_injuries_soccer.py`, `fetch_lineups_soccer.py`, `fetch_referees_soccer.py` — Sofascore (lents, 2-4h cadence)
- `fetch_weather.py` — Open-Meteo (gratuit, self-throttled)
- `fetch_clubelo.py` — ClubElo CSV (~1 call/20h)
- `fetch_team_stats.py`, `fetch_h2h.py`, `fetch_forebet.py`, `fetch_tips.py`, `fetch_tennis_odds.py`, `fetch_rus_odds.py` — signaux annexes
- `patch_*.py` — injectent les signaux fetched dans `data.js` (idempotent)
- `snapshot_odds.py` — freeze des cotes pre-match

Ordre canonique : fetch → patch_odds → patch_winamax → patch_winamax_markets → patch_injuries_soccer → patch_team_stats → patch_lineups_soccer → patch_clubelo → patch_weather → patch_referees_soccer.

## Convention Winamax-only

Depuis v17, **seuls les events avec `event.winamax.available === true` sont conservés** dans `data.js` (`patch_winamax.py` filtre le reste). Tout ce que le frontend voit est bookable sur Winamax.

## Agent autonome (depuis v27)

Le modèle est un **agent autonome** avec sa propre bankroll (10€ depuis J1). Il parie sur **tous ses picks non-skip** avec :
- Kelly 0.25×
- Cap per-bet 10% du NAV courant
- Cap daily aggregate 20% du NAV
- Plancher 0.10€
- **Skip strict si k ≤ 0** (pas de mise forcée sur edge négatif)
- Amplification divergence : edge >20pt = ×1.6, >15pt = ×1.4, >10pt = ×1.2

User **n'intervient PAS** sur cette cagnotte. C'est l'agent. `localStorage.agentResetTs` permet un reset (annulable dans les 10 min).

User a SA propre section **"À parier aujourd'hui"** en tête du feed avec 3 meilleurs edges + bankroll configurable (default 50€, clé `userBankroll`).

## Pipeline data staleness (depuis v28.7-v28.10)

Si `Date.now() - data.generated_at > 4h` :
- `topPicks = []` → pas de reco user
- `rawCandidates = []` → pas de positions agent
- `buteursFoot = []`, `combinesPicks = []`, `allTodayRaw = []`, `psArr = []` — rien d'actionnable
- Banner rouge explicite dans le feed

Si `> 6h` : auto force-refresh au page load (1× par session via `sessionStorage.autoRefreshDone`).

## Deploy / cron / race conditions

Le cron GitHub Actions push toutes les 5 min sur `data.js` + `pronostics.html` (car `patch_winamax.py` réinjecte `window.PRONOSTICS_DATA` dans le HTML). **Conflit récurrent** quand je push manuel pendant le cron tick.

DEPLOY-V20.bat (Windows) gère ça avec :
1. `git reset --hard origin/main` (prendre le remote frais)
2. `node splice-prono-data.js` (extrait PRONOSTICS_DATA du remote, l'injecte dans ma version UI locale)
3. Copie sw.js
4. Copie scripts/*.py + .github/workflows/refresh.yml si modifiés
5. Commit + push, retry jusqu'à 5× si race

**À préserver absolument** : le splice. Sinon on overwrite la data fraîche par notre copie locale stale.

## Historique des patches récents (toujours en cours)

v27 → v28.10 shipped en une nuit :
- v27 : refonte one-feed agent
- v27.1 : Kelly strict + cap daily 20% (fix bug 27 positions forcées à 0.10€ chacune)
- v27.2 : auto-tuning règles d'exclusion (conf-threshold, sport, league, odd-range)
- v27.3 : divergence amplification
- v28 : multi-marché tentative (incomplet, seul 1N2 Winamax marche)
- v28.1 : fix critique `fetch_winamax_catalog.py` (single-request approach)
- v28.2 : inline combinés/buteurs/tous matchs
- v28.3 : discipline (stop-loss, take-profit, filtres, tri)
- v28.4 : mobile + export CSV + scroll fix
- v28.5 : bouton force refresh
- v28.6 : section "À parier aujourd'hui" pour user
- v28.7 → v28.10 : chasse aux bugs data stale, auto-refresh, pollData error, undo reset

## Bugs connus / Technical debt

**Critiques à fix :**
1. **Modal détail match (`openDetail`)** — design obsolète, devrait être refondue en onglets (Synthèse / Signaux / Cotes / H2H). Task #138 pending depuis longtemps. ~200 lignes à réécrire.
2. **Mobile responsive fragile** — `nth-child` CSS selectors basés sur positions de divs. Si une section est conditionnellement absente, les sélecteurs ciblent le mauvais élément. À tester sur vrai device.
3. **Signaux dormants non intégrés dans `predictMatch`** : `weather.json`, `referees_soccer.json`, `lineups_soccer.json` sont fetched mais inutilisés. Potentiel +3-5pt de précision foot.
4. **Pas de tests unitaires** sur `predictMatch`, `kellyFraction`, `_agentReplay`, `_agentBestPick`, `_evaluateBestPick`. Zéro garantie de non-régression.

**À moyen impact :**
5. `data.days` peut avoir des clés date sans events (skip propre à faire)
6. Filtre sport reset inconsistant si le sport disparaît
7. Timezone : tout hardcodé `Europe/Paris`, casse pour user ailleurs
8. Manifest PWA peut aussi rester cache-stuck
9. Stake formatting incohérent (2 décimales vs 0.50)
10. Auto-tuning a besoin de ≥10 paris par bucket pour proposer — pas de message "en attente de sample" si 0 rules

**Signal improvements futurs :**
- Scraper O/U 2.5 + BTTS Winamax (pas dans l'index, besoin per-match fetch)
- Calibration isotonique (>50 paris nécessaires)
- xG rolling fbref.com (nouveau scraper)
- Poids dynamique signaux auto-appris

## Conventions

- **JavaScript vanilla**, pas de framework
- **CSS inline dans style="..."** dans la plupart des nouvelles sections (trader-grade). Les `<style>` globales pour les anciennes pages.
- **Variables CSS** : `--brand` (violet #a78bfa), `--accent` (vert #10b981), `--danger` (rouge #fca5a5), `--warn` (orange), `--text`, `--text-dim`, `--text-dim2`, `--panel`, `--panel-2`, `--border`
- **`tabular-nums`** pour tous les chiffres (via `font-variant-numeric:tabular-nums` sur le conteneur parent)
- **Commit messages** : `vXX.Y <titre> : <liste de changements séparés par /> — SW vZ`
- **SW cache busting** : bumper `CACHE_VERSION` dans `sw.js` à CHAQUE deploy qui change `pronostics.html` ou `sw.js`
- **Préserver le splice PRONOSTICS_DATA** dans deploy-v20/splice-prono-data.js — ne jamais copier bêtement notre pronostics.html local

## Prochains gros chantiers recommandés (par impact)

1. **Tests unitaires** (~2h) : vitest ou jest, coverage sur `predictMatch` + `kellyFraction` + `_agentReplay` + `_agentBestPick`. Tests basés sur 5-10 matchs fixtures connus. Garantit non-régression des futurs refactors.

2. **Intégration signaux dormants** (~3h) : extension de `predictMatch` pour lire `event.weather`, `event.referee`, `event.lineups`. Pondération à calibrer — commencer petit (poids 5% chacun), tester, ajuster.

3. **Refactor pronostics.html en modules** (~demi-journée) : split en `index.html` + `src/agent.js` + `src/render.js` + `src/predict.js` + `src/pages/*.js`. Build Vite ou rollup qui concatène en un seul HTML pour GitHub Pages. Rend tout le reste 10× plus maintenable.

4. **Modal détail en onglets** (task #138) : refonte complète de `openDetail` en structure tabs (Synthèse / Signaux / Cotes / H2H / Historique).

5. **Calibration isotonique + poids dynamique** — quand ≥50 paris accumulés.

6. **Scraping multi-marché Winamax** (O/U 2.5 + BTTS) : nouveau `fetch_winamax_match_details.py` qui hit chaque page match. Voir `CHANTIER-MULTI-MARCHE.md` pour le détail.

## Gotchas spécifiques

- **Service Worker cache-first sur HTML** : peut servir vieille version même après deploy. Toujours bumper `CACHE_VERSION`. User a un bouton "forcer refresh" + auto-refresh si >6h stale.
- **`getSides(match)`** peut renvoyer `{home: undefined, away: undefined}` si `match.competitors` est malformé. Toujours `?.` sur les accès.
- **Cron-job.org** ping le workflow toutes les 5 min (bypass du throttling GH schedule). PAT expire 2026-05-22.
- **Syntax check** pour ce fichier gros : `node -e "new Function(scriptContent)"` sur chaque `<script>`. Fait avant chaque deploy.
- **Pas d'intégration Betclic ou autre bookmaker** — 100% Winamax par choix produit.

## Pour démarrer une session Codex sur ce projet

1. Lire `AGENTS.md` (ce fichier) en premier
2. Scanner `scripts/` pour comprendre le backend data
3. Scanner les fonctions clés de `pronostics.html` via Grep sur les noms ci-dessus
4. Avant tout changement : faire un syntax check baseline (tous les `<script>` doivent passer `new Function()`)
5. Après changements : re-syntax check + jsdom test si possible
6. Bumper `sw.js` CACHE_VERSION avant deploy
7. Commit descriptif + push, laisser DEPLOY-V20.bat gérer le race sur Windows
