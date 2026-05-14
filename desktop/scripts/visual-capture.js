#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { _electron: electron } = require('playwright');

async function firstWindow(app) {
  return app.windows()[0] || app.waitForEvent('window', { timeout: 60000 });
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
    await win.waitForSelector('#final-decision-grid .quality-report-card, #final-decision-grid .empty', { timeout: 30000 });
    const finalCards = await win.locator('#final-decision-grid .quality-report-card, #final-decision-grid .empty').count();
    const decisionConsistency = await win.evaluate(() => ({
      caption: document.querySelector('#final-decision-caption')?.textContent || '',
      picksMetric: Number(document.querySelector('#metric-picks')?.textContent || 0),
      trackButtons: document.querySelectorAll('[data-track-bet-key]').length,
      pnlVisible: Boolean(document.querySelector('#user-pnl-total') && document.querySelector('#user-pnl-sub')),
      filtersVisible: Boolean(document.querySelector('#pick-search') && document.querySelector('#pick-sort')),
      positiveStakeCells: Array.from(document.querySelectorAll('#picks-body td[data-label="Mise"], #stake-scenario-body td[data-label="Prudent"], #stake-scenario-body td[data-label="Normal"], #stake-scenario-body td[data-label="Agressif"]'))
        .filter((node) => /[1-9]\d*(?:[,.]\d+)?\s*€/.test(node.textContent || '')).length
    }));
    await safeScreenshot(win, path.join(captureDir, 'desktop-dashboard-audit.png'), { fullPage: true });

    await win.click('[data-tab="data"]');
    await win.evaluate(() => document.querySelectorAll('details.advanced-section').forEach((node) => { node.open = true; }));
    await win.waitForSelector('#file-list .file-row, #file-list .empty', { timeout: 30000 });
    const files = await win.locator('#file-list .file-row, #file-list .empty').count();
    const sources = await win.locator('#source-health-grid .source-card, #source-health-grid .empty').count();
    const refreshCards = await win.locator('#refresh-summary-grid .refresh-card, #refresh-summary-grid .empty').count();
    const checklist = await win.locator('#prebet-checklist-grid .quality-report-card, #prebet-checklist-grid .empty').count();
    await safeScreenshot(win, path.join(captureDir, 'desktop-data-health.png'), { fullPage: true });

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
        tabs: tabs ? tabs.scrollWidth > tabs.clientWidth + 2 : false
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
    if (finalCards !== 4) throw new Error(`Panneau décision V17 incomplet: ${finalCards} cartes`);
    if (/Aucun pari à jouer maintenant|Mise bloquée|blocage/i.test(decisionConsistency.caption) && decisionConsistency.positiveStakeCells > 0) {
      throw new Error(`Mise positive affichée malgré décision bloquée: ${JSON.stringify(decisionConsistency)}`);
    }
    if (decisionConsistency.picksMetric < 10 || decisionConsistency.trackButtons < 10 || !decisionConsistency.pnlVisible || !decisionConsistency.filtersVisible) {
      throw new Error(`Cockpit actionnable incomplet: ${JSON.stringify(decisionConsistency)}`);
    }
    if (files <= 0 || sources <= 0 || refreshCards <= 0 || checklist <= 0) {
      throw new Error(`Vue Données incomplète: ${JSON.stringify({ files, sources, refreshCards, checklist })}`);
    }
    if (modalOverflow.modal || modalOverflow.content || modalOverflow.tabs) {
      throw new Error(`Overflow horizontal fiche match: ${JSON.stringify(modalOverflow)}`);
    }
    if (!mobile.before.includes('Match') || mobile.hasOverflow || mobile.rows <= 0) {
      throw new Error(`Rendu mobile invalide: ${JSON.stringify(mobile)}`);
    }
    console.log(`Visual capture OK: décision ${finalCards} cartes, ${sources} sources, ${refreshCards} refresh cards, ${mobile.rows} cartes mobiles.`);
  } finally {
    await app.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
