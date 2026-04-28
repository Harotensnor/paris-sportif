# Paris Sportif — Guide Claude

Site statique de pronostics sportifs (foot, tennis, basket, hockey, baseball)
avec un agent IA qui gère une "cagnotte modèle" (Kelly fractionné, cap 10%),
des pronostics simples/combinés/montantes séquentielles, et une vue bilan.
Déployé sur GitHub Pages. Client = navigateur ; données = fichier `data.js`
régénéré en continu.

## Architecture v31.7.138 (mise à jour 2026-04-28 — Sprint 49 marchés étendus foot)

**Sprint 49 (Phase 3 — overhaul user-driven 2026-04-28)** — réponse à
"je veux plus de types de paris (score exact, mi-temps, double chance,
handicap)". Phase 1 ne touche QUE le foot (Poisson xG dispo). Tennis/
basket/hockey/baseball arrivent dans phases suivantes.

- **`poissonMarketsExtended(lamH, lamA)`** (app.js ~L1395) — dérive du
  même Poisson xG : grille jointe complète + 1X2 sanity, Double chance
  (1X/X2/12), Score exact top 5, Over/Under 1.5/2.5/3.5, mi-temps
  (lambda × 0.45 pour HT). Pas de scraping additionnel.
- **`pred.markets.extended`** dans predictMatch — `{ doubleChance,
  doubleChanceAll, exactScores, ou15, ou35, halfTime, halfTimeAll }`.
  Chaque sélection = `{ key, label, prob }`. `raw` garde la structure
  brute pour debug.
- **Modal détail** — section "🥅 Marchés buts (Poisson)" étendue : ajoute
  des chips conditionnels pour Double chance (≥0.65), Score exact (top
  ≥0.10), Mi-temps (≥0.50), OU 1.5 (≥0.70), OU 3.5 (≥0.55). Seuils
  choisis pour ne montrer que des picks lisibles.

Limites assumées (Phase 4+ ouvert) :
- Indépendance Poisson home/away (Dixon-Coles τ corrige légèrement
  les nuls bas mais pas dans extended).
- Mi-temps via 0.45 × λ — empirique, pas par-ligue calibré.
- Pas encore de comparaison cote bookmaker / proba modèle pour edge
  per-marché (à venir Sprint 50 — wire pred.markets.extended dans
  evaluateModelPick + tracking backtest).
- Tennis/basket/hockey/MLB pas encore couverts (handicap / total
  jeux / quart-temps / strikeouts).

## Architecture v31.7.137 (mise à jour 2026-04-28 — Sprint 48 page Matchs détectés)

**Sprint 48 (Phase 2 — overhaul user-driven 2026-04-28)** — réponse à
"je veux voir TOUS les matchs détectés, pas juste ceux avec un prono fort".

- **Page `#matchs` "Matchs détectés"** (app.js `renderMatchsPage` ~L15291)
  — vue exhaustive complémentaire à `#tous`. Tous les matchs des 7
  prochains jours avec leur badge statut (5 codes Sprint 47), filtres
  jour / sport / ligue / statut / tri (date / enjeu / statut) +
  recherche libre. Filtres persistés via `localStorage.matchsFilters`.
- Stats bar : "147 matchs · 23 pronos forts · 38 incertains · 86 sans
  données". L'user voit clairement la distribution.
- Limite 100 cards à la fois (DOM safety) avec compteur "+ N autres
  matchs (réduis la fenêtre ou filtre)".
- Ajouté à `pronos-subnav` (sous-nav onglets) + nav menu desktop +
  Cmd-K palette ("Aller à Matchs détectés").
- VALID_PAGES étendu, applyPageView gère le wrap avec skeleton pendant
  `_ensureFullData()`.

Différence avec Tous pronos (`#tous`) : `#tous` filtre Winamax-bookable
+ pred actionnable (l'user prend une décision rapide). `#matchs` ne
filtre rien — c'est l'index complet pour explorer/comprendre, et c'est
là que tu retrouves PSG-Bayern même quand le modèle hésite.

## Architecture v31.7.136 (mise à jour 2026-04-28 — Sprint 47 visibilité gros matchs)

**Sprint 47 (Phase 1 — overhaul user-driven 2026-04-28)** — répond au feedback
"je ne vois pas PSG-Bayern alors qu'il est demain". Le modèle skipait le match
parce que les cotes sont serrées (2.20/4.00/2.60 → reliability < 0.55) ; le
filtre `pred.skip || pred.lowConf` cachait le match au lieu de le surfacer
avec un statut clair. Pivot produit : montrer **tous** les matchs détectés,
chacun avec son statut human-readable.

- **`matchImportance(match)`** (app.js ~L942) — score 0..100 reflétant l'enjeu.
  Composantes : compétition (UEFA Champions/Europa = 35/25, top-5 = 20),
  phase (finale +25, demi +18, quart +12, knockout +8), Elo équipes (>1900 = +20),
  records NBA/NHL/MLB (>30W = +12), sport (foot +5).
- **`getMatchStatus(match, pred?)`** (app.js ~L1004) — 5 codes :
  - `strong` : Prono fort (Winamax bookable + reliability ≥ 0.55)
  - `uncertain` : Match incertain (pred OK mais reliability < 0.55)
  - `no_data` : Données insuffisantes (pred.skip ou pas assez de signaux)
  - `no_odds` : Cotes en attente (match_id Winamax mais markets vides)
  - `no_winamax` : Marchés Winamax non disponibles (tournament-only)
- **Section dashboard "🏆 Prochains gros matchs · 7 jours"** — surfacée
  AU-DESSUS de "Prochaines opportunités". Top 8 matchs filtrés par
  `matchImportance ≥ 30`, classés par enjeu desc puis kickoff asc. Chaque
  card affiche le badge statut, donc PSG-Bayern apparaît avec
  "⚠ Match incertain" au lieu d'être caché.
- **Calendrier 7j relâché** — avant : `if (pred.skip || pred.lowConf) return`.
  Maintenant : on garde **tous** les matchs Winamax-bookable + les "gros
  matchs" non-bookable (importance ≥ 35). Tri : locks → strong → autres
  par importance. `renderPickRow` rend un badge statut quand non-strong.

Suit le pivot produit : "Winamax-only-strict" → "show-all-with-status".
Reste à traiter dans les sprints suivants (24 sections du brief Théo
2026-04-28) : per-market predictions, Performance fusion Bilan/Historique,
Tous les matchs détectés (vue séparée), match importance score V2, alerts/
favorites enhancement, navigation 6 sections, comprehensive match detail
tabs, etc. Voir backlog dans le brief original.

## Architecture v31.7.10-12x (mise à jour 2026-04-27 — sprints 13-40 polish & extension)

**Sprints 13-40 (140 points)** — phase polish + extensions modèle.

### Sprints 13-18 — Visual & UX (v31.7.104-108)
- **Sprint 13** Design tokens (typo modular scale, spacing 4px, radius/shadow ladder, tracking)
- **Sprint 14** Cards & components (.interactive hover-lift, focus rings WCAG, active scale)
- **Sprint 15** Mobile UX (touch ≥44px, bottom sheet modal, drag-to-dismiss)
- **Sprint 16** Micro-interactions (animated counter, toast stack, tooltip system, loading)
- **Sprint 17** Nav & wayfinding (breadcrumbs, modal scroll progress, Cmd-K search)
- **Sprint 18** Onboarding (smart suggestion banner, badge "Nouveau", confetti, empty state v2)

### Sprints 19-24 — Bugs corrigés + cohérence (v31.7.109-114)
- **Sprint 19** Bugs régression (focus rings, hover sticky mobile, modal progress)
- **Sprint 20** Adoption helpers (counter Bilan, confetti win streak, tooltip migration)
- **Sprint 21** Sweep design tokens (223 valeurs px → var(--space-*) et var(--r-*))
- **Sprint 22** Tests fixtures + CSP migration (4 inline onclick → delegation)
- **Sprint 23** Bundle budget + cleanup (preconnect Sofascore, lazy images, dup CSS)
- **Sprint 24** Mobile polish (touch targets, modal tabs scroll, reduced-motion safety)

### Sprints 25-32 — Modèle V3 + DevOps (v31.7.115-122)
- **Sprint 25** Bugs résiduels (modal progress hide, smart suggest UTC, MutationObserver)
- **Sprint 26** Mobile UX completion (pull-to-refresh, keyboard avoidance, haptic helper)
- **Sprint 27** Search & filter (URL deep-link filters, saved presets helpers)
- **Sprint 28** Onboarding (recently viewed tracking, bookmark picks helpers)
- **Sprint 29** Modèle foot (fenêtre congestion 3j proxy fatigue européenne)
- **Sprint 30** Modèle US sports (NBA/NHL back-to-back fatigue)
- **Sprint 31** Framework analytique (A/B test Wilcoxon, CV backtest rolling-origin)
- **Sprint 32** DevOps wired (auto-rollback, backup quotidien, Discord alerts, structured logs)

### Sprints 33-40 — Adoption + finitions (v31.7.123-129)
- **Sprint 33** Adoption UI (page Favoris #favoris, helpers bookmark visibles)
- **Sprint 34** Profile/Settings (export/import settings JSON helpers)
- **Sprint 35** Framework UI (drift detector visible Santé)
- **Sprint 36** Modèle backlog documenté (CLV, multi-bkmk, form decay, per-league)
- **Sprint 37** SEO (sitemap dynamique build_sitemap.py)
- **Sprint 38** A11y avancée (keyboard shortcut overlay `?`, ARIA live region)
- **Sprint 39** Production monitoring tier 2 (LCP per-page CI, structured logs ×2)
- **Sprint 40** Polish final (docs consolidées, ARCHITECTURE.md, DECISIONS.md)

## Architecture v31.7.9x (mise à jour 2026-04-27 — 6 sprints post-audit)

**6 sprints post-audit Codex 2026-04-27** (30 points exécutés). Voir
v31.7.93 → v31.7.98 dans le commit log.

- **Sprint 1 — Data integrity (v31.7.93)** : snapshot_odds fallback Winamax
  markets, isWinamaxBookable étendu Buteurs/Combinés/Montantes, garde-fou
  patch_winamax_markets cotes absurdes, CI bloquante quality_checks,
  tests fixtures pollution data.
- **Sprint 2 — Modal détail rework (v31.7.94)** : vrais tabs Synthèse/
  Signaux/Cotes/H2H/Stats, source cote en évidence, print stylesheet,
  deep linking #match/<id>/<tab>.
- **Sprint 3 — UX mobile + PWA (v31.7.95)** : refresh-indicator au-dessus
  bottom-nav, drawer/bottom-nav exclusif, PWA install signal d'engagement,
  offline UX banner, skeleton loaders.
- **Sprint 4 — Tests & monitoring (v31.7.96)** : backtest auto sur PR
  (regression catch -2pt ROI), visual regression étendu 5 pages, Discord
  webhook health warnings, helper logs structurés JSON, page Santé
  quality_checks visibles.
- **Sprint 5 — Modèle & analytics (v31.7.97)** : Wilson + Bootstrap CI sur
  ROI/WR, baselines always-fav/dog/draw/random, page Ligues drill-down
  (#league/eng.1), Brier per-sport breakdown.
- **Sprint 6 — Dette technique partielle (v31.7.98)** : bundle size budget
  CI (app.js < 1100KB, app.css < 200KB, etc.).

### Backlog dette technique restante

Ce qui reste non traité du Sprint 6 (à attaquer un sprint dédié) :
- Découper app.js (~1MB) en modules ESM. Trop gros refactor pour un
  sprint single-shot, garde la convention "no build step" mais nécessite
  d'identifier des frontières propres (core/pages/model/utils).
- Migration inline → utility V3 : ~250 occurrences `style="color:var(--text)"`
  encore inline. Patterns top : `color:var(--text)` (×39), `color:var(--text-dim)` (×27),
  `text-align:right` (×17). Un sweep ferait gagner ~10KB sur app.js.
- Audit `!important` CSS : 107 occurrences, dont 27 légitimes en
  media-query (override inline styles), 11 hides légitimes, 7 theme
  overrides, 60 "autres" à reviewer.
- Lazy-load pages secondaires : Académie / Méthodologie / Légal sont
  pré-cachées par le SW alors qu'elles sont rarement visitées. Pourrait
  passer en lazy-fetch on demand.

## Architecture v31.7.8x (mise à jour 2026-04-27 — pack audit Codex)

**Pack audit Codex 2026-04-27** (`AUDIT_CLAUDE_PACK_2026-04-27/`) :
3 root causes data critiques traitées en P1/P2/P3.

- **v31.7.83** Stop NBA→foot contamination via team_stats. ESPN partage
  les `team_id` entre sports (tid=20 = Boston Celtics ET Unión Santa Fe).
  L'ancienne pipeline patchait des stats NBA sur clubs argentins
  (avg_gf5=100, last5 vs Lakers 91-123). Fix : clé composite `lc:tid`
  dans `fetch_team_stats.py` + `patch_team_stats.py`, garde-fou sport-
  mismatch + cleanup proactif des form_stats déjà contaminés. Confirmé :
  7 contaminations live nettoyées, 96 sport-mismatch désormais skip.
- **v31.7.84** Health sémantique + Winamax-exact priorité dans
  `getMatchOdds`. `build_health.py` ajoute `quality_checks` :
  `winamax_exact_ratio`, `actionable_external_odds` (events avec
  Winamax exact MAIS odds_snapshot externe DraftKings/TennisExplorer
  → 187 sur la data live), `football_invalid_form`. `getMatchOdds`
  prioritise désormais `winamax.markets['1n2']` en pré-match (avant :
  ESPN live → odds_snapshot externe → Winamax dernier).
- **v31.7.85** Météo : `resolve_event_location` priorise `event.city +
  country` au lieu de géocoder le nom d'équipe. Fix les "Tarma →
  Ada", "Stockholm → Aiken", "Glasgow → Rangersdorf". Ajoute
  `weather.source` pour traçabilité (event_city / event_venue /
  static_team).
- **v31.7.86** VOID explicite des matchs RETIRED/WALKOVER/POSTPONED
  dans `evaluateModelPick` (frontend) et `resolve_outcome` (backend
  `backtest_v2.py`). Avant : ESPN met `winner=true` sur RETIRED/
  WALKOVER → le backtest les comptait comme wins/losses normaux,
  alors que les bookmakers Winamax les VOID (mise refundée).
- **v31.7.87** Helper `isWinamaxBookable(m)` qui exige `match_id +
  markets['1n2']`, pas juste `available === true`. Appliqué à
  Top picks, Locks, Calendrier 7j (paths actionnables). 268/601
  events de la data live étaient "tournament-only" sans cote
  bookable — l'user pouvait voir des picks non placeable chez
  Winamax. Page Tous reste plus permissive (exploration).
- **v31.7.88** Sync `location.hash` sur nav SPA via `replaceState`
  (avant : page changeait visuellement mais URL restait sur
  l'ancienne page → partage de lien / refresh / back-forward
  cassés). Pas de récursion avec hashchange handler.
- **v31.7.89** Modal anchor nav (sticky chips Synthèse / Signaux /
  Cotes / H2H / Stats avec scrollIntoView smooth) + badge source
  cote dans la card (`Winamax` / `externe` / `archive`) pour que
  l'user voit immédiatement la nature de la cote affichée +
  predictMatch ignore weather si `source` n'est pas dans la
  liste blanche (event_city / event_venue / static_team).
- **v31.7.90** Service worker dedup variants : helpers
  `pathEndsWith` + `networkFirst` factorisent les 4 blocs
  network-first identiques (data.js, data_today.json, manifest,
  odds_history.jsonl, health.json). +6 tests fixtures dans
  `tests/unit-helpers.spec.js` pour les helpers exposés sur
  `__testAPI` (isWinamaxBookable 10 cases, evaluateModelPick
  VOID 8 cases + branches, kellyFraction, getMatchOdds Winamax-
  prio).

## Architecture v31.7.7x (mise à jour 2026-04-27 — sweep visuel)

**Sweep audit visuel 2026-04-27 (suite)** :
- **v31.7.70** Bug UX critique reasons "X vs Y" ambigu fixé (LLLLL vs WWWDW)
- **v31.7.71** Trust-strip cachait sidebar gauche + chevauchait right rail (CSS var --trust-h)
- **v31.7.72** Bug compteur Locks 46 vs 6 incohérent (aligné sur le jour)
- **v31.7.73** Theme accent variants : 49 hex hardcodés migrés vers CSS vars
- **v31.7.74** "MAJ à l'instant" seuil 10min→2min + badge v24 stale
- **v31.7.75** Renommage "Aujourd'hui"→"🏠 Accueil" + 5 KPIs stats strip + hero empty state enrichi
- **v31.7.76** Page Alertes enrichie : 4 sources (locks imminents <30min, value bets ≥15pt, hot/cold streaks 3 picks)

## Architecture v31.7.x (mise à jour 2026-04-27 — gros sweep audit)

**Sweep audit complet 2026-04-27** : 26 commits du chantier audit + V2/V3.
Versions notables :
- **v31.7.42** A11y axe-clean + focus trap modal détail
- **v31.7.43** Link-in-text-block 6 pages éditoriales + .contrib-prompt
- **v31.7.44** RGPD email retiré + bug FAB cagnotte mobile fixé
- **v31.7.45** Modal Bienvenue→RGPD ordre cascade
- **v31.7.46** Modal détail forme L5 cohérence (bug fmtForm3)
- **v31.7.47** Copy review : "défaites" / "Voir cote" / pas d'emoji casino
- **v31.7.48** Sticky headers + tri client tableaux backtest
- **v31.7.49** save_data_js() atomique + retry HTTP 429/503
- **v31.7.50** Utility classes V0 (.info-banner, .kpi-tile)
- **v31.7.52** Colonne TIER complète backtest (mapping étendu)
- **v31.7.54** Profit calendar GitHub-style (heatmap 365j)
- **v31.7.55** Sparkline cumulative ROI tableaux best/worst
- **v31.7.56** PWA install prompt smarter (≥3 pages distinctes)
- **v31.7.57** Académie sport-aware (9 termes par sport)
- **v31.7.58** Comparateur 2 dates côte à côte (#compare)
- **v31.7.59** Discord webhook intégration (Profil)
- **v31.7.60** Pipeline tier 2 leagues (15 ligues vs 5)
- **v31.7.61** Theme variant lime/amber
- **v31.7.62** CLV moy. per-tier dans tableau backtest
- **v31.7.63** Full Bivariate Poisson MLE Dixon-Coles
- **v31.7.64** Visual regression Playwright snapshots
- **v31.7.65** Utility classes V2 (.lbl-tiny, .flex-row, .text-{xs..xl}, .card-base)
- **v31.7.66** Cleanup bind('tabs') orphelin
- **v31.7.67** Migration inline → utility (-41 occurrences)
- **v31.7.68** Prefetch pages éditoriales

## Architecture v31.7 (mise à jour 2026-04-26 nuit)

**Refonte IA navigation v31.5** : sidebar verticale gauche desktop ≥1100px
(6 hubs : Aujourd'hui solo, Pronos, Ma perf, Transparence, Apprendre, Compte),
mobile bottom nav 5 items (Accueil/Top/Locks/Bilan/Menu) + drawer hamburger.

**Ajouts récents v31.7.x** :
- 🎯 **Catégorie Montantes** (3 sous-pages : jour / weekend / semaine).
  Algo SÉQUENTIEL : étape N démarre après fin étape N-1 + buffer 30min.
  Calcul progressif des mises (10€ → cote × → étape suivante).
- 📊 **Modal détail enrichie** : section "Contexte du match" (cadre / forme /
  conditions) + synthèse rédigée "Pourquoi ce prono est fiable" + section
  "Chiffres clés" sport-aware (Clubelo + GF/GA foot, Elo surface tennis,
  Goalie+SV% NHL, Pitcher ERA MLB, points/forme NBA). Sur mobile ≤720px,
  sections collapsibles (premier ouvert, autres fermées).
- 🤖 Modèle Dixon-Coles 1997 (foot) : correction τ pour scores nuls bas
  (ρ = -0.13). Améliore calibration P(0-0), P(1-1), P(1-0), P(0-1).
- 🖼️ **OG images dédiées** 1200×630 PNG générées au cron par
  `scripts/build_og_images.py` (Pillow). 4 templates : og-default
  (hero+KPIs backtest), og-backtest, og-credibilite, og-methodologie.
- 📰 RSS feed narratif : description avec ligue + kickoff + value label
  (Solide / Équilibré / Outsider). ttl 5min cale sur cron.
- 🛠️ Service Worker pre-cache élargi : 5 pages statiques + 4 OG PNG.

**Coach IA flottant supprimé v31.7** (`.cb-fab` retiré, ~300 lignes en moins).

## Architecture v31 (post-audit ChatGPT 2026-04-26)

L'audit a recommandé de découper le HTML monolithique. Solution **hybride**
sans bundler : pages de contenu = HTML statiques séparés, dashboard = SPA.

```
┌────────────────────┐       cron 5 min       ┌──────────────────┐
│ .github/workflows/ │  ───────────────────▶  │   GitHub Pages   │
│   refresh.yml      │    commit *.html       │  (déploiement)   │
└─────────┬──────────┘                        └──────────────────┘
          │ exécute scripts/*.py
          ▼
   ┌─────────────────────┐    scrape 9 sources    ┌─────────────────────┐
   │ scripts/fetch_*.py  │  (ESPN, Sofascore,    │ data.js + sidecars  │
   │ scripts/patch_*.py  │  Winamax, ClubElo,    │ (JSON par domaine)  │
   │ scripts/build_*.py  │  Sackmann, FB-Data,   │                     │
   └──────────┬──────────┘  MLB, NHL, Open-Meteo)└──────────┬──────────┘
              │                                              │
              ▼                                              ▼
   ┌──────────────────────┐                    ┌──────────────────────┐
   │ Pages STATIQUES      │                    │ pronostics.html      │
   │  index.html (landing)│                    │  (SPA dynamique,     │
   │  legal.html          │                    │   ~16500 lignes)     │
   │  methodologie.html   │                    │  + sw.js (offline)   │
   │  academie.html       │                    └──────────────────────┘
   │  comment-lire-       │
   │      un-prono.html   │   build_*.py (Python) régénèrent à
   │  backtest.html ◄─────┼───── chaque tick depuis JSON :
   │  credibilite.html ◄──┤        backtest.html ← backtest_report_v2.json
   │  feed.xml ◄──────────┤        credibilite.html ← backtest_report_v2.json
   └──────────────────────┘        feed.xml ← data.js
```

**Convention "no build step" préservée** : pas de bundler, pas de npm,
pas de Astro. Les pages statiques sont du HTML hand-coded (~15-25 KB
chacune), régénérées par scripts Python à chaque cron tick.

En local : `python serveur.py` lance un HTTP server (port 8765), ouvre
`pronostics.html`, et démarre `auto_refresh.py` en arrière-plan pour
rejouer la pipeline GitHub Actions toutes les 60 s (cadences par script).

## Pages statiques v31

Hand-coded HTML, indexables sans JS, JSON-LD complet, CSP stricte.
Chacune sert un rôle SEO/éditorial distinct :

- **`index.html`** (~21 KB) — Landing page. Hero + 6 cards "comment ça
  marche" + 9 sources + "Ce site c'est quoi" + CTA dashboard. Indexée
  prioritaire (priority 1.0 sitemap). Canonical = `/`.
- **`legal.html`** (~15 KB) — À propos / mentions légales / politique
  de confidentialité / disclosure Winamax (aucune affiliation).
- **`methodologie.html`** (~18 KB) — Protocole formel : 9 sources,
  pipeline, dictionnaire des métriques (8 entrées), protocole de
  backtest, biais et limites. JSON-LD `TechArticle`.
- **`academie.html`** (~17 KB) — Glossaire complet, 22 termes en
  5 sections (cotes, valeur, mise, qualité, signaux). JSON-LD `Article`.
- **`comment-lire-un-prono.html`** (~17 KB) — Pédago débutants : maquette
  de carte annotée + tier explainer + erreurs classiques. JSON-LD
  `HowTo` (rich result éligible).
- **`backtest.html`** (~18 KB, **généré**) — KPIs + tables tier/sport/
  bucket/calibration/ligues. Régénéré à chaque cron tick par
  `scripts/build_backtest_page.py`. JSON-LD `Dataset`.
- **`credibilite.html`** (~17 KB, **généré**) — Diagramme calibration
  SVG + Brier + log-loss + tableau bins. Régénéré par
  `scripts/build_credibilite_page.py`. JSON-LD `TechArticle`.
- **`feed.xml`** (~13 KB, **généré**) — RSS 2.0 des top picks du jour
  (15 items, prob ≥ 55%). Régénéré par `scripts/build_feed.py`.
  Discoverable feed readers + Google News.

Hygiène moderne :
- `humans.txt` — credits + tech stack
- `.well-known/security.txt` — RFC 9116 disclosure policy
- `manifest.webmanifest` — PWA installable
- `robots.txt` + `sitemap.xml` (15 URLs prioritisées)

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

- **DASHBOARD = SPA séparée 3 fichiers** depuis v31.1 (audit perf) :
  - `pronostics.html` (~600 KB) — HTML shell + LITE data blob inline (écrit
    par finalize_inline.py) + petits boot scripts (theme loader, JSON-LD,
    enhancement module, FAB).
  - `app.css` (~100 KB) — toutes les styles. Cacheable agressivement.
  - `app.js` (~880 KB) — IIFE principale (predictMatch, renderXxxPage,
    _agentReplay, etc.). Loaded avec `defer`, exécution après parse +
    après lecture du LITE blob inline (l'ordre est respecté par defer).
  - Service worker en stale-while-revalidate pour app.css/app.js — cache
    instantané + refresh background. CACHE_VERSION bumpé à chaque deploy
    pour invalider proprement.
  - Toujours **pas de bundler, pas de npm**. Modifier app.css / app.js
    directement. Le split a été fait one-shot via `.cache/split_pronostics.py`
    (script jetable, plus utilisé). v31 : pages éditoriales (legal/methodologie/
    academie/comment-lire/backtest/credibilite) sont SORTIES en HTML statiques
    séparés pour le SEO.
- **`index.html`** = vraie landing page indexable depuis v31 (avant : redirect
  vers pronostics.html). Hero + value prop + cards explicatives + CTA dashboard.
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
- **`prompt()` / `confirm()` interdits** : ces APIs natives ne marchent
  pas en PWA installée (iOS Safari standalone), iframes sandbox, et
  certains browsers sécurisés. Toujours utiliser les modals custom :
  - `await window._showStakePrompt(suggested, label)` → string ou null
  - `await window._showConfirm({ title, body, confirmLabel, cancelLabel,
    danger })` → true ou false
  Ces modals sont async, ARIA-annotés, supportent Enter/Esc, body en
  HTML, et un fallback `confirm()` si jamais le helper n'est pas chargé.
- **Helper console** : `window.__diag()` print structure synthétique de
  l'état du site (data age, user prefs, sw status, calibration loaded,
  etc.). Utile pour debug rapide quand un user signale un problème.

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
- **`scripts/check_pipeline_drift.py`** (v31.4) — diff `auto_refresh.py`
  vs `refresh.yml`. Tourne en CI (e2e.yml `drift` job, ~5s) et bloque la
  merge si un script est dans une pipeline mais pas l'autre. Lancer en
  local : `python scripts/check_pipeline_drift.py`.
- **`scripts/build_og_images.py`** (v31.7.4) — génère 4 PNG 1200×630 :
  og-default (hero + KPIs backtest), og-backtest, og-credibilite,
  og-methodologie. Pillow requis (installé via refresh.yml). Skip
  gracieux si Pillow absent. Cadence 5 ticks (~25 min).

## Web Vitals (v31.4)

Tracker inline minimaliste dans `pronostics.html` (avant `app.js` defer).
Capture LCP / FCP / CLS / INP / TTFB via `PerformanceObserver`, persiste
les 50 dernières sessions dans `localStorage.paris_sportif_web_vitals_v1`.
**Aucun envoi réseau** (privacy-first).

Pour inspecter : ouvrir la console et `window.__webVitals()` → table des
20 dernières sessions. Utile pour mesurer l'impact d'un refacto avant/après
sans compte Sentry / GA.

## Zones fragiles connues

- **`renderDashboardPage`** : ~700 lignes, chiffon de dépendances ; les
  ajouts de features (pauseStatus, _dataIsStale, etc.) doivent déclarer
  leurs `const` tout en haut de la fonction pour éviter les TDZ.
- **Synchronisation `auto_refresh.py` ↔ `refresh.yml`** : toute nouvelle
  source ou patch doit être ajouté aux deux endroits (sinon dev local ≠ prod).
  Depuis v31.4 : `check_pipeline_drift.py` mécanise la règle (CI bloque
  la merge si drift).
- **`model_loader.py` lit `app.js`** depuis v31.1 (split). Si app.js
  absent, fallback `pronostics.html`. Si l'IIFE qui contient
  `window.predictMatch = predictMatch` est renommée/déplacée, le loader
  lèvera. `python scripts/model_loader.py` smoke-teste rapidement.
- **`backtest_baselines.py` vs `backtest_v2.py`** : `backtest_baselines.py` évalue des stratégies
  marché (fav/dog/draw/value), PAS `predictMatch` — ne pas l'utiliser pour
  juger la perf du modèle prod. `backtest_v2.py` appelle la vraie fonction
  `predictMatch` via `model_loader.py` (V8 embarqué, une seule source de
  vérité dans `app.js`). Cron hebdo dans `backtest.yml`, sortie
  `backtest_report_v2.{json,md}`.
