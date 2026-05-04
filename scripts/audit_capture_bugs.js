#!/usr/bin/env node
/*
 * Smoke audit for Theo's screenshot bugs (#2-#6).
 *
 * It intentionally uses plain Playwright instead of @playwright/test so Codex
 * can run it with the bundled runtime and a system Chrome.
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'phase35_capture_bugs_audit.json');
const CHROME = process.env.CHROME_EXECUTABLE_PATH || process.env.PW_CHROME || '';
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function serve() {
  const server = http.createServer((req, res) => {
    const raw = decodeURIComponent((req.url || '/').split('?')[0]);
    const rel = raw === '/' ? '/pronostics.html' : raw;
    const file = path.resolve(ROOT, `.${rel}`);
    if (!file.startsWith(ROOT)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    fs.readFile(file, (err, buf) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(buf);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

(async () => {
  const server = await serve();
  const port = server.address().port;
  const browser = await chromium.launch({
    headless: true,
    ...(CHROME ? { executablePath: CHROME } : {}),
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));
  await page.addInitScript(() => {
    try {
      localStorage.setItem('cookieConsent', 'accepted');
      localStorage.setItem('paris_sportif_onboarded_v1', '1');
      localStorage.setItem('paris_sportif_onboarded_v2', '1');
      localStorage.setItem('userPrefs', JSON.stringify({
        onboardingDone: true,
        level: 'confirme',
        consentLocalStorage: 'accepted',
      }));
    } catch (e) {}
  });

  await page.goto(`http://127.0.0.1:${port}/pronostics.html#dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.PRONOSTICS_DATA && document.querySelector('[data-pick-uid]'), null, { timeout: 30_000 });
  await page.waitForTimeout(800);

  const audit = await page.evaluate(() => {
    const text = (sel) => Array.from(document.querySelectorAll(sel)).map(el => (el.textContent || '').trim()).filter(Boolean);
    const badgeTexts = text('.v37-intel-chips i, .v36-table-card__signals i');
    const opaquePattern = /\b(strict|fade|steam)\b/i;
    const scoreEls = Array.from(document.querySelectorAll('.v37-opportunity'));
    return {
      rows: document.querySelectorAll('.v36-table-row[data-pick-uid], .v36-table-card[data-pick-uid]').length,
      scoreLegend: !!document.querySelector('.v37-score-legend'),
      scoreTooltips: scoreEls.filter(el => !!el.getAttribute('data-tooltip')).length,
      scoreClassed: scoreEls.filter(el => /(is-high|is-mid|is-low|is-muted)/.test(el.className)).length,
      opaqueBadges: badgeTexts.filter(t => opaquePattern.test(t)).slice(0, 10),
      duplicateMarkers: document.querySelectorAll('.v37-match-multi, .v36-table-card.is-same-match').length,
      badgeTooltips: Array.from(document.querySelectorAll('.v37-intel-chips i')).filter(el => !!el.getAttribute('data-tooltip')).length,
    };
  });

  const firstRow = page.locator('.v36-table-row[data-pick-uid]:visible, .v36-table-card[data-pick-uid]:visible').first();
  await firstRow.click({ force: true });
  await page.waitForSelector('#detail-modal.open', { timeout: 5_000 });
  const modal = await page.evaluate(() => {
    const title = document.querySelector('#why-bet-title')?.textContent || '';
    const reasons = Array.from(document.querySelectorAll('.why-bet li')).map(el => (el.textContent || '').trim());
    const xgReasons = reasons.filter(r => /Buts attendus/i.test(r));
    return { title, reasons, xgReasons };
  });

  const realErrors = consoleErrors.filter(e => !/favicon|sourcemap|Failed to load resource|net::ERR_ABORTED|40\d/i.test(e));
  const failures = [];
  if (audit.rows < 200) failures.push(`table trop courte: ${audit.rows} rows`);
  if (!audit.scoreLegend) failures.push('legende score absente');
  if (audit.scoreTooltips < Math.min(20, audit.scoreClassed)) failures.push('score tooltip insuffisant');
  if (audit.opaqueBadges.length) failures.push(`badges opaques: ${audit.opaqueBadges.join(', ')}`);
  if (!audit.duplicateMarkers) failures.push('aucun groupement doublon visible');
  if (!modal.reasons.length) failures.push('modal sans raisons');
  if (modal.xgReasons.some(r => /Buts attendus\s*:\s*\d/.test(r))) failures.push(`xG sans noms equipes: ${modal.xgReasons.join(' | ')}`);
  if (realErrors.length) failures.push(`console errors: ${realErrors.slice(0, 3).join(' | ')}`);

  const report = {
    generated_at: new Date().toISOString(),
    checks: audit,
    modal_sample: modal,
    console_errors: realErrors.slice(0, 10),
    failures,
  };
  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));

  await browser.close();
  server.close();
  if (failures.length) process.exit(1);
})().catch(err => {
  console.error(err && err.stack || err);
  process.exit(1);
});
