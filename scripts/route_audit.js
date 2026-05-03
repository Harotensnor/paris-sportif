#!/usr/bin/env node
/*
 * Phase 12 route/navigation audit.
 * Checks current hubs and legacy aliases still land on a useful page.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.ROUTE_AUDIT_PORT || 8765);
const HOST = process.env.ROUTE_AUDIT_HOST || '127.0.0.1';
const BASE_URL = process.env.ROUTE_AUDIT_BASE_URL || `http://${HOST}:${PORT}`;
const OUT = path.join(ROOT, '.cache', 'route-audit-report.json');
const OUT_TRACKED = path.join(ROOT, 'phase12_route_audit.json');
const CHROME_EXE = process.env.CHROME_EXECUTABLE_PATH
  || (fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : '');

const ROUTES = [
  ['dashboard', 'dashboard'], ['tous', 'tous'], ['performance', 'performance'],
  ['academie', 'academie'], ['profil', 'profil'], ['sante', 'sante'],
  ['montantes', 'montantes'], ['legal', 'legal.html'],
  ['top', 'dashboard'], ['locks', 'dashboard'], ['matchs', 'dashboard'],
  ['combines', 'tous'], ['bilan', 'performance'], ['historique', 'performance'],
  ['backtest', 'performance'], ['credibilite', 'performance'],
  ['methodologie', 'academie'], ['comment-lire', 'academie'],
  ['compare', 'tous'], ['calendrier', 'tous'], ['favoris', 'profil'],
  ['buteurs', 'tous'], ['cagnotte', 'performance'], ['agent', 'performance'],
  ['live', 'tous'], ['mes-paris', 'performance'], ['stats', 'performance'],
];

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.jsonl')) return 'application/x-ndjson; charset=utf-8';
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  if (file.endsWith('.webmanifest')) return 'application/manifest+json';
  return 'application/octet-stream';
}

function startServerIfNeeded() {
  if (process.env.ROUTE_AUDIT_BASE_URL) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let url = (req.url || '/').split('?')[0];
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
    server.on('error', err => {
      if (err && err.code === 'EADDRINUSE') return resolve(null);
      reject(err);
    });
    server.listen(PORT, HOST, () => resolve(server));
  });
}

(async () => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const server = await startServerIfNeeded();
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    try {
      localStorage.setItem('cookieConsent', 'accepted');
      localStorage.setItem('paris_sportif_onboarded_v1', '1');
      localStorage.setItem('paris_sportif_onboarded_v2', '1');
      localStorage.setItem('userPrefs', JSON.stringify({ onboardingDone: true, level: 'confirme', consentLocalStorage: 'accepted' }));
    } catch (e) {}
  });
  const report = { generated_at: new Date().toISOString(), base_url: BASE_URL, routes: [], failures: [] };
  for (const [hash, expected] of ROUTES) {
    const errors = [];
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(`${BASE_URL}/pronostics.html#${hash}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(700);
    const info = await page.evaluate(() => ({
      pathname: location.pathname,
      hash: location.hash.replace(/^#/, ''),
      title: document.title,
      h1: (document.querySelector('h1')?.textContent || '').replace(/\s+/g, ' ').trim(),
      text_len: (document.body?.innerText || '').trim().length,
    }));
    const realErrors = errors.filter(e => !/favicon|sourcemap|Failed to load resource|net::ERR_ABORTED|40\d/i.test(e));
    const ok = expected === 'legal.html'
      ? info.pathname.endsWith('/legal.html') && info.text_len > 300
      : info.hash === expected && info.text_len > 500;
    const row = { hash, expected, ok, ...info, errors: realErrors };
    report.routes.push(row);
    if (!ok || realErrors.length) report.failures.push(row);
  }
  await browser.close();
  if (server) server.close();
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  fs.writeFileSync(OUT_TRACKED, JSON.stringify(report, null, 2));
  console.log(`Route audit: ${report.routes.length} route(s) · ${report.failures.length} failure(s)`);
  console.log(path.relative(ROOT, OUT));
  process.exit(report.failures.length ? 1 : 0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
