#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { _electron: electron } = require('playwright');

async function firstWindow(app) {
  const existing = app.windows()[0];
  return existing || app.waitForEvent('window', { timeout: 60000 });
}

async function safeScreenshot(page, file, options = {}) {
  try {
    fs.rmSync(file, { force: true });
  } catch {}
  await page.screenshot({ path: file, ...options });
}

async function main() {
  const root = path.resolve(__dirname, '..', '..');
  const captureDir = path.join(root, 'captures');
  fs.mkdirSync(captureDir, { recursive: true });
  const electronExe = path.join(
    root,
    'desktop',
    'node_modules',
    'electron',
    'dist',
    process.platform === 'win32' ? 'electron.exe' : 'electron'
  );
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
    await win.waitForSelector('#v16-cockpit-grid .quality-report-card, #v16-cockpit-grid .empty', { timeout: 30000 });
    const v16CockpitCount = await win.locator('#v16-cockpit-grid .quality-report-card, #v16-cockpit-grid .empty').count();
    await safeScreenshot(win, path.join(captureDir, 'desktop-dashboard-audit.png'), { fullPage: true });
    await win.evaluate(() => {
      document.querySelector('#dashboard-v15-diagnostics')?.setAttribute('open', '');
      document.querySelector('#dashboard-legacy-diagnostics')?.setAttribute('open', '');
    });
    await win.waitForSelector('#v15-cockpit-grid .quality-report-card, #v15-cockpit-grid .empty', { timeout: 30000 });
    const v15CockpitCount = await win.locator('#v15-cockpit-grid .quality-report-card, #v15-cockpit-grid .empty').count();
    await win.waitForSelector('#v14-cockpit-grid .quality-report-card, #v14-cockpit-grid .empty', { timeout: 30000 });
    const v14CockpitCount = await win.locator('#v14-cockpit-grid .quality-report-card, #v14-cockpit-grid .empty').count();
    await win.waitForSelector('#v9-unlock-grid .quality-report-card, #v9-unlock-grid .empty', { timeout: 30000 });
    const v9UnlockCount = await win.locator('#v9-unlock-grid .quality-report-card, #v9-unlock-grid .empty').count();
    await win.waitForSelector('#v10-finalizer-grid .quality-report-card, #v10-finalizer-grid .empty', { timeout: 30000 });
    const v10FinalizerCount = await win.locator('#v10-finalizer-grid .quality-report-card, #v10-finalizer-grid .empty').count();
    await win.waitForSelector('#v11-cockpit-grid .quality-report-card, #v11-cockpit-grid .empty', { timeout: 30000 });
    const v11CockpitCount = await win.locator('#v11-cockpit-grid .quality-report-card, #v11-cockpit-grid .empty').count();
    await win.waitForSelector('#v12-cockpit-grid .quality-report-card, #v12-cockpit-grid .empty', { timeout: 30000 });
    const v12CockpitCount = await win.locator('#v12-cockpit-grid .quality-report-card, #v12-cockpit-grid .empty').count();
    await win.waitForSelector('#v13-cockpit-grid .quality-report-card, #v13-cockpit-grid .empty', { timeout: 30000 });
    const v13CockpitCount = await win.locator('#v13-cockpit-grid .quality-report-card, #v13-cockpit-grid .empty').count();

    await win.click('[data-tab="data"]');
    await win.waitForSelector('#v15-control-room-grid .quality-report-card, #v15-control-room-grid .empty', { timeout: 30000 });
    const v15ControlCount = await win.locator('#v15-control-room-grid .quality-report-card, #v15-control-room-grid .empty').count();
    await win.waitForSelector('#v16-control-room-grid .quality-report-card, #v16-control-room-grid .empty', { timeout: 30000 });
    const v16ControlCount = await win.locator('#v16-control-room-grid .quality-report-card, #v16-control-room-grid .empty').count();
    await win.waitForSelector('#v8-control-room-grid .quality-report-card, #v8-control-room-grid .empty', { timeout: 30000 });
    const v8ControlCount = await win.locator('#v8-control-room-grid .quality-report-card, #v8-control-room-grid .empty').count();
    await win.waitForSelector('#v9-control-room-grid .quality-report-card, #v9-control-room-grid .empty', { timeout: 30000 });
    const v9ControlCount = await win.locator('#v9-control-room-grid .quality-report-card, #v9-control-room-grid .empty').count();
    await win.waitForSelector('#v10-control-room-grid .quality-report-card, #v10-control-room-grid .empty', { timeout: 30000 });
    const v10ControlCount = await win.locator('#v10-control-room-grid .quality-report-card, #v10-control-room-grid .empty').count();
    await win.waitForSelector('#v11-control-room-grid .quality-report-card, #v11-control-room-grid .empty', { timeout: 30000 });
    const v11ControlCount = await win.locator('#v11-control-room-grid .quality-report-card, #v11-control-room-grid .empty').count();
    await win.waitForSelector('#v12-control-room-grid .quality-report-card, #v12-control-room-grid .empty', { timeout: 30000 });
    const v12ControlCount = await win.locator('#v12-control-room-grid .quality-report-card, #v12-control-room-grid .empty').count();
    await win.waitForSelector('#v13-control-room-grid .quality-report-card, #v13-control-room-grid .empty', { timeout: 30000 });
    const v13ControlCount = await win.locator('#v13-control-room-grid .quality-report-card, #v13-control-room-grid .empty').count();
    await safeScreenshot(win, path.join(captureDir, 'desktop-data-health.png'), { fullPage: true });
    await win.evaluate(() => {
      document.querySelector('details.data-advanced')?.setAttribute('open', '');
    });
    await win.waitForSelector('#source-health-grid .source-card', { timeout: 30000 });
    const sourceCount = await win.locator('#source-health-grid .source-card').count();
    const refreshCardCount = await win.locator('#refresh-summary-grid .refresh-card').count();
    const qualityAlertCount = await win.locator('#quality-alert-grid .quality-alert').count();

    await win.click('[data-tab="matches"]');
    await win.waitForSelector('#matches-body tr.clickable-row', { timeout: 30000 });
    await win.click('#matches-body tr.clickable-row');
    await win.waitForSelector('#match-modal:not(.hidden)', { timeout: 10000 });
    const modalOverflow = await win.evaluate(() => {
      const modal = document.querySelector('#match-modal .modal');
      const content = document.querySelector('#modal-content');
      const tabs = document.querySelector('#modal-tabs');
      return {
        modal: modal ? modal.scrollWidth > modal.clientWidth + 2 : true,
        content: content ? content.scrollWidth > content.clientWidth + 2 : true,
        tabs: tabs ? tabs.scrollWidth > tabs.clientWidth + 2 : true
      };
    });
    await safeScreenshot(win, path.join(captureDir, 'desktop-modal-audit.png'), { fullPage: false });
    await win.click('#modal-close');

    await win.setViewportSize({ width: 390, height: 860 });
    await win.click('[data-tab="matches"]');
    await win.waitForSelector('#matches-body tr.clickable-row', { timeout: 30000 });
    const mobile = await win.evaluate(() => {
      const first = document.querySelector('#matches-body td[data-label="Match"]');
      return {
        before: first ? getComputedStyle(first, '::before').content : '',
        hasOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
        rows: document.querySelectorAll('#matches-body tr.clickable-row').length
      };
    });
    await safeScreenshot(win, path.join(captureDir, 'desktop-mobile-cards.png'), { fullPage: false });

    const severe = messages.filter((message) => message.startsWith('error:') || message.startsWith('pageerror:'));
    if (severe.length) throw new Error(`Erreurs console: ${severe.join(' | ')}`);
    if (v15CockpitCount <= 0) throw new Error('Cockpit V15 accueil absent');
    if (v16CockpitCount <= 0) throw new Error('Cockpit V16 accueil absent');
    if (v14CockpitCount <= 0) throw new Error('Cockpit V14 accueil absent');
    if (v9UnlockCount <= 0) throw new Error('Centre V9 accueil absent');
    if (v10FinalizerCount <= 0) throw new Error('Finalizer V10 accueil absent');
    if (v11CockpitCount <= 0) throw new Error('Cockpit V11 accueil absent');
    if (v12CockpitCount <= 0) throw new Error('Cockpit V12 accueil absent');
    if (v13CockpitCount <= 0) throw new Error('Cockpit V13 accueil absent');
    if (v15ControlCount <= 0) throw new Error('Control Room V15 absente');
    if (v16ControlCount <= 0) throw new Error('Control Room V16 absente');
    if (v8ControlCount <= 0) throw new Error('Control Room V8 absente');
    if (v9ControlCount <= 0) throw new Error('Control Room V9 absente');
    if (v10ControlCount <= 0) throw new Error('Control Room V10 absente');
    if (v11ControlCount <= 0) throw new Error('Control Room V11 absente');
    if (v12ControlCount <= 0) throw new Error('Control Room V12 absente');
    if (v13ControlCount <= 0) throw new Error('Control Room V13 absente');
    if (sourceCount < 8) throw new Error('Santé des signaux incomplète');
    if (refreshCardCount < 8) throw new Error('Résumé des refresh incomplet');
    if (qualityAlertCount < 1) throw new Error('Alertes qualité absentes');
    if (modalOverflow.modal || modalOverflow.content || modalOverflow.tabs) {
      throw new Error(`Overflow horizontal fiche match: ${JSON.stringify(modalOverflow)}`);
    }
    if (!mobile.before.includes('Match') || mobile.hasOverflow || mobile.rows <= 0) {
      throw new Error(`Rendu mobile invalide: ${JSON.stringify(mobile)}`);
    }
    console.log(`Visual capture OK: V16 ${v16ControlCount} cartes, V15 ${v15ControlCount} cartes, V14 ${v14CockpitCount} cartes, V8 ${v8ControlCount} cartes, V9 ${v9ControlCount} cartes, V10 ${v10ControlCount} cartes, V11 ${v11ControlCount} cartes, V12 ${v12ControlCount} cartes, V13 ${v13ControlCount} cartes, ${sourceCount} sources, ${refreshCardCount} refresh cards, ${qualityAlertCount} alertes, ${mobile.rows} cartes mobiles.`);
  } finally {
    await app.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
