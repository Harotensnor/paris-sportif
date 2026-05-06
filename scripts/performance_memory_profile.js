#!/usr/bin/env node
/*
 * Lightweight memory/CPU regression probe.
 * Navigates the SPA 50 times and records heap + DOM growth + long tasks.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PERF_PROFILE_PORT || 8765);
const HOST = '127.0.0.1';
const BASE_URL = process.env.PERF_PROFILE_BASE_URL || `http://${HOST}:${PORT}`;
const OUT = path.join(ROOT, 'performance-memory-report.json');
const CHROME_EXE = process.env.CHROME_EXECUTABLE_PATH
  || (fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : '');

const ROUTES = ['dashboard', 'tous', 'performance', 'academie', 'profil', 'sante', 'montantes', 'legal'];

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.jsonl')) return 'application/x-ndjson; charset=utf-8';
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.webp')) return 'image/webp';
  if (file.endsWith('.avif')) return 'image/avif';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  if (file.endsWith('.webmanifest')) return 'application/manifest+json';
  return 'application/octet-stream';
}

function startServerIfNeeded() {
  if (process.env.PERF_PROFILE_BASE_URL) return Promise.resolve(null);
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
  const server = await startServerIfNeeded();
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const samples = [];
  for (const route of ROUTES) {
    await page.goto(`${BASE_URL}/pronostics.html#${route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(200);
  }
  for (let i = 0; i < 50; i += 1) {
    const route = ROUTES[i % ROUTES.length];
    await page.goto(`${BASE_URL}/pronostics.html#${route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(150);
    samples.push(await page.evaluate((iteration) => ({
      iteration,
      hash: location.hash,
      heap: performance.memory ? performance.memory.usedJSHeapSize : null,
      nodes: document.getElementsByTagName('*').length,
      longTasks: window.__longTasks ? window.__longTasks() : null,
    }), i + 1));
  }
  await browser.close();
  if (server) server.close();

  const first = samples.find(s => Number.isFinite(s.heap));
  const last = [...samples].reverse().find(s => Number.isFinite(s.heap));
  const heapGrowthMb = first && last ? (last.heap - first.heap) / 1024 / 1024 : null;
  const byRoute = new Map();
  for (const sample of samples) {
    const key = sample.hash || 'unknown';
    if (!byRoute.has(key)) byRoute.set(key, []);
    byRoute.get(key).push(sample);
  }
  const routeGrowth = Array.from(byRoute.entries()).map(([route, rows]) => ({
    route,
    samples: rows.length,
    node_growth: rows.length > 1 ? rows[rows.length - 1].nodes - rows[0].nodes : 0,
    heap_growth_mb: rows.length > 1 && Number.isFinite(rows[0].heap) && Number.isFinite(rows[rows.length - 1].heap)
      ? Number(((rows[rows.length - 1].heap - rows[0].heap) / 1024 / 1024).toFixed(2))
      : null,
  }));
  const nodeGrowth = Math.max(0, ...routeGrowth.map(r => r.node_growth || 0));
  const maxLongTask = Math.max(0, ...samples.map(s => s.longTasks && s.longTasks.max || 0));
  const report = {
    generated_at: new Date().toISOString(),
    iterations: samples.length,
    heap_growth_mb: heapGrowthMb == null ? null : Number(heapGrowthMb.toFixed(2)),
    node_growth: nodeGrowth,
    max_long_task_ms: maxLongTask,
    route_growth: routeGrowth,
    status: (heapGrowthMb != null && heapGrowthMb > 20) || nodeGrowth > 1500 ? 'fail' : 'ok',
    samples,
  };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    iterations: report.iterations,
    heap_growth_mb: report.heap_growth_mb,
    node_growth: report.node_growth,
    max_long_task_ms: report.max_long_task_ms,
    status: report.status,
  }, null, 2));
  if (report.status !== 'ok') process.exitCode = 1;
})();
