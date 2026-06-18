// Chantier S (révisé 2026-04-22 nuit) — Service Worker pour Paris-Sportif.
//
// Stratégie :
//   * pronostics.html : NETWORK-FIRST (cache = fallback offline).
//   * data_lite / health : NETWORK-FIRST.
//   * data.js / odds_history.jsonl : STALE-WHILE-REVALIDATE (gros fichiers).
//   * icônes / manifest : cache-first (change rarement).
//   * tout le reste    : passthrough réseau.

// CACHE_VERSION is auto-stamped by .github/workflows/refresh.yml on each deploy.
// The "Stamp sw.js" step replaces this entire line with the current UTC timestamp,
// so every deploy invalidates all caches → users see the new pronostics.html
// without needing Ctrl+Shift+R. Manual edits stay valid for local dev.
const CACHE_VERSION = 'paris-sportif-v55.4-20260618-000615';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// AUDIT-2026-04-27 (Sprint 10 #19) — Split en 2 listes :
// PRECACHE = chargé à l'install (taille critique au boot)
// LAZY_CACHE_FIRST = listé dans SHELL_ASSETS pour le matcher cache-first
//                    mais PAS chargé à l'install (premier hit network).
// L'union des deux = SHELL_ASSETS pour préserver la logique de matching.
const PRECACHE_ASSETS = [
  'manifest.webmanifest',
  'icon.svg',
  'icon-192.webp',
  'icon-192.avif',
  'icon-192.png',
  'icon-512.webp',
  'icon-512.avif',
  'icon-512.png',
  // FIX Bug 7 — pré-cache pronostics.html pour fallback offline garanti
  'pronostics.html',
  // v31 — app.css extrait depuis pronostics.html (audit ChatGPT).
  // v35.295 — app.js sort du precache : 1.6MB ne doit pas bloquer l'install PWA.
  // v49 — Audit point #44 : legacy-app.js (1.9 MB) sort aussi pour accélérer
  // l'install PWA. Tous deux servis en stale-while-revalidate (fetch handler).
  // Trade-off : si user va offline IMMÉDIATEMENT après install, legacy-app.js
  // pas dispo. En usage normal (visite avant offline), 1er load cache, puis OK.
  'app.css',
  'app-design-v3.css',
  'src/perf-bootstrap.js',
  'src/utils.js',
  'src/model.js',
  'src/core.js',
  'src/tier.js',
  'src/data-access.js',
  'src/pages.js',
  'workers/quality-worker.js',
  'workers/backtest-worker.js',
  'workers/bayesian-worker.js',
  'app-i18n.js',
  'sports_coverage_extended.js',
  'vendor/qrcode-generator.js',
  'src/privacy-social.js',
  'vendor/lunr.min.js',
  'src/docs-onboarding.js',
  'src/local-analytics.js',
  'src/qa-runtime.js',
  'docs/search-index.json',
  'i18n.json',
  'print.css',
  'app-enhancements.js',
  // Landing page indexable + son CSS partagé.
  'static-page.css',
  'index.html',
];

// Pages éditoriales : seulement ~5% des sessions visitent ces pages.
// Pas pré-cachées (économie ~80KB au boot) mais cache-first au premier hit.
// v49 — app.js + legacy-app.js sortent du precache pour accélérer l'install
// (~2 MB économisés). Restent dans LAZY_CACHE_FIRST pour matching offline
// après 1er load (servis stale-while-revalidate au runtime).
const LAZY_CACHE_FIRST = [
  'app.js',
  'legacy-app.js',
  'methodologie.html',
  'academie.html',
  'comment-lire-un-prono.html',
  'legal.html',
  // v33.18 — Pages additionnelles présentes dans le repo mais oubliées de
  // la liste cache-first. Couvrent les liens depuis index.html / footer.
  'backtest.html',
  'credibilite.html',
  '404.html',
  'components-showcase.html',
  // OG images partagées sur reseaux sociaux : cache-first au premier hit,
  // pas à l'installation PWA.
  'og-default.png',
  'og-default.webp',
  'og-default.avif',
  'og-backtest.png',
  'og-backtest.webp',
  'og-backtest.avif',
  'og-credibilite.png',
  'og-credibilite.webp',
  'og-credibilite.avif',
  'og-methodologie.png',
  'og-methodologie.webp',
  'og-methodologie.avif',
];

const SHELL_ASSETS = [...PRECACHE_ASSETS, ...LAZY_CACHE_FIRST];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      // AUDIT-2026-04-27 (Sprint 10 #19) — Pré-cache uniquement les
      // assets critiques. Les pages éditoriales seront fetch network
      // au premier hit puis cachées via le matcher cache-first ci-bas.
      .then(cache => cache.addAll(PRECACHE_ASSETS).catch(() => { /* pas bloquant */ }))
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

// v54.3 — Auto-update : le client envoie SKIP_WAITING quand il détecte un
// nouveau SW. Le SW arrête le mode "waiting" et prend le contrôle direct.
// Combiné avec controllerchange + reload côté client = update silencieux.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = event.notification && event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : 'pronostics.html#dashboard';
  event.waitUntil((async () => {
    const targetUrl = new URL(rawUrl, self.location.origin).href;
    const sameOrigin = targetUrl.startsWith(self.location.origin);
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (sameOrigin && 'navigate' in client) {
        try { await client.navigate(targetUrl); } catch (e) {}
        if ('focus' in client) return client.focus();
      }
      if ('focus' in client && client.url.startsWith(self.location.origin)) return client.focus();
    }
    if (clients.openWindow) return clients.openWindow(targetUrl);
  })());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (e) {
    try { payload = { body: event.data ? event.data.text() : '' }; } catch (err) { payload = {}; }
  }
  const title = payload.title || 'Paris-Sportif';
  event.waitUntil(self.registration.showNotification(title, {
    body: payload.body || 'Un Big Bet mérite ton attention.',
    icon: payload.icon || 'icon-192.png',
    badge: payload.badge || 'icon.svg',
    tag: payload.tag || 'paris-sportif-20260508-063641',
    data: { url: payload.url || 'pronostics.html#dashboard' },
  }));
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
function networkFirst(req, cacheName, options = {}) {
  const fetchReq = options.noStore ? new Request(req, { cache: 'no-store' }) : req;
  const cacheKey = options.cacheKey || req;
  return fetch(fetchReq)
    .then(resp => {
      const respClone = resp.clone();
      caches.open(cacheName).then(c => c.put(cacheKey, respClone));
      return resp;
    })
    .catch(() => caches.match(cacheKey));
}

// Gros fichiers de données : servir le dernier cache immédiatement puis
// rafraîchir en arrière-plan. Sur mobile/3G, data.js et odds_history.jsonl ne
// doivent jamais bloquer le rendu initial.
function staleWhileRevalidate(req, cacheName) {
  return caches.match(req).then(hit => {
    const refresh = fetch(req).then(resp => {
      const respClone = resp.clone();
      caches.open(cacheName).then(c => c.put(req, respClone));
      return resp;
    }).catch(() => hit);
    return hit || refresh;
  });
}

// Data recovery: ne jamais remplacer un data.js cache par une réponse
// manifestement corrompue. En cas de panne réseau ou de payload cassé, le
// dernier snapshot valide reste servi.
function staleWhileRevalidateData(req, cacheName) {
  return caches.match(req).then(hit => {
    const refresh = fetch(req).then(resp => {
      if (!resp || !resp.ok) throw new Error('data response not ok');
      const headers = resp.headers;
      return resp.clone().text().then(text => {
        if (!/window\.PRONOSTICS_DATA\s*=/.test(text)) {
          throw new Error('data.js missing PRONOSTICS_DATA marker');
        }
        const safeResp = new Response(text, {
          status: resp.status,
          statusText: resp.statusText,
          headers,
        });
        caches.open(cacheName).then(c => c.put(req, safeResp.clone()));
        return safeResp;
      });
    }).catch(() => hit || new Response(
      'window.PRONOSTICS_DATA_RECOVERY_ERROR = true;',
      { status: 503, headers: { 'Content-Type': 'application/javascript; charset=utf-8' } }
    ));
    return hit || refresh;
  });
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
      fetch(new Request(req, { cache: 'no-store' }))
        .then(resp => {
          const respClone = resp.clone();
          const canonicalClone = resp.clone();
          caches.open(RUNTIME_CACHE).then(c => {
            c.put(req, respClone);
            if (pathEndsWith(url, 'pronostics.html')) c.put('pronostics.html', canonicalClone);
          });
          return resp;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('pronostics.html')))
    );
    return;
  }

  // Données lourdes : STALE-WHILE-REVALIDATE pour éviter le blocage 3G.
  if (pathEndsWith(url, 'data.js')) {
    event.respondWith(staleWhileRevalidateData(req, RUNTIME_CACHE));
    return;
  }

  if (pathEndsWith(url, 'odds_history.jsonl')) {
    event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE));
    return;
  }

  // Données légères critiques rafraîchies par le cron : NETWORK-FIRST.
  const isCriticalFreshData =
    pathEndsWith(url, 'data_lite.js') ||
    pathEndsWith(url, 'data_today.json') ||
    pathEndsWith(url, 'data_manifest.json') ||
    pathEndsWith(url, 'health.json');
  if (isCriticalFreshData) {
    event.respondWith(networkFirst(req, RUNTIME_CACHE));
    return;
  }

  if (/\.(?:png|jpg|jpeg|webp|avif|svg|ico)$/i.test(path)) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(resp => {
        const respClone = resp.clone();
        caches.open(SHELL_CACHE).then(c => c.put(req, respClone));
        return resp;
      }))
    );
    return;
  }

  // CSS/JS d'application : NETWORK-FIRST no-store. Les captures utilisateur
  // montraient une vieille v54 servie malgré les query stamps v55 ; on préfère
  // un hit réseau frais et seulement utiliser le cache en secours offline.
  if (pathEndsWith(url, 'app.css') || pathEndsWith(url, 'app-design-v3.css') || pathEndsWith(url, 'app.js') || pathEndsWith(url, 'legacy-app.js')) {
    event.respondWith(networkFirst(req, SHELL_CACHE, { noStore: true }));
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
