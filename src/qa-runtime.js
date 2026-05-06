(function qaRuntime() {
  'use strict';

  const VERSION = 'v37.022';
  const ERRORS_KEY = 'paris_sportif_js_errors_v1';
  const CANARY_KEY = 'qa_canary_variant_v1';
  const MAX_ERRORS = 80;

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }
  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  function hash(value) {
    let h = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function canaryVariant() {
    let variant = localStorage.getItem(CANARY_KEY);
    if (!variant) {
      const seed = localStorage.getItem('usage_telemetry_user_id') || `${navigator.userAgent}|${location.host}`;
      variant = hash(seed) % 10 === 0 ? 'canary' : 'baseline';
      localStorage.setItem(CANARY_KEY, variant);
    }
    return variant;
  }
  function normalizeError(input, extra) {
    const err = input instanceof Error ? input : null;
    return {
      ts: new Date().toISOString(),
      version: VERSION,
      message: err ? err.message : String(input || 'Unknown error'),
      stack: err && err.stack ? String(err.stack).slice(0, 3000) : '',
      page: location.hash || '#dashboard',
      href: location.href.replace(location.search, location.search ? '?…' : ''),
      userAgent: navigator.userAgent,
      extra: extra || {},
    };
  }
  function recordError(input, extra) {
    const errors = readJson(ERRORS_KEY, []);
    errors.push(normalizeError(input, extra));
    writeJson(ERRORS_KEY, errors.slice(-MAX_ERRORS));
  }
  function errorsTable() {
    const errors = readJson(ERRORS_KEY, []);
    if (console.table) console.table(errors.map(e => ({ ts: e.ts, page: e.page, message: e.message })));
    return errors;
  }
  function downloadBugReport() {
    const payload = {
      generated_at: new Date().toISOString(),
      version: VERSION,
      canary: canaryVariant(),
      errors: readJson(ERRORS_KEY, []),
      qa: {
        url_hash: location.hash || '#dashboard',
        viewport: { width: innerWidth, height: innerHeight },
        storage_keys: Object.keys(localStorage).filter(k => k.startsWith('paris_') || k.startsWith('qa_') || k.startsWith('usage_')),
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paris-sportif-bug-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return payload;
  }
  function ensureAdminButton() {
    const params = new URLSearchParams(location.search);
    const enabled = params.get('qa') === '1' || localStorage.getItem('adminMode') === '1';
    if (!enabled || document.querySelector('[data-qa-report-bug]')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-qa-report-bug', '1');
    btn.setAttribute('aria-label', 'Exporter un rapport de bug local');
    btn.textContent = 'Bug report';
    btn.style.cssText = 'position:fixed;left:14px;bottom:92px;z-index:100001;min-height:44px;border-radius:999px;border:1px solid rgba(148,163,184,.35);background:#111827;color:#f8fafc;padding:10px 14px;font-weight:800;box-shadow:0 12px 32px rgba(0,0,0,.28)';
    btn.addEventListener('click', downloadBugReport);
    document.body.appendChild(btn);
  }

  window.addEventListener('error', event => {
    recordError(event.error || event.message, { source: event.filename, line: event.lineno, column: event.colno });
  });
  window.addEventListener('unhandledrejection', event => {
    recordError(event.reason || 'Unhandled promise rejection', { type: 'unhandledrejection' });
  });
  window.__errors = errorsTable;
  window.__qaBugReport = downloadBugReport;
  window.__qaCanaryVariant = canaryVariant;
  window.__qaHealth = function qaHealth() {
    return {
      version: VERSION,
      canary: canaryVariant(),
      storedErrors: readJson(ERRORS_KEY, []).length,
      runtimeNetworkCalls: 0,
    };
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureAdminButton, { once: true });
  else ensureAdminButton();
})();
