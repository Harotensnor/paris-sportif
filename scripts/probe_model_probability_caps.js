#!/usr/bin/env node
/*
 * Synthetic predictMatch probability cap probe.
 *
 * Reproduces the historical failure mode where extreme favourites could leak
 * 0.98/0.999 model probabilities into picks/history. The public model output
 * must stay capped at window.MODEL_PROB_CAP for football, basketball and
 * baseball.
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

function startServer() {
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
        fs.createReadStream(filePath).pipe(res);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

const failures = [];
function check(label, ok, detail = '') {
  console.log(`  [${ok ? 'ok' : 'FAIL'}] ${label}${ok ? '' : ' - ' + detail}`);
  if (!ok) failures.push({ label, detail });
}

(async () => {
  const server = await startServer();
  const port = server.address().port;
  console.log(`[probe-prob-caps] static server on http://127.0.0.1:${port}`);
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('paris_sportif_onboarded_v1', '1');
    localStorage.setItem('paris_sportif_onboarded_v2', '1');
    sessionStorage.setItem('autoRefreshDone', '1');
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(`pageerror:${err.message}`));
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/Failed to load resource|ERR_|MIME type/i.test(text)) return;
    errors.push(`console:${text}`);
  });

  await page.goto(`http://127.0.0.1:${port}/pronostics.html#dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.predictMatch === 'function' && Number(window.MODEL_PROB_CAP) === 0.95);

  const results = await page.evaluate(() => {
    const future = new Date(Date.now() + 36 * 3600000).toISOString();
    function matchFor(sport) {
      const hasDraw = sport === 'football';
      return {
        id: `prob-cap-${sport}-${Date.now()}`,
        sport,
        date: future,
        league_code: 'qa.cap',
        league_name: 'QA Probability Cap',
        completed: false,
        competitors: [
          {
            home_away: 'home',
            name: `Extreme ${sport} Home`,
            record: '82-0',
            form: 'WWWWWWWWWW',
            form10: 'WWWWWWWWWW',
            team_form_l10: 'WWWWWWWWWW',
            form_stats: { played5: 5, avg_gf5: sport === 'basketball' ? 140 : 9, avg_ga5: 0.1, last5: [] },
          },
          {
            home_away: 'away',
            name: `Extreme ${sport} Away`,
            record: '0-82',
            form: 'LLLLLLLLLL',
            form10: 'LLLLLLLLLL',
            team_form_l10: 'LLLLLLLLLL',
            form_stats: { played5: 5, avg_gf5: 0.1, avg_ga5: sport === 'basketball' ? 140 : 9, last5: [] },
          },
        ],
        winamax: {
          available: true,
          match_id: `wx-cap-${sport}`,
          markets: {
            '1n2': hasDraw
              ? { home: 1.20, draw: 15.0, away: 20.0 }
              : { home: 1.20, away: 20.0 },
          },
        },
      };
    }
    return ['football', 'basketball', 'baseball'].map((sport) => {
      const pred = window.predictMatch(matchFor(sport));
      const calibrated = typeof window._calibrateProb === 'function'
        ? Number(window._calibrateProb(0.99, sport))
        : null;
      return {
        sport,
        cap: window.MODEL_PROB_CAP,
        reliability: Number(pred && pred.reliability),
        pickProb: Number(pred && pred.pick && pred.pick.prob),
        calibrated,
        rawCap: Number(pred && pred.reliability_raw_cap),
        pickRawCap: Number(pred && pred.pick && pred.pick.prob_raw_cap),
        suspect: !!(pred && pred.suspect),
      };
    });
  });

  for (const row of results) {
    check(`${row.sport}: cap exposed`, row.cap === 0.95, JSON.stringify(row));
    check(`${row.sport}: reliability <= 0.95`, Number.isFinite(row.reliability) && row.reliability <= 0.95, JSON.stringify(row));
    check(`${row.sport}: pick.prob <= 0.95`, Number.isFinite(row.pickProb) && row.pickProb <= 0.95, JSON.stringify(row));
    check(`${row.sport}: _calibrateProb <= 0.95`, Number.isFinite(row.calibrated) && row.calibrated <= 0.95, JSON.stringify(row));
  }
  check('probe run has zero console errors', errors.length === 0, errors.join(' | '));

  await browser.close();
  server.close();
  if (failures.length) {
    console.error(`[probe-prob-caps] ${failures.length} failure(s)`);
    process.exit(1);
  }
  console.log('[probe-prob-caps] all green');
})().catch(err => {
  console.error('[probe-prob-caps] runner crashed:', err);
  process.exit(2);
});
