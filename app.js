(function () {
  'use strict';

  const startedAt = performance.now();
  const chunks = {
    esm: 'src/perf-bootstrap.js',
    legacy: 'legacy-app.js',
    workers: [
      'workers/quality-worker.js',
      'workers/backtest-worker.js',
      'workers/bayesian-worker.js',
    ],
  };

  function ready() {
    window.PS_APP_SHELL = {
      version: 'v37.023',
      startedAt,
      readyAt: performance.now(),
      bootMs: Math.round(performance.now() - startedAt),
      chunks,
      esmReady: Boolean(window.PS_ESM),
      legacyReady: Boolean(window.predictMatch && window.__testAPI),
    };
    document.dispatchEvent(new CustomEvent('ps:app-shell-ready', { detail: window.PS_APP_SHELL }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
})();
