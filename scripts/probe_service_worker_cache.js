#!/usr/bin/env node
/*
 * Service worker cache strategy probe.
 *
 * Executes sw.js in a mocked worker runtime and locks the critical cache
 * invariants: old cache cleanup, data.js stale-while-revalidate with corrupt
 * payload protection, HTML network-first fallback, and image cache-first.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const swPath = path.join(ROOT, 'sw.js');
const swSource = fs.readFileSync(swPath, 'utf8');
const version = (swSource.match(/const CACHE_VERSION = '([^']+)'/) || [])[1];

const failures = [];
function check(label, ok, detail = '') {
  console.log(`  [${ok ? 'ok' : 'FAIL'}] ${label}${ok ? '' : ' - ' + detail}`);
  if (!ok) failures.push({ label, detail });
}

function absoluteKey(input) {
  const raw = typeof input === 'string' ? input : input && input.url;
  return new URL(raw || '/', 'https://example.test/').href;
}

class CacheStore {
  constructor() {
    this.map = new Map();
  }
  async put(req, resp) {
    this.map.set(absoluteKey(req), resp.clone());
  }
  async match(req) {
    const hit = this.map.get(absoluteKey(req));
    return hit ? hit.clone() : undefined;
  }
  async addAll(items) {
    for (const item of items) {
      this.map.set(absoluteKey(item), new Response(`asset:${item}`, { status: 200 }));
    }
  }
}

function makeRuntime() {
  const listeners = {};
  const stores = new Map();
  const fetchQueue = [];
  const fetchLog = [];
  const clients = {
    async claim() { clients.claimed = true; },
    async matchAll() { return []; },
    async openWindow() { return null; },
    claimed: false
  };
  const caches = {
    stores,
    async open(name) {
      if (!stores.has(name)) stores.set(name, new CacheStore());
      return stores.get(name);
    },
    async keys() {
      return Array.from(stores.keys());
    },
    async delete(name) {
      return stores.delete(name);
    },
    async match(req) {
      for (const cache of stores.values()) {
        const hit = await cache.match(req);
        if (hit) return hit;
      }
      return undefined;
    }
  };
  const context = {
    console,
    URL,
    Response,
    Request,
    Headers,
    setTimeout,
    clearTimeout,
    Promise,
    clients,
    caches,
    self: {
      location: { origin: 'https://example.test' },
      clients,
      registration: {
        async showNotification() {}
      },
      addEventListener(type, fn) {
        listeners[type] = fn;
      },
      skipWaiting() {
        context.self.skippedWaiting = true;
        return Promise.resolve();
      },
      skippedWaiting: false
    },
    fetch(req) {
      fetchLog.push(absoluteKey(req));
      const next = fetchQueue.length ? fetchQueue.shift() : { body: 'ok', status: 200 };
      if (next.error) return Promise.reject(next.error);
      return Promise.resolve(new Response(next.body || '', {
        status: next.status || 200,
        headers: next.headers || {}
      }));
    },
    __listeners: listeners,
    __fetchQueue: fetchQueue,
    __fetchLog: fetchLog
  };
  context.globalThis = context;
  return context;
}

async function dispatchLifecycle(ctx, type) {
  let pending = Promise.resolve();
  ctx.__listeners[type]({
    waitUntil(promise) {
      pending = Promise.resolve(promise);
    }
  });
  await pending;
}

async function dispatchFetch(ctx, url) {
  let responsePromise = null;
  ctx.__listeners.fetch({
    request: new Request(new URL(url, 'https://example.test/').href, { method: 'GET' }),
    respondWith(promise) {
      responsePromise = Promise.resolve(promise);
    }
  });
  if (!responsePromise) return null;
  return responsePromise;
}

(async () => {
  check('CACHE_VERSION is stamped', /^paris-sportif-\d{8}-\d{6}$/.test(version || ''), String(version));
  const ctx = makeRuntime();
  vm.runInNewContext(swSource, ctx, { filename: 'sw.js' });
  check('worker registers install/activate/fetch handlers', ['install', 'activate', 'fetch'].every(k => typeof ctx.__listeners[k] === 'function'));

  ctx.caches.stores.set('paris-sportif-20000101-000000-shell', new CacheStore());
  ctx.caches.stores.set(`${version}-shell`, new CacheStore());
  ctx.caches.stores.set(`${version}-runtime`, new CacheStore());
  await dispatchLifecycle(ctx, 'activate');
  const cacheKeys = await ctx.caches.keys();
  check('activate deletes old cache versions', !cacheKeys.includes('paris-sportif-20000101-000000-shell'), cacheKeys.join(','));
  check('activate keeps current cache versions', cacheKeys.includes(`${version}-shell`) && cacheKeys.includes(`${version}-runtime`), cacheKeys.join(','));

  const runtime = await ctx.caches.open(`${version}-runtime`);
  await runtime.put(new Request('https://example.test/data.js'), new Response('window.PRONOSTICS_DATA = {cached:true};'));
  ctx.__fetchQueue.push({ body: 'window.PRONOSTICS_DATA = {fresh:true};', headers: { 'Content-Type': 'text/javascript' } });
  const cachedData = await dispatchFetch(ctx, 'https://example.test/data.js');
  check('data.js serves cached snapshot immediately', /cached:true/.test(await cachedData.text()));
  await new Promise(resolve => setTimeout(resolve, 0));
  const refreshedData = await runtime.match(new Request('https://example.test/data.js'));
  check('data.js refreshes valid payload in background', /fresh:true/.test(await refreshedData.text()));

  ctx.__fetchQueue.push({ body: 'corrupted data payload', headers: { 'Content-Type': 'text/javascript' } });
  const safeData = await dispatchFetch(ctx, 'https://example.test/data.js');
  check('data.js corrupt network response falls back to cache', /fresh:true/.test(await safeData.text()));
  await new Promise(resolve => setTimeout(resolve, 0));
  const stillSafe = await runtime.match(new Request('https://example.test/data.js'));
  check('data.js corrupt payload does not overwrite cache', /fresh:true/.test(await stillSafe.text()));

  const emptyCtx = makeRuntime();
  vm.runInNewContext(swSource, emptyCtx, { filename: 'sw.js' });
  emptyCtx.__fetchQueue.push({ body: 'broken data' });
  const recovery = await dispatchFetch(emptyCtx, 'https://example.test/data.js');
  check('data.js corrupt payload without cache returns recovery marker', recovery.status === 503 && /RECOVERY_ERROR/.test(await recovery.text()));

  const htmlCtx = makeRuntime();
  vm.runInNewContext(swSource, htmlCtx, { filename: 'sw.js' });
  const htmlRuntime = await htmlCtx.caches.open(`${version}-runtime`);
  await htmlRuntime.put(new Request('https://example.test/pronostics.html'), new Response('<html>cached</html>'));
  htmlCtx.__fetchQueue.push({ error: new Error('offline') });
  const htmlFallback = await dispatchFetch(htmlCtx, 'https://example.test/pronostics.html');
  check('HTML network-first falls back to cached page offline', /cached/.test(await htmlFallback.text()));

  const imageCtx = makeRuntime();
  vm.runInNewContext(swSource, imageCtx, { filename: 'sw.js' });
  const shell = await imageCtx.caches.open(`${version}-shell`);
  await shell.put(new Request('https://example.test/icon.svg'), new Response('<svg>cached</svg>'));
  imageCtx.__fetchQueue.push({ body: '<svg>network</svg>' });
  const image = await dispatchFetch(imageCtx, 'https://example.test/icon.svg');
  check('images are cache-first', /cached/.test(await image.text()) && imageCtx.__fetchLog.length === 0, JSON.stringify(imageCtx.__fetchLog));

  console.log(`\n[probe-sw-cache] ${failures.length ? failures.length + ' failure(s)' : 'all green'}`);
  if (failures.length) process.exit(1);
})().catch(err => {
  console.error('[probe-sw-cache] runner crashed:', err);
  process.exit(2);
});
