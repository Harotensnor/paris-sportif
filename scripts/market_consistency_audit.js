#!/usr/bin/env node
/*
 * Phase 9 market consistency audit.
 * Standalone Playwright runner used when @playwright/test is not installed locally.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.MARKET_AUDIT_PORT || 8765);
const HOST = process.env.MARKET_AUDIT_HOST || '127.0.0.1';
const BASE_URL = process.env.MARKET_AUDIT_BASE_URL || `http://${HOST}:${PORT}`;
const OUT = path.join(ROOT, '.cache', 'market-consistency-audit.json');
const CHROME_EXE = process.env.CHROME_EXECUTABLE_PATH
  || (fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : '');

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
  if (process.env.MARKET_AUDIT_BASE_URL) return Promise.resolve(null);
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

async function runCases(page) {
  return page.evaluate(() => {
    const api = window.__testAPI;
    const score = s => ({ market: 'exactScore', key: s, pickValue: s, label: `Score ${s}` });
    const m = (market, key, extra = {}) => ({ market, key, pickKey: key, label: `${market} ${key}`, ...extra });
    const cases = [
      ['1-0 + BTTS Yes', score('1-0'), m('btts', 'BTTS_Y', { side: 'yes' }), false],
      ['1-0 + BTTS No', score('1-0'), m('btts', 'BTTS_N', { side: 'no' }), true],
      ['0-0 + over 2.5', score('0-0'), m('ou25', 'O2.5', { side: 'over', line: 2.5 }), false],
      ['0-0 + under 2.5', score('0-0'), m('ou25', 'U2.5', { side: 'under', line: 2.5 }), true],
      ['2-1 + BTTS Yes', score('2-1'), m('btts', 'BTTS_Y', { side: 'yes' }), true],
      ['2-1 + BTTS No', score('2-1'), m('btts', 'BTTS_N', { side: 'no' }), false],
      ['1-0 + 1N2 1', score('1-0'), m('1n2', '1'), true],
      ['1-0 + 1N2 X', score('1-0'), m('1n2', 'X'), false],
      ['0-2 + BTTS Yes', score('0-2'), m('btts', 'BTTS_Y', { side: 'yes' }), false],
      ['0-2 + 1N2 2', score('0-2'), m('1n2', '2'), true],
      ['1-0 + DC X2', score('1-0'), m('doubleChance', 'X2'), false],
      ['1-0 + DC 1X', score('1-0'), m('doubleChance', '1X'), true],
      ['1-1 + DC 12', score('1-1'), m('doubleChance', '12'), false],
      ['1-1 + DC X2', score('1-1'), m('doubleChance', 'X2'), true],
      ['1-1 + DNB 1', score('1-1'), m('dnb', 'DNB_1', { side: 'home' }), false],
      ['2-0 + DNB 1', score('2-0'), m('dnb', 'DNB_1', { side: 'home' }), true],
      ['2-0 + DNB 2', score('2-0'), m('dnb', 'DNB_2', { side: 'away' }), false],
      ['BTTS Yes + under 1.5', m('btts', 'BTTS_Y', { side: 'yes' }), m('ou15', 'U1.5', { side: 'under', line: 1.5 }), false],
      ['BTTS Yes + under 2.5', m('btts', 'BTTS_Y', { side: 'yes' }), m('ou25', 'U2.5', { side: 'under', line: 2.5 }), true],
      ['1N2 1 + DC X2', m('1n2', '1'), m('doubleChance', 'X2'), false],
      ['1N2 2 + DC 1X', m('1n2', '2'), m('doubleChance', '1X'), false],
      ['1N2 X + DC 12', m('1n2', 'X'), m('doubleChance', '12'), false],
      ['same total over/under conflict', m('ou25', 'O2.5', { side: 'over', line: 2.5 }), m('ou25', 'U2.5', { side: 'under', line: 2.5 }), false],
      ['different total lines can coexist', m('ou15', 'O1.5', { side: 'over', line: 1.5 }), m('ou25', 'U2.5', { side: 'under', line: 2.5 }), true],
      ['same BTTS conflict', m('btts', 'BTTS_Y', { side: 'yes' }), m('btts', 'BTTS_N', { side: 'no' }), false],
      ['3-2 + over 4.5', score('3-2'), m('ou', 'O4.5', { side: 'over', line: 4.5 }), true],
      ['3-2 + under 4.5', score('3-2'), m('ou', 'U4.5', { side: 'under', line: 4.5 }), false],
      ['4-0 + BTTS Yes', score('4-0'), m('btts', 'BTTS_Y', { side: 'yes' }), false],
      ['4-0 + over 3.5', score('4-0'), m('ou35', 'O3.5', { side: 'over', line: 3.5 }), true],
      ['4-0 + under 3.5', score('4-0'), m('ou35', 'U3.5', { side: 'under', line: 3.5 }), false],
      ['0-1 + 1N2 2', score('0-1'), m('1n2', '2'), true],
      ['0-1 + DNB 1', score('0-1'), m('dnb', 'DNB_1', { side: 'home' }), false],
      ['0-1 + DNB 2', score('0-1'), m('dnb', 'DNB_2', { side: 'away' }), true],
      ['2-2 + 1N2 X', score('2-2'), m('1n2', 'X'), true],
      ['2-2 + DNB 1', score('2-2'), m('dnb', 'DNB_1', { side: 'home' }), false],
      ['2-2 + DC 1X', score('2-2'), m('doubleChance', '1X'), true],
      ['2-2 + DC X2', score('2-2'), m('doubleChance', 'X2'), true],
      ['2-2 + DC 12', score('2-2'), m('doubleChance', '12'), false],
      ['basket same total conflict', m('basketTotal', 'O205.5', { side: 'over', line: 205.5 }), m('basketTotal', 'U205.5', { side: 'under', line: 205.5 }), false],
      ['basket ladder totals can coexist', m('basketTotal', 'O199.5', { side: 'over', line: 199.5 }), m('basketTotal', 'U215.5', { side: 'under', line: 215.5 }), true],
      ['tennis same games conflict', m('tennisGames', 'O22.5', { side: 'over', line: 22.5 }), m('tennisGames', 'U22.5', { side: 'under', line: 22.5 }), false],
      ['tennis ladder games can coexist', m('tennisGames', 'O18.5', { side: 'over', line: 18.5 }), m('tennisGames', 'U24.5', { side: 'under', line: 24.5 }), true],
      ['baseball same total conflict', m('baseballTotal', 'O8.5', { side: 'over', line: 8.5 }), m('baseballTotal', 'U8.5', { side: 'under', line: 8.5 }), false],
      ['hockey same total conflict', m('hockeyTotal', 'O5.5', { side: 'over', line: 5.5 }), m('hockeyTotal', 'U5.5', { side: 'under', line: 5.5 }), false],
      ['team total same line conflict', m('teamTotal', 'O1.5', { side: 'over', line: 1.5 }), m('teamTotal', 'U1.5', { side: 'under', line: 1.5 }), false],
      ['same market same pick allowed', m('ou25', 'O2.5', { side: 'over', line: 2.5 }), m('ou25', 'O2.5', { side: 'over', line: 2.5 }), true],
      ['unknown unrelated markets pass', m('playerPoints', 'over_20.5', { side: 'over', line: 20.5 }), m('tennisSets', '2-0'), true],
      ['2:0 + BTTS No', score('2:0'), m('btts', 'BTTS_N', { side: 'no' }), true],
      ['2:0 + 1N2 2', score('2:0'), m('1n2', '2'), false],
      ['1-2 + DC X2', score('1-2'), m('doubleChance', 'X2'), true],
      ['0-0 + DC 12', score('0-0'), m('doubleChance', '12'), false],
      ['1-0 + handicap home -0.5', score('1-0'), m('handicap', 'home:-0.5', { side: 'home', line: -0.5 }), true],
      ['1-0 + handicap away +0.5', score('1-0'), m('handicap', 'away:+0.5', { side: 'away', line: 0.5 }), false],
      ['2-0 + handicap home -1.5', score('2-0'), m('handicap', 'home:-1.5', { side: 'home', line: -1.5 }), true],
      ['1-0 + handicap home -1.5', score('1-0'), m('handicap', 'home:-1.5', { side: 'home', line: -1.5 }), false],
      ['1N2 1 + handicap home -0.5 duplicate', m('1n2', '1'), m('handicap', 'home:-0.5', { side: 'home', line: -0.5 }), false],
      ['1N2 1 + handicap away +0.5 conflict', m('1n2', '1'), m('handicap', 'away:+0.5', { side: 'away', line: 0.5 }), false],
      ['1N2 X + handicap home +0.5 coexist', m('1n2', 'X'), m('handicap', 'home:+0.5', { side: 'home', line: 0.5 }), true],
    ];
    const rows = cases.map(([name, a, b, expected]) => ({ name, expected, actual: api.isPairConsistent(a, b) }));
    const scorePick = score('1-0');
    const candidates = [
      scorePick,
      { market: 'btts', key: 'BTTS_Y', side: 'yes', label: 'BTTS Oui' },
      { market: 'btts', key: 'BTTS_N', side: 'no', label: 'BTTS Non' },
      { market: 'ou25', key: 'O2.5', side: 'over', line: 2.5, label: 'Over 2.5' },
      { market: 'ou25', key: 'U2.5', side: 'under', line: 2.5, label: 'Under 2.5' },
      { market: '1n2', key: '1', label: 'Home' },
      { market: '1n2', key: 'X', label: 'Draw' },
      { market: 'doubleChance', key: 'X2', label: 'X2' },
      { market: 'doubleChance', key: '1X', label: '1X' },
    ];
    const out = api.validateMarketConsistency(candidates, { anchor: scorePick });
    return { rows, validate: { consistent: out.consistent.map(c => c.label), contradicted: out.contradicted.map(c => c.label) } };
  });
}

(async () => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const server = await startServerIfNeeded();
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  await page.addInitScript(() => {
    try {
      localStorage.setItem('cookieConsent', 'accepted');
      localStorage.setItem('paris_sportif_onboarded_v1', '1');
      localStorage.setItem('paris_sportif_onboarded_v2', '1');
    } catch (e) {}
  });
  await page.goto(`${BASE_URL}/pronostics.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForFunction(
    () => window.__testAPI
      && typeof window.__testAPI.isPairConsistent === 'function'
      && typeof window.__testAPI.validateMarketConsistency === 'function',
    null,
    { timeout: 15000 }
  );
  const result = await runCases(page);
  await browser.close();
  if (server) server.close();
  const failures = result.rows.filter(row => row.actual !== row.expected);
  const validationOk = ['Score 1-0', 'BTTS Non', 'Under 2.5', 'Home', '1X'].every(label => result.validate.consistent.includes(label))
    && ['BTTS Oui', 'Over 2.5', 'Draw', 'X2'].every(label => result.validate.contradicted.includes(label));
  const report = {
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    cases: result.rows.length,
    failures,
    validation_ok: validationOk,
    browser_errors: errors.filter(e => !/favicon|sourcemap|Failed to load resource|net::ERR_ABORTED|40\d/i.test(e)),
  };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`Market consistency audit: ${report.cases} cases · ${failures.length} failure(s) · validation ${validationOk ? 'ok' : 'failed'}`);
  console.log(path.relative(ROOT, OUT));
  process.exit(failures.length || !validationOk || report.browser_errors.length ? 1 : 0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
