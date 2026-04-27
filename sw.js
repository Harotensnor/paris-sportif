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
const CACHE_VERSION = 'paris-sportif-20260427-032344';
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

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // pronostics.html : NETWORK-FIRST, fallback cache.
  const isHtml = url.pathname.endsWith('/pronostics.html')
              || url.pathname.endsWith('pronostics.html')
              || url.pathname === '/'
              || url.pathname.endsWith('/');
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

  // data.js : NETWORK-FIRST.
  if (url.pathname.endsWith('/data.js') || url.pathname.endsWith('data.js')) {
    event.respondWith(
      fetch(req)
        .then(resp => {
          const respClone = resp.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(req, respClone));
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Chantier #3 lazy-load — data_today.json + data_manifest.json : NETWORK-FIRST.
  // Ces fichiers sont rafraîchis à chaque tick du cron, donc on veut
  // toujours la dernière version. Cache fallback si offline.
  if (url.pathname.endsWith('/data_today.json') || url.pathname.endsWith('data_today.json') ||
      url.pathname.endsWith('/data_manifest.json') || url.pathname.endsWith('data_manifest.json')) {
    event.respondWith(
      fetch(req)
        .then(resp => {
          const respClone = resp.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(req, respClone));
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // odds_history.jsonl : NETWORK-FIRST (Chantier PP).
  if (url.pathname.endsWith('/odds_history.jsonl') || url.pathname.endsWith('odds_history.jsonl')) {
    event.respondWith(
      fetch(req)
        .then(resp => {
          const respClone = resp.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(req, respClone));
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // v31 — app.css + app.js : STALE-WHILE-REVALIDATE. Servir le cache
  // immédiatement (instant render) ET refetch en background pour la prochaine
  // visite. Couplé au stamp CACHE_VERSION qui est bumpé à chaque vrai
  // changement, on a le meilleur des deux mondes : rapide ET frais.
  if (url.pathname.endsWith('/app.css') || url.pathname.endsWith('app.css') ||
      url.pathname.endsWith('/app.js')  || url.pathname.endsWith('app.js')) {
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

  // Icônes / manifest : cache-first.
  if (SHELL_ASSETS.some(a => url.pathname.endsWith('/' + a) || url.pathname.endsWith(a))) {
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
