const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, expect, _electron: electron } = require('@playwright/test');

const root = path.resolve(__dirname, '..', '..');
const electronExe = path.join(root, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
const testPort = 19000 + Math.floor(Math.random() * 2000);

async function firstWindow(app) {
  return app.windows()[0] || app.waitForEvent('window', { timeout: 60_000 });
}

function isIgnorableConsoleMessage(message) {
  return /Failed to load resource:\s*net::ERR_(EMPTY_RESPONSE|ABORTED)/i.test(String(message || ''));
}

test('Sprint 23 desktop keeps clear Winamax picks with supervised workflows', async () => {
  test.setTimeout(180_000);
  const rendererText = fs.readFileSync(path.join(root, 'desktop', 'src', 'renderer', 'renderer.js'), 'utf8');
  const htmlText = fs.readFileSync(path.join(root, 'desktop', 'src', 'renderer', 'index.html'), 'utf8');
  const mainText = fs.readFileSync(path.join(root, 'desktop', 'src', 'main.js'), 'utf8');

  expect(rendererText).not.toMatch(/fetch\(\s*['"]https?:\/\//i);
  expect(htmlText).not.toMatch(/<\s*(iframe|webview)\b/i);
  const retiredOddsPattern = new RegExp(['api/odds', 'MULTI_' + 'BOOKMAKER', 'odds' + 'Api', 'the-' + 'odds-api', 'Meilleure\\s+cote'].join('|'), 'i');
  expect(`${rendererText}\n${mainText}\n${htmlText}`).not.toMatch(retiredOddsPattern);
  expect(mainText).toContain('contextIsolation: true');
  expect(mainText).toContain('sandbox: true');
  expect(mainText).toContain('setWindowOpenHandler');
  expect(mainText).toContain("permission === 'notifications'");
  expect(mainText).toContain('requestSingleInstanceLock');
  expect(mainText).toContain('cleanupChromiumEphemeralStorage');
  expect(mainText).toContain('fallback démarrage');
  expect(mainText).toContain('DEFAULT_LOCAL_PORT = 17654');
  expect(mainText).toContain('/api/bug-report/save');
  expect(mainText).not.toContain('clearStorageData');
  expect(rendererText).toContain('todayFunnel');
  expect(rendererText).toContain('renderSimpleTimeline');
  expect(rendererText).toContain('antiTiltStatus');
  expect(rendererText).toContain('applyExpertMode');
  expect(rendererText).toContain('renderWinamaxPromos');
  expect(rendererText).toContain('renderBankrollAccounting');
  expect(rendererText).toContain('winamaxMarketAudit');
  expect(rendererText).toContain('coverage24h');
  expect(rendererText).toContain('safeBadgeHtml');
  expect(rendererText).toContain('renderTemporalCockpit');
  expect(rendererText).toContain('priorityBadgeHtml');
  expect(rendererText).toContain('dailyBudgetPlan');
  expect(rendererText).toContain('renderPaperSimulation');
  expect(rendererText).toContain('renderModelVsUser');
  expect(rendererText).toContain('buildDailySuggestion');
  expect(rendererText).toContain('specialPatternBadgeHtml');
  expect(rendererText).toContain('maybeShowEveningBrief');
  expect(rendererText).toContain('startDemoTour');
  expect(rendererText).toContain('SIMPLE_MARKET_PREFS');
  expect(rendererText).toContain('actionPickHtml');
  expect(rendererText).toContain('userBetLabel');
  expect(rendererText).toContain('applyTheme');
  expect(rendererText).toContain('installGlobalErrorReporting');
  expect(rendererText).toContain('renderShortcutSettings');
  expect(rendererText).toContain('prepareUpdateInstall');
  expect(rendererText).toContain('renderFavoritePicksSection');
  expect(rendererText).toContain('trendForRow');
  expect(rendererText).toContain('installPerformanceObserver');
  expect(rendererText).toContain('renderDeepAnalytics');
  expect(rendererText).toContain('renderDeepSearch');
  expect(rendererText).toContain('cashOutEstimate');
  expect(rendererText).toContain('renderTradingDesk');
  expect(rendererText).toContain('runAutoTracking');
  expect(rendererText).toContain('parseWinamaxPaste');
  expect(rendererText).toContain('renderSavedStrategies');
  expect(rendererText).toContain('advancedSportsSignals');
  expect(rendererText).toContain('applyI18n');
  expect(fs.existsSync(path.join(root, 'desktop', 'src', 'i18n', 'fr.json'))).toBe(true);
  expect(fs.existsSync(path.join(root, 'desktop', 'src', 'i18n', 'en.json'))).toBe(true);
  expect(mainText).toContain('/api/live-scores');

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paris-sportif-pw-'));
  const messages = [];
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

    await win.waitForSelector('[data-panel="dashboard"].active', { timeout: 60_000 });
    await win.waitForFunction(() => document.querySelector('#metric-picks')?.textContent !== '-', null, { timeout: 90_000 });
    await win.waitForFunction(() => (
      document.querySelectorAll('#home-top3-grid .home-top-card').length > 0 ||
      /Aucun pari|Top 3 incomplet/i.test(document.querySelector('#home-top3-grid')?.textContent || '')
    ), null, { timeout: 90_000 });

    const cockpit = await win.evaluate(() => ({
      title: document.querySelector('#page-title')?.textContent || '',
      nav: Array.from(document.querySelectorAll('.nav-btn:not(.hidden)')).map((node) => node.textContent.trim()),
      navText: document.querySelector('.sidebar')?.innerText || '',
      metric: Number(document.querySelector('#metric-picks')?.textContent || 0),
      metricLabel: document.querySelector('#metric-picks-label')?.textContent || '',
      funnelAlert: document.querySelector('#today-funnel-alert')?.innerText || '',
      rows: document.querySelectorAll('#picks-body tr.clickable-row').length,
      homeRows: document.querySelectorAll('#home-picks-table-body tr.clickable-row').length,
      homeTopCards: document.querySelectorAll('#home-top3-grid .home-top-card').length,
      homeCategoryCards: document.querySelectorAll('#home-category-grid .home-category-card').length,
      timeline: document.querySelectorAll('#simple-pick-timeline .simple-timeline-card').length,
      trackButtons: document.querySelectorAll('[data-track-bet-key]').length,
      safeBadges: document.querySelectorAll('.safe-pick-badge.safe').length,
      priorityBadges: document.querySelectorAll('.priority-badge').length,
      topPick: document.body.textContent.includes('TOP PICK'),
      noUltimate: document.querySelector('#ultimate-bet-card')?.textContent.includes('Aucun bet ultime validé') || false,
      dailyBudget: document.querySelector('#daily-budget-summary')?.textContent || '',
      viewModes: Array.from(document.querySelectorAll('#picks-view-switch [data-picks-view-mode]')).map((node) => node.textContent.trim()),
      emptyTimeSections: Array.from(document.querySelectorAll('#time-cockpit .time-section')).filter((section) => /Aucun pick dans cette fenêtre/i.test(section.textContent || '')).length,
      bankroll: document.querySelector('#simple-bankroll')?.textContent || '',
      pnl: document.querySelector('#simple-pnl')?.textContent || '',
      combines: Boolean(document.querySelector('#simple-combines-section')),
      scorers: Boolean(document.querySelector('#simple-scorers-section')),
      promos: Boolean(document.querySelector('#simple-promos-section')),
      suggestion: document.querySelector('#daily-suggestion-card')?.textContent || '',
      expertHidden: !document.querySelector('[data-tab="data"]:not(.hidden)'),
      multibookText: document.body.textContent.includes('Multi-' + 'bookmaker') || document.body.textContent.includes('Meilleure ' + 'cote'),
      dashboardText: document.querySelector('[data-panel="dashboard"]')?.innerText || ''
    }));
    expect(cockpit.title).toBe('À miser');
    for (const label of ['À miser', 'Cockpit', 'Vainqueurs', 'Buts', 'Nuit', 'Buteurs', 'Combinés', 'À surveiller', 'Bilan & Stats', 'Recherche', 'Réglages']) {
      expect(cockpit.navText).toContain(label);
    }
    expect(cockpit.metric).toBeGreaterThanOrEqual(0);
    expect(cockpit.homeTopCards).toBeGreaterThanOrEqual(1);
    expect(cockpit.homeTopCards).toBeLessThanOrEqual(3);
    expect(cockpit.homeRows).toBeGreaterThanOrEqual(3);
    expect(cockpit.homeRows).toBeLessThanOrEqual(10);
    expect(cockpit.homeCategoryCards).toBeGreaterThanOrEqual(6);
    expect(cockpit.homeCategoryCards).toBeLessThanOrEqual(10);
    expect(cockpit.rows).toBeLessThanOrEqual(30);
    expect(cockpit.trackButtons).toBeGreaterThanOrEqual(3);
    expect(cockpit.metricLabel).toMatch(/aujourd’hui|à venir|surveill|24h|prêts/i);
    if (cockpit.funnelAlert) expect(cockpit.funnelAlert).toMatch(/trop strict|Winamax|prêt|opportunité/i);
    expect(cockpit.priorityBadges).toBeGreaterThanOrEqual(cockpit.topPick ? 1 : 0);
    expect(cockpit.topPick || cockpit.noUltimate).toBe(true);
    expect(cockpit.dailyBudget).toContain('jour');
    expect(cockpit.viewModes).toEqual(['Horaire', 'Type', 'Sport']);
    expect(cockpit.emptyTimeSections).toBe(0);
    expect(cockpit.bankroll).toContain('€');
    expect(cockpit.pnl).toContain('€');
    expect(cockpit.combines).toBe(true);
    expect(cockpit.scorers).toBe(true);
    expect(cockpit.promos).toBe(true);
    expect(cockpit.suggestion).toContain('Suggestion du jour');
    expect(cockpit.expertHidden).toBe(true);
    expect(cockpit.multibookText).toBe(false);
    expect(cockpit.dashboardText).toMatch(/PARI/i);
    expect(cockpit.dashboardText).toMatch(/COTE/i);
    expect(cockpit.dashboardText).toMatch(/MISE/i);
    expect(cockpit.dashboardText).not.toMatch(/Handicap|Double chance|Jeux tennis|Total basket|Total runs|Score exact|Corners|Cartons/i);
    expect(cockpit.dashboardText).not.toMatch(/\bKelly\b|\bEV\b|\btier\b|\b1N2\b|\bBTTS\b|\bedge\b/i);
    expect(cockpit.dashboardText).not.toMatch(/À réparer/i);
    expect(cockpit.dashboardText).not.toMatch(/PARI\s*:?\s*Match nul/i);
    await expect(win.locator('#saved-strategy-select')).toHaveCount(1);
    await expect(win.locator('#save-current-strategy-btn')).toHaveCount(1);

    await win.locator('[data-track-bet-key]:visible').first().click();
    await win.waitForFunction(() => /1 en cours/.test(document.querySelector('#user-pnl-sub')?.textContent || ''), null, { timeout: 5_000 });
    await win.waitForFunction(() => Array.from(document.querySelectorAll('[data-track-bet-key]')).some((node) => /Suivi/.test(node.textContent || '')), null, { timeout: 5_000 });

    await win.keyboard.press('Control+2');
    await expect(win.locator('#page-title')).toHaveText('Bilan & Stats');
    await expect(win.locator('#bankroll-allocation-grid')).toContainText('#1');
    await expect(win.locator('#paper-simulation-grid')).toContainText('Simulation');
    await expect(win.locator('#model-vs-user-grid')).toContainText(/Si tu avais suivi le modèle|Toi sur 30 jours/);
    await expect(win.locator('#winamax-reconciliation-grid')).toContainText(/Aucun import Winamax confirmé|Solde Winamax/);
    await expect(win.locator('#saved-strategies-grid')).toContainText(/stratégie|Aucune/i);
    await expect(win.locator('#deep-analytics-summary')).toContainText(/Sample|P&L net|Meilleure zone/);
    await expect(win.locator('#deep-analytics-insights')).toContainText(/Insight|Recommandation|attente/i);
    await win.keyboard.press('Control+4');
    await expect(win.locator('#page-title')).toHaveText('Recherche');
    await expect(win.locator('#deep-search-input')).toBeVisible();
    await win.fill('#deep-search-input', 'Real');
    await expect(win.locator('#deep-search-results')).toContainText(/Équipe|Ligue|Joueur|Aucun résultat/);
    await win.click('[data-tab="preferences"]');
    await expect(win.locator('#page-title')).toHaveText('Réglages');
    await expect(win.locator('#pref-bankroll')).toBeVisible();
    await expect(win.locator('#pref-anti-tilt-strict')).toBeVisible();
    await expect(win.locator('#pref-allocation-strategy')).toBeVisible();
    await expect(win.locator('#pref-daily-budget')).toBeVisible();
    await expect(win.locator('#pref-prematch-alerts')).toBeVisible();
    await expect(win.locator('#pref-evening-hour')).toBeVisible();
    await expect(win.locator('#pref-expert-mode')).toBeVisible();
    await expect(win.locator('#pref-theme')).toBeVisible();
    await expect(win.locator('#pref-bug-report-prompt')).toBeVisible();
    await expect(win.locator('#pref-trading-desk')).toBeVisible();
    await expect(win.locator('#favorite-team-search')).toBeVisible();
    await expect(win.locator('#favorite-player-search')).toBeVisible();
    await expect(win.locator('#winamax-import-paste')).toBeVisible();
    await expect(win.locator('#pref-auto-tracking-enabled')).toHaveCount(1);
    await expect(win.locator('#pref-live-news-watcher')).toBeVisible();
    await expect(win.locator('#pref-language')).toBeVisible();
    await expect(win.locator('#app-version-label')).toContainText('v3.2.0');
    await win.selectOption('#pref-theme', 'light');
    await expect(win.locator('body')).toHaveClass(/theme-light/);
    await win.selectOption('#pref-theme', 'dark');
    await expect(win.locator('body')).toHaveClass(/theme-dark/);
    await win.click('#manual-bug-report-btn');
    await expect(win.locator('#bug-report-modal:not(.hidden)')).toContainText('Signaler un bug');
    await win.click('#bug-report-close');
    await expect(win.locator('#pref-sports')).toContainText('rugby');
    await expect(win.locator('#pref-sports')).toContainText('mma');
    await expect(win.locator('#pref-markets')).toContainText('Vainqueur du match');
    await expect(win.locator('#pref-markets')).toContainText('Plus / Moins de buts');
    await expect(win.locator('#pref-markets')).toContainText('Les deux équipes marquent');
    await expect(win.locator('#pref-markets')).toContainText('Buteurs');
    await expect(win.locator('#pref-markets')).not.toContainText(/Handicap|Corners|Cartons|Jeux tennis|Score exact/);
    await expect(win.locator('#pref-advanced-markets')).toContainText('Handicaps');
    await expect(win.locator('#pref-advanced-markets')).toContainText('Total jeux tennis');
    await expect(win.locator('#pref-multibook-enabled')).toHaveCount(0);
    await expect(win.locator('#pref-odds-api-key')).toHaveCount(0);
    await win.fill('#winamax-import-paste', '12/05 Real Madrid - Barcelone Plus de 2,5 buts cote 1.85 mise 12 gagné');
    await win.click('#preview-winamax-import-btn');
    await expect(win.locator('#winamax-import-preview')).toContainText(/Real Madrid|Plus\/Moins|Non suivi/);
    await win.click('#confirm-winamax-import-btn');
    await expect(win.locator('#winamax-import-preview')).toContainText(/Real Madrid|Aucun import/);
    await win.selectOption('#pref-language', 'en');
    await win.click('[data-tab="preferences"]');
    await expect(win.locator('#page-title')).toHaveText('Settings');
    await win.selectOption('#pref-language', 'fr');
    await win.click('[data-tab="preferences"]');
    await expect(win.locator('#page-title')).toHaveText('Réglages');
    await win.fill('#bankroll-tx-amount', '25');
    await win.click('#add-bankroll-transaction-btn');
    await expect(win.locator('#bankroll-transaction-list')).toContainText('Dépôt');
    await win.click('#force-weekly-report-btn');
    await expect(win.locator('#weekly-report-modal:not(.hidden)')).toContainText('rapport hebdo');
    await win.click('#weekly-report-close');
    await win.click('#force-evening-brief-btn');
    await expect(win.locator('#evening-brief-modal:not(.hidden)')).toContainText('Brief du soir');
    await win.click('#evening-brief-close');
    await win.click('#start-demo-tour-btn');
    await expect(win.locator('#demo-tour-modal:not(.hidden)')).toContainText(/Bienvenue dans ton cockpit|bet ultime/i);
    await win.click('#demo-tour-close');

    await win.click('[data-tab="preferences"]');
    await win.check('#pref-expert-mode');
    await win.click('#save-preferences-btn');
    await win.waitForFunction(() => !document.querySelector('#pref-auto-tracking-confirmed')?.closest('.expert-only')?.classList.contains('hidden'), null, { timeout: 5000 });
    await win.check('#pref-trading-desk');
    await win.check('#pref-auto-tracking-confirmed');
    await win.check('#pref-auto-tracking-enabled');
    await win.check('#pref-auto-tracking-dry-run');
    await win.fill('#pref-auto-tracking-edge', '1');
    await win.fill('#pref-auto-tracking-limit', '2');
    await win.click('#save-preferences-btn');
    await win.click('#run-auto-tracking-btn');
    await expect(win.locator('#auto-tracking-audit')).toContainText(/Dry-run|Actif|Inactif|pari/i);
    await expect(win.locator('[data-tab="data"]:not(.hidden)')).toBeVisible();
    await win.click('[data-tab="dashboard"]');
    await expect(win.locator('#trading-desk.active')).toBeVisible();
    await expect(win.locator('#trading-top-panel')).toContainText(/Top picks|#1/);
    await win.keyboard.press('N');
    await expect(win.locator('#trading-top-panel')).toContainText(/Top picks|#1/);
    await expect(win.locator('#shortcut-settings-grid')).toContainText('Vue Picks');
    await expect(win.locator('#shortcut-settings-grid')).toContainText('Ctrl+1');
    await win.click('[data-tab="data"]');
    await expect(win.locator('#quality-report-grid')).toBeVisible();
    await expect(win.locator('#winamax-market-audit-grid')).toContainText('Familles disponibles');
    await expect(win.locator('#winamax-market-audit-grid')).toContainText('24h glissantes');
    await expect(win.locator('#winamax-market-audit-grid')).toContainText('Cette nuit');

    await win.click('[data-tab="dashboard"]');
    await win.click('#help-panel-btn');
    await expect(win.locator('#help-panel:not(.hidden)')).toContainText('Edge');
    await win.click('#help-panel-close');
    await expect(win.locator('#help-panel')).toBeHidden();

    await win.click('[data-tab="preferences"]');
    await win.uncheck('#pref-trading-desk');
    await win.click('#save-preferences-btn');
    await win.click('[data-tab="dashboard"]');
    await win.waitForSelector('#home-picks-table-body tr.clickable-row:visible', { timeout: 10_000 });
    await win.click('#home-picks-table-body tr.clickable-row:visible td[data-label="Match"]');
    await win.waitForSelector('#match-modal:not(.hidden)', { timeout: 10_000 });
    const summaryPanel = win.locator('#modal-content [data-detail-panel="summary"]');
    await expect(summaryPanel).toContainText('PARI');
    await expect(summaryPanel).toContainText('COTE');
    await expect(summaryPanel).toContainText('MISE');
    await expect(summaryPanel).toContainText(/Pourquoi ce pari/i);
    const visibleSummaryText = await summaryPanel.evaluate((node) => node.innerText || '');
    expect(visibleSummaryText).not.toMatch(/Meilleure\s+cote|Type Winamax|Cote modèle|\b1N2\b|\bKelly\b|\bedge\b/i);
    const overflow = await win.evaluate(() => {
      const modal = document.querySelector('#match-modal .modal');
      const content = document.querySelector('#modal-content');
      return Boolean((modal && modal.scrollWidth > modal.clientWidth + 2) || (content && content.scrollWidth > content.clientWidth + 2));
    });
    expect(overflow).toBe(false);

    const severe = messages.filter((message) => (
      message.startsWith('error:') || message.startsWith('pageerror:')
    ) && !isIgnorableConsoleMessage(message));
    expect(severe).toEqual([]);
  } finally {
    await app.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
});
