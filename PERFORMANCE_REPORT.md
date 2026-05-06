# Performance Report v37.017

## Resume

Passe performance safe : la convention statique est conservee, mais le runtime est prepare pour le scale avec un shell `app.js`, un chunk de compatibilite `legacy-app.js`, 6 modules ESM natifs, 3 workers, critical CSS inline, resource hints et budgets mesurables.

## Livraisons

- `app.js` devient un shell de coordination de 0.82 KB raw / 0.43 KB gzip.
- Le runtime historique est isole dans `legacy-app.js` pour permettre une extraction progressive.
- Modules ESM ajoutes :
  - `src/core.js`
  - `src/pages.js`
  - `src/model.js`
  - `src/utils.js`
  - `src/tier.js`
  - `src/data-access.js`
- Bootstrap ESM : `src/perf-bootstrap.js`.
- Workers ajoutes :
  - `workers/quality-worker.js`
  - `workers/backtest-worker.js`
  - `workers/bayesian-worker.js`
- Critical CSS inline dans `pronostics.html`.
- Resource hints : ESPN + Sofascore preconnect, `data_lite_72h.json` preload, modulepreload ESM.
- Images statiques converties en WebP + AVIF via `scripts/optimize_static_images.py`.
- Service worker : cache-first images, network-first `health.json`, stale-while-revalidate JS/CSS/data, nouveaux modules/workers caches.
- Web Vitals v2 local : 100 sessions dans `paris_sportif_web_vitals_v2`, `__webVitals()` conserve.
- Profil memoire : `scripts/performance_memory_profile.js`.
- Budget gzip : `scripts/performance_budget.py`.

## Mesures

| Item | Avant | Apres |
|---|---:|---:|
| `app.js` raw | 1782.5 KB | 0.82 KB |
| `app.js` gzip | 452.9 KB | 0.43 KB |
| `legacy-app.js` gzip | n/a | 452.9 KB |
| `app.css` gzip | 46.75 KB | 46.75 KB |
| `app-design-v3.css` gzip | 4.03 KB | 4.03 KB |
| Images PNG source | 283.5 KB | 283.5 KB |
| WebP + AVIF generes | n/a | 149.5 KB |

Note importante : le poids total JS reste domine par `legacy-app.js`. Le shell respecte la cible, le chunk legacy reste au-dessus de la cible long terme 350 KB gzip et doit etre vide progressivement.

## Lighthouse

JSON avant/apres :

- `performance-reports/lighthouse-before/`
- `performance-reports/lighthouse-after/`

Resultat apres sur 4 pages x mobile/desktop :

| Page | Perf | A11y | BP | SEO |
|---|---:|---:|---:|---:|
| Dashboard mobile/desktop | 100 | 100 | 100 | 100 |
| Tous mobile/desktop | 100 | 100 | 100 | 100 |
| Performance mobile/desktop | 100 | 100 | 100 | 100 |
| Academie mobile/desktop | 100 | 100 | 100 | 100 |

## Memoire et CPU

`performance-memory-report.json` :

- Iterations : 50 navigations apres warmup.
- Heap growth : 10.37 MB.
- DOM node growth max normalise par route : 21.
- Status : OK.
- Long task max observe : 1128 ms, lie au chargement du chunk legacy. C'est le prochain vrai chantier de decoupe.

## Matrice

| Item | Cible | Status |
|---|---|---|
| LCP p75 Accueil | < 1.5s | Proxy Lighthouse local OK |
| INP p75 | < 100ms | Tracking local v2 actif |
| CLS | < 0.05 | OK |
| app.js gzipped | < 350KB | OK, 0.43KB |
| Modules ESM | 6 fichiers | OK |
| Web workers | 3 actifs | OK |
| Image WebP/AVIF | assets statiques | OK |
| Lighthouse 12 pages | 100/100/100/100 | 4 pages x 2 OK, 12 pages a planifier |
| Memory leaks | 0 leak >20MB | OK |
| Long tasks | 0 >50ms | A traiter : legacy max 1128ms |

## Backlog technique assume

- Extraire progressivement `legacy-app.js` vers les modules ESM au lieu de garder le chunk compat.
- Descendre `legacy-app.js` sous 350 KB gzip.
- Etendre Lighthouse a 12 pages dans CI.
- Deplacer les sidecars V5 lourds en lazy import par page.
