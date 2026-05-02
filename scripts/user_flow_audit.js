#!/usr/bin/env node
/*
 * Phase 9 user flow audit.
 * Covers the conversion path: Big Bet card -> detail modal -> Winamax CTA -> tracked bet.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.FLOW_AUDIT_PORT || 8765);
const HOST = process.env.FLOW_AUDIT_HOST || '127.0.0.1';
const BASE_URL = process.env.FLOW_AUDIT_BASE_URL || `http://${HOST}:${PORT}`;
const OUT = path.join(ROOT, '.cache', 'user-flow-audit.json');
const CHROME_EXE = process.env.CHROME_EXECUTABLE_PATH
  || (fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : '');

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.jsonl')) return 'application/x-ndjson; charset=utf-8';
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  if (file.endsWith('.webmanifest')) return 'application/manifest+json';
  return 'application/octet-stream';
}

function startServerIfNeeded() {
  if (process.env.FLOW_AUDIT_BASE_URL) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let url = (req.url || '/').split('?')[0];
      if (url === '/') url = '/pronostics.html';
      const filePath = path.join(ROOT, decodeURIComponent(url));
      if (!filePath.startsWith(ROOT)) {
        res.statusCode = 403;
        return res.end('forbidden');
      }
      fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
          res.statusCode = 404;
          return res.end('not found');
        }
        res.setHeader('Content-Type', contentType(filePath));
        res.setHeader('Cache-Control', 'no-store');
        fs.createReadStream(filePath).pipe(res);
      });
    });
    server.on('error', err => {
      if (err && err.code === 'EADDRINUSE') return resolve(null);
      reject(err);
    });
    server.listen(PORT, HOST, () => resolve(server));
  });
}

async function clickModalWinamaxWithoutLeaving(page) {
  return page.evaluate(() => {
    const link = document.querySelector('#detail-modal.open [data-modal-winamax-click]');
    if (!link) return { clicked: false, href: '' };
    const href = link.href || '';
    const block = (ev) => ev.preventDefault();
    link.addEventListener('click', block, { capture: true, once: true });
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return { clicked: true, href };
  });
}

async function countStorage(page) {
  return page.evaluate(() => {
    const userBets = JSON.parse(localStorage.getItem('paris_sportif_user_bets') || '[]');
    const wx = JSON.parse(localStorage.getItem('paris_sportif_winamax_clicks_v1') || '{"count":0}');
    return {
      user_bets: Array.isArray(userBets) ? userBets.length : 0,
      winamax_clicks: Number(wx.count || 0),
    };
  });
}

(async () => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const server = await startServerIfNeeded();
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  const report = {
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    steps: [],
    failures: [],
  };
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  page.on('popup', popup => popup.close().catch(() => {}));
  await page.addInitScript(() => {
    try {
      localStorage.setItem('cookieConsent', 'accepted');
      localStorage.setItem('paris_sportif_onboarded_v1', '1');
      localStorage.setItem('paris_sportif_onboarded_v2', '1');
      localStorage.setItem('userPrefs', JSON.stringify({ onboardingDone: true, level: 'confirme', consentLocalStorage: 'accepted' }));
      localStorage.removeItem('paris_sportif_user_bets');
      localStorage.removeItem('paris_sportif_winamax_clicks_v1');
    } catch (e) {}
  });

  await page.goto(`${BASE_URL}/pronostics.html#dashboard`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForFunction(() => document.querySelector('[data-big-detail]') || window.PRONOSTICS_DATA, null, { timeout: 12000 });
  const firstCard = page.locator('[data-big-detail]').first();
  if (!await firstCard.count()) report.failures.push('No Big Bet detail button found on dashboard');
  else {
    await firstCard.click({ timeout: 5000 });
    await page.locator('#detail-modal.open').waitFor({ state: 'visible', timeout: 5000 });
    const title = (await page.locator('#detail-title').textContent().catch(() => '') || '').trim();
    if (!title) report.failures.push('Detail modal opened without title');
    report.steps.push({ step: 'modal_opened', title });
  }

  const beforeWx = await countStorage(page);
  const wxClick = await clickModalWinamaxWithoutLeaving(page);
  const afterWx = await countStorage(page);
  if (!wxClick.clicked) report.failures.push('No Winamax CTA found inside detail modal');
  if (wxClick.clicked && !/winamax\.fr\/paris-sportifs\/match\//.test(wxClick.href)) report.failures.push(`Invalid Winamax href: ${wxClick.href}`);
  if (wxClick.clicked && afterWx.winamax_clicks <= beforeWx.winamax_clicks) report.failures.push('Winamax CTA did not increment click tracking');
  report.steps.push({ step: 'winamax_cta', ...wxClick, before: beforeWx.winamax_clicks, after: afterWx.winamax_clicks });

  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(300);
  const trackBtn = page.locator('.action-focus-trackbet').first();
  if (!await trackBtn.count()) report.failures.push('No track bet button found on dashboard');
  else {
    const before = await countStorage(page);
    await trackBtn.click({ timeout: 5000 });
    await page.waitForTimeout(700);
    const after = await countStorage(page);
    if (after.user_bets <= before.user_bets) report.failures.push('Track bet button did not store a user bet');
    report.steps.push({ step: 'track_bet', before: before.user_bets, after: after.user_bets });
  }

  const realErrors = errors.filter(e => !/favicon|sourcemap|Failed to load resource|net::ERR_ABORTED|40\d/i.test(e));
  report.browser_errors = realErrors;
  if (realErrors.length) report.failures.push(`Browser errors: ${realErrors.join(' | ')}`);
  await browser.close();
  if (server) server.close();
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`User flow audit: ${report.steps.length} step(s) · ${report.failures.length} failure(s)`);
  console.log(path.relative(ROOT, OUT));
  process.exit(report.failures.length ? 1 : 0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
