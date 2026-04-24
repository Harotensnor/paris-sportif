#!/usr/bin/env node
/*
 * Smoke test E2E pour pronostics.html.
 *
 * Ouvre chaque page principale, clique toutes les nav buttons, capte
 * les `window.error` + `unhandledrejection` + console.error. Fait échouer
 * si la moindre erreur JS est remontée. Le but : bloquer les régressions
 * type TDZ (cf. bug accueil v28.10 où _dataIsStale était utilisé avant
 * sa déclaration) AVANT qu'elles n'arrivent en prod.
 *
 * Dépendances : playwright (installé par le workflow).
 * Usage local : `npx playwright install chromium && node scripts/smoke_e2e.js`.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8765;

const PAGES = [
  'dashboard', 'simples', 'combines', 'locks', 'buteurs',
  'mesparis', 'top', 'academie', 'profil', 'backtest',
  'alertes', 'historique',
];

// --- Minimal static server ---
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

(async () => {
  const server = await startServer();
  console.log(`[smoke] server on http://127.0.0.1:${PORT}`);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  const failures = [];
  page.on('pageerror', err => failures.push({ phase: 'pageerror', msg: err.message, stack: err.stack }));
  page.on('console', msg => {
    if (msg.type() === 'error') {
      // Ignore harmless "Failed to load resource" when a sidecar is missing locally.
      const text = msg.text();
      if (/Failed to load resource/i.test(text) && /404/.test(text)) return;
      failures.push({ phase: 'console.error', msg: text });
    }
  });
  page.on('crash', () => failures.push({ phase: 'crash', msg: 'page crashed' }));

  await page.goto(`http://127.0.0.1:${PORT}/pronostics.html`, { waitUntil: 'domcontentloaded' });
  // Dismiss onboarding modal if present
  await page.evaluate(() => {
    const ign = Array.from(document.querySelectorAll('button,a')).find(b => /ignorer/i.test(b.textContent || ''));
    if (ign) ign.click();
  });
  await page.waitForTimeout(300);

  // Click each page and wait a tick
  for (const p of PAGES) {
    const before = failures.length;
    const found = await page.evaluate(pageName => {
      const btn = document.querySelector(`.page-btn[data-page="${pageName}"]`);
      if (!btn) return 'no-btn';
      btn.click();
      return 'clicked';
    }, p);
    if (found === 'no-btn') {
      console.log(`[skip] ${p} — nav button not found`);
      continue;
    }
    await page.waitForTimeout(250);
    const newErrs = failures.slice(before);
    const tag = newErrs.length ? `FAIL (${newErrs.length} errs)` : 'ok';
    console.log(`[${tag}] ${p}`);
  }

  // Responsive smoke at 375×812
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(200);
  const overflow = await page.evaluate(() => {
    document.querySelector('.page-btn[data-page="dashboard"]').click();
    return document.documentElement.scrollWidth - document.documentElement.clientWidth;
  });
  if (overflow > 2) {
    failures.push({ phase: 'responsive', msg: `dashboard overflows by ${overflow}px on 375 viewport` });
  }
  console.log(`[${overflow > 2 ? 'FAIL' : 'ok'}] mobile overflow = ${overflow}px`);

  await browser.close();
  server.close();

  if (failures.length) {
    console.error(`\n[smoke] ${failures.length} failure(s):`);
    for (const f of failures) {
      console.error(` - [${f.phase}] ${f.msg}${f.stack ? '\n     ' + f.stack.split('\n').slice(0, 3).join('\n     ') : ''}`);
    }
    process.exit(1);
  }
  console.log('\n[smoke] all green');
})().catch(err => {
  console.error('[smoke] runner crashed:', err);
  process.exit(2);
});
