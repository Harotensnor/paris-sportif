// Chantier S (révisé 2026-04-22 nuit) — Service Worker pour Paris-Sportif.
//
// Stratégie :
//   * pronostics.html : NETWORK-FIRST (cache = fallback offline).
//   * data.js et JSON  : NETWORK-FIRST.
//   * odds_history.jsonl : NETWORK-FIRST (Chantier PP).
//   * icônes / manifest : cache-first (change rarement).
//   * tout le reste    : passthrough réseau.

// CACHE_VERSION is auto-stamped by .github/workflows/refresh.yml on each deploy.
// The "Stamp sw.js" step replaces this entire line with the current UTC timestamp,
// so every deploy invalidates all caches → users see the new pronostics.html
// without needing Ctrl+Shift+R. Manual edits stay valid for local dev.
const CACHE_VERSION = 'paris-sportif-20260427-182838';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const SHELL_ASSETS = [
  'manifest.webmanifest',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  // FIX Bug 7 — pré-cache pronostics.html pour fallback offline garanti
  // (avant : caches.match('pronostics.html') au offline catch dépendait
  // d'un précédent fetch ayant rempli le runtime cache, ce qui n'était
  // pas garanti pour les premières navigations).
  'pronostics.html',
  // v31 — app.css + app.js extraits depuis pronostics.html (audit ChatGPT).
  // Pré-cachés agressivement parce qu'ils ne changent presque jamais
  // (vs pronostics.html qui change à chaque cron tick avec le LITE blob).
  // CACHE_VERSION stamp invalide tout à chaque vrai changement de code.
  'app.css',
  'app.js',
  // v31.7.4 — Static editorial pages : cachées agressive pour navigation
  // rapide depuis le menu Apprendre. Régénérées rarement (build_*_page.py
  // sur changement data, mais HTML stable).
  'static-page.css',
  'index.html',
  'methodologie.html',
  'academie.html',
  'comment-lire-un-prono.html',
  'legal.html',
  // v31.7.4 — OG images partagées sur reseaux sociaux : cache 24h+ vu
  // qu'elles ne changent que quand backtest_report_v2 change.
  'og-default.png',
  'og-backtest.png',
  'og-credibilite.png',
  'og-methodologie.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_ASSETS).catch(() => { /* pas bloquant */ }))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !k.startsWith(CACHE_VERSION)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// AUDIT-2026-04-27 (Option E) — Helper au lieu de doublons slash/no-slash.
// `endsWith('data.js')` couvre déjà '/data.js' donc l'OR redondant ne servait
// à rien (sauf complexifier la lecture). Désormais une seule fonction.
function pathEndsWith(url, name) {
  // Match `name` à la fin du chemin, soit après un / soit comme chemin entier.
  const p = url.pathname;
  return p === '/' + name || p.endsWith('/' + name) || p === name;
}

// Network-first wrapper standard (rafraîchit cache à chaque hit).
function networkFirst(req, cacheName) {
  return fetch(req)
    .then(resp => {
      const respClone = resp.clone();
      caches.open(cacheName).then(c => c.put(req, respClone));
      return resp;
    })
    .catch(() => caches.match(req));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;

  // pronostics.html : NETWORK-FIRST, fallback cache + précaché shell.
  const isHtml = pathEndsWith(url, 'pronostics.html') || path === '/' || path.endsWith('/');
  if (isHtml) {
    event.respondWith(
      fetch(req)
        .then(resp => {
          const respClone = resp.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(req, respClone));
          return resp;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('pronostics.html')))
    );
    return;
  }

  // Données dynamiques rafraîchies par le cron : NETWORK-FIRST.
  // Couvre data.js + sidecar JSON + odds_history.jsonl + manifest.
  const isDynamicData =
    pathEndsWith(url, 'data.js') ||
    pathEndsWith(url, 'data_today.json') ||
    pathEndsWith(url, 'data_manifest.json') ||
    pathEndsWith(url, 'odds_history.jsonl') ||
    pathEndsWith(url, 'health.json');
  if (isDynamicData) {
    event.respondWith(networkFirst(req, RUNTIME_CACHE));
    return;
  }

  // app.css + app.js : STALE-WHILE-REVALIDATE. Servir le cache
  // immédiatement (instant render) ET refetch en background pour la prochaine
  // visite. Couplé au stamp CACHE_VERSION bumpé à chaque vrai changement.
  if (pathEndsWith(url, 'app.css') || pathEndsWith(url, 'app.js')) {
    event.respondWith(
      caches.match(req).then(hit => {
        const fetchPromise = fetch(req).then(resp => {
          const respClone = resp.clone();
          caches.open(SHELL_CACHE).then(c => c.put(req, respClone));
          return resp;
        }).catch(() => hit);  // network fail → fallback to cache
        return hit || fetchPromise;  // immediate cache, refresh background
      })
    );
    return;
  }

  // Icônes / manifest / pages éditoriales : cache-first.
  if (SHELL_ASSETS.some(a => pathEndsWith(url, a))) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(resp => {
        const respClone = resp.clone();
        caches.open(SHELL_CACHE).then(c => c.put(req, respClone));
        return resp;
      }))
    );
    return;
  }

  // Reste : passthrough.
});
