(function () {
  'use strict';

  const VERSION = 'v37.189';
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

  function syncFooterVersion() {
    const footer = document.getElementById('footer-version');
    document.documentElement.dataset.psAppVersion = VERSION;
    window.PS_APP_VERSION = VERSION;
    if (!footer) return null;
    const previous = (footer.textContent || '').trim();
    footer.dataset.appVersion = VERSION;
    if (previous !== VERSION) {
      footer.dataset.versionDrift = previous || 'missing';
      footer.textContent = VERSION;
    }
    footer.title = `Voir les nouveautés ${VERSION}`;
    return {
      previous,
      current: VERSION,
      driftFixed: Boolean(previous && previous !== VERSION),
    };
  }

  function ready() {
    const footerVersion = syncFooterVersion();
    scheduleLazySignalScripts();
    window.PS_APP_SHELL = {
      version: VERSION,
      startedAt,
      readyAt: performance.now(),
      bootMs: Math.round(performance.now() - startedAt),
      chunks,
      footerVersion,
      esmReady: Boolean(window.PS_ESM),
      legacyReady: Boolean(window.predictMatch && window.__testAPI),
    };
    document.dispatchEvent(new CustomEvent('ps:app-shell-ready', { detail: window.PS_APP_SHELL }));
  }

  function scheduleLazySignalScripts() {
    const nodes = Array.from(document.querySelectorAll('script[type="text/plain"][data-ps-lazy-script]'));
    const urls = Array.from(new Set(nodes.map(node => node.dataset.psLazyScript || '').filter(Boolean)));
    if (!urls.length || window.__psLazySignalsScheduled) return;
    window.__psLazySignalsScheduled = true;
    window.PS_LAZY_SIGNAL_STATUS = {
      pending: urls.length,
      loaded: 0,
      failed: 0,
      startedAt: null,
      finishedAt: null,
      assets: urls.slice(),
      errors: [],
    };

    const loadOne = (src) => new Promise((resolve) => {
      if (document.querySelector(`script[data-ps-lazy-loaded="${src}"]`)) {
        resolve({ src, ok: true, cached: true });
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.defer = true;
      script.dataset.psLazyLoaded = src;
      script.onload = () => resolve({ src, ok: true });
      script.onerror = () => resolve({ src, ok: false });
      document.head.appendChild(script);
    });

    const loadAll = async () => {
      const status = window.PS_LAZY_SIGNAL_STATUS;
      if (!status || status.loading || status.finishedAt) return status;
      status.loading = true;
      status.startedAt = performance.now();
      for (const src of urls) {
        const result = await loadOne(src);
        if (result.ok) status.loaded += 1;
        else {
          status.failed += 1;
          status.errors.push(src);
        }
        status.pending = Math.max(0, urls.length - status.loaded - status.failed);
      }
      status.finishedAt = performance.now();
      status.loading = false;
      window.dispatchEvent(new CustomEvent('ps:lazy-signals-ready', { detail: status }));
      try {
        if (typeof window.applyPageView === 'function') window.applyPageView();
      } catch (_) {}
      return status;
    };

    const idle = (reason) => {
      const status = window.PS_LAZY_SIGNAL_STATUS;
      if (status) status.reason = reason || status.reason || 'manual';
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(loadAll, { timeout: 5000 });
      } else {
        setTimeout(loadAll, 800);
      }
    };
    const requestLazySignals = (reason) => {
      const status = window.PS_LAZY_SIGNAL_STATUS;
      if (!status || status.loading || status.finishedAt) return;
      idle(reason);
    };
    const pageNeedsSignals = () => {
      const raw = (location.hash || '').replace(/^#/, '').split('?')[0];
      return /^(tous|performance|historique|bilan|backtest|buteurs|compare|sante|profil|academie|match\/)/.test(raw);
    };
    window.PS_loadLazySignals = () => loadAll();
    window.addEventListener('ps:need-lazy-signals', (event) => requestLazySignals(event.detail?.reason || 'event'), { passive: true });
    window.addEventListener('hashchange', () => {
      if (pageNeedsSignals()) requestLazySignals('hashchange');
    }, { passive: true });
    document.addEventListener('click', (event) => {
      const target = event.target && event.target.closest && event.target.closest('[data-page],[data-big-detail],[data-match-id],[data-tous-mode],[data-agent-tab],[data-perf-tab]');
      if (target) requestLazySignals('user-intent');
    }, { passive: true });
    window.addEventListener('scroll', () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      if (y > 1600) requestLazySignals('deep-scroll');
    }, { passive: true });
    if (pageNeedsSignals()) {
      if (document.readyState === 'complete') setTimeout(() => requestLazySignals('initial-page'), 800);
      else window.addEventListener('load', () => setTimeout(() => requestLazySignals('initial-page'), 800), { once: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
})();
