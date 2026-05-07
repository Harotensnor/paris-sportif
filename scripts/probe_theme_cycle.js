#!/usr/bin/env node
/*
 * Theme cycle probe.
 *
 * Locks the topbar theme control and Shift+T shortcut to the product's
 * three-state cycle: dark -> light -> auto -> dark. Also verifies that auto
 * follows the browser color scheme and that meta theme-color stays in sync.
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
    () => typeof window.getDataAge === 'function' && !!document.getElementById('theme-toggle'),
    null,
    { timeout: 7000 }
  );
}

async function themeState(page) {
  return page.evaluate(() => {
    let prefs = {};
    try { prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}'); } catch (e) { prefs = {}; }
    const root = document.documentElement;
    const btn = document.getElementById('theme-toggle');
    return {
      stored: prefs.theme || null,
      dataTheme: root.getAttribute('data-theme') || 'dark',
      meta: document.getElementById('theme-color-meta')?.getAttribute('content') || '',
      bodyBg: getComputedStyle(document.body).backgroundColor,
      buttonText: btn?.textContent || '',
      buttonTitle: btn?.getAttribute('title') || '',
      filter: root.style.filter || ''
    };
  });
}

async function openPage(browser, port, colorScheme, initialTheme = 'dark') {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 }, colorScheme });
  await ctx.addInitScript(theme => {
    localStorage.setItem('userPrefs', JSON.stringify({
      onboardingDone: true,
      consentLocalStorage: 'accepted',
      theme
    }));
    localStorage.setItem('paris_sportif_onboarded_v1', '1');
    localStorage.setItem('paris_sportif_onboarded_v2', '1');
    sessionStorage.setItem('autoRefreshDone', '1');
  }, initialTheme);
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
  return { ctx, page, errors };
}

(async () => {
  const server = await startServer();
  const port = server.address().port;
  console.log(`[probe-theme-cycle] static server on http://127.0.0.1:${port}`);

  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});

  const darkRun = await openPage(browser, port, 'dark', 'dark');
  const initial = await themeState(darkRun.page);
  check('initial dark theme is applied', initial.stored === 'dark' && initial.dataTheme === 'dark' && initial.meta === '#08080a', JSON.stringify(initial));

  await darkRun.page.keyboard.press('Shift+T');
  await darkRun.page.waitForFunction(() => JSON.parse(localStorage.getItem('userPrefs') || '{}').theme === 'light');
  const light = await themeState(darkRun.page);
  check('Shift+T moves dark -> light', light.stored === 'light' && light.dataTheme === 'light', JSON.stringify(light));
  check('light theme changes visual background/meta', light.bodyBg !== initial.bodyBg && light.meta === '#f5f5f7', JSON.stringify({ initial, light }));

  await darkRun.page.keyboard.press('Shift+T');
  await darkRun.page.waitForFunction(() => JSON.parse(localStorage.getItem('userPrefs') || '{}').theme === 'auto');
  const autoDark = await themeState(darkRun.page);
  check('Shift+T moves light -> auto', autoDark.stored === 'auto' && autoDark.buttonText.includes('🌓'), JSON.stringify(autoDark));
  check('auto follows dark browser scheme', autoDark.dataTheme === 'dark' && autoDark.meta === '#08080a', JSON.stringify(autoDark));

  await darkRun.page.keyboard.press('Shift+T');
  await darkRun.page.waitForFunction(() => JSON.parse(localStorage.getItem('userPrefs') || '{}').theme === 'dark');
  const backDark = await themeState(darkRun.page);
  check('Shift+T moves auto -> dark', backDark.stored === 'dark' && backDark.dataTheme === 'dark', JSON.stringify(backDark));
  check('no clock-based filter overrides explicit theme', backDark.filter === '', JSON.stringify(backDark));
  check('dark run has zero console errors', darkRun.errors.length === 0, darkRun.errors.slice(0, 3).join(' | '));
  await darkRun.ctx.close();

  const lightRun = await openPage(browser, port, 'light', 'auto');
  const autoLight = await themeState(lightRun.page);
  check('auto follows light browser scheme', autoLight.stored === 'auto' && autoLight.dataTheme === 'light' && autoLight.meta === '#f5f5f7', JSON.stringify(autoLight));
  check('auto light run has zero console errors', lightRun.errors.length === 0, lightRun.errors.slice(0, 3).join(' | '));
  await lightRun.ctx.close();

  await browser.close();
  server.close();
  console.log(`\n[probe-theme-cycle] ${failures.length ? failures.length + ' failure(s)' : 'all green'}`);
  if (failures.length) process.exit(1);
})().catch(err => {
  console.error('[probe-theme-cycle] runner crashed:', err);
  process.exit(2);
});
