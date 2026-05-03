#!/usr/bin/env node
/*
 * Phase 12 audit: validate resilience for common edge cases.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.EDGE_CASE_AUDIT_PORT || 8776);
const HOST = process.env.EDGE_CASE_AUDIT_HOST || '127.0.0.1';
const BASE_URL = process.env.EDGE_CASE_AUDIT_BASE_URL || `http://${HOST}:${PORT}`;
const OUT = path.join(ROOT, 'phase12_edge_case_audit.json');
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
  if (process.env.EDGE_CASE_AUDIT_BASE_URL) return Promise.resolve(null);
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

function cleanErrors(errors) {
  return errors.filter(e => !/favicon|sourcemap|Failed to load resource|net::ERR_ABORTED|40\d/i.test(e));
}

async function withPage(browser, setup, run) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  if (setup) await setup(ctx, page);
  const result = await run(page, errors);
  await ctx.close();
  result.consoleErrors = cleanErrors(errors);
  result.status = result.status || (result.consoleErrors.length ? 'fail' : 'pass');
  return result;
}

async function waitApp(page) {
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForSelector('body', { timeout: 10000 });
  await page.waitForTimeout(1800);
}

(async () => {
  const server = await startServerIfNeeded();
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const cases = [];

  cases.push(await withPage(browser, async (_, page) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('cookieConsent', 'accepted');
        localStorage.setItem('paris_sportif_user_bets', '{broken');
        localStorage.setItem('tousFilters', '{broken');
        localStorage.setItem('userPrefs', '{broken');
        localStorage.setItem('paris_sportif_strategy_prefs', '{broken');
      } catch (e) {}
    });
  }, async (page) => {
    await page.goto(`${BASE_URL}/pronostics.html#dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await waitApp(page);
    const body = await page.locator('body').innerText({ timeout: 5000 });
    return {
      key: 'corrupt_localStorage',
      status: /Paris-Sportif|Big Bets|Accueil/i.test(body) ? 'pass' : 'fail',
      evidence: body.replace(/\s+/g, ' ').slice(0, 180),
    };
  }));

  cases.push(await withPage(browser, async (_, page) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('cookieConsent', 'accepted');
        localStorage.removeItem('paris_sportif_user_bets');
        localStorage.removeItem('userBets');
      } catch (e) {}
    });
  }, async (page) => {
    await page.goto(`${BASE_URL}/pronostics.html#performance`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await waitApp(page);
    const text = await page.locator('body').innerText({ timeout: 5000 });
    return {
      key: 'zero_tracked_bets',
      status: /Track ton premier pari|Aucun pari|Mes paris|Performance/i.test(text) ? 'pass' : 'warn',
      evidence: text.replace(/\s+/g, ' ').slice(0, 220),
    };
  }));

  cases.push(await withPage(browser, null, async (page) => {
    await page.goto(`${BASE_URL}/pronostics.html#tous?sport=football&edge=0.99&conf=0.99&odd=99&preset=bigbets`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await waitApp(page);
    const empty = await page.locator('#tous-wrap .empty-state-v2').first().textContent({ timeout: 5000 }).catch(() => '');
    return {
      key: 'overstrict_filters',
      status: /Aucun match|Vider les filtres|Voir demain/i.test(empty || '') ? 'pass' : 'fail',
      evidence: String(empty || '').replace(/\s+/g, ' ').slice(0, 220),
    };
  }));

  cases.push(await withPage(browser, async (_, page) => {
    await page.addInitScript(() => {
      const realNow = Date.now.bind(Date);
      Date.now = () => realNow() + 6 * 3600 * 1000;
    });
  }, async (page) => {
    await page.goto(`${BASE_URL}/pronostics.html#dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await waitApp(page);
    const text = await page.locator('body').innerText({ timeout: 5000 });
    return {
      key: 'stale_data_guard',
      status: /Pause data|Recommandations en pause|données sont trop anciennes|Données trop anciennes|🔴\s*\d+h|Refresh requis/i.test(text) ? 'pass' : 'warn',
      evidence: text.replace(/\s+/g, ' ').slice(0, 240),
    };
  }));

  cases.push(await withPage(browser, async (_, page) => {
    await page.addInitScript(() => {
      try {
        Object.defineProperty(Navigator.prototype, 'onLine', { get: () => false, configurable: true });
      } catch (e) {}
    });
  }, async (page) => {
    await page.goto(`${BASE_URL}/pronostics.html#dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await waitApp(page);
    const text = await page.locator('body').innerText({ timeout: 5000 });
    return {
      key: 'offline_banner',
      status: /Mode offline|Hors ligne|offline/i.test(text) ? 'pass' : 'fail',
      evidence: text.replace(/\s+/g, ' ').slice(0, 220),
    };
  }));

  await browser.close();
  if (server) server.close();
  const report = {
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    cases,
    summary: {
      total: cases.length,
      passed: cases.filter(c => c.status === 'pass').length,
      warn: cases.filter(c => c.status === 'warn').length,
      failed: cases.filter(c => c.status === 'fail').length,
      consoleErrorCases: cases.filter(c => c.consoleErrors && c.consoleErrors.length).map(c => c.key),
    },
  };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`Edge case audit: ${report.summary.passed}/${report.summary.total} pass · ${report.summary.warn} warn · ${report.summary.failed} fail`);
  console.log(path.relative(ROOT, OUT));
  if (report.summary.failed || report.summary.consoleErrorCases.length) process.exitCode = 1;
})().catch(err => {
  console.error(err);
  process.exit(1);
});
