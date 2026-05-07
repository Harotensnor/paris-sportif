#!/usr/bin/env node
/*
 * Runtime QA probe.
 *
 * Verifies the local-only DevTools surface: __errors(), __bugReport(),
 * __exportBugReport() and deterministic local canary assignment.
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

(async () => {
  const server = await startServer();
  const port = server.address().port;
  console.log(`[probe-qa-runtime] static server on http://127.0.0.1:${port}`);
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('paris_sportif_onboarded_v1', '1');
    localStorage.setItem('paris_sportif_onboarded_v2', '1');
    sessionStorage.setItem('autoRefreshDone', '1');
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(`pageerror:${err.message}`));
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/Failed to load resource|ERR_|MIME type/i.test(text)) return;
    errors.push(`console:${text}`);
  });

  await page.goto(`http://127.0.0.1:${port}/pronostics.html#dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.__errors === 'function' && typeof window.__bugReport === 'function');
  await page.waitForTimeout(300);

  const before = await page.evaluate(() => window.__errors().length);
  check('__errors() exposed', Number.isInteger(before) && before >= 0, String(before));

  await page.evaluate(() => {
    window.dispatchEvent(new ErrorEvent('error', {
      message: 'qa-runtime synthetic error',
      error: new Error('qa-runtime synthetic error'),
    }));
  });
  await page.waitForFunction(() => window.__errors().some(err => /qa-runtime synthetic error/.test(err.msg || '')));
  const captured = await page.evaluate(() => window.__errors().filter(err => /qa-runtime synthetic error/.test(err.msg || '')).length);
  check('synthetic error is captured locally once', captured === 1, String(captured));

  const report = await page.evaluate(() => window.__bugReport());
  check('bug report includes local context', report && report.source === 'qa-runtime-local' && report.context && report.context.url, JSON.stringify(report));
  check('bug report includes captured errors', report && report.errors && report.errors.some(err => /qa-runtime synthetic error/.test(err.msg || '')), JSON.stringify(report && report.errors));

  const variants = await page.evaluate(() => {
    const first = window.__qaCanaryVariant('probe-runtime');
    const second = window.__qaCanaryVariant('probe-runtime');
    return { first, second };
  });
  check('canary variant is local and stable', variants.first === variants.second && /^(control|variant)$/.test(variants.first), JSON.stringify(variants));

  const exported = await page.evaluate(() => {
    const original = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function patchedClick() {};
    try {
      return window.__exportBugReport();
    } finally {
      HTMLAnchorElement.prototype.click = original;
    }
  });
  check('export bug report returns payload', exported && exported.source === 'qa-runtime-local', JSON.stringify(exported));
  check('probe run has zero console errors', errors.length === 0, errors.join(' | '));

  await browser.close();
  server.close();
  if (failures.length) {
    console.error(`[probe-qa-runtime] ${failures.length} failure(s)`);
    process.exit(1);
  }
  console.log('[probe-qa-runtime] all green');
})().catch(err => {
  console.error('[probe-qa-runtime] runner crashed:', err);
  process.exit(2);
});
