#!/usr/bin/env node
/*
 * Keyboard navigation probe.
 *
 * Locks the no-mouse path across the global nav, Tous rows, detail modal
 * and command palette. A regression here means the app became harder to
 * use from a keyboard or assistive workflow even if mouse probes still pass.
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

async function waitApp(page, wrapId) {
  await page.waitForFunction(
    (id) => typeof window.getDataAge === 'function' && !!document.getElementById(id)?.offsetParent,
    wrapId,
    { timeout: 9000 }
  );
}

async function activeState(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return { tag: '', id: '', text: '', visible: false, selector: '' };
    const rect = el.getBoundingClientRect();
    const selector = [
      el.tagName.toLowerCase(),
      el.id ? `#${el.id}` : '',
      el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '',
      el.getAttribute('data-page') ? `[data-page="${el.getAttribute('data-page')}"]` : '',
      el.getAttribute('data-match-id') ? '[data-match-id]' : ''
    ].join('');
    return {
      tag: el.tagName,
      id: el.id || '',
      text: (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 80),
      visible: rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== 'hidden',
      selector
    };
  });
}

(async () => {
  const server = await startServer();
  const port = server.address().port;
  console.log(`[probe-keyboard] static server on http://127.0.0.1:${port}`);

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
    localStorage.removeItem('tousFilters');
    localStorage.removeItem('tousTab');
    localStorage.removeItem('advFilters');
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
  await waitApp(page, 'dashboard-wrap');

  const tabStops = [];
  for (let i = 0; i < 16; i += 1) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(40);
    tabStops.push(await activeState(page));
  }
  const visibleStops = tabStops.filter(x => x.visible && (x.id || x.text || x.selector));
  check('Tab reaches visible controls', visibleStops.length >= 4, JSON.stringify(visibleStops.slice(0, 6)));
  check(
    'Tab order includes global navigation',
    visibleStops.some(x => /Accueil|Tous|Performance|Méthode|Profil|Réglages/i.test(x.text)),
    JSON.stringify(visibleStops.slice(0, 10))
  );

  await page.evaluate(() => {
    const btn = document.querySelector('.page-btn[data-page="tous"]');
    if (!btn) throw new Error('missing Tous nav button');
    btn.focus();
  });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => location.hash === '#tous' && !!document.getElementById('tous-wrap')?.offsetParent, null, { timeout: 5000 });
  check('Enter activates focused global nav item', await page.evaluate(() => location.hash === '#tous'));

  await page.waitForFunction(() => document.querySelectorAll('.tous-row[data-match-id]').length > 0, null, { timeout: 9000 });
  await page.keyboard.press('j');
  await page.waitForTimeout(150);
  const rowFocus = await page.evaluate(() => {
    const el = document.activeElement;
    return {
      isRow: !!el?.matches?.('.tous-row[data-match-id]'),
      matchId: el?.getAttribute?.('data-match-id') || '',
      tabIndex: el?.getAttribute?.('tabindex') || ''
    };
  });
  check('j focuses first Tous row', rowFocus.isRow && !!rowFocus.matchId, JSON.stringify(rowFocus));

  await page.keyboard.press('j');
  await page.waitForTimeout(100);
  const secondRow = await page.evaluate(() => {
    const el = document.activeElement;
    return { isRow: !!el?.matches?.('.tous-row[data-match-id]'), matchId: el?.getAttribute?.('data-match-id') || '' };
  });
  check('j advances Tous row focus', secondRow.isRow && secondRow.matchId !== rowFocus.matchId, JSON.stringify({ first: rowFocus, second: secondRow }));

  await page.keyboard.press('k');
  await page.waitForTimeout(100);
  const backRow = await page.evaluate(() => document.activeElement?.getAttribute?.('data-match-id') || '');
  check('k moves Tous row focus back', backRow === rowFocus.matchId, JSON.stringify({ expected: rowFocus.matchId, got: backRow }));

  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const modal = document.getElementById('detail-modal');
    return modal && (modal.classList.contains('open') || modal.getAttribute('aria-hidden') === 'false');
  }, null, { timeout: 5000 });
  check('Enter opens focused row detail modal', await page.evaluate(() => {
    const modal = document.getElementById('detail-modal');
    return !!modal && (modal.classList.contains('open') || modal.getAttribute('aria-hidden') === 'false');
  }));

  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  check('Escape closes detail modal', await page.evaluate(() => {
    const modal = document.getElementById('detail-modal');
    return !modal || (!modal.classList.contains('open') && modal.getAttribute('aria-hidden') !== 'false');
  }));

  await page.keyboard.press('Control+K');
  await page.waitForFunction(() => document.activeElement?.id === '__cmd-input', null, { timeout: 3000 });
  await page.fill('#__cmd-input', 'performance');
  await page.waitForFunction(() => document.querySelector('#__cmd-results [role="option"]'), null, { timeout: 5000 });
  await page.locator('#__cmd-input').press('ArrowDown');
  const cmdActive = await page.evaluate(() => {
    const input = document.getElementById('__cmd-input');
    const selected = document.querySelector('#__cmd-results [aria-selected="true"]');
    return { active: input?.getAttribute('aria-activedescendant') || '', selected: selected?.id || '', label: selected?.textContent || '' };
  });
  check('ArrowDown updates command active option', !!cmdActive.active && cmdActive.active === cmdActive.selected, JSON.stringify(cmdActive));
  await page.fill('#__cmd-input', 'performance modele');
  await page.waitForFunction(() => {
    const first = document.querySelector('#__cmd-results [role="option"]');
    return first && /performance/i.test(first.textContent || '');
  }, null, { timeout: 5000 });
  await page.locator('#__cmd-input').press('Enter');
  await page.waitForFunction(() => location.hash.includes('performance'), null, { timeout: 5000 });
  check('Enter activates command palette result', await page.evaluate(() => location.hash.includes('performance')));

  await page.keyboard.press('Control+K');
  await page.waitForFunction(() => document.activeElement?.id === '__cmd-input', null, { timeout: 3000 });
  await page.locator('#__cmd-input').press('Escape');
  await page.waitForTimeout(150);
  check('Escape closes command palette', await page.evaluate(() => document.getElementById('__cmd-modal')?.style.display === 'none'));
  check('zero console errors', errors.length === 0, errors.slice(0, 4).join(' | '));

  await ctx.close();
  await browser.close();
  server.close();

  console.log(`\n[probe-keyboard] ${failures.length ? failures.length + ' failure(s)' : 'all green'}`);
  if (failures.length) process.exit(1);
})().catch(err => {
  console.error('[probe-keyboard] runner crashed:', err);
  process.exit(2);
});
