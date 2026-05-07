#!/usr/bin/env node
/*
 * Mobile pull-to-refresh probe.
 *
 * Locks the touch-only refresh gesture: a downward pull at scroll top must
 * reveal the indicator, cross the ready threshold, call pollData(true), keep
 * the UI responsive while refreshing, then hide cleanly once the refresh ends.
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

async function waitApp(page) {
  await page.waitForFunction(
    () => typeof window.getDataAge === 'function' && !!document.querySelector('.page-shell, #app, main'),
    null,
    { timeout: 9000 }
  );
}

async function indicatorState(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.ptr-indicator');
    if (!el) return null;
    return {
      text: el.textContent || '',
      cls: el.className || '',
      hidden: el.getAttribute('aria-hidden'),
      progress: el.style.getPropertyValue('--ptr-progress') || '',
      pointer: getComputedStyle(document.body).pointerEvents
    };
  });
}

async function waitRefreshing(page, timeout = 1200) {
  return page.waitForFunction(() => {
    const el = document.querySelector('.ptr-indicator');
    return el && el.classList.contains('refreshing');
  }, null, { timeout }).then(() => true).catch(() => false);
}

async function dispatchDomPull(page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    const makeTouch = y => ({
      identifier: 1,
      target: document.body,
      clientX: 180,
      clientY: y,
      pageX: 180,
      pageY: y,
      screenX: 180,
      screenY: y,
      radiusX: 4,
      radiusY: 4,
      force: 1
    });
    const emit = (type, y, active) => {
      const touch = active ? makeTouch(y) : null;
      const ev = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(ev, 'touches', { value: touch ? [touch] : [] });
      Object.defineProperty(ev, 'targetTouches', { value: touch ? [touch] : [] });
      Object.defineProperty(ev, 'changedTouches', { value: [makeTouch(y)] });
      document.dispatchEvent(ev);
    };
    emit('touchstart', 8, true);
    emit('touchmove', 56, true);
    emit('touchmove', 118, true);
    emit('touchend', 118, false);
  });
}

async function dispatchPull(page) {
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 180, y: 8, radiusX: 4, radiusY: 4, force: 1 }]
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: 180, y: 55, radiusX: 4, radiusY: 4, force: 1 }]
  });
  await page.waitForTimeout(80);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: 180, y: 116, radiusX: 4, radiusY: 4, force: 1 }]
  });
  await page.waitForTimeout(80);
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  if (!(await waitRefreshing(page))) await dispatchDomPull(page);
}

(async () => {
  const server = await startServer();
  const port = server.address().port;
  console.log(`[probe-pull-refresh] static server on http://127.0.0.1:${port}`);

  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
  });
  await ctx.addInitScript(() => {
    if (!('ontouchstart' in window)) {
      Object.defineProperty(window, 'ontouchstart', { value: null, configurable: true });
    }
    localStorage.setItem('paris_sportif_onboarded_v1', '1');
    localStorage.setItem('paris_sportif_onboarded_v2', '1');
    localStorage.setItem('userPrefs', JSON.stringify({
      onboardingDone: true,
      consentLocalStorage: 'accepted',
      theme: 'dark'
    }));
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
  await waitApp(page);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    window.__ptrForce = null;
    window.__ptrResolve = null;
    window.pollData = force => {
      window.__ptrForce = force;
      return new Promise(resolve => { window.__ptrResolve = resolve; });
    };
  });

  await dispatchPull(page);
  await page.waitForFunction(() => {
    const el = document.querySelector('.ptr-indicator');
    return el && el.classList.contains('refreshing');
  }, null, { timeout: 4000 });
  const refreshing = await indicatorState(page);
  check('indicator enters refreshing state', !!refreshing && /Rafraichissement|Rafraîchissement/i.test(refreshing.text) && refreshing.cls.includes('visible'), JSON.stringify(refreshing));
  check('pull calls pollData(true)', await page.evaluate(() => window.__ptrForce === true), 'pollData was not called with force=true');
  check('UI remains interactive while refresh is pending', refreshing && refreshing.pointer !== 'none', JSON.stringify(refreshing));

  await page.evaluate(() => { if (typeof window.__ptrResolve === 'function') window.__ptrResolve(); });
  await page.waitForFunction(() => {
    const el = document.querySelector('.ptr-indicator');
    return el && !el.classList.contains('visible') && el.getAttribute('aria-hidden') === 'true';
  }, null, { timeout: 3000 });
  const hidden = await indicatorState(page);
  check('indicator hides after refresh resolves', !!hidden && hidden.hidden === 'true' && !hidden.cls.includes('visible'), JSON.stringify(hidden));
  check('zero console errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  await ctx.close();
  await browser.close();
  server.close();
  console.log(`\n[probe-pull-refresh] ${failures.length ? failures.length + ' failure(s)' : 'all green'}`);
  if (failures.length) process.exit(1);
})().catch(err => {
  console.error('[probe-pull-refresh] runner crashed:', err);
  process.exit(2);
});
