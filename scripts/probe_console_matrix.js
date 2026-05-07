#!/usr/bin/env node
/*
 * 16 routes × 2 viewports, with a fresh page load each time.
 * This locks the "0 console error on 32 page loads" release criterion in a
 * report that is easier to read than the broader all-pages probe.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PROBE_PORT || 0);
const CHROME_EXE = process.env.CHROME_EXECUTABLE_PATH || '';
const REPORT = path.join(ROOT, '.cache', 'probe-console-matrix.json');

const ROUTES = [
  '#dashboard', '#tous', '#performance', '#academie',
  '#profil', '#buteurs', '#sante', '#backtest',
  '#credibilite', '#alertes', '#historique', '#bilan',
  '#favoris', '#combines', '#valeur', '#calendrier',
];
const VIEWPORTS = [
  { label: 'desktop', width: 1280, height: 800 },
  { label: 'mobile', width: 375, height: 812 },
];

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.webmanifest')) return 'application/manifest+json';
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.svg')) return 'image/svg+xml';
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
        return res.end('forbidden');
      }
      fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
          res.statusCode = 404;
          return res.end('not found');
        }
        res.setHeader('Content-Type', contentType(filePath));
        res.setHeader('Cache-Control', 'no-store');
        fs.createReadStream(filePath).pipe(res);
      });
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

function isIgnorable(text) {
  if (/Failed to load resource/i.test(text) && /404/.test(text)) return true;
  if (/ERR_(CERT|NAME_NOT_RESOLVED|TIMED_OUT|CONNECTION_(REFUSED|RESET|CLOSED)|FAILED|EMPTY_RESPONSE|BLOCKED_BY_CLIENT)/i.test(text)) return true;
  if (/clubelo\.com|espncdn\.com|sofascore\.com|gstatic\.com|plausible|cloudflareinsights/i.test(text)) return true;
  if (/script does not have a MIME type/i.test(text)) return true;
  return false;
}

(async () => {
  const server = await startServer();
  const port = server.address().port;
  console.log(`[probe-console-matrix] static server on http://127.0.0.1:${port}`);
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const results = [];
  const failures = [];

  for (const viewport of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    await ctx.addInitScript(() => {
      try {
        const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
        prefs.onboardingDone = true;
        prefs.consentLocalStorage = 'accepted';
        localStorage.setItem('userPrefs', JSON.stringify(prefs));
      } catch (e) {}
    });
    for (const route of ROUTES) {
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push({ type: 'pageerror', text: e.message }));
      page.on('console', msg => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        if (!isIgnorable(text)) errors.push({ type: 'console.error', text });
      });
      await page.goto(`http://127.0.0.1:${port}/pronostics.html${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(900);
      const textLength = await page.evaluate(() => (document.querySelector('#main-content')?.innerText || '').trim().length);
      const ok = errors.length === 0 && textLength > 100;
      const row = { viewport: viewport.label, route, ok, errors, textLength };
      results.push(row);
      console.log(`  [${ok ? 'ok' : 'FAIL'}] ${viewport.label.padEnd(7)} ${route.padEnd(13)} errors=${errors.length} text=${textLength}`);
      if (!ok) failures.push(row);
      await page.close();
    }
    await ctx.close();
  }

  await browser.close();
  server.close();
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify({
    generated_at: new Date().toISOString(),
    total: results.length,
    passed: results.filter(r => r.ok).length,
    results,
  }, null, 2), 'utf8');

  if (failures.length) {
    console.error(`\n[probe-console-matrix] ${failures.length} failure(s); report=${REPORT}`);
    process.exit(1);
  }
  console.log(`\n[probe-console-matrix] all green (${results.length}/${results.length}); report=${REPORT}`);
})().catch(err => {
  console.error('[probe-console-matrix] fatal', err);
  process.exit(1);
});
