// Chantier S (révisé 2026-04-22) — Service Worker pour Paris-Sportif.
//
// Stratégie corrigée suite au bug de cache figé :
//   * pronostics.html : NETWORK-FIRST (on veut toujours la dernière version,
//     le cache n'est qu'un fallback hors-ligne).
//   * data.js et JSON  : NETWORK-FIRST (inchangé).
//   * icônes / manifest : cache-first (change rarement, vaut le coup de cacher).
//   * tout le reste    : passe directement au réseau.
//
// IMPORTANT : incrémenter CACHE_VERSION à chaque déploiement qui touche le SW
// lui-même ou la liste d'assets. Le reste (HTML) sera invalidé automatiquement
// grâce à la stratégie network-first.
//
// Pour forcer un rafraîchissement immédiat côté utilisateur après un déploy :
//   skipWaiting() + clients.claim() → le nouveau SW prend le relais dès que le
//   nouveau fichier sw.js est récupéré par le navigateur (ce qui se fait à
//   chaque navigation vers le site, indépendamment du cache).

const CACHE_VERSION = 'paris-sportif-v2-2026-04-22';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// On ne cache plus pronostics.html côté shell — il sera géré en network-first.
// Les icônes/manifest restent cache-first car inertes.
const SHELL_ASSETS = [
  'manifest.webmanifest',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
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
        // Nuke tout cache qui ne matche pas la version courante.
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
  // L'essentiel — sans ça, les users stay bloqués sur une vieille version.
  const isHtml = url.pathname.endsWith('/pronostics.html')
              || url.pathname.endsWith('pronostics.html')
              || url.pathname === '/'
              || url.pathname.endsWith('/');
  if (isHtml) {
    event.respondWith(
      fetch(req)
        .then(resp => {
          // Met à jour le cache avec la version fraîche (fallback offline).
          const respClone = resp.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(req, respClone));
          return resp;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('pronostics.html')))
    );
    return;
  }

  // data.js : NETWORK-FIRST (inchangé).
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
