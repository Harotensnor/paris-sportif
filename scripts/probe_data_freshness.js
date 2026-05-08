#!/usr/bin/env node
/*
 * Data freshness UI probe.
 *
 * Serves the static app twice and rewrites only the top-level
 * PRONOSTICS_DATA.generated_at timestamp in data_lite.js/data.js:
 *   - fresh: no stale/pipeline-down warning may be visible
 *   - stale: read-only/stale warning must be visible and getDataAge() is down
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

function rewriteGeneratedAt(text, iso) {
  return text.replace(
    /window\.PRONOSTICS_DATA\s*=\s*\{"generated_at":"[^"]+"/,
    `window.PRONOSTICS_DATA = {"generated_at":"${iso}"`
  );
}

function startServer(ageMin) {
  const iso = new Date(Date.now() - ageMin * 60000).toISOString();
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
        if (url === '/data_lite.js' || url === '/data.js') {
          const body = rewriteGeneratedAt(fs.readFileSync(filePath, 'utf8'), iso);
          res.end(body);
          return;
        }
        fs.createReadStream(filePath).pipe(res);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, iso }));
    server.on('error', reject);
  });
}

const failures = [];
function check(label, ok, detail = '') {
  console.log(`  [${ok ? 'ok' : 'FAIL'}] ${label}${ok ? '' : ' - ' + detail}`);
  if (!ok) failures.push({ label, detail });
}

async function runCase(browser, label, ageMin) {
  const { server, iso } = await startServer(ageMin);
  const port = server.address().port;
  console.log(`\n=== ${label}: age=${ageMin}min server=http://127.0.0.1:${port} ===`);
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
  await page.waitForTimeout(2200);
  const state = await page.evaluate(() => {
    const body = document.body.innerText || '';
    const age = typeof window.getDataAge === 'function'
      ? window.getDataAge(window.PRONOSTICS_DATA)
      : { minutes: null, state: 'missing' };
    const staleText = /(Données anciennes|Données en retard|lecture seule|Pipeline en panne)/i.test(body);
    const tableVisible = !!document.querySelector('.v36-table-panel .v36-picks-table');
    const footerText = document.querySelector('#footer-data-age, .footer-data-age')?.innerText || '';
    return { age, staleText, tableVisible, footerText, generatedAt: window.PRONOSTICS_DATA?.generated_at || null };
  });
  check(`${label}: generated_at rewritten`, state.generatedAt === iso, JSON.stringify(state));
  if (ageMin <= 30) {
    check(`${label}: getDataAge fresh`, state.age.minutes <= 30 && state.age.state === 'fresh', JSON.stringify(state.age));
    check(`${label}: no stale warning visible`, !state.staleText, JSON.stringify(state));
    check(`${label}: dashboard table visible`, state.tableVisible, JSON.stringify(state));
  } else {
    check(`${label}: getDataAge down`, state.age.minutes > 240 && state.age.state === 'down', JSON.stringify(state.age));
    check(`${label}: stale warning visible`, state.staleText, JSON.stringify(state));
  }
  check(`${label}: zero console errors`, errors.length === 0, errors.slice(0, 3).join(' | '));

  await ctx.close();
  server.close();
}

(async () => {
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  await runCase(browser, 'fresh-data', 5);
  await runCase(browser, 'stale-data', 300);
  await browser.close();
  console.log(`\n[probe-data-freshness] ${failures.length ? failures.length + ' failure(s)' : 'all green'}`);
  if (failures.length) process.exit(1);
})().catch(err => {
  console.error('[probe-data-freshness] runner crashed:', err);
  process.exit(2);
});
