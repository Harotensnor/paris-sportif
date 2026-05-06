#!/usr/bin/env node
/*
 * Corrupted localStorage resilience probe.
 *
 * A real browser can keep stale or hand-edited preferences for months. This
 * probe poisons the main JSON-backed keys before boot and verifies the app
 * still mounts the critical pages without console errors.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHROME_EXE = process.env.CHROME_EXECUTABLE_PATH || '';
const ROUTES = [
  ['#dashboard', 'Accueil'],
  ['#tous', 'Tous'],
  ['#performance', 'Performance'],
  ['#profil', 'Profil'],
];
const CORRUPT_KEYS = [
  'userPrefs',
  'paris_sportif_v36_home_filter',
  'paris_sportif_tracked_bets',
  'paris_sportif_js_errors_v1',
  'pwaPagesSeen',
  'profilAccordionState',
  'usage_telemetry',
  'usage_telemetry_prefs',
];

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

(async () => {
  const server = await startServer();
  const port = server.address().port;
  console.log(`[probe-corrupt-storage] static server on http://127.0.0.1:${port}`);
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  await ctx.addInitScript((keys) => {
    for (const key of keys) localStorage.setItem(key, '{not-json');
    localStorage.setItem('paris_sportif_onboarded_v1', '1');
    localStorage.setItem('paris_sportif_onboarded_v2', '1');
    sessionStorage.setItem('autoRefreshDone', '1');
  }, CORRUPT_KEYS);

  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(`pageerror:${err.message}`));
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/Failed to load resource|ERR_|MIME type/i.test(text)) return;
    errors.push(`console:${text}`);
  });

  for (const [hash, label] of ROUTES) {
    const before = errors.length;
    await page.goto(`http://127.0.0.1:${port}/pronostics.html${hash}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.readyState === 'complete', null, { timeout: 7000 });
    await page.waitForTimeout(450);
    const state = await page.evaluate(() => ({
      textLen: document.body.innerText.length,
      modal: !!document.querySelector('.onboard-overlay'),
      diag: typeof window.__diag === 'function' ? window.__diag() : null,
    }));
    check(`${label} renders with corrupt storage`, state.textLen > 800, JSON.stringify(state));
    check(`${label} does not reopen onboarding`, state.modal === false, JSON.stringify(state));
    check(`${label} has zero new console errors`, errors.length === before, errors.slice(before).join(' | '));
  }

  await browser.close();
  server.close();
  if (failures.length) {
    console.error(`[probe-corrupt-storage] ${failures.length} failure(s)`);
    process.exit(1);
  }
  console.log('[probe-corrupt-storage] all green');
})().catch(err => {
  console.error('[probe-corrupt-storage] runner crashed:', err);
  process.exit(2);
});
