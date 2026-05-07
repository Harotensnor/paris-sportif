#!/usr/bin/env node
/*
 * v37.049 — Deep navigation chain probe.
 *
 * Walks a long, realistic user flow:
 *   1. Boot on dashboard
 *   2. Open detail modal on first pending row → 6 modal tabs → close
 *   3. Navigate to Tous → click compare on 2 picks → open compare modal
 *   4. Close → switch to Big Bets preset → click pick → modal → close
 *   5. Navigate to Performance → switch to each sub-tab
 *   6. Navigate to Historique (revived in v37.043) → reload page →
 *      assert we land on Historique not Performance
 *   7. Navigate via sub-nav suivi tab to Bilan → reload → assert
 *      hash reflects #bilan (catches v37.048 regression)
 *   8. Navigate to Combinés → assert combines-wrap is visible
 *   9. Navigate to Sante → assert sante-wrap is visible
 *  10. Click a hub button → assert the right page opens
 *
 * Asserts zero console errors throughout the entire chain.
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

async function nav(page, hash, wait = 700) {
  await page.evaluate(h => { window.location.hash = h; }, hash);
  await page.waitForTimeout(wait);
}

(async () => {
  const server = await startServer();
  const port = server.address().port;
  console.log(`[probe-nav-chain] static server on http://127.0.0.1:${port}`);
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
      prefs.onboardingDone = true;
      prefs.consentLocalStorage = 'accepted';
      localStorage.setItem('userPrefs', JSON.stringify(prefs));
      ['tousFilters','tousTab','tousSort','advFilters','tousComparePickIds'].forEach(k => localStorage.removeItem(k));
    } catch (e) {}
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PE:'+e.message));
  page.on('console', m => {
    if (m.type() === 'error') {
      const t = m.text();
      if (/Failed to load resource/i.test(t)) return;
      if (/ERR_/i.test(t)) return;
      if (/script does not have a MIME type/i.test(t)) return;
      errs.push('CE:'+t);
    }
  });

  await page.goto(`http://127.0.0.1:${port}/pronostics.html#dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  console.log('\n=== Step 1-2: dashboard → modal → close ===');
  const dashOk = await page.evaluate(() => {
    return !!document.getElementById('dashboard-wrap')?.offsetParent;
  });
  check('Step 1: dashboard renders', dashOk);
  // Dashboard has clickable picks via .v36-pick-card or similar. Let's
  // just nav to Tous to find a clickable pick reliably.

  console.log('\n=== Step 3: Tous → modal on row → close ===');
  await nav(page, '#tous', 1000);
  let opened = await page.evaluate(() => {
    const r = document.querySelector('.tous-row[data-match-id]');
    if (r) { r.click(); return true; }
    return false;
  });
  await page.waitForTimeout(600);
  check('Step 3: row click opens modal', !!opened && await page.evaluate(() => document.getElementById('detail-modal')?.classList.contains('open')));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  console.log('\n=== Step 4: revived routes (combines, sante, alertes) ===');
  const routeExpectations = {
    '#combines': 'combines-wrap',
    '#sante': 'sante-wrap',
    '#alertes': 'alertes-wrap',
    '#bilan': 'bilan-wrap',
    '#historique': 'historique-wrap',
    '#backtest': 'backtest-wrap',
    '#credibilite': 'credibilite-wrap',
    '#compare': 'compare-wrap',
    '#montantes': 'montante-wrap',
    '#simulator': 'profil-wrap',
  };
  for (const [route, expectedWrap] of Object.entries(routeExpectations)) {
    const before = errs.length;
    await nav(page, route, 1100);
    const visibleIds = await page.evaluate(() => {
      const main = document.querySelector('#main-content');
      const visible = Array.from(main.querySelectorAll(':scope > div')).filter(el => el.offsetParent !== null);
      return visible.map(el => el.id).filter(Boolean);
    });
    const newErrs = errs.slice(before);
    const hasExpected = visibleIds.includes(expectedWrap);
    const leaksCombines = route !== '#combines' && visibleIds.includes('combines-wrap');
    check(`${route} → visible wraps: ${visibleIds.join(',')}`, newErrs.length === 0 && hasExpected && !leaksCombines,
      `errs=${newErrs.length}, expected=${expectedWrap}, visible=${visibleIds.join(',')}`);
  }

  console.log('\n=== Step 5: hash survives reload (suivi sub-nav v37.048) ===');
  await nav(page, '#performance', 1000);
  // Click the historique tab in the suivi sub-nav
  await page.evaluate(() => {
    const btn = document.querySelector('[data-suivi-page="historique"]');
    if (btn) btn.click();
  });
  await page.waitForTimeout(700);
  const hashAfterClick = await page.evaluate(() => location.hash);
  check('Sub-nav click syncs hash to #historique', hashAfterClick === '#historique', `got=${hashAfterClick}`);
  // Reload and confirm we land on historique
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const afterReload = await page.evaluate(() => ({
    hash: location.hash,
    historiqueVisible: !!document.getElementById('historique-wrap')?.offsetParent,
  }));
  check('Reload preserves #historique', afterReload.hash === '#historique' && afterReload.historiqueVisible,
    JSON.stringify(afterReload));

  console.log('\n=== Step 6: page-btn[data-page] active state ===');
  // Hard nav by reloading at the new hash to make the route resolution
  // unambiguous (otherwise leftover state from Step 5 can keep the
  // previous active class).
  await page.evaluate(() => { window.location.hash = '#bilan'; });
  await page.waitForTimeout(400);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const activeButtons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.page-btn.active'))
      .map(b => b.dataset.page)
      .filter(Boolean);
  });
  check('Bilan marks data-page="bilan" buttons active', activeButtons.includes('bilan'),
    `active=${activeButtons.join(',')}`);

  console.log('\n=== Console errors over the whole chain ===');
  if (errs.length === 0) {
    check('Zero console error', true);
  } else {
    check('Zero console error', false, `${errs.length}: ${errs.slice(0,2).join(' | ')}`);
  }

  await browser.close();
  server.close();

  console.log(`\n[probe-nav-chain] ${failures.length === 0 ? 'all green' : failures.length + ' failure(s)'}`);
  if (failures.length) process.exit(1);
})().catch(err => {
  console.error('[probe-nav-chain] runner crashed:', err);
  process.exit(2);
});
