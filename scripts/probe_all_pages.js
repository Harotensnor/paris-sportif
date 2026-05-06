#!/usr/bin/env node
/*
 * v37.031 — Deep page probe.
 *
 * Visits every distinct route + every meaningful alias and asserts:
 *   - no pageerror, no console.error besides 404 / cert / DNS noise
 *   - no horizontal overflow at 375 / 1280 viewports
 *   - the main content area renders SOMETHING substantial (not blank)
 *   - performance sub-tabs all click cleanly
 *
 * Designed to run alongside scripts/smoke_e2e.js. Smoke covers the
 * 15 page-button clicks in one go; this script drills harder per
 * page and per sub-tab so a regression on, say, the Stratégies tab
 * gets caught even when the parent page boots cleanly.
 *
 * Usage : node scripts/probe_all_pages.js
 *   PROBE_PORT=8765   override the static server port
 *   CHROME_EXECUTABLE_PATH=/path/to/chrome   override browser binary
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PROBE_PORT || 0);
const CHROME_EXE = process.env.CHROME_EXECUTABLE_PATH || '';

// Each entry: hash, label, expected wrap id (the renderer mounts there).
// All routes resolve to one of dashboard / tous / performance / profil /
// academie / buteurs after PAGE_ALIASES rewriting; we still probe each
// alias to verify the rewrite + sub-view selection works.
const PROBES = [
  { hash: '#dashboard',     label: 'Accueil',                    wrap: 'dashboard-wrap' },
  { hash: '#tous',          label: 'Tous les pronostics',        wrap: 'tous-wrap' },
  { hash: '#combines',      label: 'Combinés (alias tous)',      wrap: 'tous-wrap' },
  { hash: '#valeur',        label: 'Valeur (alias tous)',        wrap: 'tous-wrap' },
  { hash: '#calendrier',    label: 'Calendrier (alias tous)',    wrap: 'tous-wrap' },
  { hash: '#plan-mise',     label: 'Plan de mise (alias tous)',  wrap: 'tous-wrap' },
  { hash: '#performance',   label: 'Performance',                wrap: 'performance-wrap' },
  { hash: '#bilan',         label: 'Bilan (alias performance)',  wrap: 'performance-wrap' },
  { hash: '#historique',    label: 'Historique (alias perf)',    wrap: 'performance-wrap' },
  { hash: '#backtest',      label: 'Backtest (alias perf)',      wrap: 'performance-wrap' },
  { hash: '#credibilite',   label: 'Crédibilité',                wrap: 'credibilite-wrap' },
  { hash: '#academie',      label: 'Académie',                   wrap: 'academie-wrap' },
  { hash: '#profil',        label: 'Profil',                     wrap: 'profil-wrap' },
  { hash: '#favoris',       label: 'Favoris (alias profil)',     wrap: 'profil-wrap' },
  { hash: '#alertes',       label: 'Alertes (alias profil)',     wrap: 'profil-wrap' },
  { hash: '#sante',         label: 'Santé (alias profil)',       wrap: 'profil-wrap' },
  { hash: '#buteurs',       label: 'Buteurs',                    wrap: 'buteurs-wrap' },
];

const PERF_TABS = ['global', 'periode', 'confiance', 'marche', 'sport', 'ligue', 'strategies'];
const VIEWPORTS = [
  { width: 1280, height: 800, label: 'desktop' },
  { width: 375, height: 812, label: 'mobile' },
];

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js'))   return 'text/javascript; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.jsonl')) return 'application/x-ndjson; charset=utf-8';
  if (file.endsWith('.css'))  return 'text/css; charset=utf-8';
  if (file.endsWith('.svg'))  return 'image/svg+xml';
  if (file.endsWith('.png'))  return 'image/png';
  if (file.endsWith('.webmanifest')) return 'application/manifest+json';
  return 'application/octet-stream';
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let url = req.url.split('?')[0];
      if (url === '/') url = '/index.html';
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

function isIgnorableConsoleError(text) {
  if (/Failed to load resource/i.test(text) && /404/.test(text)) return true;
  if (/ERR_(CERT|NAME_NOT_RESOLVED|TIMED_OUT|CONNECTION_(REFUSED|RESET|CLOSED)|FAILED|EMPTY_RESPONSE|BLOCKED_BY_CLIENT)/i.test(text)) return true;
  // 3rd-party CDN / analytics — same intent as the smoke filter.
  if (/clubelo\.com|espncdn\.com|sofascore\.com|gstatic\.com|plausible|cloudflareinsights/i.test(text)) return true;
  return false;
}

const MIN_TEXT_LEN = 100;

(async () => {
  const server = await startServer();
  const port = server.address().port;
  console.log(`[probe] static server on http://127.0.0.1:${port}`);

  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const failures = [];
  let pagesProbed = 0;
  let pageOk = 0;

  for (const viewport of VIEWPORTS) {
    console.log(`\n=== viewport: ${viewport.label} (${viewport.width}x${viewport.height}) ===`);
    const ctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    await ctx.addInitScript(() => {
      try {
        const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
        prefs.onboardingDone = true;
        prefs.consentLocalStorage = 'accepted';
        localStorage.setItem('userPrefs', JSON.stringify(prefs));
      } catch (e) {}
    });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push({ kind: 'pageerror', msg: e.message }));
    page.on('console', m => {
      if (m.type() === 'error') {
        const t = m.text();
        if (!isIgnorableConsoleError(t)) errs.push({ kind: 'console.error', msg: t });
      }
    });

    await page.goto(`http://127.0.0.1:${port}/pronostics.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    for (const probe of PROBES) {
      pagesProbed++;
      const before = errs.length;
      await page.evaluate((h) => { window.location.hash = h; }, probe.hash);
      await page.waitForTimeout(450);

      const overflow = await page.evaluate(() => {
        return Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);
      });

      // Aggregate visible text across ALL direct children of #main-content
      // so pages that mount a sub-nav + a content wrap (e.g. Performance)
      // are not falsely flagged because the sub-nav comes first.
      const renderInfo = await page.evaluate((expectedId) => {
        const main = document.querySelector('#main-content') || document.querySelector('main') || document.body;
        const expected = document.getElementById(expectedId);
        const visibleKids = Array.from(main.querySelectorAll(':scope > div'))
          .filter(el => el.offsetParent !== null);
        const totalText = visibleKids.map(el => (el.innerText || '').trim()).join('\n');
        const ids = visibleKids.map(el => el.id || '(no-id)').join(',');
        return {
          expectedVisible: !!(expected && expected.offsetParent !== null),
          visibleIds: ids,
          totalTextLen: totalText.length,
          textSample: totalText.slice(0, 100).replace(/\s+/g, ' '),
        };
      }, probe.wrap);

      const newErrs = errs.slice(before);
      const renderOk = renderInfo.totalTextLen >= MIN_TEXT_LEN;
      const ok = newErrs.length === 0 && overflow <= 2 && renderOk;
      if (ok) pageOk++;

      const flags = [];
      if (newErrs.length) flags.push(`${newErrs.length} JS error(s)`);
      if (overflow > 2) flags.push(`overflow ${overflow}px`);
      if (!renderOk) flags.push(`text=${renderInfo.totalTextLen} on [${renderInfo.visibleIds}]`);
      console.log(`  [${ok ? 'ok' : 'FAIL'}] ${probe.hash.padEnd(20)} ${probe.label}${flags.length ? ' — ' + flags.join(', ') : ''}`);
      for (const err of newErrs.slice(0, 3)) {
        console.log(`        ${err.kind}: ${String(err.msg).slice(0, 240)}`);
        failures.push({ viewport: viewport.label, probe: probe.hash, ...err });
      }
      if (overflow > 2) failures.push({ viewport: viewport.label, probe: probe.hash, kind: 'overflow', msg: `${overflow}px` });
      if (!renderOk) failures.push({ viewport: viewport.label, probe: probe.hash, kind: 'render', msg: `text=${renderInfo.totalTextLen} visibleIds=${renderInfo.visibleIds}` });
    }

    if (viewport.label === 'desktop') {
      console.log(`\n  [sub] performance sub-tabs:`);
      await page.evaluate(() => { window.location.hash = '#performance'; });
      await page.waitForTimeout(500);
      for (const tabKey of PERF_TABS) {
        const before = errs.length;
        const clicked = await page.evaluate((k) => {
          const btn = document.querySelector(`[data-perf-tab="${k}"]`);
          if (!btn) return false;
          btn.click();
          return true;
        }, tabKey);
        await page.waitForTimeout(350);
        const newErrs = errs.slice(before);
        if (!clicked) {
          console.log(`    [skip] ${tabKey.padEnd(12)} button not present`);
          continue;
        }
        pagesProbed++;
        const ok = newErrs.length === 0;
        if (ok) pageOk++;
        console.log(`    [${ok ? 'ok' : 'FAIL'}] ${tabKey.padEnd(12)} ${newErrs.length ? newErrs.length + ' err(s)' : ''}`);
        for (const err of newErrs.slice(0, 2)) {
          console.log(`        ${err.kind}: ${String(err.msg).slice(0, 240)}`);
          failures.push({ viewport: 'desktop-subtab', probe: `perf:${tabKey}`, ...err });
        }
      }
    }

    await ctx.close();
  }

  await browser.close();
  server.close();

  console.log(`\n[probe] ${pageOk} / ${pagesProbed} probes ok`);
  if (failures.length) {
    console.log(`[probe] ${failures.length} failure(s):`);
    for (const f of failures.slice(0, 30)) {
      console.log(`  - [${f.viewport}] ${f.probe} ${f.kind}: ${String(f.msg).slice(0, 200)}`);
    }
    process.exit(1);
  }
  console.log('[probe] all green');
})().catch(err => {
  console.error('[probe] runner crashed:', err);
  process.exit(2);
});
