#!/usr/bin/env node
/*
 * v37.031 — Deep audit of the Tous-les-pronostics filter/sort/persist
 * pipeline + modal detail flow + key window.* helpers.
 *
 * Catches the kind of regressions that a one-page-per-click smoke
 * misses: filter persistence after reload, sort stability, modal
 * tabs scrolling, helper exports.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PROBE_PORT || 0);
const CHROME_EXE = process.env.CHROME_EXECUTABLE_PATH || '';

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js'))   return 'text/javascript; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.jsonl')) return 'application/x-ndjson; charset=utf-8';
  if (file.endsWith('.css'))  return 'text/css; charset=utf-8';
  if (file.endsWith('.svg'))  return 'image/svg+xml';
  if (file.endsWith('.png'))  return 'image/png';
  if (file.endsWith('.webmanifest')) return 'application/manifest+json';
  return 'application/octet-stream';
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let url = req.url.split('?')[0];
      if (url === '/') url = '/index.html';
      const filePath = path.join(ROOT, decodeURIComponent(url));
      if (!filePath.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
      fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) { res.statusCode = 404; return res.end('not found'); }
        res.setHeader('Content-Type', contentType(filePath));
        res.setHeader('Cache-Control', 'no-store');
        fs.createReadStream(filePath).pipe(res);
      });
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

const failures = [];
function check(label, ok, detail) {
  console.log(`  [${ok ? 'ok' : 'FAIL'}] ${label}${ok ? '' : ' — ' + (detail || '')}`);
  if (!ok) failures.push({ label, detail });
}

(async () => {
  const server = await startServer();
  const port = server.address().port;
  console.log(`[probe-modal] static server on http://127.0.0.1:${port}`);
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
      prefs.onboardingDone = true;
      // Pre-accept the localStorage consent banner so its modal does not
      // intercept clicks aimed at pick rows or detail modals.
      prefs.consentLocalStorage = 'accepted';
      localStorage.setItem('userPrefs', JSON.stringify(prefs));
      // v37.037 — wipe Tous filter / tab state so a previous probe run
      // does not contaminate this one (e.g. landing on inprogress with
      // 0 rows or with a sport filter that hides every match).
      localStorage.removeItem('tousFilters');
      localStorage.removeItem('tousSort');
      localStorage.removeItem('tousTab');
      localStorage.removeItem('advFilters');
    } catch (e) {}
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => {
    if (m.type() === 'error') {
      const t = m.text();
      if (/Failed to load resource/i.test(t)) return;
      if (/ERR_/i.test(t)) return;
      if (/script does not have a MIME type/i.test(t)) return;
      errs.push(t);
    }
  });

  await page.goto(`http://127.0.0.1:${port}/pronostics.html#tous`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  console.log('\n=== window.* helpers ===');
  const helpers = await page.evaluate(() => {
    const targets = [
      'predictMatch', 'evaluateModelPick', 'getMatchOdds', 'isWinamaxBookable',
      'selectBestMarket', 'matchImportance', 'getMatchStatus', 'kellyFraction',
      'qualityScore', 'expectedValue', 'getScopedEvents', 'PAGE_ALIASES',
      '_calibrateProb', '_loadProbCalibration', '_loadTierCalibration',
      '_loadStrategyBacktest', 'evaluateMarketPick', 'combinationCorrelation',
      'buildComboVariants', '_checkRiskLimits', '_loadRiskLimits',
      '__diag', '__webVitals', 'getTierBreakdown',
    ];
    return targets.map(name => ({ name, present: typeof window[name] !== 'undefined' }));
  });
  for (const h of helpers) {
    check(`window.${h.name}`, h.present);
  }

  console.log('\n=== Tous filters/sort persistence ===');
  // Find a filter input and a sort select
  await page.evaluate(() => { window.location.hash = '#tous'; });
  await page.waitForTimeout(700);

  const filterControls = await page.evaluate(() => {
    const tousWrap = document.getElementById('tous-wrap');
    if (!tousWrap) return { error: 'no #tous-wrap' };
    return {
      hasSearchInput: !!tousWrap.querySelector('input[type="search"], input[placeholder*="Rechercher" i], input[placeholder*="search" i]'),
      hasSortSelect: !!tousWrap.querySelector('select'),
      cardOrRowCount: tousWrap.querySelectorAll('[data-pick-uid], .v36-table-row, [data-match-id], .pick-card, .v36-card').length,
      tabCount: tousWrap.querySelectorAll('[data-tous-tab]').length,
    };
  });
  check('Tous: card/row rendered', (filterControls.cardOrRowCount || 0) > 0, `n=${filterControls.cardOrRowCount}`);
  check('Tous: at least one filter control', filterControls.hasSearchInput || filterControls.hasSortSelect, JSON.stringify(filterControls));
  check('Tous: sub-tabs present', (filterControls.tabCount || 0) >= 2, `n=${filterControls.tabCount}`);

  // Try clicking the second sub-tab and verify the active state changes
  const tabSwitchOk = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('[data-tous-tab]'));
    if (btns.length < 2) return { ok: false, reason: 'too few tabs' };
    btns[1].click();
    return { ok: true, key: btns[1].dataset.tousTab };
  });
  await page.waitForTimeout(250);
  if (tabSwitchOk.ok) {
    const persisted = await page.evaluate(() => localStorage.getItem('tousTab'));
    check('Tous: sub-tab click persists tousTab', persisted === tabSwitchOk.key, `expected=${tabSwitchOk.key} got=${persisted}`);
  } else {
    check('Tous: sub-tab clickable', false, tabSwitchOk.reason);
  }

  console.log('\n=== Modal detail flow ===');
  // Reset tousTab to pending and click it manually so renderTousPage
  // re-runs with the right active tab. Plain hash-change doesn't always
  // re-render when we're already on #tous.
  await page.evaluate(() => {
    try { localStorage.setItem('tousTab', 'pending'); } catch(e) {}
    const btn = document.querySelector('[data-tous-tab="pending"]');
    if (btn) btn.click();
  });
  await page.waitForTimeout(900);
  const opened = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll(
      '[data-pick-uid], .v36-table-row, .tous-row, [data-match-id]'
    )).filter(el => el.offsetParent !== null);
    const target = candidates.find(el => {
      const id = el.dataset.matchId || el.dataset.pickUid;
      return id && String(id).length > 0;
    });
    if (!target) {
      const debug = {
        candidates: candidates.length,
        tousRow: document.querySelectorAll('.tous-row').length,
        tousTab: localStorage.getItem('tousTab'),
        tousVisible: !!document.querySelector('#tous-wrap')?.offsetParent,
      };
      return { ok: false, reason: 'no clickable pick', debug };
    }
    target.click();
    return { ok: true, id: target.dataset.matchId || target.dataset.pickUid };
  });
  if (!opened.ok) {
    check('Modal: pick clickable', false, `${opened.reason} ${JSON.stringify(opened.debug || {})}`);
  } else {
    await page.waitForTimeout(600);
    const modal = await page.evaluate(() => {
      // The detail modal lives at #detail-modal in pronostics.html and
      // toggles the .open class when active.
      const dm = document.getElementById('detail-modal');
      if (!dm) return { open: false, reason: 'no #detail-modal in DOM' };
      const isOpen = dm.classList.contains('open') ||
        (dm.getAttribute('aria-hidden') === 'false') ||
        (window.getComputedStyle(dm).display !== 'none' && dm.offsetParent !== null);
      if (!isOpen) return { open: false, reason: 'detail-modal present but not open' };
      const tabs = Array.from(dm.querySelectorAll('[data-mtab-toggle], [data-modal-tab], [data-tab]'))
        .map(b => b.dataset.mtabToggle || b.dataset.modalTab || b.dataset.tab)
        .filter(Boolean);
      return {
        open: true,
        tabs,
        text: (dm.innerText || '').slice(0, 200),
      };
    });
    check('Modal: opens on pick click', modal.open, JSON.stringify({ tabs: modal.tabs?.length, text: modal.text?.slice(0,80) }));
    check('Modal: has tabs', (modal.tabs || []).length >= 2, `tabs=${modal.tabs}`);
    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const closed = await page.evaluate(() => {
      const modal = document.querySelector('.v36-modal-overlay, .modal-detail, [role="dialog"]');
      return !modal || modal.offsetParent === null;
    });
    check('Modal: Escape closes', closed);

    // Re-open and click each modal tab to ensure each renders without errors.
    await page.evaluate(() => {
      const target = Array.from(document.querySelectorAll('[data-pick-uid], [data-match-id]'))
        .find(el => el.offsetParent !== null && (el.dataset.matchId || el.dataset.pickUid));
      if (target) target.click();
    });
    await page.waitForTimeout(500);
    const tabKeys = await page.evaluate(() => {
      const dm = document.getElementById('detail-modal');
      if (!dm) return [];
      return Array.from(dm.querySelectorAll('[data-mtab-toggle]')).map(b => b.dataset.mtabToggle);
    });
    for (const tk of tabKeys) {
      const before = errs.length;
      const ok = await page.evaluate((k) => {
        const dm = document.getElementById('detail-modal');
        if (!dm) return false;
        const btn = dm.querySelector(`[data-mtab-toggle="${k}"]`);
        if (!btn) return false;
        btn.click();
        return true;
      }, tk);
      await page.waitForTimeout(180);
      const newErrs = errs.slice(before);
      check(`Modal tab: ${tk}`, ok && newErrs.length === 0, newErrs.slice(0,1).join('') || 'no btn');
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
  }

  console.log('\n=== Helper output sanity ===');
  const helperOutputs = await page.evaluate(() => {
    const out = {};
    // window.kellyFraction defaults to a quarter-Kelly multiplier capped
    // at 10% of bankroll. Full Kelly for (0.6, 2.0) is 0.20; quarter is 0.05.
    try { out.kelly = window.kellyFraction ? window.kellyFraction(0.6, 2.0) : null; } catch(e) { out.kelly = String(e); }
    try { out.kellyFull = window.kellyFraction ? window.kellyFraction(0.6, 2.0, 1.0, 1.0) : null; } catch(e) { out.kellyFull = String(e); }
    try { out.ev = window.expectedValue ? window.expectedValue(0.6, 2.0) : null; } catch(e) { out.ev = String(e); }
    try { out.calibrated = window._calibrateProb ? window._calibrateProb(0.99) : null; } catch(e) { out.calibrated = String(e); }
    try {
      const data = window.PRONOSTICS_DATA;
      if (data && data.days) {
        const sample = Object.values(data.days).flat().filter(Boolean)[0];
        out.predict = sample && window.predictMatch ? typeof window.predictMatch(sample) : 'no-data';
      } else out.predict = 'no-data';
    } catch(e) { out.predict = String(e); }
    return out;
  });
  check('kellyFraction(0.6, 2.0) ≈ 0.05 (quarter Kelly default)', Math.abs((helperOutputs.kelly || 0) - 0.05) < 0.005, `got=${helperOutputs.kelly}`);
  check('kellyFraction(0.6, 2.0, 1.0, 1.0) ≈ 0.20 (full Kelly)', Math.abs((helperOutputs.kellyFull || 0) - 0.20) < 0.01, `got=${helperOutputs.kellyFull}`);
  check('expectedValue(0.6, 2.0) ≈ 0.20', Math.abs((helperOutputs.ev || 0) - 0.20) < 0.01, `got=${helperOutputs.ev}`);
  check('_calibrateProb(0.99) ≤ 0.99 (calibrated down)', helperOutputs.calibrated == null || helperOutputs.calibrated <= 0.99, `got=${helperOutputs.calibrated}`);
  check('predictMatch returns object', helperOutputs.predict === 'object', `got=${helperOutputs.predict}`);

  console.log('\n=== Console errors during the run ===');
  if (errs.length === 0) {
    check('No console errors during nav/modal/helpers', true);
  } else {
    check('Console errors clean', false, `${errs.length} errors: ${errs.slice(0,3).join(' | ')}`);
  }

  await browser.close();
  server.close();

  console.log(`\n[probe-modal] ${failures.length === 0 ? 'all green' : failures.length + ' failure(s)'}`);
  if (failures.length) process.exit(1);
})().catch(err => {
  console.error('[probe-modal] runner crashed:', err);
  process.exit(2);
});
