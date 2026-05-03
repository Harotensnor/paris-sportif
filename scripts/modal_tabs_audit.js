#!/usr/bin/env node
/*
 * Phase 12 modal tabs audit.
 * Standalone Playwright runner used when @playwright/test is not installed locally.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.MODAL_AUDIT_PORT || 8765);
const HOST = process.env.MODAL_AUDIT_HOST || '127.0.0.1';
const BASE_URL = process.env.MODAL_AUDIT_BASE_URL || `http://${HOST}:${PORT}`;
const OUT = path.join(ROOT, '.cache', 'modal-tabs-audit-report.json');
const ARTIFACT_DIR = path.join(ROOT, 'audit-artifacts');
const SPORTS = ['football', 'tennis', 'basketball', 'baseball', 'hockey'];
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
  if (process.env.MODAL_AUDIT_BASE_URL) return Promise.resolve(null);
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

function cleanErrors(errors) {
  return errors.filter(e => !/favicon|sourcemap|Failed to load resource|net::ERR_ABORTED|40\d/i.test(e));
}

async function pickMatches(page) {
  return page.evaluate((sports) => {
    const days = window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.days || {};
    const events = Object.values(days).flat().filter(Boolean);
    const bySport = {};
    const normSport = (value) => String(value || '').toLowerCase();
    for (const sport of sports) {
      const match = events.find(e => normSport(e.sport || e.sport_key || e.sport_name).includes(sport));
      if (match) {
        const sides = Array.isArray(match.competitors) ? match.competitors : [];
        bySport[sport] = {
          id: String(match.id || ''),
          label: sides.map(c => c && c.name).filter(Boolean).slice(0, 2).join(' vs ') || match.name || sport,
        };
      }
    }
    return bySport;
  }, SPORTS);
}

async function openMatch(page, id) {
  await page.evaluate((matchId) => {
    const days = window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.days || {};
    const events = Object.values(days).flat().filter(Boolean);
    const match = events.find(e => String(e.id || '') === String(matchId));
    if (!match) throw new Error(`match ${matchId} not found`);
    if (typeof window.openDetail !== 'function') throw new Error('window.openDetail unavailable');
    window.openDetail(match);
  }, id);
  await page.locator('#detail-modal.open').waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(250);
}

async function revealTechnicalTabs(page) {
  const toggle = page.locator('#detail-modal.open [data-why-tech-toggle]').first();
  if (await toggle.count()) {
    const expanded = await toggle.getAttribute('aria-expanded').catch(() => null);
    if (expanded !== 'true') {
      await toggle.click({ timeout: 3000 });
      await page.waitForTimeout(180);
    }
  }
  await page.locator('#detail-modal.open .md-tab').first().waitFor({ state: 'visible', timeout: 4000 });
}

async function tabState(page, target) {
  return page.evaluate((key) => {
    const modal = document.querySelector('#detail-modal.open');
    if (!modal) return { modalOpen: false };
    const active = modal.querySelector(`.md-tab[data-mtab-toggle="${key}"]`);
    const visibleSections = [...modal.querySelectorAll(`[data-mtab="${key}"]`)]
      .filter(el => getComputedStyle(el).display !== 'none')
      .map(el => (el.querySelector('h4')?.textContent || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120));
    const hiddenOther = [...modal.querySelectorAll('[data-mtab]')]
      .filter(el => el.dataset.mtab !== key && getComputedStyle(el).display !== 'none')
      .length;
    return {
      modalOpen: true,
      selected: active ? active.getAttribute('aria-selected') : null,
      visibleSections,
      hiddenOther,
    };
  }, target);
}

(async () => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const server = await startServerIfNeeded();
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  const report = {
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    sports_targeted: SPORTS,
    tested: [],
    skipped: [],
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
    } catch (e) {}
  });

  await page.goto(`${BASE_URL}/pronostics.html#tous`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForFunction(() => !!(window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.days), null, { timeout: 10000 });
  await page.waitForFunction(() => !!(window.PRONOSTICS_DATA && !window.PRONOSTICS_DATA._lite), null, { timeout: 12000 }).catch(() => {});
  const picks = await pickMatches(page);

  for (const sport of SPORTS) {
    const pick = picks[sport];
    if (!pick) {
      report.skipped.push({ sport, reason: 'no event in current data.js' });
      continue;
    }
    errors.length = 0;
    const row = { sport, id: pick.id, label: pick.label, tabs: [] };
    report.tested.push(row);
    try {
      await openMatch(page, pick.id);
      await revealTechnicalTabs(page);
      const tabs = await page.locator('#detail-modal.open .md-tab').evaluateAll(nodes =>
        nodes.map(n => ({
          key: n.getAttribute('data-mtab-toggle') || '',
          label: (n.textContent || '').trim().replace(/\s+/g, ' '),
        }))
      );
      row.tabs = tabs;
      if (tabs.length < 2) {
        throw new Error(`expected at least 2 tabs, got ${tabs.length}`);
      }
      for (const tab of tabs) {
        const tabButton = page.locator(`#detail-modal.open .md-tab[data-mtab-toggle="${tab.key}"]`).first();
        await tabButton.scrollIntoViewIfNeeded().catch(() => {});
        await tabButton.click({ timeout: 3000 });
        await page.waitForTimeout(120);
        const state = await tabState(page, tab.key);
        if (state.selected !== 'true') {
          throw new Error(`${sport}/${tab.key}: aria-selected is ${state.selected}`);
        }
        if (!state.visibleSections || state.visibleSections.length < 1) {
          throw new Error(`${sport}/${tab.key}: no visible section`);
        }
        if (state.hiddenOther > 0) {
          throw new Error(`${sport}/${tab.key}: ${state.hiddenOther} other tab section(s) still visible`);
        }
      }
      const realErrors = cleanErrors(errors);
      if (realErrors.length) throw new Error(realErrors.join(' | '));
      await page.keyboard.press('Escape').catch(() => {});
    } catch (err) {
      const safeSport = sport.replace(/[^a-z0-9_-]+/gi, '-');
      const shot = path.join(ARTIFACT_DIR, `manual-modal-tab-${safeSport}-fail.png`);
      await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
      report.failures.push({ sport, id: pick.id, label: pick.label, error: err.message, screenshot: path.relative(ROOT, shot) });
      await page.keyboard.press('Escape').catch(() => {});
    }
  }

  await browser.close();
  if (server) server.close();
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`Modal tabs audit: ${report.tested.length} sport(s) tested · ${report.skipped.length} skipped · ${report.failures.length} failure(s)`);
  console.log(path.relative(ROOT, OUT));
  process.exit(report.failures.length ? 1 : 0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
