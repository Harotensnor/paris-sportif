#!/usr/bin/env node
/*
 * Browser history probe.
 *
 * Verifies that hash navigation, browser Back and browser Forward keep the
 * visible page in sync with location.hash. This catches SPA regressions where
 * applyPageView updates the URL but leaves the previous hub mounted.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHROME_EXE = process.env.CHROME_EXECUTABLE_PATH || '';

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.jsonl')) return 'application/x-ndjson; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.webmanifest')) return 'application/manifest+json';
  return 'application/octet-stream';
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let url = req.url.split('?')[0];
      if (url === '/') url = '/pronostics.html';
      const filePath = path.join(ROOT, decodeURIComponent(url));
      if (!filePath.startsWith(ROOT)) {
        res.statusCode = 403;
        res.end('forbidden');
        return;
      }
      fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
          res.statusCode = 404;
          res.end('not found');
          return;
        }
        res.setHeader('Content-Type', contentType(filePath));
        res.setHeader('Cache-Control', 'no-store');
        fs.createReadStream(filePath).pipe(res);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

const failures = [];
function check(label, ok, detail = '') {
  console.log(`  [${ok ? 'ok' : 'FAIL'}] ${label}${ok ? '' : ' - ' + detail}`);
  if (!ok) failures.push({ label, detail });
}

async function waitForRoute(page, hash, wrapId) {
  await page.waitForFunction(
    ({ hash, wrapId }) => location.hash === hash && !!document.getElementById(wrapId)?.offsetParent,
    { hash, wrapId },
    { timeout: 4000 }
  );
}

async function assertRoute(page, hash, wrapId, label) {
  const state = await page.evaluate(({ hash, wrapId }) => {
    const visible = !!document.getElementById(wrapId)?.offsetParent;
    const visibleIds = Array.from(document.querySelectorAll('#main-content > div'))
      .filter(el => el.offsetParent !== null)
      .map(el => el.id)
      .filter(Boolean);
    return { hash: location.hash, visible, visibleIds };
  }, { hash, wrapId });
  check(label, state.hash === hash && state.visible, JSON.stringify(state));
}

(async () => {
  const server = await startServer();
  const port = server.address().port;
  console.log(`[probe-back-forward] static server on http://127.0.0.1:${port}`);

  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('userPrefs', JSON.stringify({
      onboardingDone: true,
      consentLocalStorage: 'accepted',
      theme: 'dark'
    }));
    sessionStorage.setItem('autoRefreshDone', '1');
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror:${e.message}`));
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/Failed to load resource|ERR_|MIME type/i.test(text)) return;
    errors.push(`console:${text}`);
  });

  await page.goto(`http://127.0.0.1:${port}/pronostics.html#dashboard`, { waitUntil: 'domcontentloaded' });
  await waitForRoute(page, '#dashboard', 'dashboard-wrap');
  await assertRoute(page, '#dashboard', 'dashboard-wrap', 'initial dashboard visible');

  await page.evaluate(() => { location.hash = '#tous'; });
  await waitForRoute(page, '#tous', 'tous-wrap');
  await page.evaluate(() => { location.hash = '#performance'; });
  await waitForRoute(page, '#performance', 'performance-wrap');
  await page.evaluate(() => { location.hash = '#credibilite'; });
  await waitForRoute(page, '#credibilite', 'credibilite-wrap');

  await page.goBack();
  await waitForRoute(page, '#performance', 'performance-wrap');
  await assertRoute(page, '#performance', 'performance-wrap', 'back restores performance');

  await page.goBack();
  await waitForRoute(page, '#tous', 'tous-wrap');
  await assertRoute(page, '#tous', 'tous-wrap', 'second back restores tous');

  await page.goForward();
  await waitForRoute(page, '#performance', 'performance-wrap');
  await assertRoute(page, '#performance', 'performance-wrap', 'forward restores performance');

  await page.evaluate(() => {
    const btn = document.querySelector('[data-suivi-page="historique"]');
    if (!btn) throw new Error('missing historique suivi button');
    btn.click();
  });
  await waitForRoute(page, '#historique', 'historique-wrap');
  await assertRoute(page, '#historique', 'historique-wrap', 'suivi tab syncs historique hash');

  await page.goBack();
  await waitForRoute(page, '#performance', 'performance-wrap');
  await assertRoute(page, '#performance', 'performance-wrap', 'back from suivi tab restores performance');

  check('zero console errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  await browser.close();
  server.close();
  console.log(`\n[probe-back-forward] ${failures.length ? failures.length + ' failure(s)' : 'all green'}`);
  if (failures.length) process.exit(1);
})().catch(err => {
  console.error('[probe-back-forward] runner crashed:', err);
  process.exit(2);
});
