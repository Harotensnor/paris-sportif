#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { _electron: electron } = require('playwright');

async function firstWindow(app) {
  return app.windows()[0] || app.waitForEvent('window', { timeout: 60000 });
}

function isIgnorableConsoleMessage(message) {
  return /Failed to load resource:\s*net::ERR_(EMPTY_RESPONSE|ABORTED)/i.test(String(message || ''));
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
  if (/api\/odds|MULTI_BOOKMAKER|oddsApi|the-odds-api|Meilleure cote/i.test(`${rendererText}\n${mainText}\n${htmlText}`)) {
    throw new Error('Reste multi-bookmaker détecté alors que Sprint 11 est Winamax-only');
  }
  for (const marker of ['contextIsolation: true', 'sandbox: true', 'setWindowOpenHandler', "permission === 'notifications'", 'process.memoryUsage()']) {
    if (!mainText.includes(marker)) throw new Error(`Durcissement Electron absent: ${marker}`);
  }
  for (const marker of ['todayFunnel', 'renderSimpleTimeline', 'antiTiltStatus', 'applyExpertMode']) {
    if (!rendererText.includes(marker)) throw new Error(`Sprint 11 renderer absent: ${marker}`);
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
    const dashboard = await win.evaluate(() => ({
      title: document.querySelector('#page-title')?.textContent || '',
      nav: Array.from(document.querySelectorAll('.nav-btn:not(.hidden)')).map((node) => node.textContent.trim()),
      metric: Number(document.querySelector('#metric-picks')?.textContent || 0),
      rows: document.querySelectorAll('#picks-body tr.clickable-row').length,
      todayRows: Array.from(document.querySelectorAll('#picks-body tr.clickable-row')).filter((row) => /Aujourd'hui|Aujourd’hui|dans|h|min/i.test(row.textContent || '')).length,
      timeline: document.querySelectorAll('#simple-pick-timeline .simple-timeline-card').length,
      combines: Boolean(document.querySelector('#simple-combines-section')),
      scorers: Boolean(document.querySelector('#simple-scorers-section')),
      bankroll: document.querySelector('#simple-bankroll')?.textContent || '',
      pnl: document.querySelector('#simple-pnl')?.textContent || '',
      trackButtons: document.querySelectorAll('[data-track-bet-key]').length,
      expertHidden: !document.querySelector('[data-tab="data"]:not(.hidden)'),
      multibookText: document.body.textContent.includes('Multi-bookmaker') || document.body.textContent.includes('Meilleure cote')
    }));
    if (dashboard.title !== 'Picks') throw new Error(`Titre dashboard invalide: ${dashboard.title}`);
    if (dashboard.nav.join('|') !== 'Picks|Bilan|Réglages') throw new Error(`Navigation non simplifiée: ${dashboard.nav.join(', ')}`);
    if (dashboard.metric < 5 || dashboard.rows < 5 || dashboard.timeline < 5 || dashboard.trackButtons < 5) throw new Error(`Picks insuffisants: ${JSON.stringify(dashboard)}`);
    if (!dashboard.combines || !dashboard.scorers || !dashboard.bankroll.includes('€') || !dashboard.pnl.includes('€') || !dashboard.expertHidden || dashboard.multibookText) {
      throw new Error(`Cockpit Sprint 11 incohérent: ${JSON.stringify(dashboard)}`);
    }

    await win.click('[data-track-bet-key]');
    await win.waitForFunction(() => /1 en cours/.test(document.querySelector('#user-pnl-sub')?.textContent || ''), null, { timeout: 5000 });

    await win.click('[data-tab="history"]');
    await win.waitForSelector('#model-performance-grid .performance-card, #model-performance-grid .empty', { timeout: 30000 });
    await win.click('[data-tab="preferences"]');
    await win.waitForSelector('#pref-bankroll', { timeout: 10000 });
    const prefs = await win.evaluate(() => ({
      expert: Boolean(document.querySelector('#pref-expert-mode')),
      antiTilt: Boolean(document.querySelector('#pref-anti-tilt-strict')),
      multiBook: Boolean(document.querySelector('#pref-multibook-enabled') || document.querySelector('#pref-odds-api-key'))
    }));
    if (!prefs.expert || !prefs.antiTilt || prefs.multiBook) throw new Error(`Réglages Sprint 11 invalides: ${JSON.stringify(prefs)}`);

    await win.check('#pref-expert-mode');
    await win.click('#save-preferences-btn');
    await win.waitForSelector('[data-tab="data"]:not(.hidden)', { timeout: 5000 });
    await win.click('[data-tab="data"]');
    await win.waitForSelector('#quality-report-grid .quality-report-card, #quality-report-grid .empty', { timeout: 30000 });

    await win.click('[data-tab="dashboard"]');
    await win.click('#picks-body tr.clickable-row td[data-label="Match"]');
    await win.waitForSelector('#match-modal:not(.hidden)', { timeout: 10000 });
    const modal = await win.evaluate(() => {
      const modalNode = document.querySelector('#match-modal .modal');
      const content = document.querySelector('#modal-content');
      return {
        text: content?.textContent || '',
        overflow: Boolean((modalNode && modalNode.scrollWidth > modalNode.clientWidth + 2) || (content && content.scrollWidth > content.clientWidth + 2))
      };
    });
    if (modal.overflow || !modal.text.includes('Puis-je miser ?') || !modal.text.includes('Cote Winamax') || modal.text.includes('Meilleure cote')) {
      throw new Error(`Fiche match invalide: ${JSON.stringify(modal).slice(0, 800)}`);
    }

    const severe = messages.filter((message) => (
      message.startsWith('error:') || message.startsWith('pageerror:')
    ) && !isIgnorableConsoleMessage(message));
    if (severe.length) throw new Error(`Erreurs console: ${severe.join(' | ')}`);
    console.log(`Desktop smoke OK: ${dashboard.metric} picks visibles, ${dashboard.timeline} en timeline, Winamax-only.`);
  } finally {
    await app.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
