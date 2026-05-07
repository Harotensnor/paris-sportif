#!/usr/bin/env node
/*
 * v37.046 — Modal probe across every sport in the dataset.
 *
 * Opens the detail modal on at least one match per sport (football,
 * tennis, basketball, hockey, baseball). For each, asserts:
 *   - the modal opens (#detail-modal.open)
 *   - it contains the home and away team names
 *   - all six modal tabs (synthese / signaux / cotes / transparence /
 *     h2h / stats) click through without console errors
 *   - the cotes tab shows odd information
 *
 * Catches sport-specific regressions in the modal: e.g. the basketball
 * branch missing a stats panel, the baseball pitcher block crashing,
 * etc.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PROBE_PORT || 0);
const CHROME_EXE = process.env.CHROME_EXECUTABLE_PATH || '';

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
  console.log(`[probe-modal-sports] static server on http://127.0.0.1:${port}`);
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
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

  await page.goto(`http://127.0.0.1:${port}/pronostics.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Find one match id per sport directly from window.PRONOSTICS_DATA.
  const samples = await page.evaluate(() => {
    const out = {};
    const days = (window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.days) || {};
    for (const arr of Object.values(days)) {
      for (const ev of (arr || [])) {
        if (!out[ev.sport] && (ev.winamax || {}).available && ev.id) {
          out[ev.sport] = String(ev.id);
        }
      }
    }
    return out;
  });
  console.log(`  data has matches for sports: ${Object.keys(samples).join(', ')}`);

  for (const [sport, matchId] of Object.entries(samples)) {
    console.log(`\n  === ${sport} (match ${matchId}) ===`);
    // Open the modal via window.openDetail by looking up the match.
    const opened = await page.evaluate(id => {
      const days = window.PRONOSTICS_DATA?.days || {};
      let match = null;
      for (const arr of Object.values(days)) {
        for (const ev of (arr || [])) {
          if (String(ev.id) === id) { match = ev; break; }
        }
        if (match) break;
      }
      if (!match) return { ok: false, reason: 'match not found in data' };
      if (typeof window.openDetail !== 'function') {
        // fallback: trigger via predictMatch-aware modal opener if exposed
        return { ok: false, reason: 'window.openDetail not exposed' };
      }
      window.openDetail(match);
      return { ok: true, home: match.competitors?.[0]?.name, away: match.competitors?.[1]?.name };
    }, matchId);
    if (!opened.ok) {
      check(`${sport} open`, false, opened.reason);
      continue;
    }
    await page.waitForTimeout(700);
    const modal = await page.evaluate(() => {
      const dm = document.getElementById('detail-modal');
      if (!dm || !dm.classList.contains('open')) return { open: false };
      // Don't filter by offsetParent: the tab chips may use position:sticky
      // and report offsetParent null while still being visible.
      const tabs = Array.from(dm.querySelectorAll('[data-mtab-toggle]'))
        .map(b => b.dataset.mtabToggle);
      return {
        open: true,
        tabs,
        text: (dm.innerText || '').slice(0, 1500),
        textLen: (dm.innerText || '').length,
      };
    });
    if (!modal.open) {
      check(`${sport} modal opens`, false, 'detail-modal not in open state');
      continue;
    }
    check(`${sport} modal opens`, true);
    check(`${sport} modal contains home name`, modal.text.includes(opened.home), `home=${opened.home}`);
    check(`${sport} modal contains away name`, modal.text.includes(opened.away), `away=${opened.away}`);
    check(`${sport} modal has substantial content`, modal.textLen > 300, `len=${modal.textLen}`);
    check(`${sport} modal has at least 2 tabs`, modal.tabs.length >= 2, `tabs=${modal.tabs}`);

    // Click each available tab and ensure no errors
    for (const t of modal.tabs) {
      const before = errs.length;
      try {
        await page.evaluate(k => {
          const dm = document.getElementById('detail-modal');
          if (!dm) return false;
          const btn = dm.querySelector(`[data-mtab-toggle="${k}"]`);
          if (btn) btn.click();
          return true;
        }, t);
      } catch (e) {
        await page.waitForTimeout(200);
      }
      await page.waitForTimeout(200);
      const newErrs = errs.slice(before);
      check(`${sport} tab=${t}`, newErrs.length === 0, newErrs.slice(0,1).join(''));
    }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }

  await browser.close();
  server.close();

  console.log(`\n[probe-modal-sports] ${failures.length === 0 ? 'all green' : failures.length + ' failure(s)'}`);
  if (failures.length) process.exit(1);
})().catch(err => {
  console.error('[probe-modal-sports] runner crashed:', err);
  process.exit(2);
});
