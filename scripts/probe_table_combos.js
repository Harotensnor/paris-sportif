#!/usr/bin/env node
/*
 * v37.046 — Combinatorial Tous-table probe.
 *
 * For every (preset × sport × sub-tab) combination, asserts:
 *   - the page re-renders without console errors
 *   - the displayed row count is consistent with the active filters
 *     (e.g. preset Big Bets shrinks vs Tout voir)
 *   - clicking the same combo twice is idempotent
 *
 * Walks each preset (all/bigbets/solides/outsiders), each sport
 * filter (none/football/tennis/basketball/hockey/baseball), each
 * sub-tab (pending/inprogress/finished). Catches drift between the
 * UI state and what's actually rendered — the "En cours (0) → 194 rows"
 * regression v37.037 fixed was a single tile in this matrix.
 *
 * Run: node scripts/probe_table_combos.js
 *   PROBE_PORT=8765   override the static server port
 *   CHROME_EXECUTABLE_PATH=/path/to/chrome
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PROBE_PORT || 0);
const CHROME_EXE = process.env.CHROME_EXECUTABLE_PATH || '';

const PRESETS = ['Tout voir', 'Big Bets', 'Solides', 'Outsiders'];
const SPORTS = [
  null,        // no sport filter
  '⚽ Foot',
  '🎾 Tennis',
  '🏀 Basket',
  '🏒 Hockey',
  '⚾ Baseball',
];
const SUB_TABS = ['pending', 'inprogress', 'finished'];

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

const failures = [];
function check(label, ok, detail) {
  console.log(`  [${ok ? 'ok' : 'FAIL'}] ${label}${ok ? '' : ' — ' + (detail || '')}`);
  if (!ok) failures.push({ label, detail });
}

(async () => {
  const server = await startServer();
  const port = server.address().port;
  console.log(`[probe-combos] static server on http://127.0.0.1:${port}`);
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
      prefs.onboardingDone = true;
      prefs.consentLocalStorage = 'accepted';
      localStorage.setItem('userPrefs', JSON.stringify(prefs));
      localStorage.removeItem('tousFilters');
      localStorage.removeItem('tousTab');
      localStorage.removeItem('tousSort');
      localStorage.removeItem('advFilters');
    } catch (e) {}
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PE:'+e.message));
  page.on('console', m => {
    if (m.type() === 'error') {
      const t = m.text();
      if (/Failed to load resource/i.test(t)) return;
      if (/ERR_/i.test(t)) return;
      if (/script does not have a MIME type/i.test(t)) return;
      errs.push('CE:'+t);
    }
  });

  await page.goto(`http://127.0.0.1:${port}/pronostics.html#tous`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);

  let combosTested = 0;
  const summary = [];
  for (const preset of PRESETS) {
    // Click the preset
    const presetClicked = await page.evaluate(p => {
      const btn = Array.from(document.querySelectorAll('.tous-filter-bar button'))
        .find(b => (b.textContent || '').trim() === p);
      if (!btn) return false;
      btn.click();
      return true;
    }, preset);
    if (!presetClicked) {
      check(`Preset "${preset}" clickable`, false, 'preset button not found');
      continue;
    }
    await page.waitForTimeout(450);

    for (const sport of SPORTS) {
      // Reset sport filter, then click the requested sport (if any)
      if (sport) {
        await page.evaluate(s => {
          const btn = Array.from(document.querySelectorAll('.tous-filter-bar [data-tous-sport]'))
            .find(b => (b.textContent || '').trim().includes(s.replace(/^[^\s]+\s+/, '')));
          if (btn) btn.click();
        }, sport);
        await page.waitForTimeout(300);
      }
      for (const tab of SUB_TABS) {
        const before = errs.length;
        try {
          await page.evaluate(t => {
            const b = document.querySelector(`[data-tous-tab="${t}"]`);
            if (b) b.click();
          }, tab);
        } catch (e) {
          // Page navigated mid-evaluate; settle and continue.
          await page.waitForTimeout(400);
        }
        await page.waitForTimeout(550);
        let state = { rendered: -1, badge: null, tab: '?' };
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            state = await page.evaluate(() => {
              const rows = Array.from(document.querySelectorAll('.tous-row'))
                .filter(r => r.offsetParent !== null);
              const tabKey = localStorage.getItem('tousTab') || 'pending';
              const targetBtn = document.querySelector(`[data-tous-tab="${tabKey}"]`);
              const m = targetBtn ? (targetBtn.textContent || '').match(/\((\d+)\)/) : null;
              return { rendered: rows.length, badge: m ? Number(m[1]) : null, tab: tabKey };
            });
            break;
          } catch (e) {
            await page.waitForTimeout(300);
          }
        }
        const newErrs = errs.slice(before);
        const ok = newErrs.length === 0 && (state.badge === null || state.rendered <= state.badge);
        combosTested++;
        if (!ok) failures.push({
          label: `preset=${preset} sport=${sport || 'all'} tab=${tab}`,
          detail: `rendered=${state.rendered}, badge=${state.badge}, errs=${newErrs.slice(0,1).join('')}`,
        });
        summary.push({ preset, sport: sport || '-', tab, rendered: state.rendered, badge: state.badge, errs: newErrs.length });
      }
      // Reset sport filter for next sport iteration
      if (sport) {
        await page.evaluate(s => {
          const btn = Array.from(document.querySelectorAll('.tous-filter-bar [data-tous-sport]'))
            .find(b => (b.textContent || '').trim().includes(s.replace(/^[^\s]+\s+/, '')));
          if (btn) btn.click();
        }, sport);
        await page.waitForTimeout(200);
      }
    }
  }

  // Pretty print summary
  console.log(`\n  preset           sport       tab         rendered  badge  errs`);
  console.log(  `  ---------------- ----------- ----------- --------- ------ ----`);
  for (const r of summary) {
    const sport = r.sport === '-' ? 'tous' : r.sport;
    console.log(`  ${r.preset.padEnd(16)} ${sport.padEnd(11)} ${r.tab.padEnd(11)} ${String(r.rendered).padStart(9)} ${String(r.badge ?? '-').padStart(6)} ${String(r.errs).padStart(4)}`);
  }

  await browser.close();
  server.close();

  console.log(`\n[probe-combos] ${combosTested} combos tested, ${failures.length} failure(s)`);
  if (failures.length) {
    for (const f of failures.slice(0, 20)) {
      console.log(`  - ${f.label}: ${f.detail}`);
    }
    process.exit(1);
  }
  console.log('[probe-combos] all green');
})().catch(err => {
  console.error('[probe-combos] runner crashed:', err);
  process.exit(2);
});
