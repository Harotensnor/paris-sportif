#!/usr/bin/env node
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cacheDir = path.join(root, '.cache');
const outPath = path.join(cacheDir, 'dashboard_pipeline_breakdown.json');

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'application/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.webmanifest') return 'application/manifest+json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

function readDataMeta() {
  const raw = fs.readFileSync(path.join(root, 'data.js'), 'utf8');
  const generatedAt = /"generated_at"\s*:\s*"([^"]+)"/.exec(raw)?.[1] || null;
  const today = /"today"\s*:\s*"([^"]+)"/.exec(raw)?.[1] || new Date().toISOString().slice(0, 10);
  return { generatedAt, today };
}

function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (url.pathname === '/' || url.pathname === '') file = path.join(root, 'pronostics.html');
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, {
      'content-type': contentType(file),
      'cache-control': 'no-store',
    });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function visibleRowsScript() {
  return () => {
    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const rows = [...document.querySelectorAll('.v36-picks-table tbody .v36-table-row')].filter(visible);
    const cards = [...document.querySelectorAll('.v36-table-cards .v36-table-card')].filter(visible);
    const panel = document.querySelector('[data-v37-debug-panel] pre');
    const debug = JSON.parse(panel?.textContent || '{}');
    return {
      visibleRows: rows.length,
      visibleCards: cards.length,
      visiblePicks: Math.max(rows.length, cards.length),
      heading: document.querySelector('h1')?.textContent || '',
      coverage: [...document.querySelectorAll('.v37-scope, .v36-coverage, .v37-empty-pool-help')]
        .map(el => el.textContent.trim())
        .filter(Boolean)
        .slice(0, 6),
      debug,
    };
  };
}

async function scenario(browser, baseUrl, meta, label, ageMin, storedDate) {
  const generatedMs = meta.generatedAt ? new Date(meta.generatedAt).getTime() : Date.now();
  const fakeNow = generatedMs + ageMin * 60_000;
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(({ storedDate }) => {
    try {
      sessionStorage.setItem('autoRefreshDoneAt', String(Date.now()));
      localStorage.setItem('cookieConsent', 'accepted');
      localStorage.setItem('paris_sportif_onboarded_v1', '1');
      localStorage.setItem('paris_sportif_onboarded_v2', '1');
      localStorage.setItem('paris_sportif_v36_home_filter', JSON.stringify({
        sport: '',
        tier: '',
        time: '',
        q: '',
        sort: 'tier',
        date: storedDate,
        includeLive: false,
      }));
    } catch (e) {}
  }, { storedDate });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/pronostics.html?debug=1&fakeAgeMin=${encodeURIComponent(String(ageMin))}#dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-v37-debug-panel] pre', { timeout: 20_000 });
  await page.waitForFunction(() => {
    const panel = document.querySelector('[data-v37-debug-panel] pre');
    return !!panel && panel.textContent.includes('"v36TableRows"');
  }, null, { timeout: 20_000 });
  const data = await page.evaluate(visibleRowsScript());
  await context.close();
  return {
    label,
    fakeNow: new Date(fakeNow).toISOString(),
    ageMin,
    storedDate,
    ...data,
  };
}

(async () => {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (error) {
    console.error('Playwright introuvable. Lance ce script avec le NODE_PATH du runtime Codex.');
    process.exit(2);
  }
  fs.mkdirSync(cacheDir, { recursive: true });
  const meta = readDataMeta();
  const server = await startServer();
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_EXECUTABLE_PATH || undefined,
  });
  try {
    const scenarios = [
      await scenario(browser, baseUrl, meta, 'current-all-horizon', 5, 'all'),
      await scenario(browser, baseUrl, meta, 'theo-stale-397min-stored-today', 397, meta.today),
    ];
    const output = {
      generatedAt: meta.generatedAt,
      today: meta.today,
      checkedAt: new Date().toISOString(),
      scenarios,
    };
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(JSON.stringify(output, null, 2));
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
