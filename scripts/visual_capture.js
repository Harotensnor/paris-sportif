#!/usr/bin/env node
/*
 * Phase 4+ visual QA capture.
 * Captures the 8 public SPA hubs across 4 viewports into .cache/phase4-<tag>/.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.VISUAL_PORT || 8765);
const HOST = process.env.VISUAL_HOST || '127.0.0.1';
const BASE_URL = process.env.VISUAL_BASE_URL || `http://${HOST}:${PORT}`;
const CHROME_EXE = process.env.CHROME_EXECUTABLE_PATH
  || (fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : '');

const PAGES = [
  { hash: 'dashboard', name: 'dashboard' },
  { hash: 'tous', name: 'tous' },
  { hash: 'performance', name: 'performance' },
  { hash: 'academie', name: 'academie' },
  { hash: 'profil', name: 'profil' },
  { hash: 'sante', name: 'sante' },
  { hash: 'montantes', name: 'montantes' },
  { hash: 'legal', name: 'legal' },
];

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'wide', width: 1920, height: 1080 },
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
  if (process.env.VISUAL_BASE_URL) return Promise.resolve(null);
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
  const tag = process.argv[2] || 'snapshot';
  const dir = path.join(ROOT, '.cache', `phase4-${tag}`);
  fs.mkdirSync(dir, { recursive: true });
  const server = await startServerIfNeeded();
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const manifest = {
    tag,
    base_url: BASE_URL,
    generated_at: new Date().toISOString(),
    pages: PAGES.map(p => p.name),
    viewports: VIEWPORTS,
    screenshots: [],
    failures: [],
  };

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    page.on('pageerror', err => {
      manifest.failures.push({ viewport: vp.name, page: 'runtime', message: err.message });
    });
    for (const p of PAGES) {
      const out = path.join(dir, `${p.name}-${vp.name}.png`);
      try {
        await page.goto(`${BASE_URL}/pronostics.html#${p.hash}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(1200);
        await page.screenshot({ path: out, fullPage: true });
        const metrics = await page.evaluate(() => ({
          hash: location.hash,
          title: document.title,
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
          overflow_x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }));
        manifest.screenshots.push({ page: p.name, viewport: vp.name, file: path.relative(ROOT, out), metrics });
        console.log(`✓ ${p.name} ${vp.name} ${metrics.width}x${metrics.height}`);
      } catch (err) {
        manifest.failures.push({ page: p.name, viewport: vp.name, message: err.message });
        console.error(`✗ ${p.name} ${vp.name}: ${err.message}`);
      }
    }
    await ctx.close();
  }

  await browser.close();
  if (server) server.close();
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  if (manifest.failures.length) process.exitCode = 1;
})();
