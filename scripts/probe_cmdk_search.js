#!/usr/bin/env node
/*
 * Cmd-K command palette probe.
 *
 * Locks the global command palette: Ctrl/Cmd-K opens the modal command
 * surface, typed results expose role=option, ArrowDown updates the active
 * option, Enter activates a route command, Escape closes, and "/" remains
 * the dedicated topbar search shortcut.
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
    () => typeof window.getDataAge === 'function'
      && !!document.getElementById('search')
      && !!document.getElementById('__cmd-modal'),
    null,
    { timeout: 9000 }
  );
}

(async () => {
  const server = await startServer();
  const port = server.address().port;
  console.log(`[probe-cmdk] static server on http://127.0.0.1:${port}`);

  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  await ctx.addInitScript(() => {
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
  await page.locator('body').click({ position: { x: 24, y: 160 } });
  await page.keyboard.press('Control+K');
  await page.waitForFunction(() => {
    const modal = document.getElementById('__cmd-modal');
    return modal && modal.style.display !== 'none' && document.activeElement?.id === '__cmd-input';
  }, null, { timeout: 3000 });
  check('Ctrl+K opens command palette', await page.evaluate(() => {
    const modal = document.getElementById('__cmd-modal');
    return modal?.style.display !== 'none' && document.activeElement?.id === '__cmd-input';
  }));

  await page.fill('#__cmd-input', 'performance');
  await page.waitForFunction(() => {
    const box = document.getElementById('__cmd-results');
    return box && box.querySelectorAll('[role="option"]').length > 0;
  }, null, { timeout: 5000 });
  const listboxState = await page.evaluate(() => {
    const box = document.getElementById('__cmd-results');
    const input = document.getElementById('__cmd-input');
    const options = Array.from(box.querySelectorAll('[role="option"]'));
    return {
      role: box.getAttribute('role'),
      count: options.length,
      selected: options.filter(o => o.getAttribute('aria-selected') === 'true').map(o => o.id),
      active: input.getAttribute('aria-activedescendant') || '',
      labels: options.map(o => o.textContent || '').slice(0, 5)
    };
  });
  check('suggestions render as listbox options', listboxState.role === 'listbox' && listboxState.count > 0, JSON.stringify(listboxState));
  check('Performance destination appears in Cmd-K results', listboxState.labels.some(x => /performance/i.test(x || '')), JSON.stringify(listboxState));
  check('active option is linked to input', listboxState.selected.length === 1 && listboxState.active === listboxState.selected[0], JSON.stringify(listboxState));

  await page.locator('#__cmd-input').press('ArrowDown');
  const selectedAfterDown = await page.evaluate(() => {
    const box = document.getElementById('__cmd-results');
    const input = document.getElementById('__cmd-input');
    const opt = box.querySelector('[aria-selected="true"]');
    return {
      selected: opt?.textContent || '',
      active: input.getAttribute('aria-activedescendant') || '',
      selectedId: opt?.id || ''
    };
  });
  check('ArrowDown selects one active command', !!selectedAfterDown.selected && selectedAfterDown.active === selectedAfterDown.selectedId, JSON.stringify(selectedAfterDown));

  await page.fill('#__cmd-input', 'performance modele');
  await page.waitForFunction(() => {
    const first = document.querySelector('#__cmd-results [role="option"]');
    return first && /performance/i.test(first.textContent || '');
  }, null, { timeout: 5000 });
  await page.locator('#__cmd-input').press('Enter');
  await page.waitForFunction(() => location.hash.includes('performance'), null, { timeout: 5000 });
  check('Enter activates page destination', await page.evaluate(() => location.hash.includes('performance') && /Performance/i.test(document.body.textContent || '')));

  await page.locator('body').click({ position: { x: 20, y: 120 } });
  await page.keyboard.press('Control+K');
  await page.waitForFunction(() => document.activeElement?.id === '__cmd-input', null, { timeout: 3000 });
  await page.locator('#__cmd-input').press('Escape');
  const escapeState = await page.evaluate(() => {
    const modal = document.getElementById('__cmd-modal');
    const input = document.getElementById('__cmd-input');
    return {
      display: modal.style.display,
      active: document.activeElement?.id || document.activeElement?.tagName || '',
      activeDescendant: input.getAttribute('aria-activedescendant') || ''
    };
  });
  check('Escape closes command palette', escapeState.display === 'none' && escapeState.active !== '__cmd-input' && !escapeState.activeDescendant, JSON.stringify(escapeState));

  await page.locator('body').click({ position: { x: 20, y: 120 } });
  await page.keyboard.press('/');
  await page.waitForFunction(() => document.activeElement?.id === 'search', null, { timeout: 3000 });
  check('slash shortcut remains topbar search focus', await page.evaluate(() => document.activeElement?.id === 'search'));
  check('zero console errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  await ctx.close();
  await browser.close();
  server.close();
  console.log(`\n[probe-cmdk] ${failures.length ? failures.length + ' failure(s)' : 'all green'}`);
  if (failures.length) process.exit(1);
})().catch(err => {
  console.error('[probe-cmdk] runner crashed:', err);
  process.exit(2);
});
