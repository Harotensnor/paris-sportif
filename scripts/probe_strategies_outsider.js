#!/usr/bin/env node
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

(async () => {
  const server = await startServer();
  const port = server.address().port;
  console.log(`[probe-strategies] static server on http://127.0.0.1:${port}`);

  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
      prefs.onboardingDone = true;
      localStorage.setItem('userPrefs', JSON.stringify(prefs));
    } catch (e) {}
  });
  const page = await ctx.newPage();
  const failures = [];
  page.on('pageerror', err => failures.push(`pageerror: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') failures.push(`console: ${msg.text()}`);
  });

  try {
    await page.goto(`http://127.0.0.1:${port}/pronostics.html#performance`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForSelector('[data-perf-tab="strategies"]', { timeout: 10000 });
    await page.click('[data-perf-tab="strategies"]');
    await page.waitForFunction(() => {
      const text = document.body.textContent || '';
      return text.includes('Outsider-only');
    }, null, { timeout: 10000 });
    const report = await page.evaluate(async () => {
      if (typeof window._loadStrategyBacktest === 'function') {
        await window._loadStrategyBacktest();
      }
      return window.__backtestStrategies || null;
    });
    if (!report || !report.strategies || !report.strategies.outsider_only) {
      failures.push('backtest_strategies.json missing strategies.outsider_only');
    } else {
      const out = report.strategies.outsider_only;
      if (!(out.bets_placed > 0)) failures.push('outsider_only has no settled bets');
      if (!(out.roi > 0)) failures.push(`outsider_only ROI not positive: ${out.roi}`);
      if (!(report.outsider_edge_min >= 0.05)) {
        failures.push(`outsider_edge_min too low: ${report.outsider_edge_min}`);
      }
      console.log(
        `[probe-strategies] outsider_only bets=${out.bets_placed} roi=${(out.roi * 100).toFixed(2)}%`
      );
    }

    if (failures.length) {
      console.error('[probe-strategies] failures:');
      for (const f of failures) console.error(`  - ${f}`);
      process.exitCode = 1;
    } else {
      console.log('[probe-strategies] all green');
    }
  } finally {
    await browser.close().catch(() => {});
    server.close();
  }
})().catch(err => {
  console.error('[probe-strategies] runner crashed:', err);
  process.exitCode = 1;
});
