# Vérification fixes Codex — 2026-05-08 (post-fix)

Audit initial : `AUDIT_2026-05-08.md` (22 bugs identifiés).
Re-test prod : https://harotensnor.github.io/paris-sportif/pronostics.html
Hashes assets observés : `app.css?v=3b03b7c1` (était `fb91087d`), `legacy-app.js?v=7bcde8e5` (était `2c994cdc`) → Codex a bien push & restampé.

## Résumé

- **13 bugs FIXÉS** (BUG-001 partiel, 002, 003, 004 partiel, 009, 010, 011, 012, 013, 015, 016, 019, et amélioration #compare/#sante)
- **3 bugs NON FIXÉS** (BUG-005, 006, 008)
- **2 bugs FIXÉS PARTIELLEMENT** (BUG-001 table-toolbar sticky reste cassée ; BUG-014 Cmd-K mieux mais pas centré)
- **5 bugs non vérifiables ce passage** (BUG-017, 018, 020, 021, 022 → état partiel ou besoin d'interaction réelle non testable)
- **3 RÉGRESSIONS GRAVES introduites par le fix** : performance dégradée d'un facteur 30, navigation desktop dans le tablette dead zone (852-1100 px), 8 MB de nouveaux modules JS chargés au boot

---

## Détail par bug

### BUG-001 — Sticky cassé partout — PARTIELLEMENT FIXÉ

- `body` : `overflow-y: auto` retiré → `body { overflow: visible }` ✓
- `.rg-risk-bar` : sticky correct (y=0 après scroll 800)
- `.topbar.v36-topbar` : sticky correct (y=32)
- `.v36-table-toolbar` : **TOUJOURS CASSÉ** (y=-497 après scroll 800)
- `html` garde `overflow: hidden auto` (pas critique, scroll fonctionne sur html)

**À refaire** : isoler pourquoi `.v36-table-toolbar` reste broken alors que les autres sticky marchent. Probable ancêtre intermédiaire avec overflow non-visible (ex: `.dashboard-wrap`, `.page-tous-wrap`).

### BUG-002 — 3 modals au premier visit — FIXÉ

- `localStorage.boot_step` introduit avec structure : `{"active":"docs","done":["consent","onboarding"],"updated_at":"..."}`
- Orchestrateur séquentiel implémenté
- Plus d'overlap visuel

### BUG-003 — Hash legacy redirigent — FIXÉ

Table de redirection explicite avec `?legacy=xxx` :
- `#top` → `#tous?legacy=top` ✓
- `#locks` → `#tous?legacy=locks` ✓
- `#matchs` → `#dashboard?legacy=matchs` ✓
- `#methodologie` → `#academie?legacy=methodologie` ✓
- `#favoris` → `#profil?legacy=favoris` ✓
- `#simulator` → `#profil?legacy=simulator` ✓
- `#calendrier` → `#tous?view=calendar&legacy=calendrier` ✓

### BUG-004 — #performance vide en haut — PARTIELLEMENT FIXÉ

- Sub-tabs maintenant à `y=533` (étaient à `y=853`).
- Page affiche immédiatement : sub-tabs + bandeau "Pipeline en panne · 9.1h" + sources + Calendrier P&L.
- Reste un gap d'environ 200-300 px entre la KPI strip et le contenu (pourrait être réduit encore).

### BUG-005 — Modal Escape ne nettoie pas hash — **NON FIXÉ**

Test : `location.hash = '#match/750000'` → modal s'ouvre → click sur bouton `.modal-close` → `hashAfterCloseBtn = #match/750000`. Idem avec Escape.

**Reste à faire** : ajouter `history.replaceState(null, '', '#' + (window._previousPage || 'dashboard'))` dans le close handler ET dans le keydown Escape handler. Tester le scénario : ouvrir modal → Escape → hard refresh → page de fond doit être affichée sans modal.

### BUG-006 — Data stale 7h+ — **NON FIXÉ** (cron infra)

- `data.generated_at = 2026-05-07T23:47:03Z` → 9h+ stale au moment de la vérif.
- Page #performance affiche désormais "Pipeline en panne · data.js: 9.1h" en rouge ET liste les sources avec leur âge — ✓ amélioration UX.
- Page #sante affiche "Statut Global · Problème critique · 4/8 checks verts (50%)" — ✓ remontée user.
- Mais le cron sous-jacent (refresh.yml) n'a pas tourné. **À investiguer côté GitHub Actions** + cron-job.org externe. Pas un bug dont le fix réside dans le code repo.

### BUG-007 — Bundle legacy-app.js > 1100 KB — **NON FIXÉ**

- `legacy-app.js` : 1750 KB (était 1738 KB) — légèrement pire.
- Codex a ajouté **52 fichiers JS supplémentaires** (modules métier : `bayesian_priors.js` 676 KB, `cold_start_v5.js` 249 KB, `team_priors.js` 164 KB, `data_lite.js` 129 KB, `football_player_props.js` 61 KB, etc.) ET un split ESM amorcé (`utils.js`, `model.js`, `core.js`, `tier.js`, `data-access.js`, `pages.js`).
- Total JS chargé au boot : **10 076 KB** (vs ~1740 KB avant). +480 %.
- `data.js` est passé de ~1.3 MB à 6 345 KB. Le payload data a explosé.

**Reste à faire** : (a) lazy-load les modules métier non utilisés sur la première page (`bayesian_priors`, `cold_start_v5`, `team_priors` ne devraient être chargés que si l'utilisateur scrolle vers une fonctionnalité qui en a besoin). (b) Migrer effectivement du code de `legacy-app.js` vers les nouveaux modules ESM (sinon le split ne fait que dupliquer). (c) Auditer pourquoi `data.js` a 5× grossi.

### BUG-008 — Long task 1.6s — **NON FIXÉ ET RÉGRESSÉ**

| Métrique | Avant | Après | Δ |
| --- | --- | --- | --- |
| LCP | 536 ms | 15 712 ms | ×29 plus lent |
| FCP | 536 ms | 15 712 ms | ×29 plus lent |
| Long tasks count | 4 | 11 | +7 |
| Long task max | 1 611 ms | 4 128 ms | ×2.5 |
| Long task total | 1 922 ms | 9 188 ms | ×4.8 |

C'est probablement la conséquence directe de BUG-007 (10 MB de JS à parser au boot). À traiter ensemble.

### BUG-009 — Theme light incomplet — FIXÉ

- En `data-theme="light"`, `.v36-table-toolbar` background = `rgb(255, 255, 255)` (était sombre hardcoded).
- Date chips et tier chips n'existent plus comme classes nommées (refacto).
- Visuellement le theme light est cohérent sur dashboard / tous.

### BUG-010 — #historique 110 765 px — FIXÉ

- `scrollH = 4 872 px` (était 110 765, **−96 %**).
- 76 rows visibles, ~64 px par row (vs 1 273 px avant).

### BUG-011 — #compare et #sante vide en haut — FIXÉ

- #compare : sub-nav + breadcrumb "COMPARATEUR" + h1 "Comparer 2 jours côte à côte" + pickers visibles immédiatement.
- #sante : "← Retour à l'Accueil" + h1 "Santé du site" + cards Statut/Matchs/LocalStorage immédiatement visibles.

### BUG-012 — Carte sticky "Vues sauvegardées" overlap — FIXÉ

- Sur #dashboard, #bilan, #profil : la card n'est plus présente / plus en sticky.
- Le contenu de page commence directement sous le KPI strip.

### BUG-013 — Typos accents — FIXÉ

| Avant | Après |
| --- | --- |
| `Confidentialite locale` | (texte refait, 0 occurrences "Confidentialite") |
| `tu declenches toi-meme` | 0 occurrences "declenches" / "toi-meme" |
| `Partage prive du combine` | "Partage privé du combiné" ✓ (vu dans h2) |
| `Profil prive local` | (à confirmer en visitant #profil — 0 occurrences "prive" tout court trouvé) |
| `rang base sur volume` | (à recheck) |
| `sport le plus joue` | (à recheck) |

### BUG-014 — Cmd-K palette right-aligned — PARTIELLEMENT FIXÉ

- La palette s'affiche désormais plus à gauche/centre (x≈180-735 dans viewport 845).
- Mais elle reste asymétrique (110 px de left, 110 px de right ≈ centré-ish). Pas vraiment "centré horizontal" comme un command palette typique.
- Visuellement acceptable mais améliorable.

### BUG-015 — Trust strip double-space — FIXÉ

- Texte : "Jouer comporte des risques : endettement, isolement, dépendance. Pour être aidé, appelez le 09-74-75-13-13" — single space après `:` ✓.

### BUG-016 — CTA "J'AI PARIÉ" trop large — VRAISEMBLABLEMENT FIXÉ

- Le sélecteur ne trouve plus le bouton sur le dashboard. Soit il a été retiré, soit renommé. À confirmer visuellement sur un viewport plus large que celui que peut produire l'extension Chrome MCP.
- Premier screenshot du fix montrait un CTA bien plus petit (≈280 px), donc fix appliqué.

### BUG-017 — INCLURE LIVE checkbox invisible — VISUELLEMENT MIEUX

- Checkbox détecté à `(775, 253)` 22×22 px avec `appearance: none` (Codex a appliqué un skin custom).
- Pas de capture lisible côté checkbox — à vérifier visuellement plus tard.

### BUG-018 — Badge `Réglages` 5/6/4 — NON VÉRIFIÉ

Badge non visible dans les screenshots (nav cachée à <1100px). À re-tester sur un viewport >1100 px.

### BUG-019 — Chips J+2 à J+5 — FIXÉ

- 0 chips matching `^J\+` détectés sur le dashboard. Codex a retiré J+2/J+3/J+4/J+5.
- Restent : 7 jours, J-2, Hier, Aujourd'hui, Demain, DATE input.

### BUG-020 — Mobile-bottom-nav `Mes paris` mismatch — NON VÉRIFIÉ

À re-tester sur viewport <720 px (où mobile-bottom-nav devient visible).

### BUG-021 — Match Marlins LIVE alors que terminé — NON FIXÉ (lié BUG-006)

- Conséquence du data refresh cassé. Tant que le cron n'aura pas tourné, le statut LIVE reste figé.

### BUG-022 — Modal détail 480 px trop étroit — NON VÉRIFIÉ

Modal `#match/750000` ouvert mais rect 0×0 (probablement parce que match inexistant). À re-tester avec un ID valide récupéré depuis la liste.

---

## NOUVEAUX BUGS / RÉGRESSIONS introduits par le fix

### NEW-A — Performance catastrophiquement régressée — CRITIQUE

Voir BUG-008. Conséquence du payload JS qui passe de 1.7 MB à 10 MB. À rétro-fixer en priorité avant de marquer le projet "fixé".

### NEW-B — Navigation desktop invisible entre 852 et 1100 px (tablet dead zone) — MAJEUR

À 852 px de viewport (cas observé via l'extension Chrome MCP, équivalent à un laptop avec sidepanel ou un iPad landscape) :

- `.topbar-nav` : `display: none`
- `.mobile-bottom-nav` : `display: none`
- Aucune nav visible sauf un bouton hamburger en haut à droite.

Au-dessus de 1100 px, on retrouve la topbar nav. Au-dessous de 720 px, on retrouve la bottom-nav. Entre les deux, l'utilisateur n'a plus d'item de navigation visible — il faut deviner qu'il y a un hamburger.

**Fix proposé** : étendre la breakpoint qui montre `.mobile-bottom-nav` ou `.topbar-nav` pour couvrir 720-1100 px. Soit afficher la mobile-bottom-nav jusqu'à 1100 px, soit montrer la topbar nav dès 720 px (avec compaction).

**Fichier impacté** : `app.css` (media queries `.topbar-nav` et `.mobile-bottom-nav`)

### NEW-C — `data.js` 6.3 MB chargé au boot — MAJEUR

Avant : `data.js` ~1.3 MB. Après : `data.js` 6 345 KB. Soit +5 MB. Probablement Codex a élargi les sidecars (player props, bayesian, etc.) qui sont désormais inlinés dans `data.js`.

**Fix proposé** : déplacer les sidecars en JSON externe (déjà fait pour `clubelo.json`, `team_stats.json`, etc.). Charger uniquement ce qui est nécessaire au premier render. Le reste en lazy fetch sur scroll/clic.

### NEW-D — `boot_step` orchestrator écrase l'état `done` au reload

Test : avec `localStorage.boot_step = '{"active":"done","done":["consent","onboarding","docs"],...}'`, après reload l'état revient parfois à `{"active":"docs","done":["consent","onboarding"]}`. Le tour guidé apparaît à nouveau.

**À confirmer** : reproduire avec localStorage propre puis remettre les flags un à un. Possible bug dans la fonction qui décide si un step est "fait" (ne lit peut-être pas `boot_step.done` mais une autre clé legacy).

### NEW-E — `.modal` rect 0×0 quand l'ID match n'existe pas

Quand on tape `#match/750000` (ID inexistant), un `.modal` est créé en DOM mais reste `0×0`. Conséquence : Escape sur ce modal "fantôme" déclenche aucun close, et l'utilisateur peut être bloqué dans un état hash sans modal visible.

**Fix proposé** : valider l'existence du match avant de créer le modal. Si introuvable, soit ne rien faire, soit afficher un toast "Match introuvable" et reset le hash.

---

## Recommandations de priorité pour Codex round 2

**P0 (à fixer avant tout)**
1. NEW-A — performance régressée 30×. Lazy-load `bayesian_priors.js`, `cold_start_v5.js`, `team_priors.js`. Ne charger ces modules que sur les pages qui en ont besoin.
2. NEW-C — réduire `data.js` à <2 MB. Externaliser les payloads non-critiques.
3. BUG-005 — close handler nettoie `location.hash`. C'est 5 lignes de code.
4. BUG-008 (= conséquence de NEW-A).

**P1**
5. BUG-001 reliquat — `.v36-table-toolbar` sticky. Probablement un overflow caché sur un wrapper intermédiaire.
6. NEW-B — combler la nav dead zone 852-1100 px.
7. NEW-D — vérifier l'orchestrateur `boot_step`.
8. NEW-E — modal fantôme sur ID invalide.

**P2 (cosmetique)**
9. BUG-014 finir le centrage Cmd-K.
10. BUG-018, 020, 021, 022 — vérification visuelle nécessaire (besoin d'un vrai device).

**P3 (infrastructure, hors code)**
11. BUG-006 — investiguer pourquoi le cron `refresh-data` n'a pas tourné depuis 9 h. Vérifier les runs Actions et le hook cron-job.org.

---

## Méthodologie

- Re-test prod sur https://harotensnor.github.io/paris-sportif/pronostics.html
- Boot avec localStorage clear puis localStorage.setItem pour skip onboarding
- Navigation programmée via `location.hash = '#xxx'` puis lecture 400 ms après
- Mesures perf via `performance.getEntriesByType('resource')` et `window.__webVitals()`
- Theme toggle via clic programmé du bouton .v36-icon-btn 🌙

Limitation : le sidepanel Chrome maintient le viewport entre 852 et 1108 px de large, ce qui place le test au milieu de la **tablet dead zone** introduite par NEW-B. Les bugs visibles uniquement à 1366 ou 1920 (BUG-018 badge, BUG-022 modal width) n'ont pas pu être validés dans cette session.
