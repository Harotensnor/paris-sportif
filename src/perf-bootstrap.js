import * as utils from './utils.js';
import * as model from './model.js';
import * as core from './core.js';
import * as tier from './tier.js';
import * as dataAccess from './data-access.js';
import { setupNavigationPrefetch, renderPageShellStatus } from './pages.js';

const WORKER_PATHS = {
  quality: new URL('../workers/quality-worker.js', import.meta.url),
  backtest: new URL('../workers/backtest-worker.js', import.meta.url),
  bayesian: new URL('../workers/bayesian-worker.js', import.meta.url),
};

function createWorker(path) {
  try {
    return new Worker(path);
  } catch (error) {
    return { unavailable: true, error: String(error && error.message || error) };
  }
}

const workers = {};

function setupWorkers() {
  if (!('Worker' in window)) return workers;
  for (const [name, path] of Object.entries(WORKER_PATHS)) {
    if (!workers[name]) workers[name] = createWorker(path);
  }
  return workers;
}

function requestWorker(name, payload, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const worker = workers[name];
    if (!worker || worker.unavailable || typeof worker.postMessage !== 'function') return resolve({ ok: false, error: worker?.error || 'worker unavailable' });
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timer = setTimeout(() => {
      worker.removeEventListener('message', onMessage);
      resolve({ ok: false, error: 'timeout' });
    }, timeoutMs);
    function onMessage(event) {
      if (event.data?.id !== id) return;
      clearTimeout(timer);
      worker.removeEventListener('message', onMessage);
      resolve(event.data);
    }
    worker.addEventListener('message', onMessage);
    worker.postMessage({ id, ...payload });
  });
}

function setupResourceHints() {
  const hints = [
    ['dns-prefetch', 'https://a.espncdn.com'],
    ['preconnect', 'https://a.espncdn.com'],
    ['dns-prefetch', 'https://img.sofascore.com'],
    ['preconnect', 'https://img.sofascore.com'],
  ];
  for (const [rel, href] of hints) {
    if (document.querySelector(`link[rel="${rel}"][href="${href}"]`)) continue;
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }
}

function setupImageFallbackOptimization() {
  const mark = (img) => {
    if (!(img instanceof HTMLImageElement)) return;
    if (!img.loading) img.loading = 'lazy';
    if (!img.decoding) img.decoding = 'async';
    if (!img.getAttribute('width') && img.naturalWidth > 0) img.setAttribute('width', String(img.naturalWidth));
    if (!img.getAttribute('height') && img.naturalHeight > 0) img.setAttribute('height', String(img.naturalHeight));
  };
  document.querySelectorAll('img').forEach(mark);
  if ('MutationObserver' in window) {
    new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLImageElement) mark(node);
          if (node.querySelectorAll) node.querySelectorAll('img').forEach(mark);
        });
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
}

function setupLongTaskTracking() {
  const state = { count: 0, max: 0, total: 0, last: [] };
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const duration = Math.round(entry.duration || 0);
        state.count += 1;
        state.max = Math.max(state.max, duration);
        state.total += duration;
        state.last.push({ name: entry.name || 'longtask', duration, start: Math.round(entry.startTime || 0) });
        if (state.last.length > 20) state.last.shift();
      }
    }).observe({ type: 'longtask', buffered: true });
  } catch (error) {}
  window.__longTasks = () => ({ ...state, last: state.last.slice() });
}

function setupVitalsV2() {
  const storageKey = 'paris_sportif_web_vitals_v2';
  const maxSessions = 100;
  const session = { ts: Date.now(), path: location.pathname + location.hash, LCP: null, FCP: null, CLS: 0, INP: null, FID: null, TTFB: null };
  const save = () => {
    try {
      const arr = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const rows = Array.isArray(arr) ? arr : [];
      rows.push({ ...session, longTasks: window.__longTasks ? window.__longTasks() : null });
      localStorage.setItem(storageKey, JSON.stringify(rows.slice(-maxSessions)));
    } catch (error) {}
  };
  const observe = (type, callback, opts = {}) => {
    try { new PerformanceObserver((list) => list.getEntries().forEach(callback)).observe({ type, buffered: true, ...opts }); } catch (error) {}
  };
  observe('largest-contentful-paint', (entry) => { session.LCP = Math.round(entry.startTime || 0); });
  observe('paint', (entry) => { if (entry.name === 'first-contentful-paint') session.FCP = Math.round(entry.startTime || 0); });
  observe('layout-shift', (entry) => { if (!entry.hadRecentInput) session.CLS = Math.round((session.CLS + entry.value) * 1000) / 1000; });
  observe('event', (entry) => { session.INP = Math.max(session.INP || 0, Math.round(entry.duration || 0)); }, { durationThreshold: 16 });
  observe('first-input', (entry) => { session.FID = Math.round((entry.processingStart || 0) - (entry.startTime || 0)); });
  try {
    const nav = performance.getEntriesByType?.('navigation')?.[0];
    if (nav) session.TTFB = Math.round(nav.responseStart || 0);
  } catch (error) {}
  let persisted = false;
  const once = () => { if (!persisted) { persisted = true; save(); } };
  addEventListener('pagehide', once);
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') once(); });
  const previous = window.__webVitals;
  window.__webVitals = () => {
    let rows = [];
    try { rows = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch (error) { rows = []; }
    if (window.console?.table) console.table(rows.slice(-20));
    return rows.length ? rows : (typeof previous === 'function' ? previous() : []);
  };
}

function setupDataBackups() {
  if (!('indexedDB' in window)) return;
  const dbName = 'paris_sportif_data_backups_v1';
  const storageKey = 'paris_sportif_last_data_backup_at';
  const everyMs = 24 * 60 * 60 * 1000;
  const last = Number(localStorage.getItem(storageKey) || 0);
  if (Number.isFinite(last) && Date.now() - last < everyMs) return;

  const openDb = () => new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const put = (db, row) => new Promise((resolve, reject) => {
    const tx = db.transaction('snapshots', 'readwrite');
    tx.objectStore('snapshots').put(row);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });

  const run = async () => {
    try {
      const db = await openDb();
      const files = ['data.js', 'health.json', 'source_health.json', 'data_integrity_report.json'];
      const ts = new Date().toISOString();
      for (const file of files) {
        const resp = await fetch(file, { cache: 'no-store' }).catch(() => null);
        if (!resp || !resp.ok) continue;
        const text = await resp.text();
        await put(db, { id: `${file}:${ts.slice(0, 10)}`, file, ts, size: text.length, text });
      }
      localStorage.setItem(storageKey, String(Date.now()));
      window.dispatchEvent(new CustomEvent('ps:data-backup', { detail: { ts } }));
    } catch (error) {}
  };

  const schedule = window.requestIdleCallback || ((fn) => setTimeout(fn, 2500));
  schedule(run);
  window.__dataBackups = () => new Promise((resolve, reject) => {
    openDb().then((db) => {
      const tx = db.transaction('snapshots', 'readonly');
      const req = tx.objectStore('snapshots').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    }).catch(reject);
  });
}

setupResourceHints();
setupWorkers();
setupNavigationPrefetch();
setupImageFallbackOptimization();
setupLongTaskTracking();
setupVitalsV2();
setupDataBackups();

window.PS_ESM = Object.freeze({
  utils,
  model,
  core,
  tier,
  dataAccess,
  pages: { setupNavigationPrefetch, renderPageShellStatus },
  workers,
  getDataAge: dataAccess.getDataAge,
  getDisplayablePicks: dataAccess.getDisplayablePicks,
  getTierBreakdown: dataAccess.getTierBreakdown,
  qualityDistribution: (picks) => requestWorker('quality', { type: 'score-distribution', picks }),
  backtest: (picks) => requestWorker('backtest', { type: 'simulate', picks }, 3000),
  bayesianPriors: (matches) => requestWorker('bayesian', { type: 'team-priors', matches }, 3000),
});

document.dispatchEvent(new CustomEvent('ps:esm-ready', { detail: { version: utils.VERSION, workers: Object.keys(workers) } }));
