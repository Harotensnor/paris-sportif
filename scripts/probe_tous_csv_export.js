#!/usr/bin/env node
/*
 * Verrouille l'export CSV de la page Tous : téléchargement réel, BOM UTF-8
 * pour Excel/LibreOffice FR, séparateur point-virgule et lignes exploitables.
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

const failures = [];
function check(label, ok, detail = '') {
  console.log(`  [${ok ? 'ok' : 'FAIL'}] ${label}${ok ? '' : ` — ${detail}`}`);
  if (!ok) failures.push({ label, detail });
}

(async () => {
  const server = await startServer();
  const port = server.address().port;
  console.log(`[probe-tous-csv] static server on http://127.0.0.1:${port}`);
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
      prefs.onboardingDone = true;
      prefs.consentLocalStorage = 'accepted';
      localStorage.setItem('userPrefs', JSON.stringify(prefs));
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
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Failed to load resource|ERR_|MIME type/i.test(t)) return;
    errs.push(t);
  });

  await page.goto(`http://127.0.0.1:${port}/pronostics.html#tous`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const exportBtn = page.locator('[data-tous-export]').first();
  check('export button visible on Tous', await exportBtn.isVisible().catch(() => false));

  if (!failures.length) {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 8000 }),
      exportBtn.click(),
    ]);
    const downloadPath = await download.path();
    const suggested = download.suggestedFilename();
    const buf = fs.readFileSync(downloadPath);
    const text = buf.toString('utf8');
    const lines = text.trim().split(/\r?\n/);
    const header = lines[0] || '';
    const firstData = lines[1] || '';
    check('filename is dated CSV', /^tous-pronos-\d{4}-\d{2}-\d{2}\.csv$/.test(suggested), suggested);
    check('CSV starts with UTF-8 BOM', buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf);
    check('CSV header uses semicolon separator', header.includes('status;date;sport;league'), header);
    check('CSV header does not use comma separator', !header.includes('status,date,sport,league'), header);
    check('CSV has at least one data row', lines.length > 1, `lines=${lines.length}`);
    check('CSV data row has semicolon cells', firstData.split(';').length >= 10, firstData);
  }

  check('zero console errors', errs.length === 0, errs.slice(0, 5).join(' | '));
  await browser.close();
  server.close();
  if (failures.length) {
    console.error(`\n[probe-tous-csv] ${failures.length} failure(s)`);
    process.exit(1);
  }
  console.log('\n[probe-tous-csv] all green');
})().catch(err => {
  console.error('[probe-tous-csv] fatal', err);
  process.exit(1);
});
