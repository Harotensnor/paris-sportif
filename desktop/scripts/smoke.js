#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { _electron: electron } = require('playwright');

async function firstWindow(app) {
  return app.windows()[0] || app.waitForEvent('window', { timeout: 60000 });
}

async function expectDownload(page, selector, expectedPrefix) {
  await page.evaluate(() => document.querySelector('#export-toast')?.classList.add('hidden'));
  await page.evaluate((targetSelector) => {
    const button = document.querySelector(targetSelector);
    if (!button) throw new Error(`Bouton export introuvable: ${targetSelector}`);
    button.click();
  }, selector);
  await page.waitForTimeout(250);
  const toast = await page.locator('#export-toast').textContent().catch(() => '');
  if (toast && !toast.includes(expectedPrefix)) throw new Error(`Toast export inattendu: ${toast}`);
  return expectedPrefix;
}

async function main() {
  const root = path.resolve(__dirname, '..', '..');
  const electronExe = path.join(root, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
  if (!fs.existsSync(electronExe)) throw new Error(`Electron introuvable: ${electronExe}`);

  const rendererText = fs.readFileSync(path.join(root, 'desktop', 'src', 'renderer', 'renderer.js'), 'utf8');
  const htmlText = fs.readFileSync(path.join(root, 'desktop', 'src', 'renderer', 'index.html'), 'utf8');
  const mainText = fs.readFileSync(path.join(root, 'desktop', 'src', 'main.js'), 'utf8');
  if (/fetch\(\s*['"]https?:\/\//i.test(rendererText)) throw new Error('Fetch internet direct détecté dans le renderer');
  if (/<\s*(iframe|webview)\b/i.test(htmlText)) throw new Error('iframe/webview détecté dans l’interface');
  if (!mainText.includes('contextIsolation: true') || !mainText.includes('sandbox: true') || !mainText.includes('setWindowOpenHandler')) {
    throw new Error('Durcissement Electron incomplet');
  }
  if (!mainText.includes("permission === 'notifications'")) throw new Error('Notifications desktop non autorisées proprement');
  if (!htmlText.includes('design-tokens.css')) throw new Error('Socle design tokens absent');
  for (const marker of ['REFRESH_URGENT_INTERVAL_MS', 'visibilitychange', 'Notification']) {
    if (!rendererText.includes(marker)) throw new Error(`QOL Sprint 3 absente: ${marker}`);
  }
  for (const mode of ['full', 'signals', 'prematch', 'prematch_t60', 'prematch_t30', 'prematch_t10', 'critical', 'repair_context']) {
    if (!mainText.includes(mode)) throw new Error(`Mode refresh Electron non exposé: ${mode}`);
  }

  const messages = [];
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paris-sportif-smoke-'));
  const app = await electron.launch({
    executablePath: electronExe,
    cwd: path.join(root, 'desktop'),
    acceptDownloads: true,
    args: [`--user-data-dir=${userDataDir}`, '.']
  });

  try {
    const win = await firstWindow(app);
    win.on('console', (msg) => {
      if (['error', 'warning'].includes(msg.type())) messages.push(`${msg.type()}: ${msg.text()}`);
    });
    win.on('pageerror', (error) => messages.push(`pageerror: ${error.message}`));

    await win.waitForSelector('[data-panel="dashboard"].active', { timeout: 60000 });
    await win.waitForFunction(() => document.querySelector('#metric-picks')?.textContent !== '-', null, { timeout: 90000 });
    await win.waitForSelector('#final-decision-grid .quality-report-card, #final-decision-grid .empty', { timeout: 30000 });

    const dashboard = await win.evaluate(() => ({
      title: document.querySelector('#page-title')?.textContent || '',
      analyzed: Number(document.querySelector('#metric-upcoming')?.textContent || 0),
      picks: Number(document.querySelector('#metric-picks')?.textContent || 0),
      caption: document.querySelector('#final-decision-caption')?.textContent || '',
      finalCards: document.querySelectorAll('#final-decision-grid .quality-report-card, #final-decision-grid .empty').length,
      firstActionButton: Boolean(document.querySelector('#run-first-action-btn')),
      criticalButton: Boolean(document.querySelector('#refresh-critical-btn')),
      t10Button: Boolean(document.querySelector('#refresh-prematch-t10-btn')),
      scenarioCards: document.querySelectorAll('#stake-scenario-grid .scenario-card').length,
      trackButtons: document.querySelectorAll('[data-track-bet-key]').length,
      pnlVisible: Boolean(document.querySelector('#user-pnl-total') && document.querySelector('#user-pnl-sub')),
      pnlSparkline: Boolean(document.querySelector('#user-pnl-sparkline svg')),
      userBetExport: Boolean(document.querySelector('#export-user-bets-btn')),
      filtersVisible: Boolean(document.querySelector('#pick-search') && document.querySelector('#pick-sort')),
      performanceMetric: document.querySelector('#metric-boot-time')?.textContent || '',
      refreshPolicy: document.querySelector('#refresh-policy')?.textContent || '',
      positiveStakeCells: Array.from(document.querySelectorAll('#picks-body td[data-label="Mise"], #stake-scenario-body td[data-label="Prudent"], #stake-scenario-body td[data-label="Normal"], #stake-scenario-body td[data-label="Agressif"]'))
        .filter((node) => /[1-9]\d*(?:[,.]\d+)?\s*€/.test(node.textContent || '')).length
    }));
    if (dashboard.title !== 'Accueil') throw new Error(`Titre dashboard invalide: ${dashboard.title}`);
    if (dashboard.analyzed <= 0) throw new Error('Aucun match analysé');
    if (dashboard.finalCards <= 0 || !dashboard.firstActionButton || !dashboard.criticalButton || !dashboard.t10Button) {
      throw new Error(`Panneau décision incomplet: ${JSON.stringify(dashboard)}`);
    }
    if (dashboard.picks < 10 || dashboard.trackButtons < 10 || !dashboard.pnlVisible || !dashboard.pnlSparkline || !dashboard.userBetExport || !dashboard.filtersVisible) {
      throw new Error(`Cockpit de mise incomplet: ${JSON.stringify(dashboard)}`);
    }
    if (!/s|\.\.\./.test(dashboard.performanceMetric) || !/Auto-refresh|Mode économie/.test(dashboard.refreshPolicy)) {
      throw new Error(`Indicateurs performance/refresh incomplets: ${JSON.stringify(dashboard)}`);
    }
    if (/Aucun pari à jouer maintenant|Mise bloquée|blocage/i.test(dashboard.caption) && dashboard.positiveStakeCells > 0) {
      throw new Error(`Mise positive affichée malgré gate rouge: ${JSON.stringify(dashboard)}`);
    }

    await win.click('[data-track-bet-key]');
    await win.waitForFunction(() => /1 en cours/.test(document.querySelector('#user-pnl-sub')?.textContent || ''), null, { timeout: 5000 });
    const trackedButton = await win.locator('[data-track-bet-key]').first().textContent();
    if (!/Suivi/.test(trackedButton || '')) throw new Error(`Bouton de suivi non mis à jour: ${trackedButton}`);

    await expectDownload(win, '#export-btn', 'paris-sportif-desktop-');
    await expectDownload(win, '#export-user-bets-btn', 'paris-sportif-paris-suivis-');
    await expectDownload(win, '#export-report-json-btn', 'paris-sportif-rapport-');

    await win.click('[data-tab="data"]');
    await win.evaluate(() => document.querySelectorAll('details.advanced-section').forEach((node) => { node.open = true; }));
    await win.waitForSelector('#file-list .file-row, #file-list .empty', { timeout: 30000 });
    await win.waitForSelector('#source-health-grid .source-card, #source-health-grid .empty', { timeout: 30000 });
    const data = await win.evaluate(() => ({
      files: document.querySelectorAll('#file-list .file-row, #file-list .empty').length,
      sources: document.querySelectorAll('#source-health-grid .source-card, #source-health-grid .empty').length,
      refreshCards: document.querySelectorAll('#refresh-summary-grid .refresh-card, #refresh-summary-grid .empty').length,
      checklist: document.querySelectorAll('#prebet-checklist-grid .quality-report-card, #prebet-checklist-grid .empty').length,
      repair: document.querySelectorAll('#context-repair-grid .quality-report-card, #context-repair-grid .empty').length
    }));
    if (data.files <= 0 || data.sources <= 0 || data.refreshCards <= 0 || data.checklist <= 0 || data.repair <= 0) {
      throw new Error(`Vue Données incomplète: ${JSON.stringify(data)}`);
    }

    await win.click('[data-tab="matches"]');
    await win.waitForSelector('#matches-body tr.clickable-row', { timeout: 30000 });
    await win.click('#matches-body tr.clickable-row');
    await win.waitForSelector('#match-modal:not(.hidden)', { timeout: 10000 });
    const modal = await win.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('#modal-tabs [data-detail-tab]')).map((node) => node.dataset.detailTab);
      const modalNode = document.querySelector('#match-modal .modal');
      const content = document.querySelector('#modal-content');
      return {
        tabs,
        overflow: Boolean(
          (modalNode && modalNode.scrollWidth > modalNode.clientWidth + 2) ||
          (content && content.scrollWidth > content.clientWidth + 2)
        ),
        title: document.querySelector('#modal-title')?.textContent || '',
        canBet: document.querySelector('#modal-content')?.textContent.includes('Puis-je miser ?') || false,
        signals: document.querySelector('#modal-content')?.textContent.includes('Signaux clés') || false,
        audit: document.querySelector('#modal-content')?.textContent.includes('Audit technique') || false,
        modalStakeBlocked: /Puis-je miser \?\s*Non[\s\S]*Mise affichée\s*0 €/.test(document.querySelector('#modal-content')?.innerText || '')
      };
    });
    for (const tab of ['summary', 'decision', 'context', 'teams', 'availability', 'signals', 'odds', 'h2h', 'timeline', 'sources', 'model']) {
      if (!modal.tabs.includes(tab)) throw new Error(`Onglet détail absent: ${tab}`);
    }
    if (!modal.title || modal.overflow || !modal.canBet || !modal.signals || !modal.audit) throw new Error(`Fiche match invalide: ${JSON.stringify(modal)}`);
    if (/Aucun pari à jouer maintenant|Mise bloquée|blocage/i.test(dashboard.caption) && !modal.modalStakeBlocked) {
      throw new Error(`Fiche match incohérente avec gate rouge: ${JSON.stringify(modal)}`);
    }
    await win.click('#modal-close');

    await win.setViewportSize({ width: 390, height: 860 });
    await win.click('[data-tab="matches"]');
    await win.waitForSelector('#matches-body tr.clickable-row', { timeout: 30000 });
    const mobile = await win.evaluate(() => ({
      hasOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      rows: document.querySelectorAll('#matches-body tr.clickable-row').length,
      before: getComputedStyle(document.querySelector('#matches-body td[data-label="Match"]'), '::before').content
    }));
    if (mobile.hasOverflow || mobile.rows <= 0 || !mobile.before.includes('Match')) {
      throw new Error(`Rendu mobile invalide: ${JSON.stringify(mobile)}`);
    }

    const severe = messages.filter((message) => message.startsWith('error:') || message.startsWith('pageerror:'));
    if (severe.length) throw new Error(`Erreurs console: ${severe.join(' | ')}`);
    console.log(`Desktop smoke OK: ${dashboard.analyzed} matchs, ${dashboard.picks} candidats, ${data.sources} sources, ${mobile.rows} lignes mobiles.`);
  } finally {
    await app.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
