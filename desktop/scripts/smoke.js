#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { _electron: electron } = require('playwright');

async function firstWindow(app) {
  return app.windows()[0] || app.waitForEvent('window', { timeout: 60000 });
}

function isIgnorableConsoleMessage(message) {
  // Sprint 65 — tolere ERR_NO_BUFFER_SPACE et ERR_NETWORK_CHANGED (transient Windows
  // sur fetch images Wikipedia, sans impact engine).
  return /Failed to load resource:\s*net::ERR_(EMPTY_RESPONSE|ABORTED|NO_BUFFER_SPACE|NETWORK_CHANGED|TIMED_OUT)/i.test(String(message || ''));
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
  const retiredOddsPattern = new RegExp(['api/odds', 'MULTI_' + 'BOOKMAKER', 'odds' + 'Api', 'the-' + 'odds-api', 'Meilleure\\s+cote'].join('|'), 'i');
  if (retiredOddsPattern.test(`${rendererText}\n${mainText}\n${htmlText}`)) {
    throw new Error('Reste multi-bookmaker détecté alors que Sprint 11 est Winamax-only');
  }
  for (const marker of ['contextIsolation: true', 'sandbox: true', 'setWindowOpenHandler', "permission === 'notifications'", 'process.memoryUsage()', 'requestSingleInstanceLock', 'cleanupChromiumEphemeralStorage', 'fallback démarrage']) {
    if (!mainText.includes(marker)) throw new Error(`Durcissement Electron absent: ${marker}`);
  }
  for (const marker of ['DEFAULT_LOCAL_PORT = 17654', '/api/bug-report/save']) {
    if (!mainText.includes(marker)) throw new Error(`Sprint 20 main absent: ${marker}`);
  }
  if (mainText.includes('clearStorageData')) throw new Error('Nettoyage CacheStorage agressif réintroduit au démarrage');
  for (const marker of ['todayFunnel', 'renderSimpleTimeline', 'antiTiltStatus', 'applyExpertMode', 'renderWinamaxPromos', 'renderBankrollAccounting', 'winamaxMarketAudit', 'coverage24h', 'safeBadgeHtml', 'renderTemporalCockpit', 'priorityBadgeHtml', 'dailyBudgetPlan', 'renderPaperSimulation', 'renderModelVsUser', 'buildDailySuggestion', 'specialPatternBadgeHtml', 'maybeShowEveningBrief', 'startDemoTour', 'SIMPLE_MARKET_PREFS', 'actionPickHtml', 'userBetLabel']) {
    if (!rendererText.includes(marker)) throw new Error(`Sprint 14 renderer absent: ${marker}`);
  }
  for (const marker of ['applyTheme', 'installGlobalErrorReporting', 'renderShortcutSettings', 'prepareUpdateInstall', 'renderFavoritePicksSection', 'trendForRow', 'installPerformanceObserver']) {
    if (!rendererText.includes(marker)) throw new Error(`Sprint 20 renderer absent: ${marker}`);
  }
  for (const marker of ['renderDeepAnalytics', 'deepSearchIndex', 'renderDeepSearch', 'cashOutEstimate', 'renderTradingDesk', 'tierCalibration']) {
    if (!rendererText.includes(marker) && !mainText.includes(marker)) throw new Error(`Sprint 22 absent: ${marker}`);
  }
  for (const marker of ['runAutoTracking', 'parseWinamaxPaste', 'renderSavedStrategies', 'advancedSportsSignals', 'applyI18n']) {
    if (!rendererText.includes(marker)) throw new Error(`Sprint 23 renderer absent: ${marker}`);
  }
  for (const rel of ['desktop/src/i18n/fr.json', 'desktop/src/i18n/en.json']) {
    if (!fs.existsSync(path.join(root, rel))) throw new Error(`Fichier i18n absent: ${rel}`);
  }

  const messages = [];
  const failedRequests = [];
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paris-sportif-smoke-'));
  const testPort = 21000 + Math.floor(Math.random() * 2000);
  const app = await electron.launch({
    executablePath: electronExe,
    cwd: path.join(root, 'desktop'),
    acceptDownloads: true,
    env: { ...process.env, PARIS_DESKTOP_PORT: String(testPort), PARIS_DESKTOP_USER_DATA_DIR: userDataDir, PARIS_DESKTOP_TEST_ISOLATED: '1' },
    args: ['.']
  });

  try {
    const win = await firstWindow(app);
    win.on('console', (msg) => {
      if (['error', 'warning'].includes(msg.type())) messages.push(`${msg.type()}: ${msg.text()}`);
    });
    win.on('requestfailed', (request) => {
      failedRequests.push(`${request.url()} :: ${request.failure()?.errorText || 'failed'}`);
    });
    win.on('pageerror', (error) => messages.push(`pageerror: ${error.message}`));

    await win.waitForSelector('[data-panel="dashboard"].active', { timeout: 60000 });
    await win.waitForFunction(() => document.querySelector('#metric-picks')?.textContent !== '-', null, { timeout: 90000 });
    const dashboard = await win.evaluate(() => ({
      title: document.querySelector('#page-title')?.textContent || '',
      nav: Array.from(document.querySelectorAll('.nav-btn:not(.hidden)')).map((node) => {
        const label = node.querySelector('.nav-label');
        return (label ? label.textContent : node.textContent).trim();
      }),
      metric: Number(document.querySelector('#metric-picks')?.textContent || 0),
      metricLabel: document.querySelector('#metric-picks-label')?.textContent || '',
      funnelAlert: document.querySelector('#today-funnel-alert')?.innerText || '',
      rows: document.querySelectorAll('#picks-body tr.clickable-row').length,
      todayRows: Array.from(document.querySelectorAll('#picks-body tr.clickable-row')).filter((row) => /Aujourd'hui|Aujourd’hui|dans|h|min/i.test(row.textContent || '')).length,
      timeline: document.querySelectorAll('#simple-pick-timeline .simple-timeline-card').length,
      safeBadges: document.querySelectorAll('.safe-pick-badge.safe').length,
      priorityBadges: document.querySelectorAll('.priority-badge').length,
      topPick: document.body.textContent.includes('TOP PICK'),
      noUltimate: document.querySelector('#ultimate-bet-card')?.textContent.includes('Aucun bet ultime validé') || false,
      dailyBudget: document.querySelector('#daily-budget-summary')?.textContent || '',
      hasRollingSections: document.body.textContent.includes('À jouer prochainement')
        && ['Dans l’heure', 'Dans les 3 heures', 'Cette nuit', 'Demain matin', 'Demain après', 'Prochains jours'].some((label) => document.body.textContent.includes(label)),
      combines: Boolean(document.querySelector('#simple-combines-section')),
      scorers: Boolean(document.querySelector('#simple-scorers-section')),
      promos: Boolean(document.querySelector('#simple-promos-section')),
      bankroll: document.querySelector('#simple-bankroll')?.textContent || '',
      pnl: document.querySelector('#simple-pnl')?.textContent || '',
      trackButtons: document.querySelectorAll('[data-track-bet-key]').length,
      expertHidden: !document.querySelector('[data-tab="data"]:not(.hidden)'),
      multibookText: document.body.textContent.includes('Multi-' + 'bookmaker') || document.body.textContent.includes('Meilleure ' + 'cote'),
      dashboardText: document.querySelector('[data-panel="dashboard"]')?.innerText || ''
    }));
    if (!/Picks|Paris|miser/i.test(dashboard.title)) throw new Error(`Titre dashboard invalide: ${dashboard.title}`);
    // Sprint 51 (refonte UX) : navigation enrichie avec groupes et labels.
    // On vérifie que les labels clés sont présents au lieu d'exiger une
    // séquence stricte qui contraint trop l'évolution de la nav.
    const navLabels = dashboard.nav.map((l) => l.toLowerCase());
    const requiredNavLabels = ['miser', 'bilan', 'recherche', 'réglages'];
    const missingNav = requiredNavLabels.filter((label) => !navLabels.some((nav) => nav.includes(label)));
    if (missingNav.length) throw new Error(`Navigation Sprint 51 incomplète, manque: ${missingNav.join(', ')}`);
    const hasActionCopy = /PARI/i.test(dashboard.dashboardText) && /COTE/i.test(dashboard.dashboardText) && /MISE/i.test(dashboard.dashboardText);
    const hasComplexMarket = /Handicap|Double chance|Jeux tennis|Total basket|Total runs|Score exact|Corners|Cartons/i.test(dashboard.dashboardText);
    const hasTechnicalJargon = /\bKelly\b|\bEV\b|\btier\b|\b1N2\b|\bBTTS\b|\bedge\b/i.test(dashboard.dashboardText);
    const hasExpertRepairLabel = /À réparer/i.test(dashboard.dashboardText);
    if (dashboard.rows < 15 || dashboard.rows > 28 || dashboard.timeline < 8 || dashboard.trackButtons < 6 || dashboard.safeBadges < 5 || !/24h|aujourd’hui|à venir|surveill/i.test(dashboard.metricLabel) || (dashboard.metric < 6 && !/trop strict|Winamax/i.test(dashboard.funnelAlert)) || !(dashboard.topPick || dashboard.noUltimate) || !/jour/i.test(dashboard.dailyBudget) || !dashboard.hasRollingSections || !hasActionCopy || hasComplexMarket || hasTechnicalJargon || hasExpertRepairLabel) {
      throw new Error(`Picks Sprint 15 insuffisants: ${JSON.stringify({ ...dashboard, dashboardText: dashboard.dashboardText.slice(0, 800), hasActionCopy, hasComplexMarket, hasTechnicalJargon })}`);
    }
    if (!dashboard.combines || !dashboard.scorers || !dashboard.promos || !dashboard.bankroll.includes('€') || !dashboard.pnl.includes('€') || !dashboard.expertHidden || dashboard.multibookText) {
      throw new Error(`Cockpit Sprint 14 incohérent: ${JSON.stringify(dashboard)}`);
    }

    await win.click('#save-current-strategy-btn');
    await win.waitForFunction(() => /Stratégie Winamax/.test(document.querySelector('#saved-strategy-select')?.textContent || ''), null, { timeout: 5000 });

    await win.locator('[data-track-bet-key]:visible').first().click();
    await win.waitForFunction(() => /1 en cours/.test(document.querySelector('#user-pnl-sub')?.textContent || ''), null, { timeout: 5000 });

    await win.click('[data-tab="history"]');
    await win.waitForSelector('#model-performance-grid .performance-card, #model-performance-grid .empty', { timeout: 30000 });
    await win.waitForFunction(() => /#1/.test(document.querySelector('#bankroll-allocation-grid')?.textContent || ''), null, { timeout: 10_000 });
    await win.waitForFunction(() => /Simulation/.test(document.querySelector('#paper-simulation-grid')?.textContent || ''), null, { timeout: 10_000 });
    await win.waitForFunction(() => /Décomposition|Sample|Insight/.test(document.querySelector('#deep-analytics-summary')?.textContent + document.querySelector('#deep-analytics-insights')?.textContent || ''), null, { timeout: 10_000 });
    await win.click('[data-tab="search"]');
    await win.waitForSelector('#deep-search-input', { timeout: 10_000 });
    await win.fill('#deep-search-input', 'Real');
    await win.waitForSelector('#deep-search-results .search-card, #deep-search-results .empty', { timeout: 10_000 });
    await win.click('[data-tab="preferences"]');
    await win.waitForSelector('#pref-bankroll', { timeout: 10000 });
    const prefs = await win.evaluate(() => ({
      expert: Boolean(document.querySelector('#pref-expert-mode')),
      antiTilt: Boolean(document.querySelector('#pref-anti-tilt-strict')),
      theme: Boolean(document.querySelector('#pref-theme')),
      bugReport: Boolean(document.querySelector('#pref-bug-report-prompt') && document.querySelector('#manual-bug-report-btn')),
      favorites: Boolean(document.querySelector('#favorite-team-search') && document.querySelector('#favorite-player-search')),
      trading: Boolean(document.querySelector('#pref-trading-desk')),
      allocation: Boolean(document.querySelector('#pref-allocation-strategy') && document.querySelector('#pref-daily-budget')),
      prematchAlerts: Boolean(document.querySelector('#pref-prematch-alerts') && document.querySelector('#pref-top-pick-alerts')),
      expandedSports: (document.querySelector('#pref-sports')?.textContent || '').includes('rugby') && (document.querySelector('#pref-sports')?.textContent || '').includes('mma'),
      simpleMarkets: ['Vainqueur du match', 'Plus / Moins de buts', 'Les deux équipes marquent', 'Buteurs', 'Mi-temps vainqueur'].every((label) => (document.querySelector('#pref-markets')?.textContent || '').includes(label)),
      simpleHasAdvanced: /Handicap|Corners|Cartons|Jeux tennis|Score exact/i.test(document.querySelector('#pref-markets')?.textContent || ''),
      advancedMarkets: /Handicaps/.test(document.querySelector('#pref-advanced-markets')?.textContent || '') && /Total jeux tennis/.test(document.querySelector('#pref-advanced-markets')?.textContent || ''),
      accounting: Boolean(document.querySelector('#add-bankroll-transaction-btn')),
      winamaxImport: Boolean(document.querySelector('#winamax-import-paste') && document.querySelector('#preview-winamax-import-btn')),
      autoTracking: Boolean(document.querySelector('#pref-auto-tracking-enabled') && document.querySelector('#pref-auto-tracking-dry-run') && document.querySelector('#stop-auto-tracking-btn')),
      liveNews: Boolean(document.querySelector('#pref-live-news-watcher')),
      language: Boolean(document.querySelector('#pref-language')),
      multiBook: Boolean(document.querySelector('#pref-multibook-enabled') || document.querySelector('#pref-odds-api-key'))
    }));
    if (!prefs.expert || !prefs.antiTilt || !prefs.theme || !prefs.bugReport || !prefs.favorites || !prefs.trading || !prefs.allocation || !prefs.prematchAlerts || !prefs.expandedSports || !prefs.simpleMarkets || prefs.simpleHasAdvanced || !prefs.advancedMarkets || !prefs.accounting || !prefs.winamaxImport || !prefs.autoTracking || !prefs.liveNews || !prefs.language || prefs.multiBook) throw new Error(`Réglages Sprint 23 invalides: ${JSON.stringify(prefs)}`);
    await win.selectOption('#pref-theme', 'light');
    await win.waitForFunction(() => document.body.classList.contains('theme-light'), null, { timeout: 5000 });
    await win.selectOption('#pref-theme', 'dark');
    await win.waitForFunction(() => document.body.classList.contains('theme-dark'), null, { timeout: 5000 });
    await win.click('#manual-bug-report-btn');
    await win.waitForSelector('#bug-report-modal:not(.hidden)', { timeout: 5000 });
    await win.click('#bug-report-close');
    await win.fill('#bankroll-tx-amount', '25');
    await win.click('#add-bankroll-transaction-btn');
    await win.waitForFunction(() => /Dépôt/.test(document.querySelector('#bankroll-transaction-list')?.textContent || ''), null, { timeout: 5000 });
    await win.fill('#winamax-import-paste', '15/05 Real Madrid - Barcelona PARI Real Madrid gagne cote 1.85 mise 12€ gagné');
    await win.click('#preview-winamax-import-btn');
    await win.waitForFunction(() => /Real Madrid|Suivi|confirmer/i.test(document.querySelector('#winamax-import-preview')?.textContent || ''), null, { timeout: 5000 });
    await win.selectOption('#pref-language', 'en');
    await win.waitForFunction(() => document.documentElement.lang === 'en' && /Settings/.test(document.querySelector('[data-tab="preferences"]')?.textContent || ''), null, { timeout: 5000 });
    await win.selectOption('#pref-language', 'fr');

    await win.check('#pref-expert-mode');
    await win.click('#save-preferences-btn');
    await win.waitForFunction(() => !document.querySelector('#pref-auto-tracking-confirmed')?.closest('.expert-only')?.classList.contains('hidden'), null, { timeout: 5000 });
    await win.check('#pref-trading-desk');
    await win.check('#pref-auto-tracking-confirmed');
    await win.check('#pref-auto-tracking-enabled');
    await win.check('#pref-auto-tracking-dry-run');
    await win.click('#save-preferences-btn');
    await win.click('#run-auto-tracking-btn');
    await win.waitForFunction(() => /Dry-run|Règle|auto/i.test(document.querySelector('#auto-tracking-audit')?.textContent || ''), null, { timeout: 5000 });
    await win.waitForSelector('[data-tab="data"]:not(.hidden)', { timeout: 5000 });
    await win.waitForFunction(() => /Vue Picks/.test(document.querySelector('#shortcut-settings-grid')?.textContent || ''), null, { timeout: 5000 });
    await win.click('[data-tab="data"]');
    await win.waitForSelector('#quality-report-grid .quality-report-card, #quality-report-grid .empty', { timeout: 30000 });
    await win.waitForSelector('#winamax-market-audit-grid .quality-report-card, #winamax-market-audit-grid .empty', { timeout: 30000 });
    const auditText = await win.textContent('#winamax-market-audit-grid');
    if (!/24h glissantes/i.test(auditText || '') || !/Cette nuit/i.test(auditText || '')) {
      throw new Error(`Audit 24h absent du Mode expert: ${auditText}`);
    }

    await win.click('[data-tab="dashboard"]');
    await win.waitForSelector('#trading-desk.active', { timeout: 10_000 });
    await win.click('#picks-body tr.clickable-row td[data-label="Match"]');
    await win.waitForSelector('#match-modal:not(.hidden)', { timeout: 10000 });
    const modal = await win.evaluate(() => {
      const modalNode = document.querySelector('#match-modal .modal');
      const content = document.querySelector('#modal-content [data-detail-panel="summary"]') || document.querySelector('#modal-content');
      return {
        text: content?.innerText || '',
        overflow: Boolean((modalNode && modalNode.scrollWidth > modalNode.clientWidth + 2) || (content && content.scrollWidth > content.clientWidth + 2))
      };
    });
    if (modal.overflow || !modal.text.includes('PARI') || !modal.text.includes('COTE') || !modal.text.includes('MISE') || !/Pourquoi ce pari/i.test(modal.text) || /Meilleure\s+cote|Type Winamax|Cote modèle|\b1N2\b|\bKelly\b|\bedge\b/i.test(modal.text)) {
      throw new Error(`Fiche match invalide: ${JSON.stringify(modal).slice(0, 800)}`);
    }

    const severe = messages.filter((message) => (
      message.startsWith('error:') || message.startsWith('pageerror:')
    ) && !isIgnorableConsoleMessage(message));
    if (severe.length) throw new Error(`Erreurs console: ${severe.join(' | ')}${failedRequests.length ? ` | requêtes: ${failedRequests.join(' | ')}` : ''}`);
    console.log(`Desktop smoke OK: ${dashboard.metric} paris simples visibles, ${dashboard.timeline} timeline, ${dashboard.safeBadges} fiables, ${dashboard.priorityBadges} priorités, Sprint 23 auto-tracking/réconciliation/i18n OK.`);
  } finally {
    await app.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
