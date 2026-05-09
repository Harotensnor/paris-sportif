(function () {
  'use strict';

  const VERSION = 'v46.0';
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
    // AUDIT 2026-05-08 v40.6 — Si le footer a été stamped avec un BUILD_ID
    // complet (ex: 'v40.0-20260508-211000') par stamp_asset_hashes.py, on
    // le LAISSE tel quel pour que l'user voit le timestamp du déploy.
    // Sinon (texte = juste 'vXX.Y' plain), on overwrite avec VERSION runtime.
    const footer = document.getElementById('footer-version');
    document.documentElement.dataset.psAppVersion = VERSION;
    window.PS_APP_VERSION = VERSION;
    if (!footer) return null;
    const previous = (footer.textContent || '').trim();
    footer.dataset.appVersion = VERSION;
    const isBuildStamped = /^v\d+\.\d+-\d{8}-\d{6}$/.test(previous);
    if (isBuildStamped) {
      // HTML est stamped → on ne touche pas. Juste record la valeur visible.
      window.PS_BUILD_LABEL = previous;
      footer.title = `Build ${previous} · base ${VERSION}`;
      return {
        previous,
        current: previous,
        driftFixed: false,
      };
    }
    // HTML pas stamped → behavior original (overwrite avec VERSION).
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
    const byFile = new Map();
    nodes.forEach((node) => {
      const src = node.dataset.psLazyScript || '';
      if (!src) return;
      let file = src.split('?')[0].split('/').pop() || src;
      file = file.toLowerCase();
      if (!byFile.has(file)) byFile.set(file, src);
    });
    const urls = Array.from(new Set(byFile.values()));
    if (!urls.length || window.__psLazySignalsScheduled) return;
    window.__psLazySignalsScheduled = true;

    const PACKS = {
      model: [
        'lightgbm_weights.js',
        'stacking_meta_weights.js',
        'feature_engineering_v5.js',
        'model_versions.js',
        'calibration_method.js',
        'ensemble_adaptive_weights.js',
      ],
      backtest: [
        'feature_drift_v5.js',
        'multitask_v5.js',
        'backtest_deep_v5.js',
        'adversarial_validation.js',
        'sports_coverage_extended.js',
      ],
      detail: [
        'team_priors.js',
        'bayesian_priors.js',
        'cold_start_v5.js',
        'season_phase.js',
        'star_players.js',
        'xg_decay_params.js',
        'team_travel.js',
        'schedule_density.js',
        'stadium_effects.js',
        'coach_tenure.js',
        'derbies.js',
        'team_stats_extended.js',
      ],
      football: [
        'football_player_props.js',
        'referee_stats.js',
        'total_corners.js',
        'total_cards.js',
        'total_fouls.js',
      ],
      props: [
        'nba_player_props.js',
        'mlb_player_props.js',
        'nhl_playoff_markets.js',
        'tennis_elo_surface.js',
        'goalie_pitcher_context.js',
      ],
    };
    PACKS.all = Object.keys(PACKS)
      .filter((name) => name !== 'all')
      .flatMap((name) => PACKS[name]);

    const loadedAssets = new Set(Array.from(document.querySelectorAll('script[data-ps-lazy-loaded]'))
      .map((script) => script.dataset.psLazyLoaded || '')
      .filter(Boolean));
    const failedAssets = new Set();
    const loadingAssets = new Map();
    const status = {
      total: urls.length,
      pending: urls.length,
      loaded: 0,
      failed: 0,
      startedAt: null,
      finishedAt: null,
      reason: '',
      packs: {},
      assets: {},
      errors: [],
    };
    urls.forEach((src) => {
      status.assets[src] = { state: loadedAssets.has(src) ? 'loaded' : 'pending', packs: [] };
    });
    window.PS_LAZY_SIGNAL_STATUS = status;

    const updateCounts = () => {
      status.loaded = loadedAssets.size;
      status.failed = failedAssets.size;
      status.pending = Math.max(0, urls.length - status.loaded - status.failed);
      if (status.pending === 0 && !status.finishedAt) status.finishedAt = performance.now();
    };
    const assetSrcsForPack = (packName) => {
      const files = PACKS[packName] || [];
      return Array.from(new Set(files.map((file) => byFile.get(file)).filter(Boolean)));
    };
    const loadOne = (src, packName) => {
      if (status.assets[src] && packName && !status.assets[src].packs.includes(packName)) {
        status.assets[src].packs.push(packName);
      }
      if (loadedAssets.has(src)) return Promise.resolve({ src, ok: true, cached: true });
      if (loadingAssets.has(src)) return loadingAssets.get(src);
      const promise = new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = false;
        script.defer = true;
        script.dataset.psLazyLoaded = src;
        if (status.assets[src]) status.assets[src].state = 'loading';
        script.onload = () => {
          loadedAssets.add(src);
          loadingAssets.delete(src);
          if (status.assets[src]) status.assets[src].state = 'loaded';
          updateCounts();
          resolve({ src, ok: true });
        };
        script.onerror = () => {
          failedAssets.add(src);
          loadingAssets.delete(src);
          if (status.assets[src]) status.assets[src].state = 'failed';
          if (!status.errors.includes(src)) status.errors.push(src);
          updateCounts();
          resolve({ src, ok: false });
        };
        document.head.appendChild(script);
      });
      loadingAssets.set(src, promise);
      return promise;
    };

    const loadPack = async (packName, reason) => {
      const pack = packName || 'all';
      const srcs = pack === 'all' ? urls : assetSrcsForPack(pack);
      if (!srcs.length) return status;
      const packStatus = status.packs[pack] || {
        total: srcs.length,
        loaded: 0,
        failed: 0,
        startedAt: performance.now(),
        finishedAt: null,
        reason: reason || 'manual',
      };
      if (packStatus.finishedAt) return status;
      status.packs[pack] = packStatus;
      if (!status.startedAt) status.startedAt = performance.now();
      status.reason = reason || status.reason || 'manual';
      for (const src of srcs) {
        const result = await loadOne(src, pack);
        if (result.ok) packStatus.loaded += result.cached ? 0 : 1;
        else packStatus.failed += 1;
      }
      packStatus.finishedAt = performance.now();
      updateCounts();
      window.dispatchEvent(new CustomEvent('ps:lazy-signals-pack-ready', { detail: { pack, status } }));
      if (status.pending === 0) {
        window.dispatchEvent(new CustomEvent('ps:lazy-signals-ready', { detail: status }));
      }
      try {
        if (typeof window.applyPageView === 'function') window.applyPageView();
      } catch (_) {}
      return status;
    };

    const idle = (fn, timeout) => {
      if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: timeout || 3500 });
      else setTimeout(fn, timeout || 700);
    };
    const requestPacks = (packs, reason, immediate) => {
      const list = Array.isArray(packs) ? packs : [packs || 'all'];
      const unique = Array.from(new Set(list.filter(Boolean)));
      const run = () => unique.reduce((chain, pack) => chain.then(() => loadPack(pack, reason)), Promise.resolve(status));
      return immediate ? run() : idle(run, 2500);
    };
    const packsForRoute = () => {
      const raw = (location.hash || '#dashboard').replace(/^#/, '').split('?')[0];
      if (!raw || raw === 'dashboard' || raw === 'academie' || raw === 'profil' || raw === 'sante' || raw === 'alertes') return [];
      if (/^match\//.test(raw)) return ['detail', 'football', 'props'];
      if (raw === 'buteurs') return ['football'];
      if (raw === 'backtest' || raw === 'historique' || raw === 'bilan' || raw === 'performance' || raw === 'credibilite') return ['model', 'backtest'];
      if (raw === 'tous' || raw === 'compare' || raw === 'combines' || raw === 'montantes') return ['model'];
      if (/^(sports|rugby|handball|volley|esport|combat|cyclisme|ski|athle|tennis|foot|nfl)/.test(raw)) return ['model'];
      return [];
    };

    window.PS_loadLazySignals = (pack, reason) => requestPacks(pack || 'all', reason || 'manual', true);
    window.PS_requestLazySignalPack = requestPacks;
    window.addEventListener('ps:need-lazy-signals', (event) => {
      const detail = event.detail || {};
      requestPacks(detail.pack || detail.packs || packsForRoute(), detail.reason || 'event');
    }, { passive: true });
    window.addEventListener('hashchange', () => {
      const packs = packsForRoute();
      if (packs.length) requestPacks(packs, 'hashchange');
    }, { passive: true });
    document.addEventListener('click', (event) => {
      const target = event.target && event.target.closest && event.target.closest('[data-big-detail],[data-match-id]');
      if (target) requestPacks(['detail', 'football', 'props'], 'detail-intent');
    }, { passive: true });
    const initialPacks = packsForRoute();
    if (initialPacks.length) {
      if (document.readyState === 'complete') setTimeout(() => requestPacks(initialPacks, 'initial-page'), 900);
      else window.addEventListener('load', () => setTimeout(() => requestPacks(initialPacks, 'initial-page'), 900), { once: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
})();
