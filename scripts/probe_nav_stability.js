#!/usr/bin/env node
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PROBE_PORT || 0);
const CHROME_EXE = process.env.CHROME_EXECUTABLE_PATH || '';
const routes = ['#dashboard', '#tous', '#performance', '#academie', '#profil'];
const failures = [];

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
      if (!filePath.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
      fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) { res.statusCode = 404; return res.end('not found'); }
        res.setHeader('Content-Type', contentType(filePath));
        res.setHeader('Cache-Control', 'no-store');
        fs.createReadStream(filePath).pipe(res);
      });
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

function check(label, ok, detail) {
  console.log(`  [${ok ? 'ok' : 'FAIL'}] ${label}${ok ? '' : ' - ' + (detail || '')}`);
  if (!ok) failures.push({ label, detail });
}

function sameRect(a, b) {
  return ['x', 'y', 'w', 'h'].every(key => Math.abs(a[key] - b[key]) <= 2);
}

function sameDesktopNav(a, b) {
  return a.display === b.display
    && a.flexDirection === b.flexDirection
    && a.position === b.position
    && sameRect(a.rect, b.rect)
    && JSON.stringify(a.items) === JSON.stringify(b.items);
}

function sameMobileNav(a, b) {
  return a.display === b.display
    && a.position === b.position
    && JSON.stringify(a.items) === JSON.stringify(b.items);
}

async function prepareContext(browser, viewport) {
  const ctx = await browser.newContext({ viewport });
  await ctx.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('userPrefs', JSON.stringify({
        onboardingDone: true,
        consentLocalStorage: 'accepted'
      }));
    } catch (e) {}
  });
  return ctx;
}

async function collectRouteSnapshots(page, port, mode) {
  const out = [];
  for (const route of routes) {
    if (!out.length) {
      await page.goto(`http://127.0.0.1:${port}/pronostics.html${route}`, { waitUntil: 'domcontentloaded' });
    } else {
      await page.evaluate(hash => { window.location.hash = hash; }, route);
    }
    await page.waitForTimeout(1100);
    out.push(await page.evaluate(currentMode => {
      const desktopNav = document.querySelector('#page-nav');
      const mobileNav = document.querySelector('#mobile-bottom-nav');
      const target = currentMode === 'desktop' ? desktopNav : mobileNav;
      const style = target ? getComputedStyle(target) : null;
      const rect = target ? target.getBoundingClientRect() : null;
      const desktopItems = () => Array.from(desktopNav?.querySelectorAll('[data-page]') || []).map(el => ({
        page: el.dataset.page || '',
        icon: (el.querySelector('.v36-nav-ico')?.textContent || '').trim(),
        title: (el.querySelector('strong')?.textContent || '').replace(/\s+/g, ' ').trim(),
        subtitle: (el.querySelector('em')?.textContent || '').replace(/\s+/g, ' ').trim()
      }));
      const mobileItems = () => Array.from(mobileNav?.querySelectorAll('.mbn-btn') || []).map(el => ({
        page: el.dataset.page || el.id || '',
        icon: (el.querySelector('.mbn-icon')?.textContent || '').trim(),
        label: (el.querySelector('.mbn-label')?.textContent || '').replace(/\s+/g, ' ').trim()
      }));
      return {
        route: location.hash.split('?')[0],
        display: style?.display || '',
        flexDirection: style?.flexDirection || '',
        position: style?.position || '',
        rect: rect ? {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          w: Math.round(rect.width),
          h: Math.round(rect.height)
        } : { x: 0, y: 0, w: 0, h: 0 },
        items: currentMode === 'desktop' ? desktopItems() : mobileItems(),
        active: Array.from((currentMode === 'desktop' ? desktopNav : mobileNav)?.querySelectorAll('.active[data-page]') || []).map(el => el.dataset.page || '')
      };
    }, mode));
  }
  return out;
}

(async () => {
  const server = await startServer();
  const port = server.address().port;
  console.log(`[probe-nav-stability] static server on http://127.0.0.1:${port}`);

  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});

  const desktopCtx = await prepareContext(browser, { width: 1440, height: 900 });
  const desktopPage = await desktopCtx.newPage();
  const errors = [];
  for (const page of [desktopPage]) {
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => {
      if (m.type() !== 'error') return;
      const text = m.text();
      if (/Failed to load resource|ERR_|MIME type/i.test(text)) return;
      errors.push(text);
    });
  }
  const desktop = await collectRouteSnapshots(desktopPage, port, 'desktop');
  const desktopBase = desktop[0];
  // v37.165 — nav passé de sidebar verticale (column/fixed) à topbar horizontale (row/sticky).
  // On accepte les 2 mises en page tant qu'elles sont stables entre routes.
  check('desktop baseline nav is present',
    desktopBase.display === 'flex'
    && (desktopBase.flexDirection === 'column' || desktopBase.flexDirection === 'row')
    && (desktopBase.position === 'fixed' || desktopBase.position === 'sticky'),
    JSON.stringify(desktopBase));
  for (const snap of desktop.slice(1)) {
    check(`desktop nav stable on ${snap.route}`, sameDesktopNav(desktopBase, snap),
      JSON.stringify({ base: desktopBase, got: snap }));
    check(`desktop active follows ${snap.route}`, snap.active.includes(snap.route.slice(1)),
      `active=${snap.active.join(',')}`);
  }
  await desktopCtx.close();

  const mobileCtx = await prepareContext(browser, { width: 390, height: 844 });
  const mobilePage = await mobileCtx.newPage();
  mobilePage.on('pageerror', e => errors.push(e.message));
  mobilePage.on('console', m => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (/Failed to load resource|ERR_|MIME type/i.test(text)) return;
    errors.push(text);
  });
  const mobile = await collectRouteSnapshots(mobilePage, port, 'mobile');
  const mobileBase = mobile[0];
  check('mobile baseline bottom nav is present', mobileBase.items.length >= 5 && mobileBase.position === 'fixed',
    JSON.stringify(mobileBase));
  for (const snap of mobile.slice(1)) {
    check(`mobile bottom nav stable on ${snap.route}`, sameMobileNav(mobileBase, snap),
      JSON.stringify({ base: mobileBase, got: snap }));
  }
  await mobileCtx.close();

  check('no console/page errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  await browser.close();
  server.close();

  if (failures.length) {
    console.error(`\n[probe-nav-stability] ${failures.length} failure(s)`);
    process.exit(1);
  }
  console.log('\n[probe-nav-stability] OK');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
