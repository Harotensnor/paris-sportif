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
  const testPort = 26000 + Math.floor(Math.random() * 2000);
  const app = await electron.launch({
    executablePath: electronExe,
    cwd: path.join(root, 'desktop'),
    env: { ...process.env, PARIS_DESKTOP_PORT: String(testPort), PARIS_DESKTOP_USER_DATA_DIR: userDataDir, PARIS_DESKTOP_TEST_ISOLATED: '1' },
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
    await win.waitForFunction(() => (
      document.querySelectorAll('#home-picks-table-body tr.clickable-row').length >= 3 &&
      document.querySelectorAll('#home-top3-grid .home-top-card').length >= 1
    ), null, { timeout: 120000 });
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint23-picks.png'), { fullPage: true });
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint33-ultra-picks-after.png'), { fullPage: true });

    const dashboard = await win.evaluate(() => ({
      nav: Array.from(document.querySelectorAll('.nav-btn:not(.hidden)')).map((node) => {
        const label = node.querySelector('.nav-label');
        return (label ? label.textContent : node.textContent).trim();
      }),
      metric: Number(document.querySelector('#metric-picks')?.textContent || 0),
      metricLabel: document.querySelector('#metric-picks-label')?.textContent || '',
      funnelAlert: document.querySelector('#today-funnel-alert')?.innerText || '',
      rows: document.querySelectorAll('#home-picks-table-body tr.clickable-row').length || document.querySelectorAll('#picks-body tr.clickable-row').length,
      topCards: document.querySelectorAll('#home-top3-grid .home-top-card').length,
      timeline: Math.max(
        document.querySelectorAll('#simple-pick-timeline .simple-timeline-card').length,
        document.querySelectorAll('#home-picks-table-body tr.clickable-row').length
      ),
      safeBadges: document.querySelectorAll('.safe-pick-badge.safe').length,
      priorityBadges: document.querySelectorAll('.priority-badge').length,
      topPick: document.body.textContent.includes('TOP PICK'),
      noUltimate: document.querySelector('#ultimate-bet-card')?.textContent.includes('Aucun bet ultime validé') || false,
      dailyBudget: document.querySelector('#daily-budget-summary')?.textContent || '',
      viewModes: Array.from(document.querySelectorAll('#picks-view-switch [data-picks-view-mode]')).map((node) => node.textContent.trim()),
      emptyTimeSections: Array.from(document.querySelectorAll('#time-cockpit .time-section')).filter((section) => /Aucun pick dans cette fenêtre/i.test(section.textContent || '')).length,
      combines: Boolean(document.querySelector('#simple-combines-section')),
      scorers: Boolean(document.querySelector('#simple-scorers-section')),
      promos: Boolean(document.querySelector('#simple-promos-section')),
      suggestion: document.querySelector('#daily-suggestion-card')?.textContent || '',
      multibookText: document.body.textContent.includes('Multi-' + 'bookmaker') || document.body.textContent.includes('Meilleure ' + 'cote'),
      dashboardText: document.querySelector('[data-panel="dashboard"]')?.innerText || ''
    }));
    const ultraDashboard = await win.evaluate(() => ({
      visuals: document.querySelectorAll('.match-visual').length,
      scanner: document.querySelector('#market-scanner-section')?.textContent || '',
      voiceBriefRemoved: !document.querySelector('#listen-brief-btn') && !/lecture vocale/i.test(document.body.innerText || ''),
      heroImage: Boolean(document.querySelector('.ultimate-hero-media img, #home-top3-grid .match-visual'))
    }));

    await win.click('[data-tab="history"]');
    await win.waitForSelector('#model-performance-grid .performance-card, #model-performance-grid .empty', { timeout: 30000 });
    await win.waitForFunction(() => /#1/.test(document.querySelector('#bankroll-allocation-grid')?.textContent || ''), null, { timeout: 10000 });
    await win.waitForFunction(() => /Simulation/.test(document.querySelector('#paper-simulation-grid')?.textContent || ''), null, { timeout: 10000 });
    await win.waitForFunction(() => /Si tu avais suivi le modèle|Toi sur 30 jours/.test(document.querySelector('#model-vs-user-grid')?.textContent || ''), null, { timeout: 10000 });
    await win.waitForSelector('#deep-analytics-summary .quality-report-card, #deep-analytics-summary .empty', { timeout: 10000 });
    await win.waitForSelector('#winamax-reconciliation-grid', { timeout: 10000 });
    await win.waitForSelector('#saved-strategies-grid', { timeout: 10000 });
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint23-bilan.png'), { fullPage: true });

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
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint23-recherche.png'), { fullPage: true });

    await win.click('[data-tab="preferences"]');
    await win.waitForSelector('#pref-bankroll', { timeout: 10000 });
    await win.waitForSelector('#pref-allocation-strategy', { timeout: 10000 });
    await win.waitForSelector('#winamax-import-paste', { timeout: 10000 });
    await win.waitForSelector('#pref-auto-tracking-enabled', { state: 'attached', timeout: 10000 });
    await win.fill('#winamax-import-paste', '12/05 Real Madrid - Barcelone Plus de 2,5 buts cote 1.85 mise 12 gagné');
    await win.click('#preview-winamax-import-btn');
    await win.waitForFunction(() => /Real Madrid|Non suivi/.test(document.querySelector('#winamax-import-preview')?.textContent || ''), null, { timeout: 5000 });
    const importPreviewOk = await win.evaluate(() => /Real Madrid|Non suivi/.test(document.querySelector('#winamax-import-preview')?.textContent || ''));
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint23-reglages.png'), { fullPage: true });

    await win.check('#pref-expert-mode');
    await win.click('#save-preferences-btn');
    await win.waitForFunction(() => !document.querySelector('#pref-auto-tracking-confirmed')?.closest('.expert-only')?.classList.contains('hidden'), null, { timeout: 5000 });
    await win.check('#pref-trading-desk');
    await win.check('#pref-dashboard-custom');
    await win.check('#pref-twitter-watcher');
    await win.check('#pref-auto-tracking-confirmed');
    await win.check('#pref-auto-tracking-enabled');
    await win.check('#pref-auto-tracking-dry-run');
    await win.fill('#pref-auto-tracking-edge', '1');
    await win.click('#save-preferences-btn');
    await win.evaluate(() => document.querySelector('#run-auto-tracking-btn')?.click());
    await win.waitForFunction(() => /Dry-run|Actif|Inactif|pari/i.test(document.querySelector('#auto-tracking-audit')?.textContent || ''), null, { timeout: 5000 });
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint23-auto-tracking.png'), { fullPage: true });
    await win.click('[data-tab="dashboard"]');
    await win.waitForSelector('#trading-desk.active', { timeout: 10000 });
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint23-trading-desk.png'), { fullPage: true });
    await win.click('[data-tab="preferences"]');
    await win.waitForSelector('#pref-trading-desk', { timeout: 10000 });
    await win.uncheck('#pref-trading-desk');
    await win.click('#save-preferences-btn');
    await win.click('[data-tab="dashboard"]');
    await win.waitForSelector('[data-cockpit-category="cockpit"]:visible', { timeout: 10000 });
    await win.click('[data-cockpit-category="cockpit"]');
    await win.waitForFunction(() => Boolean(document.querySelector('#cockpit-detail-section')?.open), null, { timeout: 5000 });
    await win.waitForSelector('#custom-dashboard-grid:visible', { timeout: 10000 });
    const dashboardDragBefore = await win.evaluate(() => Array.from(document.querySelectorAll('#custom-dashboard-grid [data-bento-widget]')).map((node) => node.dataset.bentoWidget));
    if (dashboardDragBefore.length >= 2) {
      const first = dashboardDragBefore[0];
      const last = dashboardDragBefore[dashboardDragBefore.length - 1];
      await win.evaluate(({ first, last }) => {
        const source = document.querySelector(`#custom-dashboard-grid [data-bento-widget="${CSS.escape(first)}"]`);
        const target = document.querySelector(`#custom-dashboard-grid [data-bento-widget="${CSS.escape(last)}"]`);
        if (!source || !target) return;
        const dataTransfer = new DataTransfer();
        source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer }));
        const rect = target.getBoundingClientRect();
        target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer, clientY: rect.bottom + 4 }));
        target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer, clientY: rect.bottom + 4 }));
        source.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer }));
      }, { first, last });
      await win.waitForTimeout(300);
    }
    const dashboardDragAfter = await win.evaluate(() => ({
      order: Array.from(document.querySelectorAll('#custom-dashboard-grid [data-bento-widget]')).map((node) => node.dataset.bentoWidget),
      stored: JSON.parse(localStorage.getItem('parisSportifDashboardLayouts') || '{}')
    }));
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint33-ultra-dashboard-custom.png'), { fullPage: true });
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint34-dashboard-custom-drag.png'), { fullPage: true });
    const newsRun = await win.evaluate(async () => {
      const pick = {
        title: 'Paris Saint-Germain - Marseille',
        sport: 'football',
        league: 'Ligue 1',
        market: 'Vainqueur',
        label: 'Paris Saint-Germain gagne',
        odd: 1.85,
        start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      };
      const response = await fetch('/api/news-watch/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          force: true,
          config: { cacheMinutes: 1, maxPicks: 1, maxSources: 5, rateLimitPerMinute: 10 },
          picks: [pick]
        })
      });
      const json = await response.json();
      const record = (json.records || [])[0] || null;
      return {
        ok: Boolean(json.ok),
        records: (json.records || []).length,
        successfulSources: Number(record?.successfulSources || 0),
        checkedSources: Array.isArray(record?.sources) ? record.sources.length : 0,
        headline: record?.headline || '',
        sources: Array.isArray(record?.sources) ? record.sources.map((source) => `${source.label}:${source.status}`).join(' | ') : ''
      };
    });

    await win.waitForSelector('[data-tab="data"]:not(.hidden)', { timeout: 5000 });
    await win.click('[data-tab="data"]');
    await win.waitForSelector('#quality-report-grid .quality-report-card, #quality-report-grid .empty', { timeout: 30000 });
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint23-avance.png'), { fullPage: true });

    await win.evaluate(() => {
      const key = 'parisSportifPreferences';
      const prefs = JSON.parse(localStorage.getItem(key) || '{}');
      prefs.tradingDesk = false;
      localStorage.setItem(key, JSON.stringify(prefs));
    });
    await win.reload({ waitUntil: 'domcontentloaded' });
    await win.waitForSelector('[data-panel="dashboard"].active', { timeout: 60000 });
    await win.waitForFunction(() => document.querySelector('#metric-picks')?.textContent !== '-', null, { timeout: 90000 });
    await win.click('[data-tab="dashboard"]');
    await win.waitForSelector('#home-top3-grid .clickable-row[data-match-id], #home-picks-table-body tr.clickable-row, #ready-picks-hero .clickable-row[data-match-id], #picks-body tr.clickable-row', { timeout: 10000 });
    const opened = await win.evaluate(() => {
      const target = document.querySelector('#home-top3-grid .clickable-row[data-match-id]')
        || document.querySelector('#home-picks-table-body tr.clickable-row')
        || document.querySelector('#ready-picks-hero .clickable-row[data-match-id]')
        || document.querySelector('#picks-body tr.clickable-row');
      if (!target) return false;
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      return true;
    });
    if (!opened) throw new Error('Aucune fiche cliquable disponible');
    await win.waitForSelector('#match-modal:not(.hidden)', { timeout: 10000 });
    const modalOverflow = await win.evaluate(() => {
      const modal = document.querySelector('#match-modal .modal');
      const content = document.querySelector('#modal-content [data-detail-panel="summary"]') || document.querySelector('#modal-content');
      return Boolean((modal && modal.scrollWidth > modal.clientWidth + 2) || (content && content.scrollWidth > content.clientWidth + 2));
    });
    const modalText = await win.evaluate(() => document.querySelector('#modal-content [data-detail-panel="summary"]')?.innerText || '');
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint23-fiche.png'), { fullPage: false });
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint33-ultra-fiche-monte-carlo.png'), { fullPage: false });
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint34-ultra-fiche.png'), { fullPage: false });
    await win.click('#modal-close');

    await win.setViewportSize({ width: 390, height: 860 });
    await win.click('[data-tab="dashboard"]');
    await safeScreenshot(win, path.join(captureDir, 'desktop-sprint23-mobile.png'), { fullPage: false });
    const mobile = await win.evaluate(() => ({
      hasOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      rows: document.querySelectorAll('#home-picks-table-body tr.clickable-row').length || document.querySelectorAll('#picks-body tr.clickable-row').length
    }));

    const severe = messages.filter((message) => (
      message.startsWith('error:') || message.startsWith('pageerror:')
    ) && !isIgnorableConsoleMessage(message));
    if (severe.length) throw new Error(`Erreurs console: ${severe.join(' | ')}`);
    // Sprint 51 : vérification labels-clés au lieu de séquence stricte.
    const visualNavLabels = dashboard.nav.map((l) => l.toLowerCase());
    const visualRequired = ['miser', 'bilan', 'recherche', 'réglages'];
    const visualMissing = visualRequired.filter((label) => !visualNavLabels.some((nav) => nav.includes(label)));
    if (visualMissing.length) throw new Error(`Navigation Sprint 51 incomplète, manque: ${visualMissing.join(', ')}`);
    const hasActionCopy = /PARI/i.test(dashboard.dashboardText) && /COTE/i.test(dashboard.dashboardText) && /MISE/i.test(dashboard.dashboardText);
    const hasComplexMarket = /Handicap|Double chance|Jeux tennis|Total basket|Total runs|Score exact|Corners|Cartons/i.test(dashboard.dashboardText);
    const hasTechnicalJargon = /\bKelly\b|\bEV\b|\btier\b|\b1N2\b|\bBTTS\b|\bedge\b/i.test(dashboard.dashboardText);
    const hasExpertRepairLabel = /À réparer/i.test(dashboard.dashboardText);
    const sprint23Runtime = await win.evaluate(() => ({
      autoTracking: /Dry-run|Actif|Inactif|pari/i.test(document.querySelector('#auto-tracking-audit')?.textContent || ''),
      importPreview: Boolean(window.__visualImportPreviewOk),
      i18n: Boolean(window.t && typeof window.t === 'function')
    }));
    sprint23Runtime.importPreview = importPreviewOk;
    const hasViewModes = JSON.stringify(dashboard.viewModes) === JSON.stringify(['Horaire', 'Type', 'Sport']);
    const strictNoReady = /0 prêt aujourd’hui|Aucun pari prêt aujourd’hui|Checklist rouge|trop strict/i.test(dashboard.funnelAlert);
    const minSafeBadges = strictNoReady ? 1 : 2;
    if (dashboard.rows < 3 || dashboard.rows > 12 || dashboard.topCards < 1 || dashboard.timeline < 3 || dashboard.safeBadges < minSafeBadges || !/24h|aujourd’hui|à venir|surveill|candidat/i.test(dashboard.metricLabel) || (dashboard.metric < 5 && !/trop strict|Winamax|Volume prêt limité|0 prêt/i.test(dashboard.funnelAlert)) || !/jour/i.test(dashboard.dailyBudget) || !hasViewModes || dashboard.emptyTimeSections !== 0 || !dashboard.combines || !dashboard.scorers || !dashboard.promos || dashboard.multibookText || !hasActionCopy || hasComplexMarket || hasTechnicalJargon || hasExpertRepairLabel) {
      throw new Error(`Dashboard Sprint 23 invalide: ${JSON.stringify({ ...dashboard, dashboardText: dashboard.dashboardText.slice(0, 800), hasActionCopy, hasComplexMarket, hasTechnicalJargon })}`);
    }
    if (ultraDashboard.visuals < 8 || !/Scanner du jour|Aucun pattern/i.test(ultraDashboard.scanner || '') || !ultraDashboard.voiceBriefRemoved || !ultraDashboard.heroImage) {
      throw new Error(`Dashboard Ultra incomplet: ${JSON.stringify(ultraDashboard)}`);
    }
    if (dashboardDragBefore.length >= 2 && dashboardDragAfter.order.join('|') === dashboardDragBefore.join('|')) throw new Error(`Dashboard custom non déplaçable: ${JSON.stringify({ dashboardDragBefore, dashboardDragAfter })}`);
    if (dashboardDragBefore.length >= 2 && !Object.values(dashboardDragAfter.stored || {}).some((order) => Array.isArray(order) && order.join('|') === dashboardDragAfter.order.join('|'))) throw new Error(`Dashboard custom non persisté: ${JSON.stringify(dashboardDragAfter)}`);
    if (!newsRun.ok || !newsRun.records || !newsRun.checkedSources || !newsRun.successfulSources) throw new Error(`News watcher réel incomplet: ${JSON.stringify(newsRun)}`);
    if (!sprint23Runtime.autoTracking || !sprint23Runtime.importPreview || !sprint23Runtime.i18n) throw new Error(`Workflow Sprint 23 invalide: ${JSON.stringify(sprint23Runtime)}`);
    if (!searchAudit.hasInput || searchAudit.compareOptions < 2 || !searchAudit.hasResults || !/Recherche|Comparer/i.test(searchAudit.text || '')) throw new Error(`Recherche Sprint 22 invalide: ${JSON.stringify(searchAudit)}`);
    if (modalOverflow) throw new Error('Overflow horizontal dans la fiche match');
    if (!/PARI/i.test(modalText || '') || !/COTE/i.test(modalText || '') || !/MISE/i.test(modalText || '') || !/Pourquoi ce pari/i.test(modalText || '') || /Meilleure\s+cote|Type Winamax|Cote modèle|\b1N2\b|\bKelly\b|\bedge\b/i.test(modalText || '')) throw new Error('Fiche match sans ticket clair ou jargon caché');
    if (mobile.hasOverflow || mobile.rows <= 0) throw new Error(`Mobile invalide: ${JSON.stringify(mobile)}`);
    console.log(`Visual capture Sprint 23 OK: ${dashboard.metric} paris simples, ${dashboard.timeline} timeline, ${dashboard.safeBadges} fiables, auto-tracking/réconciliation/recherche/trading capturés.`);
  } finally {
    await app.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
