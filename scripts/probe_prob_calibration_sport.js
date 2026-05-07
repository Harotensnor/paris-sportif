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
  console.log(`[probe-prob-cal] static server on http://127.0.0.1:${port}`);

  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const failures = [];
  page.on('pageerror', err => failures.push(`pageerror: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') failures.push(`console: ${msg.text()}`);
  });

  try {
    await page.goto(`http://127.0.0.1:${port}/pronostics.html#performance`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForFunction(() => typeof window._calibrateProb === 'function', null, {
      timeout: 10000,
    });
    const result = await page.evaluate(async () => {
      if (typeof window._loadProbCalibration === 'function') {
        await window._loadProbCalibration();
      }
      const loaded = window.__probCalibration || {};
      const actualSportKeys = Object.keys(loaded.bins_by_sport || {});
      const makeBins = (factor) => Array.from({ length: 10 }, (_, i) => ({
        lower: i / 10,
        upper: (i + 1) / 10,
        center: (i + 0.5) / 10,
        n: 40,
        calibration_factor: factor,
      }));
      window.__probCalibration = {
        n_settled: 80,
        n_bins: 10,
        bins: makeBins(1.0),
        bins_by_sport: {
          football: { n_settled: 40, bins: makeBins(0.5) },
          hockey: { n_settled: 4, bins: makeBins(1.5) },
        },
      };
      return {
        actualSportKeys,
        football: window._calibrateProb(0.60, 'football'),
        hockeyFallsBack: window._calibrateProb(0.60, 'hockey'),
        unknownFallsBack: window._calibrateProb(0.60, 'unknown'),
      };
    });
    if (!result.actualSportKeys.length) failures.push('prob_calibration.json has no bins_by_sport keys');
    if (Math.abs(result.football - 0.30) > 0.001) {
      failures.push(`football sport bins ignored: got ${result.football}`);
    }
    if (Math.abs(result.hockeyFallsBack - 0.60) > 0.001) {
      failures.push(`low-sample hockey should fall back to global: got ${result.hockeyFallsBack}`);
    }
    if (Math.abs(result.unknownFallsBack - 0.60) > 0.001) {
      failures.push(`unknown sport should fall back to global: got ${result.unknownFallsBack}`);
    }
    console.log(`[probe-prob-cal] sports=${result.actualSportKeys.join(',') || 'none'}`);

    if (failures.length) {
      console.error('[probe-prob-cal] failures:');
      for (const f of failures) console.error(`  - ${f}`);
      process.exitCode = 1;
    } else {
      console.log('[probe-prob-cal] all green');
    }
  } finally {
    await browser.close().catch(() => {});
    server.close();
  }
})().catch(err => {
  console.error('[probe-prob-cal] runner crashed:', err);
  process.exitCode = 1;
});
