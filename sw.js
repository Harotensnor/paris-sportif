// Chantier S — Service Worker minimal pour Paris-Sportif.
//
// Objectif : rendre l'app installable en PWA et fournir un fallback hors-ligne
// sur le shell HTML/CSS. On ne cache *pas* `data.js` parce qu'il change toutes
// les 5 minutes via GH Actions — le faire expirer des vieilles données en cache
// serait pire que de charger une page vide. Stratégie :
//
//   * shell statique (pronostics.html, manifest, icônes) : cache-first
//   * data.js et tous les autres JSON : network-first avec fallback cache
//   * tout le reste : passe directement au réseau
//
// Incrémenter CACHE_VERSION pour forcer le rafraîchissement du shell.

const CACHE_VERSION = 'paris-sportif-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const SHELL_ASSETS = [
  'pronostics.html',
  'manifest.webmanifest',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_ASSETS).catch(() => { /* pas bloquant si une icône manque */ }))
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
  // Ne touche qu'aux requêtes same-origin (on ne veut pas intercepter les fetch
  // externes comme ESPN / Sofascore fait côté script Python, pas le navigateur).
  if (url.origin !== self.location.origin) return;

  // Stratégie pour data.js : network-first, cache si offline.
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

  // Shell : cache-first.
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

  // Tout le reste : pass-through.
});
