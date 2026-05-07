#!/usr/bin/env node
/*
 * Browser notifications opt-in probe.
 *
 * Locks the privacy rule: the app may read Notification.permission at boot,
 * but must not call requestPermission() until the user explicitly clicks the
 * notification control. A saved opt-in preference must not prompt again on
 * reload while the browser permission is still "default".
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

async function installNotificationStub(ctx, opts = {}) {
  await ctx.addInitScript(({ pushNotifs }) => {
    const prefs = {
      onboardingDone: true,
      consentLocalStorage: 'accepted',
      theme: 'dark',
      pushNotifs: !!pushNotifs
    };
    localStorage.setItem('paris_sportif_onboarded_v1', '1');
    localStorage.setItem('paris_sportif_onboarded_v2', '1');
    localStorage.setItem('userPrefs', JSON.stringify(prefs));
    sessionStorage.setItem('autoRefreshDone', '1');
    window.__notifRequests = 0;
    window.__nativeNotifications = [];
    function FakeNotification(title, payload) {
      window.__nativeNotifications.push({ title, payload });
      this.close = function close() {};
    }
    FakeNotification.permission = 'default';
    FakeNotification.requestPermission = function requestPermission() {
      window.__notifRequests += 1;
      FakeNotification.permission = 'granted';
      return Promise.resolve('granted');
    };
    Object.defineProperty(window, 'Notification', {
      value: FakeNotification,
      configurable: true
    });
  }, opts);
}

async function openPage(browser, port, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  await installNotificationStub(ctx, opts);
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
  await page.waitForFunction(() => typeof window.getDataAge === 'function' && !!document.getElementById('notif-toggle'), null, { timeout: 9000 });
  await page.waitForTimeout(600);
  return { ctx, page, errors };
}

(async () => {
  const server = await startServer();
  const port = server.address().port;
  console.log(`[probe-notifications] static server on http://127.0.0.1:${port}`);

  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});

  const first = await openPage(browser, port, { pushNotifs: false });
  check('boot does not request notification permission', await first.page.evaluate(() => window.__notifRequests === 0));
  await first.page.click('#notif-toggle');
  await first.page.waitForFunction(() => window.__notifRequests === 1, null, { timeout: 4000 });
  const afterClick = await first.page.evaluate(() => {
    let prefs = {};
    try { prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}'); } catch (e) { prefs = {}; }
    return {
      requests: window.__notifRequests,
      permission: Notification.permission,
      pushNotifs: prefs.pushNotifs === true,
      button: document.getElementById('notif-toggle')?.textContent || ''
    };
  });
  check('explicit click requests permission once', afterClick.requests === 1 && afterClick.permission === 'granted', JSON.stringify(afterClick));
  check('explicit click enables local push preference', afterClick.pushNotifs === true, JSON.stringify(afterClick));
  check('opt-in run has zero console errors', first.errors.length === 0, first.errors.slice(0, 3).join(' | '));
  await first.ctx.close();

  const saved = await openPage(browser, port, { pushNotifs: true });
  const savedBoot = await saved.page.evaluate(() => ({
    requests: window.__notifRequests,
    permission: Notification.permission,
    pushNotifs: JSON.parse(localStorage.getItem('userPrefs') || '{}').pushNotifs === true
  }));
  check('saved opt-in does not prompt again at boot', savedBoot.requests === 0 && savedBoot.permission === 'default' && savedBoot.pushNotifs, JSON.stringify(savedBoot));
  check('saved opt-in run has zero console errors', saved.errors.length === 0, saved.errors.slice(0, 3).join(' | '));
  await saved.ctx.close();

  await browser.close();
  server.close();
  console.log(`\n[probe-notifications] ${failures.length ? failures.length + ' failure(s)' : 'all green'}`);
  if (failures.length) process.exit(1);
})().catch(err => {
  console.error('[probe-notifications] runner crashed:', err);
  process.exit(2);
});
