#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { _electron: electron } = require('playwright');

async function firstWindow(app) {
  return app.windows()[0] || app.waitForEvent('window', { timeout: 60000 });
}

async function safeScreenshot(page, file, options = {}) {
  fs.rmSync(file, { force: true });
  await page.screenshot({ path: file, ...options });
}

function isIgnorableConsoleMessage(message) {
  return /Failed to load resource:\s*net::ERR_(EMPTY_RESPONSE|ABORTED)/i.test(String(message || ''));
}

async function main() {
  const root = path.resolve(__dirname, '..', '..');
  const captureDir = path.join(root, 'captures');
  fs.mkdirSync(captureDir, { recursive: true });
  const electronExe = path.join(root, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
  if (!fs.existsSync(electronExe)) throw new Error(`Electron introuvable: ${electronExe}`);

  const messages = [];
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paris-sportif-visual-'));
  const app = await electron.launch({
    executablePath: electronExe,
    cwd: path.join(root, 'desktop'),
    args: [`--user-data-dir=${userDataDir}`, '.']
  });

  try {
    const win = await firstWindow(app);
    win.on('console', (msg) => {
      if (['error', 'warning'].includes(msg.type())) messages.push(`${msg.type()}: ${msg.text()}`);
    });
    win.on('pageerror', (error) => messages.push(`pageerror: ${error.message}`));

    await win.setViewportSize({ width: 1360, height: 900 });
    await win.waitForSelector('[data-panel="dashboard"].active', { timeout: 60000 });
    await win.waitForFunction(() => document.querySelector('#metric-picks')?.textContent !== '-', null, { timeout: 90000 });
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint11-picks.png'), { fullPage: true });

    const dashboard = await win.evaluate(() => ({
      nav: Array.from(document.querySelectorAll('.nav-btn:not(.hidden)')).map((node) => node.textContent.trim()),
      metric: Number(document.querySelector('#metric-picks')?.textContent || 0),
      rows: document.querySelectorAll('#picks-body tr.clickable-row').length,
      timeline: document.querySelectorAll('#simple-pick-timeline .simple-timeline-card').length,
      combines: Boolean(document.querySelector('#simple-combines-section')),
      scorers: Boolean(document.querySelector('#simple-scorers-section')),
      multibookText: document.body.textContent.includes('Multi-bookmaker') || document.body.textContent.includes('Meilleure cote')
    }));

    await win.click('[data-tab="history"]');
    await win.waitForSelector('#model-performance-grid .performance-card, #model-performance-grid .empty', { timeout: 30000 });
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint11-bilan.png'), { fullPage: true });

    await win.click('[data-tab="preferences"]');
    await win.waitForSelector('#pref-bankroll', { timeout: 10000 });
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint11-reglages.png'), { fullPage: true });

    await win.check('#pref-expert-mode');
    await win.click('#save-preferences-btn');
    await win.waitForSelector('[data-tab="data"]:not(.hidden)', { timeout: 5000 });
    await win.click('[data-tab="data"]');
    await win.waitForSelector('#quality-report-grid .quality-report-card, #quality-report-grid .empty', { timeout: 30000 });
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint11-avance.png'), { fullPage: true });

    await win.click('[data-tab="dashboard"]');
    await win.click('#picks-body tr.clickable-row td[data-label="Match"]');
    await win.waitForSelector('#match-modal:not(.hidden)', { timeout: 10000 });
    const modalOverflow = await win.evaluate(() => {
      const modal = document.querySelector('#match-modal .modal');
      const content = document.querySelector('#modal-content');
      return Boolean((modal && modal.scrollWidth > modal.clientWidth + 2) || (content && content.scrollWidth > content.clientWidth + 2));
    });
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint11-fiche.png'), { fullPage: false });
    await win.click('#modal-close');

    await win.setViewportSize({ width: 390, height: 860 });
    await win.click('[data-tab="dashboard"]');
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint11-mobile.png'), { fullPage: false });
    const mobile = await win.evaluate(() => ({
      hasOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      rows: document.querySelectorAll('#picks-body tr.clickable-row').length
    }));

    const severe = messages.filter((message) => (
      message.startsWith('error:') || message.startsWith('pageerror:')
    ) && !isIgnorableConsoleMessage(message));
    if (severe.length) throw new Error(`Erreurs console: ${severe.join(' | ')}`);
    if (dashboard.nav.join('|') !== 'Picks|Bilan|Réglages') throw new Error(`Navigation non simplifiée: ${dashboard.nav.join(', ')}`);
    if (dashboard.metric < 5 || dashboard.rows < 5 || dashboard.timeline < 5 || !dashboard.combines || !dashboard.scorers || dashboard.multibookText) {
      throw new Error(`Dashboard Sprint 11 invalide: ${JSON.stringify(dashboard)}`);
    }
    if (modalOverflow) throw new Error('Overflow horizontal dans la fiche match');
    if (mobile.hasOverflow || mobile.rows <= 0) throw new Error(`Mobile invalide: ${JSON.stringify(mobile)}`);
    console.log(`Visual capture Sprint 11 OK: ${dashboard.metric} picks, ${dashboard.timeline} timeline, captures écrites.`);
  } finally {
    await app.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
