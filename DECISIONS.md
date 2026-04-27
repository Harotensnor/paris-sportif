# Architecture Decision Records (ADR)

Décisions structurantes documentées pour future-toi (ou un nouveau
contributeur). Chaque ADR : contexte, options, décision, conséquences.

---

## ADR-001 : `winamax.match_id` requis pour les recos actionnables

**Date** : 2026-04-27 (audit Codex Sprint 1)

**Contexte** : `winamax.available === true` peut signifier 3 choses :
1. Match exact + cote 1N2 dispo chez Winamax
2. Tournoi/league listé chez Winamax mais match précis pas trouvé
3. Fallback statique sur la page sport

Filter `m.winamax.available === true` mélangeait les 3 cas. 268/601
events live (45%) étaient cas 2 ou 3 → user voyait des picks qu'il
ne pouvait pas placer chez Winamax.

**Décision** : Helper `isWinamaxBookable(m)` qui exige :
- `winamax.available === true`
- `winamax.match_id` non null
- `winamax.markets['1n2']` avec `home > 1` ou `away > 1`

Appliqué aux paths actionnables : Top picks, Locks, Calendrier 7j,
Buteurs, Combinés, Montantes. Page Tous reste plus permissive
(exploration).

**Conséquences** :
- 45% des events sont filtrés des actionnables → liste plus courte
- 100% de ce qui est affiché est vraiment placeable chez Winamax
- Promesse "Winamax-only" tient pour de bon

---

## ADR-002 : Wilson + Bootstrap CI plutôt que normal-approx

**Date** : 2026-04-27 (audit Codex Sprint 5 #21)

**Contexte** : Afficher "WR 65%" sec masque l'incertitude. Avec n=18
picks tennis, l'IC95 normal-approximation peut sortir [50%, 78%] —
information critique pour l'user.

Options :
1. Normal-approximation : `p ± 1.96 * sqrt(p(1-p)/n)`. Mauvais pour
   petits n ou p proche 0/1.
2. Wilson score interval : plus stable, formule fermée.
3. Bootstrap : resample empirique, distribution-free.
4. Beta-binomial conjugate : Bayesian, demande un prior arbitraire.

**Décision** :
- WR : Wilson 95% (formule fermée, stable petits n)
- ROI : Bootstrap 95% (1000 resamples, seed=42 deterministic)

**Conséquences** :
- Reproducibilité : seed fixe → mêmes IC sur le même dataset
- Pas de scipy nécessaire (stdlib only)
- Légèrement plus coûteux que normal-approx (négligeable)
- IC affichés à côté des metrics dans modal détail + page Crédibilité

---

## ADR-003 : Clé composite `lc:tid` dans team_stats.json

**Date** : 2026-04-27 (audit Codex Sprint 1 #1)

**Contexte** : ESPN réutilise `team_id` entre sports. Exemple : `tid=20`
était à la fois Boston Celtics (NBA) et Unión Santa Fe (Argentine
soccer). L'ancienne dedup `if tid in seen` faisait passer le PREMIER
sport rencontré, écrasant les autres. patch_team_stats.py appliquait
ensuite la stat à toute compétiteur partageant ce tid → contamination
NBA→foot avec `avg_gf5=100, last5 vs Lakers 91-123`.

**Décision** :
- fetch_team_stats.py : key = `f"{league_code}:{team_id}"`
- patch_team_stats.py : reconstruit la même key, lookup composite
  d'abord, fallback v1 (tid seul) pour compat le temps que le cron
  rebuilde
- Garde-fou défensif : si foot avec `avg_gf5/ga5 > 5` → skip
- Cleanup proactif : purge les form_stats déjà contaminés dans data.js
- schema_version: 2 dans team_stats.json

**Conséquences** :
- 0 contamination cross-sport dans la version actuelle
- Backward-compat fallback supporte les anciens caches
- Les events foot ont enfin des stats foot

---

## ADR-004 : Pas de bundler / pas de TypeScript

**Date** : 2026 (convention initiale)

**Contexte** : Tentation récurrente d'introduire un build step (vite,
rollup, webpack) pour split app.js, ajouter TypeScript, etc.

**Décision** : Garder le site 100% sans build step.

**Pourquoi** :
- Site personnel — pas d'équipe → pas de gain à compiler
- GitHub Pages dépose les fichiers tels quels — pas besoin d'un step
  intermédiaire
- Debug en prod : code lisible directement dans DevTools, pas de
  source maps à gérer
- Contributions occasionnelles : pas besoin d'apprendre une toolchain
- Économie de complexité : un bug en moins par couche de tooling

**Quand reconsidérer** :
- Si app.js dépasse 1.5 MB chargé sur 4G mobile
- Si une équipe se forme (>2 contributeurs réguliers)
- Si TypeScript apporte un gain démontrable (refacto modèle V2 ?)

**Conséquences acceptées** :
- app.js IIFE monolithique → split en modules ESM possible un jour
- Pas de tree-shaking → toutes les fonctions chargées même si unused
- TypeScript via JSDoc (tsserver mode `--checkJs`) si besoin

---

## ADR-005 : Service Worker stale-while-revalidate pour app.js/css

**Date** : 2026-04-26 (post-audit ChatGPT v31)

**Contexte** : Décision entre 3 stratégies pour app.js (1 MB) :
1. Network-first : 100% fresh, mais 1 round-trip à chaque visite
2. Cache-first : instant load, mais up-to-1 visite de retard
3. Stale-while-revalidate : instant cache + refresh background

**Décision** : Stale-while-revalidate avec `CACHE_VERSION` stamp à
chaque deploy.

**Pourquoi** :
- app.js change rarement (vs data.js qui change toutes les 5 min)
- Le stamp invalide le cache à chaque vrai changement de code → la
  visite suivante un commit charge le nouveau code
- Instant render = bonne UX
- Background refresh = données fraîches quand même

**Conséquences** :
- Trade-off : la 1ère visite après un deploy charge l'ancienne version
  (mais avec refresh en background → 2e visite = nouveau code)
- Le stamp doit être robuste (auto-injecté par refresh.yml step
  "Stamp sw.js")

---

## ADR-006 : Hash `#match/<id>/<tab>` plutôt que `?match=<id>`

**Date** : 2026-04-27 (Sprint 2 #10)

**Contexte** : Deep linking modal détail. Options :
1. Query param `?match=12345&tab=cotes`
2. Hash route `#match/12345/cotes`

**Décision** : Hash route.

**Pourquoi** :
- Cohérent avec le router SPA existant (`#dashboard`, `#locks`, ...)
- Hash = client-side only, pas de round-trip serveur
- Compatible avec GH Pages (pas de routing serveur custom possible)
- Compat avec ?match=<id> conservée (vieux liens partagés fonctionnent)

**Conséquences** :
- restoreShared (pronostics.html) accepte les 2 formats
- replaceState pour ne pas polluer l'historique sur change de tab
- partage de URL avec tab spécifique fonctionne
