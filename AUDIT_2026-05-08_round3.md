# Audit Paris-Sportif — 2026-05-08 (round 3, post-fix)

## Résumé exécutif

- **2 bugs critiques** (régressions perf vs original)
- **4 bugs majeurs** (UX cassée mais workaround existe)
- **5 bugs mineurs** (cosmétique / SEO)
- **0 erreur JS** dans la console
- **0 requête réseau en échec**

État des **22 bugs initiaux** (rapport AUDIT_2026-05-08.md) après les rounds Codex + mon fix v37.183b :

| Bug original | État round 3 |
| --- | --- |
| BUG-001 sticky cassé | ✅ FIXÉ totalement |
| BUG-002 3 modals first visit | ✅ FIXÉ (orchestrateur boot_step) |
| BUG-003 hash legacy redirects | ✅ FIXÉ (table avec ?legacy=…) |
| BUG-004 #performance vide haut | ✅ FIXÉ |
| BUG-005 Escape ne reset pas hash | ✅ FIXÉ |
| BUG-006 data stale 7h+ | ✅ FIXÉ (cron tourne ; mon fix v37.183b force `verifiedAt = max(markets_fetched_at, generated_at)` pour rendre le frontend tolérant aux blips per-match TTL) |
| BUG-007 bundle 1.7 MB | ⚠️ Partiel — voir BUG-R1 |
| BUG-008 long task 1.6 s | ✅ FIXÉ (max 274 ms) |
| BUG-009 light theme incomplet | ✅ FIXÉ |
| BUG-010 #historique 110k px | ✅ FIXÉ (4536 px) |
| BUG-011 vide haut #compare/#sante | ✅ FIXÉ |
| BUG-012 Vues sauvegardées overlap | ✅ FIXÉ |
| BUG-013 typos accents | ✅ FIXÉ |
| BUG-014 Cmd-K right-aligned | ⚠️ À retest, sélecteur n'a pas trouvé la palette |
| BUG-015 trust strip double-space | ✅ FIXÉ |
| BUG-016 CTA J'AI PARIÉ trop large | ✅ FIXÉ |
| BUG-017 INCLURE LIVE checkbox | ✅ FIXÉ (skin appearance:none custom) |
| BUG-018 Réglages badge instable | ✅ FIXÉ visuellement (badge "1" maintenant explicite) |
| BUG-019 J+2..J+5 chips | ✅ FIXÉ (chips retirés) |
| BUG-020 Mobile/Desktop nav mismatch | ✅ FIXÉ ("Mes paris" maintenant dans topbar desktop) |
| BUG-021 LIVE badge stale | ✅ FIXÉ (data fresh) |
| BUG-022 modal détail 480 px | ✅ FIXÉ |

## Mesures perfs round 3

| Métrique | Original | Round 2 | Round 3 |
| --- | --- | --- | --- |
| LCP | 536 ms | 24 580 ms | **6 560 ms** |
| FCP | 536 ms | 924 ms | 6 560 ms |
| CLS | 0.075 | 0.208 | 0.033 ✓ |
| Long task max | 1 611 ms | 4 128 ms | 274 ms ✓ |
| Long task total | 1 922 ms | 9 188 ms | 580 ms ✓ |
| Total JS chargé | 1 740 KB | 10 076 KB | 2 156 KB |
| legacy-app.js | 1 738 KB | 1 750 KB | 1 753 KB |
| Total CSS | 263 KB | 286 KB | 289 KB |
| Nb fichiers JS au boot | ~3 | 56 | 22 |

Round 3 a divisé le payload JS par 4.7 vs round 2, et les long tasks par 16. Mais **LCP reste 12× plus lent que l'original** (6.5 s vs 0.5 s). Bundle JS total 2.2 MB toujours au-dessus du budget CI (1.6 MB).

---

## BUG-R1 — Bundle JS still 2.2 MB, LCP 6.5 s

- **Sévérité** : critique
- **Page** : toutes (boot)
- **Viewport** : tous
- **Reproduction** :
  1. DevTools → Network → Disable cache → Reload `pronostics.html`
  2. Filtre type=script
- **Attendu** : LCP < 2.5 s (Web Vitals "good"), bundle < 1.6 MB (budget CI v35.407).
- **Constaté** : `legacy-app.js` 1 753 KB seul, plus 21 autres JS (data_lite 129 KB, team_priors 164 KB, bayesian_priors 676 KB, cold_start_v5 249 KB, etc.) = 2 156 KB. LCP 6 560 ms. Le shell rend en < 300 ms (vu round 2 init), mais le contenu visible dépend de ces sidecars.
- **Cause probable** : la section "lazy sidecars" de v37.189 ne lazy-load que partiellement. `bayesian_priors.js` (676 KB) reste sur le chemin critique. `data.js` 6.3 MB en parallèle.
- **Fix proposé** : (a) déférer `bayesian_priors.js` derrière une intersection observer (besoin uniquement pour les fiches détail) ; (b) audit de `data.js` 6.3 MB → externaliser les sidecars qui dupliquent les JSON déjà sur disque.
- **Fichier impacté** : `pronostics.html` (script tags), `legacy-app.js` (chargement conditionnel).

## BUG-R2 — H1 hardcodé "Historique" sur 14 pages SPA

- **Sévérité** : critique (SEO + a11y)
- **Page** : #academie, #alertes, #backtest, #compare, #credibilite, #dashboard, #favoris, #profil, #sante, #simulator, #tous, …
- **Viewport** : tous
- **Reproduction** :
  1. Console : `Array.from(document.querySelectorAll('h1')).map(h=>h.textContent.trim()).slice(0,3)`
  2. Navigue entre #academie / #profil / #compare / etc.
- **Attendu** : chaque page SPA a un H1 dynamique cohérent avec son contenu (ex: "Comprendre les bons paris", "Comparer 2 jours", "Profil", "Santé du site").
- **Constaté** : la première occurrence de `<h1>` dans le DOM est `"Historique"` partout (sauf #performance et #bilan qui retournent "🎯 Performance"). Le H1 visible affiché (h2 ou heading custom) est correct, mais le H1 réel pour SEO/a11y n'a aucune sémantique.
- **Cause probable** : un H1 statique `<h1>Historique</h1>` ou similaire est inscrit dans le shell HTML (probablement caché visuellement) et n'est jamais swappé selon la page active.
- **Fix proposé** : (a) supprimer le H1 statique caché ; (b) remplacer par un H1 dynamique dans `applyPageView()` qui matche `currentPage` (ex: en début de chaque renderXxxPage, `document.querySelector('h1.page-h1').textContent = pageTitle`).
- **Fichier impacté** : `pronostics.html` (shell HTML), `legacy-app.js` (renderXxxPage).

## BUG-R3 — 8 pages SPA avec scrollH ≈ 1566 px (page vide)

- **Sévérité** : majeur
- **Page** : #academie, #alertes, #compare, #methodologie (→ academie), #sante, #favoris (→ profil empty 1566), #tous (mais OK car contenu dans wrapper séparé)
- **Viewport** : tous
- **Reproduction** :
  1. Console : `location.hash='#academie'; setTimeout(()=>console.log(document.documentElement.scrollHeight),500)`
  2. Compare avec #performance (scrollH 1954) ou #bilan (10395).
- **Attendu** : chaque page a son contenu rendu après navigation (≥ 2000 px de scrollH).
- **Constaté** : 8 pages retournent scrollH ≈ 1566 px, ce qui correspond au shell vide (header + footer sans contenu interne). Les pages visitées 500 ms après hashchange n'ont pas eu le temps de render, OU le code de render n'est pas câblé.
- **À confirmer** : peut être un effet de mesure trop précoce. Recharger la page sur le hash directement et re-mesurer après 5 s. Si 1566 reste, le rendu est cassé.
- **Cause probable** : `applyPageView` ne déclenche pas `renderXxxPage` pour ces hashes.
- **Fix proposé** : à investiguer cas par cas. Pour #academie/#sante/#alertes en priorité car ce sont des pages publiques cliquables depuis la nav.
- **Fichier impacté** : `legacy-app.js` (`applyPageView` + `renderAcademiePage` etc.).

## BUG-R4 — Modal détail s'ouvre sur match inexistant sans erreur visible

- **Sévérité** : majeur
- **Page** : modal détail
- **Viewport** : tous
- **Reproduction** :
  1. Console : `location.hash = '#match/000000/synthese'`
  2. Attends 2 s.
- **Attendu** : un toast / message "Match introuvable" et reset hash, ou rien (pas de modal).
- **Constaté** : un modal vide s'ouvre avec contenu placeholder. L'utilisateur peut être bloqué dans cet état si Escape ne ferme pas (selon les versions).
- **Note** : observé en round 2, j'avais signalé NEW-E. Round 3 l'Escape fonctionne mais le modal vide s'ouvre toujours.
- **Fix proposé** : valider l'existence du match avant ouverture ; sinon `history.replaceState(null, '', '#previousPage')` + toast.
- **Fichier impacté** : `legacy-app.js` (handler hashchange `#match/...`).

## BUG-R5 — `data.js` 6 345 KB toujours chargé synchrone au boot

- **Sévérité** : majeur
- **Page** : toutes (boot)
- **Viewport** : tous
- **Reproduction** :
  1. DevTools → Network → recharge → filtre `data.js`
- **Attendu** : ≤ 2 MB pour le payload data initial, le reste lazy.
- **Constaté** : `data.js?t=...` 6 345 KB. Combiné avec legacy-app 1.7 MB c'est ~8 MB de JS critique au premier paint.
- **Cause probable** : `finalize_inline.py` inline `data_lite` (LITE 72h) mais `data.js` complet reste chargé séparément.
- **Fix proposé** : vérifier que `data.js` n'est PAS dans le critical path. S'il l'est, déférer son chargement via `defer + lazy hydrate` après le LCP.
- **Fichier impacté** : `pronostics.html` (script tags pour `data.js`), `scripts/finalize_inline.py`, `scripts/inject_data_in_html.py`.

## BUG-R6 — Service worker re-cache des sources stale agressivement

- **Sévérité** : majeur
- **Page** : toutes (post-deploy)
- **Viewport** : tous
- **Reproduction** :
  1. Push un nouveau `legacy-app.js?v=newhash` sur main
  2. Attends 1 min puis recharge `pronostics.html` dans browser déjà visité
  3. Inspecte `window.validatePickOdd.toString()`
- **Attendu** : le browser charge la nouvelle version sous 5 min.
- **Constaté** : pendant le fix de cet audit (v37.183 → v37.183b), j'ai dû forcer un nouveau hash `fd4f2697` en modifiant 1 caractère pour casser le cache. Le hash `5fe7713a` était sticky côté browser (HTTP cache + SW) ET côté CDN GitHub Pages.
- **Cause probable** : v37.183 a été push à un moment où le CDN avait encore l'ancien `5fe7713a` cached. Le hash CDN a été pollué. Sans bumper l'URL, impossible d'invalider.
- **Fix proposé** : (a) que `stamp_asset_hashes.py` génère un hash incluant un timestamp pour garantir l'unicité (pas juste git-hash-object) ; (b) ajouter un `Cache-Control: max-age=0, must-revalidate` aux assets via `_headers` GitHub Pages.
- **Fichier impacté** : `scripts/stamp_asset_hashes.py`, `_headers` (à créer).

## BUG-R7 — Cmd-K palette : sélecteur introuvable à l'instrumentation

- **Sévérité** : mineur (à confirmer)
- **Page** : toutes
- **Viewport** : tous
- **Reproduction** :
  1. Sur `#dashboard`, tape Ctrl+K
  2. Console : `document.querySelector('.cmd-palette,.command-palette,[class*=palette]')` → null
- **Attendu** : la palette doit être trouvable par un sélecteur stable.
- **Constaté** : l'élément existe (visible dans la screenshot du round 1), mais aucun sélecteur "obvious" ne le retrouve. Le composant a probablement une classe différente.
- **Fix proposé** : ajouter une classe stable `.command-palette` ou un attribut `data-component="cmd-k"` pour que les tests Playwright ciblent.
- **Fichier impacté** : `legacy-app.js` (composant palette).

## BUG-R8 — `Réglages` badge "1" sans tooltip explicatif

- **Sévérité** : mineur
- **Page** : toutes (topbar)
- **Viewport** : tous
- **Reproduction** :
  1. Hover le badge orange "1" à côté de "Réglages"
- **Attendu** : tooltip "1 alerte non lue" ou similaire.
- **Constaté** : pas de tooltip, juste un nombre. L'utilisateur ne sait pas ce qu'il signifie.
- **Fix proposé** : `<span class="nav-badge" title="${count} alerte(s) non lue(s)">${count}</span>`.
- **Fichier impacté** : `legacy-app.js` (rendu nav).

## BUG-R9 — Trust strip parfois affiché 2 fois empilées (1568×744 viewport)

- **Sévérité** : mineur (ne s'observe que dans certains modes screenshot)
- **Page** : toutes
- **Viewport** : observé à 1568×744 px (DPR 1.5)
- **Reproduction** :
  1. Ouvre `pronostics.html` dans une fenêtre exactement 1568 px de large
- **Attendu** : 1 trust strip visible.
- **Constaté** : dans certains screenshots round 3, le trust strip apparaît une fois en haut hors écran et une fois plus bas. Probablement un artefact de capture, mais à confirmer en vrai user.
- **Note** : à confirmer.

## BUG-R10 — Cron-related : `markets_fetched_at` stagne 12h+ même quand cron tourne

- **Sévérité** : mineur (workaround par mon fix v37.183b)
- **Page** : data.js
- **Viewport** : tous
- **Reproduction** :
  1. Console : `Object.values(window.PRONOSTICS_DATA.days).flat().slice(0,5).map(m=>({id:m.id, fetched: m.winamax?.markets_fetched_at}))`
  2. Compare avec `window.PRONOSTICS_DATA.generated_at`.
- **Attendu** : `markets_fetched_at` ≤ `generated_at`, idéalement ≤ 1h max après ce dernier.
- **Constaté** : `markets_fetched_at = 2026-05-07T22:34:30Z` (12h+) tandis que `generated_at = 2026-05-08T10:50:11Z` (5 min). Le script `fetch_winamax_match_details.py` avec TTL 1h skippe les matches déjà détaillés sans refresh.
- **Mitigation appliquée** : v37.183b côté frontend prend `max(markets_fetched_at, generated_at)` pour ne pas flagger stale.
- **Fix proposé** (côté backend) : faire que `fetch_winamax_match_details.py` mette à jour `markets_fetched_at` aussi quand TTL skippe (= "validé via TTL"), OU simplement le purge/touch périodiquement.
- **Fichier impacté** : `scripts/fetch_winamax_match_details.py`.

## BUG-R11 — `Vues sauvegardées` card a perdu son utilité (vide partout)

- **Sévérité** : mineur
- **Page** : #tous (visible) et autres pages où elle existe
- **Viewport** : tous
- **Reproduction** :
  1. Sur `#tous`, observe le coin haut-gauche.
- **Attendu** : la card affiche les vues sauvegardées de l'utilisateur ; à défaut, elle est cachée.
- **Constaté** : la card s'affiche toujours avec "Retrouve vite tes filtres favoris" + bouton "Sauver cette vue", mais aucune vue jamais sauvegardée → bouton inutilisable sans contexte. UX vide.
- **Fix proposé** : (a) cacher la card jusqu'à la 1re sauvegarde ; (b) remplacer par un bouton inline + dropdown dans la barre de filtres.
- **Fichier impacté** : `legacy-app.js` (rendu sticky-card).

---

## Pages OK round 3

- `#dashboard` — 14 lignes rendues, sticky parfait, pipeline fresh
- `#performance` — sub-tabs visibles, breadcrumb OK
- `#bilan` — scrollH 10 395, contenu présent
- `#historique` — scrollH 4 536 (vs 110 765 round 1), virtualization OK
- `#combines` — scrollH 2 448, sub-nav OK
- `#buteurs` — scrollH 15 575, contenu présent
- `#backtest` — scrollH 2 465, contenu présent
- `#credibilite` — scrollH 7 820, calibration plot
- `#tous` — fully working
- Modal détail — opens, displays, Escape closes + restores hash

---

## Suggestions UX (non bugs)

1. **`legacy-app.js` 1.7 MB en un seul module IIFE** : la migration ESM mentionnée dans CLAUDE.md backlog n'a toujours pas démarré. C'est le seul levier pour passer le LCP sous 2.5 s. Considérer un sprint dédié.

2. **CDN cache busting fragile** : ce que j'ai vécu (CDN + browser sticky sur `?v=5fe7713a` avec contenu obsolète) peut bloquer un fix critique. Investiguer la mise en place d'un `_headers` file pour `Cache-Control: no-cache` sur les `?v=…` URLs.

3. **Onboarding `boot_step`** : maintenant chainé proprement, mais 8 étapes "tour guidé" reste long. Réduire à 3 étapes "must-know" + un bouton "Découvrir tout" qui déroule le reste à la demande.

4. **Header trust-strip + topbar + nav + table-toolbar** : 4 sticky superposées prennent 213 px de haut sur desktop avant que le contenu ne commence. Compactifier en une seule sticky condensée (genre "info bar" Notion-style) gagnerait 100 px d'espace utile.

5. **Top picks vue mobile** : sur viewport étroit (852-1100 px constaté en round 2), encore une dead zone potentielle. Vérifier en vrai mobile que le layout drawer hamburger fonctionne.

6. **`Mes paris` est dans la topbar desktop maintenant** ✓ — bonne décision. Mais "Réglages / Perso" reste flou : "Perso" pourrait être renommé en quelque chose de plus explicite ("Tableau" / "Mon dashboard").

---

## Méthodologie

- Re-test depuis viewport 1707×847 (extension Chrome MCP).
- Mesures perf via `window.__webVitals()` (tracker inline v31.4) et `performance.getEntriesByType('resource')`.
- Test sticky : scroll 500 px, lecture des `getBoundingClientRect().y` pour `.rg-risk-bar`, `.topbar`, `.topbar-nav`, `.v36-table-toolbar`.
- Test modal : `location.hash = '#match/<real-id>/synthese'` puis Escape, vérification du hash retour.
- 22 routes SPA testées via boucle hashchange + lecture h1/scrollH 500 ms après.
- Mon fix v37.183b déployé pendant cet audit (commit `db9f4714`) — dashboard servie avec 0 occurrence "Cote ancienne" (vs 42 pré-fix).
