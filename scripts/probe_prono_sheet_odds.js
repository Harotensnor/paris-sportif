#!/usr/bin/env node
let chromium;
try { ({ chromium } = require('playwright')); }
catch (err) {
  try { ({ chromium } = require('@playwright/test')); }
  catch (fallbackErr) {
    console.error('[probe-prono-sheet-odds] Playwright runtime unavailable:', fallbackErr.message || err.message);
    process.exit(2);
  }
}
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PROBE_PORT || 0);
const CHROME_EXE = process.env.CHROME_EXECUTABLE_PATH || '';

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.webmanifest')) return 'application/manifest+json';
  return 'application/octet-stream';
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let url = req.url.split('?')[0];
      if (url === '/') url = '/pronostics.html';
      const filePath = path.join(ROOT, decodeURIComponent(url));
      if (!filePath.startsWith(ROOT)) { res.statusCode = 403; return res.end('forbidden'); }
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
  console.log(`  [${ok ? 'ok' : 'FAIL'}] ${label}${ok ? '' : ' - ' + (detail || '')}`);
  if (!ok) failures.push({ label, detail });
}

(async () => {
  const server = await startServer();
  const port = server.address().port;
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await ctx.addInitScript(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
      prefs.onboardingDone = true;
      prefs.consentLocalStorage = 'accepted';
      localStorage.setItem('userPrefs', JSON.stringify(prefs));
      localStorage.removeItem('paris_sportif_v36_dashboard_filters');
      localStorage.removeItem('tousFilters');
      localStorage.removeItem('tousTab');
    } catch (e) {
      window.__probeInitError = String(e && e.message ? e.message : e);
    }
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => {
    if (m.type() === 'error') {
      const text = m.text();
      if (/Failed to load resource|ERR_|404/i.test(text)) return;
      errs.push(text);
    }
  });

  await page.goto(`http://127.0.0.1:${port}/pronostics.html#dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1600);

  const homeState = await page.evaluate(() => {
    const table = document.querySelector('.v36-table-panel');
    const shell = document.querySelector('[data-home-table-only]');
    const topSection = document.querySelector('[data-v38-top-paris]');
    const rail = document.querySelector('.v36-home-rail');
    const rows = Array.from(document.querySelectorAll('.v36-picks-table tbody tr'));
    const resultHeader = Array.from(document.querySelectorAll('.v36-picks-table th')).some(th => /Résultat/i.test(th.textContent || ''));
    const beginnerCopy = Array.from(document.querySelectorAll('.v37-beginner-copy')).map(el => (el.textContent || '').trim()).filter(Boolean);
    return {
      hasTable: !!table,
      tableOnly: !!shell && !topSection && !rail,
      rows: rows.length,
      resultHeader,
      beginnerCopyCount: beginnerCopy.length,
      sampleBeginnerCopy: beginnerCopy[0] || '',
      text: table ? (table.innerText || '').slice(0, 220) : ''
    };
  });
  check('Accueil renders the table as the main content', homeState.hasTable && homeState.rows > 0, JSON.stringify(homeState));
  check('Accueil is table-only, with extra dashboard blocks moved away', homeState.tableOnly, JSON.stringify(homeState));
  check('Today table exposes result column for passed/live/upcoming picks', homeState.resultHeader, JSON.stringify(homeState));
  check('Rows include beginner-friendly explanation text', homeState.beginnerCopyCount > 0 && /Lecture simple|alerte/i.test(homeState.sampleBeginnerCopy), homeState.sampleBeginnerCopy);

  const opened = await page.evaluate(() => {
    const target = document.querySelector('[data-top-paris-card]') ||
      Array.from(document.querySelectorAll('[data-big-detail][data-pick-uid]')).find(el => el.offsetParent !== null);
    if (!target) return { ok: false, reason: 'no pick target' };
    target.click();
    return { ok: true };
  });
  check('Pick target exists for modal', opened.ok, opened.reason);
  await page.waitForTimeout(800);

  const modalState = await page.evaluate(() => {
    const modal = document.getElementById('detail-modal');
    const body = document.getElementById('detail-body');
    const tabs = Array.from(document.querySelectorAll('#detail-modal [data-mtab-toggle]')).map(b => b.dataset.mtabToggle);
    const text = body ? body.innerText || '' : '';
    return {
      open: !!modal && modal.classList.contains('open'),
      tabs,
      hasSheet: !!document.querySelector('[data-v38-prono-sheet]'),
      hasOddsStatus: !!document.querySelector('#detail-modal .v38-odd-status'),
      hasMissingInfo: /non disponible|source absente|ignoré dans le modèle principal/i.test(text),
      text: text.slice(0, 220)
    };
  });
  check('Prono modal opens', modalState.open, modalState.text);
  check('Complete prono sheet present', modalState.hasSheet);
  for (const key of ['synthese', 'cotes', 'pourquoi', 'signaux', 'alternatifs', 'historique', 'risques', 'sources']) {
    check(`Modal tab ${key}`, modalState.tabs.includes(key), `tabs=${modalState.tabs.join(',')}`);
  }
  check('Modal shows odd validation status', modalState.hasOddsStatus);
  check('Modal shows missing/ignored info transparently', modalState.hasMissingInfo, modalState.text);

  const cotesVisible = await page.evaluate(() => {
    const btn = document.querySelector('#detail-modal [data-mtab-toggle="cotes"]');
    if (btn) btn.click();
    const body = document.getElementById('detail-body');
    return /Cotes vérifiées|Cote Winamax|Statut cote/i.test(body ? body.innerText || '' : '');
  });
  check('Cotes tab exposes verification details', cotesVisible);

  const travelNeutral = await page.evaluate(() => {
    const days = window.PRONOSTICS_DATA?.days || {};
    const match = Object.values(days).flatMap(v => Array.isArray(v) ? v : [])
      .find(m => m && m.sport === 'football' && !m.completed);
    if (!match || typeof window.predictMatch !== 'function') return { ok: true, skipped: true };
    const before = window.predictMatch(match);
    window.TEAM_TRAVEL = { matches: { [String(match.id || match.uid || match.name || '')]: [9000, 7, 12, -99, 'extreme'] } };
    const after = window.predictMatch(match);
    return {
      ok: Math.abs(Number(before?.reliability || 0) - Number(after?.reliability || 0)) < 1e-9,
      before: before?.reliability,
      after: after?.reliability,
      note: after?.travelContext?.model_note || after?.reliabilityMeta?.travel?.model_note || ''
    };
  });
  check('Travel penalty is informational only', travelNeutral.ok, JSON.stringify(travelNeutral));

  check('No console/page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    process.exit(1);
  }
})();
