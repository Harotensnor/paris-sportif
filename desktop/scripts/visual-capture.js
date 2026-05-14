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
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint22-picks.png'), { fullPage: true });

    const dashboard = await win.evaluate(() => ({
      nav: Array.from(document.querySelectorAll('.nav-btn:not(.hidden)')).map((node) => node.textContent.trim()),
      metric: Number(document.querySelector('#metric-picks')?.textContent || 0),
      rows: document.querySelectorAll('#picks-body tr.clickable-row').length,
      timeline: document.querySelectorAll('#simple-pick-timeline .simple-timeline-card').length,
      safeBadges: document.querySelectorAll('.safe-pick-badge.safe').length,
      priorityBadges: document.querySelectorAll('.priority-badge').length,
      topPick: document.body.textContent.includes('TOP PICK'),
      dailyBudget: document.querySelector('#daily-budget-summary')?.textContent || '',
      hasRollingSections: ['Dans l’heure', 'Dans les 3 heures', 'Cette nuit'].every((label) => document.body.textContent.includes(label)),
      combines: Boolean(document.querySelector('#simple-combines-section')),
      scorers: Boolean(document.querySelector('#simple-scorers-section')),
      promos: Boolean(document.querySelector('#simple-promos-section')),
      suggestion: document.querySelector('#daily-suggestion-card')?.textContent || '',
      multibookText: document.body.textContent.includes('Multi-' + 'bookmaker') || document.body.textContent.includes('Meilleure ' + 'cote'),
      dashboardText: document.querySelector('[data-panel="dashboard"]')?.innerText || ''
    }));

    await win.click('[data-tab="history"]');
    await win.waitForSelector('#model-performance-grid .performance-card, #model-performance-grid .empty', { timeout: 30000 });
    await win.waitForFunction(() => /#1/.test(document.querySelector('#bankroll-allocation-grid')?.textContent || ''), null, { timeout: 10000 });
    await win.waitForFunction(() => /Simulation/.test(document.querySelector('#paper-simulation-grid')?.textContent || ''), null, { timeout: 10000 });
    await win.waitForFunction(() => /Si tu avais suivi le modèle|Toi sur 30 jours/.test(document.querySelector('#model-vs-user-grid')?.textContent || ''), null, { timeout: 10000 });
    await win.waitForSelector('#deep-analytics-summary .quality-report-card, #deep-analytics-summary .empty', { timeout: 10000 });
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint22-bilan.png'), { fullPage: true });

    await win.click('[data-tab="search"]');
    await win.waitForSelector('#deep-search-input', { timeout: 10000 });
    const searchSeed = await win.evaluate(() => (
      document.querySelector('#compare-left option[value]:not([value=""])')?.textContent?.trim()?.split(' ')[0] || 'Real'
    ));
    await win.fill('#deep-search-input', searchSeed || 'Real');
    await win.waitForSelector('#deep-search-results .search-card, #deep-search-results .empty', { timeout: 10000 });
    const searchAudit = await win.evaluate(() => ({
      hasInput: Boolean(document.querySelector('#deep-search-input')),
      compareOptions: document.querySelectorAll('#compare-left option[value]:not([value=""])').length,
      hasResults: Boolean(document.querySelector('#deep-search-results .search-card') || document.querySelector('#deep-search-results .empty')),
      text: document.querySelector('[data-panel="search"]')?.innerText || ''
    }));
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint22-recherche.png'), { fullPage: true });

    await win.click('[data-tab="preferences"]');
    await win.waitForSelector('#pref-bankroll', { timeout: 10000 });
    await win.waitForSelector('#pref-allocation-strategy', { timeout: 10000 });
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint22-reglages.png'), { fullPage: true });

    await win.check('#pref-expert-mode');
    await win.check('#pref-trading-desk');
    await win.click('#save-preferences-btn');
    await win.click('[data-tab="dashboard"]');
    await win.waitForSelector('#trading-desk.active', { timeout: 10000 });
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint22-trading-desk.png'), { fullPage: true });

    await win.waitForSelector('[data-tab="data"]:not(.hidden)', { timeout: 5000 });
    await win.click('[data-tab="data"]');
    await win.waitForSelector('#quality-report-grid .quality-report-card, #quality-report-grid .empty', { timeout: 30000 });
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint22-avance.png'), { fullPage: true });

    await win.click('[data-tab="dashboard"]');
    await win.click('#picks-body tr.clickable-row td[data-label="Match"]');
    await win.waitForSelector('#match-modal:not(.hidden)', { timeout: 10000 });
    const modalOverflow = await win.evaluate(() => {
      const modal = document.querySelector('#match-modal .modal');
      const content = document.querySelector('#modal-content [data-detail-panel="summary"]') || document.querySelector('#modal-content');
      return Boolean((modal && modal.scrollWidth > modal.clientWidth + 2) || (content && content.scrollWidth > content.clientWidth + 2));
    });
    const modalText = await win.evaluate(() => document.querySelector('#modal-content [data-detail-panel="summary"]')?.innerText || '');
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint22-fiche.png'), { fullPage: false });
    await win.click('#modal-close');

    await win.setViewportSize({ width: 390, height: 860 });
    await win.click('[data-tab="dashboard"]');
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint22-mobile.png'), { fullPage: false });
    const mobile = await win.evaluate(() => ({
      hasOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      rows: document.querySelectorAll('#picks-body tr.clickable-row').length
    }));

    const severe = messages.filter((message) => (
      message.startsWith('error:') || message.startsWith('pageerror:')
    ) && !isIgnorableConsoleMessage(message));
    if (severe.length) throw new Error(`Erreurs console: ${severe.join(' | ')}`);
    if (dashboard.nav.join('|') !== 'Picks|Bilan|Recherche|Réglages') throw new Error(`Navigation non simplifiée: ${dashboard.nav.join(', ')}`);
    const hasActionCopy = /PARI/i.test(dashboard.dashboardText) && /COTE/i.test(dashboard.dashboardText) && /MISE/i.test(dashboard.dashboardText);
    const hasComplexMarket = /Handicap|Double chance|Jeux tennis|Total mi-temps|Total basket|Total runs|Score exact|Corners|Cartons/i.test(dashboard.dashboardText);
    const hasTechnicalJargon = /\bKelly\b|\bEV\b|\btier\b|\b1N2\b|\bBTTS\b|\bedge\b/i.test(dashboard.dashboardText);
    if (dashboard.metric < 10 || dashboard.rows < 10 || dashboard.rows > 18 || dashboard.timeline < 8 || dashboard.safeBadges < 5 || dashboard.priorityBadges < 5 || !dashboard.topPick || !/jour/i.test(dashboard.dailyBudget) || !dashboard.hasRollingSections || !dashboard.combines || !dashboard.scorers || !dashboard.promos || !/Suggestion du jour/.test(dashboard.suggestion || '') || dashboard.multibookText || !hasActionCopy || hasComplexMarket || hasTechnicalJargon) {
      throw new Error(`Dashboard Sprint 15 invalide: ${JSON.stringify({ ...dashboard, dashboardText: dashboard.dashboardText.slice(0, 800), hasActionCopy, hasComplexMarket, hasTechnicalJargon })}`);
    }
    if (!searchAudit.hasInput || searchAudit.compareOptions < 2 || !searchAudit.hasResults || !/Recherche|Comparer/i.test(searchAudit.text || '')) throw new Error(`Recherche Sprint 22 invalide: ${JSON.stringify(searchAudit)}`);
    if (modalOverflow) throw new Error('Overflow horizontal dans la fiche match');
    if (!/PARI/i.test(modalText || '') || !/COTE/i.test(modalText || '') || !/MISE/i.test(modalText || '') || !/Pourquoi ce pari/i.test(modalText || '') || /Meilleure\s+cote|Type Winamax|Cote modèle|\b1N2\b|\bKelly\b|\bedge\b/i.test(modalText || '')) throw new Error('Fiche match sans ticket clair Sprint 15');
    if (mobile.hasOverflow || mobile.rows <= 0) throw new Error(`Mobile invalide: ${JSON.stringify(mobile)}`);
    console.log(`Visual capture Sprint 22 OK: ${dashboard.metric} paris simples, ${dashboard.timeline} timeline, ${dashboard.safeBadges} fiables, ${dashboard.priorityBadges} priorités, recherche/trading capturés.`);
  } finally {
    await app.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
