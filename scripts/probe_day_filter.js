#!/usr/bin/env node
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PROBE_PORT || 0);
const CHROME_EXE = process.env.CHROME_EXECUTABLE_PATH || '';
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

(async () => {
  const server = await startServer();
  const port = server.address().port;
  console.log(`[probe-day-filter] static server on http://127.0.0.1:${port}`);

  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('userPrefs', JSON.stringify({
        onboardingDone: true,
        consentLocalStorage: 'accepted'
      }));
    } catch (e) {}
  });

  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (/Failed to load resource|ERR_|MIME type/i.test(text)) return;
    errors.push(text);
  });

  await page.goto(`http://127.0.0.1:${port}/pronostics.html#dashboard?date=all`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  const chips = await page.evaluate(() => Array.from(document.querySelectorAll('[data-v37-day]')).map(btn => ({
    value: btn.dataset.v37Day || '',
    label: (btn.textContent || '').replace(/\s+/g, ' ').trim()
  })));
  check('date chips are rendered', chips.length >= 6, `${chips.length} chips`);

  const todayIso = await page.evaluate(() => new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' }));
  const todayChip = chips.find(chip => chip.value === todayIso);
  check('today chip maps to Paris ISO date', Boolean(todayChip), `today=${todayIso}`);

  for (const chip of chips) {
    await page.click(`[data-v37-day="${chip.value}"]`);
    await page.waitForTimeout(500);
    const state = await page.evaluate(() => {
      let stored = {};
      try { stored = JSON.parse(localStorage.getItem('paris_sportif_v36_home_filter') || '{}') || {}; }
      catch (e) { stored = {}; }
      return {
        hashDate: new URLSearchParams((location.hash || '').split('?')[1] || '').get('date') || '',
        storedDate: stored.date || '',
        activeValues: Array.from(document.querySelectorAll('[data-v37-day].is-active')).map(btn => btn.dataset.v37Day || ''),
        autoHorizonNotice: document.body.innerText.includes('Vue élargie aux 7 prochains jours')
      };
    });
    check(`chip "${chip.label}" persists exact date`, state.hashDate === chip.value && state.storedDate === chip.value,
      `hash=${state.hashDate}, stored=${state.storedDate}, expected=${chip.value}`);
    check(`chip "${chip.label}" is the only active date`, state.activeValues.length === 1 && state.activeValues[0] === chip.value,
      `active=${state.activeValues.join(',')}`);
    if (/^\d{4}-\d{2}-\d{2}$/.test(chip.value)) {
      check(`chip "${chip.label}" does not auto-expand to 7 days`, !state.autoHorizonNotice);
    }
  }

  check('no console/page errors', errors.length === 0, errors.join(' | '));

  await browser.close();
  server.close();

  if (failures.length) {
    console.error(`\n[probe-day-filter] ${failures.length} failure(s)`);
    process.exit(1);
  }
  console.log('\n[probe-day-filter] OK');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
