#!/usr/bin/env node
/*
 * Fresh-user onboarding probe.
 *
 * Verifies the first-run wizard appears quickly, supports keyboard
 * navigation, persists completion/skip flags, and does not reappear after a
 * reload. This locks the main novice entry flow without relying on legacy
 * Playwright specs that pre-stamp onboarding as done.
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

async function readStep(page) {
  return page.evaluate(() => {
    const text = document.querySelector('.onboard-card')?.innerText || '';
    const match = text.match(/(\d+)\s*\/\s*(\d+)/);
    return {
      step: match ? Number(match[1]) : null,
      total: match ? Number(match[2]) : null,
      visible: !!document.querySelector('.onboard-overlay[role="dialog"][aria-modal="true"]'),
      title: document.getElementById('onb-title')?.textContent || ''
    };
  });
}

async function waitForStep(page, step) {
  await page.waitForFunction(
    expected => {
      const text = document.querySelector('.onboard-card')?.innerText || '';
      const match = text.match(/(\d+)\s*\/\s*(\d+)/);
      return match && Number(match[1]) === expected;
    },
    step,
    { timeout: 1200 }
  );
}

async function newFreshPage(browser, port) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  await ctx.addInitScript(() => {
    sessionStorage.setItem('autoRefreshDone', '1');
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror:${e.message}`));
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/Failed to load resource|ERR_|MIME type/i.test(text)) return;
    errors.push(`console:${text}`);
  });
  await page.goto(`http://127.0.0.1:${port}/pronostics.html#dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => typeof window.getDataAge === 'function' && document.readyState === 'complete',
    null,
    { timeout: 6000 }
  );
  return { ctx, page, errors };
}

(async () => {
  const server = await startServer();
  const port = server.address().port;
  console.log(`[probe-onboarding-fresh] static server on http://127.0.0.1:${port}`);

  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});

  const completeRun = await newFreshPage(browser, port);
  const startMs = Date.now();
  await completeRun.page.waitForSelector('.onboard-overlay[role="dialog"]', { timeout: 5000 });
  const appearMs = Date.now() - startMs;
  const firstStep = await readStep(completeRun.page);
  check('wizard appears quickly for fresh user', appearMs <= 5000, `${appearMs}ms`);
  check('wizard starts on step 1 of 3', firstStep.visible && firstStep.step === 1 && firstStep.total === 3, JSON.stringify(firstStep));

  await completeRun.page.keyboard.press('ArrowRight');
  await waitForStep(completeRun.page, 2);
  check('ArrowRight advances wizard', (await readStep(completeRun.page)).step === 2);
  await completeRun.page.keyboard.press('ArrowLeft');
  await waitForStep(completeRun.page, 1);
  check('ArrowLeft rewinds wizard', (await readStep(completeRun.page)).step === 1);
  await completeRun.page.keyboard.press('ArrowRight');
  await waitForStep(completeRun.page, 2);
  await completeRun.page.keyboard.press('ArrowRight');
  await waitForStep(completeRun.page, 3);
  await completeRun.page.click('.onb-next');
  await completeRun.page.waitForSelector('.onboard-overlay', { state: 'detached', timeout: 1200 });
  const completedState = await completeRun.page.evaluate(() => ({
    prefs: JSON.parse(localStorage.getItem('userPrefs') || '{}'),
    v1: localStorage.getItem('paris_sportif_onboarded_v1'),
    v2: localStorage.getItem('paris_sportif_onboarded_v2'),
    bankroll: localStorage.getItem('userBankroll')
  }));
  check('completion persists done flags', completedState.prefs.onboardingDone === true && completedState.v1 === '1' && completedState.v2 === '1', JSON.stringify(completedState));
  check('completion preserves default bankroll', completedState.bankroll === '50', JSON.stringify(completedState));
  await completeRun.page.reload({ waitUntil: 'domcontentloaded' });
  await completeRun.page.waitForTimeout(1200);
  check('completed wizard does not reappear after reload', !(await completeRun.page.$('.onboard-overlay')));
  check('completion run has zero console errors', completeRun.errors.length === 0, completeRun.errors.slice(0, 3).join(' | '));
  await completeRun.ctx.close();

  const skipRun = await newFreshPage(browser, port);
  await skipRun.page.waitForSelector('.onboard-overlay[role="dialog"]', { timeout: 5000 });
  await skipRun.page.click('[data-skip="1"]');
  await skipRun.page.waitForSelector('.onboard-overlay', { state: 'detached', timeout: 1200 });
  const skippedState = await skipRun.page.evaluate(() => ({
    prefs: JSON.parse(localStorage.getItem('userPrefs') || '{}'),
    v1: localStorage.getItem('paris_sportif_onboarded_v1'),
    v2: localStorage.getItem('paris_sportif_onboarded_v2')
  }));
  check('skip persists done flags', skippedState.prefs.onboardingDone === true && skippedState.v1 === '1' && skippedState.v2 === '1', JSON.stringify(skippedState));
  await skipRun.page.reload({ waitUntil: 'domcontentloaded' });
  await skipRun.page.waitForTimeout(1200);
  check('skipped wizard does not reappear after reload', !(await skipRun.page.$('.onboard-overlay')));
  check('skip run has zero console errors', skipRun.errors.length === 0, skipRun.errors.slice(0, 3).join(' | '));
  await skipRun.ctx.close();

  await browser.close();
  server.close();
  console.log(`\n[probe-onboarding-fresh] ${failures.length ? failures.length + ' failure(s)' : 'all green'}`);
  if (failures.length) process.exit(1);
})().catch(err => {
  console.error('[probe-onboarding-fresh] runner crashed:', err);
  process.exit(2);
});
