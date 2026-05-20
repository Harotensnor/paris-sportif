#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { _electron: electron } = require('playwright');
const { createLegacyEngineService } = require('../src/engine/legacy-engine');
const dataSource = require('../src/engine/data-source');

function fail(message, details) {
  const suffix = details ? ` ${JSON.stringify(details).slice(0, 2000)}` : '';
  throw new Error(`${message}${suffix}`);
}

function assert(condition, message, details) {
  if (!condition) fail(message, details);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false, ...options });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} a échoué avec le code ${code}`));
    });
  });
}

async function firstWindow(app) {
  return app.windows()[0] || app.waitForEvent('window', { timeout: 10000 });
}

async function clickTabAndWait(win, tab, panel, readySelector, timeout = 10_000) {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await win.locator(`[data-tab="${tab}"]:visible`).first().click();
      await win.waitForFunction(
        ({ panelName, selector }) => Boolean(document.querySelector(`[data-panel="${panelName}"].active ${selector}`)),
        { panelName: panel, selector: readySelector },
        { timeout }
      );
      return;
    } catch (error) {
      lastError = error;
      await win.waitForTimeout(250 + attempt * 250);
    }
  }
  throw lastError;
}

async function closeElectronApp(app) {
  if (!app) return;
  try {
    await Promise.race([
      app.close(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('app.close timeout')), 5000))
    ]);
  } catch {
    const proc = typeof app.process === 'function' ? app.process() : null;
    if (proc && !proc.killed) proc.kill('SIGKILL');
  }
}

function isIgnorableConsoleMessage(message) {
  return /Failed to load resource:\s*net::ERR_(EMPTY_RESPONSE|ABORTED)/i.test(String(message || ''));
}

async function main() {
  const root = path.resolve(__dirname, '..', '..');
  const desktopRoot = path.join(root, 'desktop');
  const skipRefresh = process.argv.includes('--skip-refresh') || process.env.PARIS_TERRAIN_SKIP_REFRESH === '1';
  const fullRefresh = process.argv.includes('--full-refresh') || process.env.PARIS_TERRAIN_FULL_REFRESH === '1';
  const refreshModeArg = process.argv.find((arg) => arg.startsWith('--refresh-mode='));
  const requestedRefreshMode = refreshModeArg ? refreshModeArg.split('=').slice(1).join('=') : '';
  const allowedRefreshModes = new Set(['instant', 'fast', 'quick', 'full', 'prematch', 'critical', 'repair-context']);
  const refreshMode = requestedRefreshMode && allowedRefreshModes.has(requestedRefreshMode)
    ? requestedRefreshMode
    : fullRefresh ? 'full' : 'fast';
  const refreshFlag = `--${refreshMode}`;

  if (!skipRefresh) {
    await run(process.platform === 'win32' ? 'python' : 'python3', ['desktop/bin/refresh_once.py', refreshFlag], { cwd: root });
  }

  const runtimeData = dataSource.loadRuntimeDataStable(root);
  const data = runtimeData.data;
  const today = dataSource.parisDay();
  assert(data.today === today, 'Terrain: data.today ne correspond pas à la vraie journée Europe/Paris', {
    data_today: data.today,
    paris_today: today,
    generated_at: data.generated_at
  });
  const events = dataSource.eventListFromDays(data.days || {});
  const todayEvents = events.filter((event) => dataSource.parisDay(event.date || event.startDate || event.kickoff || event.__dayKey) === today);
  const todayBookable = todayEvents.filter((event) => event?.winamax?.available === true);
  assert(
    !dataSource.hasPrimaryTodayWinamaxLoss(runtimeData.truth),
    'Terrain: data.js a perdu les events Winamax du jour alors que les snapshots légers en ont',
    {
      truth: runtimeData.truth,
      refreshRunning: runtimeData.refreshRunning,
      waitedMs: runtimeData.waitedMs
    }
  );
  const health = JSON.parse(fs.readFileSync(path.join(root, 'health.json'), 'utf8'));
  const v16Ticket = fs.existsSync(path.join(root, 'v16_final_ticket.json'))
    ? JSON.parse(fs.readFileSync(path.join(root, 'v16_final_ticket.json'), 'utf8'))
    : { rows: [] };
  const generatedAt = Date.parse(health.generated_at || data.generated_at || '');
  assert(Number.isFinite(generatedAt), 'health.json/data.js sans generated_at exploitable');
  assert(Date.now() - generatedAt < 2 * 60 * 60 * 1000, 'Données terrain trop anciennes', { generated_at: health.generated_at || data.generated_at });
  const dataGeneratedAt = Date.parse(data.generated_at || '');
  const healthDataAge = Number(health.data_age_min);
  const actualDataAgeMin = Number.isFinite(dataGeneratedAt) ? Math.max(0, Math.round((Date.now() - dataGeneratedAt) / 60000)) : null;
  if (actualDataAgeMin !== null && actualDataAgeMin <= 10) {
    assert(Number.isFinite(healthDataAge) && healthDataAge <= 30, 'Terrain: health.json annonce une donnée vieille alors que data.js est frais', {
      data_generated_at: data.generated_at,
      actualDataAgeMin,
      health_data_age_min: health.data_age_min,
      health_data_file_age_min: health.data_file_age_min
    });
  }

  const engine = createLegacyEngineService({ projectRoot: root });
  const analysis = engine.getAnalysis({ bankroll: 50, force: true });
  const dashboard = analysis.dashboardPicks || [];
  const todayFunnel = analysis.todayFunnel?.today || {};
  const coverage = analysis.coverage24h?.summary || {};
  assert(analysis.terrainReportV2?.schema === 'paris-sportif.terrain_report.v2', 'Terrain: rapport v2 absent', analysis.terrainReportV2);
  assert(analysis.sourceHealthV5?.schema === 'paris-sportif.source_health.v5', 'Terrain: santé sources v5 absente', analysis.sourceHealthV5);
  assert(analysis.terrainReportV3?.schema === 'paris-sportif.terrain_report.v3', 'Terrain: rapport v3 absent', analysis.terrainReportV3);
  assert(analysis.sourceHealthV6?.schema === 'paris-sportif.source_health.v6', 'Terrain: santé sources v6 absente', analysis.sourceHealthV6);
  assert(analysis.modelBacktestV4?.schema === 'paris-sportif.model_backtest.v4', 'Terrain: backtest modèle v4 absent', analysis.modelBacktestV4);
  assert(analysis.terrainReportV4?.schema === 'paris-sportif.terrain_report.v4', 'Terrain: rapport v4 absent', analysis.terrainReportV4);
  assert(analysis.sourceHealthV7?.schema === 'paris-sportif.source_health.v7', 'Terrain: santé sources v7 absente', analysis.sourceHealthV7);
  assert(analysis.modelBacktestV5?.schema === 'paris-sportif.model_backtest.v5', 'Terrain: backtest modèle v5 absent', analysis.modelBacktestV5);
  assert(analysis.terrainReportV5?.schema === 'paris-sportif.terrain_report.v5', 'Terrain: rapport v5 absent', analysis.terrainReportV5);
  assert(analysis.sourceHealthV8?.schema === 'paris-sportif.source_health.v8', 'Terrain: santé sources v8 absente', analysis.sourceHealthV8);
  assert(analysis.modelBacktestV6?.schema === 'paris-sportif.model_backtest.v6', 'Terrain: backtest modèle v6 absent', analysis.modelBacktestV6);
  assert(analysis.marketCoverageV2?.schema === 'paris-sportif.market_coverage.v2', 'Terrain: couverture marchés v2 absente', analysis.marketCoverageV2);
  assert(dashboard.every((pick) => pick?.pickDecisionV3?.schema === 'paris-sportif.pick_decision.v3' && pick?.matchSheetV3?.schema === 'paris-sportif.match_sheet.v3'), 'Terrain: le cockpit contient une ligne sans contrat v3', dashboard.slice(0, 3));
  assert(dashboard.every((pick) => pick?.pickDecisionV4?.schema === 'paris-sportif.pick_decision.v4' && pick?.matchSheetV4?.schema === 'paris-sportif.match_sheet.v4'), 'Terrain: le cockpit contient une ligne sans contrat v4', dashboard.slice(0, 3));
  assert(dashboard.every((pick) => pick?.pickDecisionV5?.schema === 'paris-sportif.pick_decision.v5' && pick?.matchSheetV5?.schema === 'paris-sportif.match_sheet.v5'), 'Terrain: le cockpit contient une ligne sans contrat v5', dashboard.slice(0, 3));
  assert(dashboard.every((pick) => pick?.pickDecisionV6?.schema === 'paris-sportif.pick_decision.v6' && pick?.matchSheetV6?.schema === 'paris-sportif.match_sheet.v6'), 'Terrain: le cockpit contient une ligne sans contrat v6', dashboard.slice(0, 3));
  assert(analysis.terrainReportV3.uxChecks?.hideEmptySections === true, 'Terrain: rapport v3 ne garantit pas le masquage des sections vides', analysis.terrainReportV3.uxChecks);
  assert(analysis.terrainReportV4.quickBetSummary && Array.isArray(analysis.terrainReportV4.userVisibleBugs), 'Terrain: rapport v4 incomplet', analysis.terrainReportV4);
  assert(analysis.terrainReportV5.quickBetSummary && analysis.terrainReportV5.nightAudit && Array.isArray(analysis.terrainReportV5.actionableNextRepairs), 'Terrain: rapport v5 incomplet', analysis.terrainReportV5);
  assert(Number.isFinite(Number(analysis.sourceHealthV8.summary?.blockedReadyCount || 0)), 'Terrain: santé sources v8 sans blocages prêts', analysis.sourceHealthV8.summary);
  if (Number(coverage.nightPositive || 0) >= 6) {
    assert(Number(coverage.nightDisplayed || 0) >= Math.min(6, Number(coverage.nightPositive || 0)), 'Terrain: couverture nuit v3 insuffisante', coverage);
  }
  const now = Date.now();
  const pastDashboard = dashboard.filter((pick) => Date.parse(pick.start || pick.date || pick.kickoff || '') <= now);
  assert(pastDashboard.length === 0, 'Terrain: le cockpit expose un match déjà commencé', pastDashboard.map((pick) => ({
    title: pick.title,
    market: pick.market,
    start: pick.start
  })));
  const ticketGeneratedAt = Date.parse(v16Ticket.generated_at || '');
  const ticketReferenceTs = Number.isFinite(ticketGeneratedAt) ? ticketGeneratedAt : now;
  const expiredTicketRows = (Array.isArray(v16Ticket.rows) ? v16Ticket.rows : []).filter((row) => Date.parse(row.kickoff || '') <= ticketReferenceTs);
  assert(expiredTicketRows.length === 0, 'Terrain: ticket final V16 exposait déjà des matchs expirés au moment du calcul', expiredTicketRows.slice(0, 5).map((row) => ({
    match: row.match,
    market: row.market,
    kickoff: row.kickoff,
    status: row.v16_status,
    ticketGeneratedAt: v16Ticket.generated_at || null
  })));
  assert(dashboard.length >= 18, 'Terrain: moins de 18 opportunités simples cockpit', { count: dashboard.length });
  const positiveSimpleToday = Number(todayFunnel.positiveSimplePassingFilters ?? todayFunnel.simplePassingFilters ?? 0);
  if (Number(todayFunnel.bookableEvents || 0) >= 20 && positiveSimpleToday >= 10) {
    assert(Number(todayFunnel.displayed || 0) >= 10, 'Terrain: 10+ signaux simples positifs mais moins de 10 affichés aujourd’hui', todayFunnel);
  }
  if (Number(todayFunnel.bookableEvents || 0) >= 20 && positiveSimpleToday > 0 && positiveSimpleToday < 10) {
    const minimumVisible = Math.max(1, positiveSimpleToday - 1);
    assert(Number(todayFunnel.displayed || 0) >= minimumVisible, 'Terrain: trop de signaux simples positifs du jour sont cachés', todayFunnel);
  }
  if (Number(todayFunnel.bookableEvents || 0) >= 20 && Number(todayFunnel.simpleReady || 0) >= 5) {
    assert(Number(todayFunnel.displayed || 0) >= 5, 'Terrain: moins de 5 opportunités visibles malgré 5+ prêtes', todayFunnel);
  }

  const electronExe = path.join(desktopRoot, 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
  assert(fs.existsSync(electronExe), 'Electron introuvable', { electronExe });

  const messages = [];
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paris-sportif-terrain-'));
  const testPort = 23000 + Math.floor(Math.random() * 2000);
  const processStartedAt = Date.now();
  const app = await electron.launch({
    executablePath: electronExe,
    cwd: desktopRoot,
    acceptDownloads: true,
    env: {
      ...process.env,
      PARIS_DESKTOP_PORT: String(testPort),
      PARIS_DESKTOP_USER_DATA_DIR: userDataDir,
      PARIS_DESKTOP_TEST_ISOLATED: '1'
    },
    args: ['.']
  });
  const launchMs = Date.now() - processStartedAt;

  try {
    const windowStartedAt = Date.now();
    const win = await firstWindow(app);
    const windowMs = Date.now() - windowStartedAt;
    assert(windowMs < 10000, 'Terrain: fenêtre non créée en moins de 10s après lancement Electron', { launchMs, windowMs });
    win.on('console', (msg) => {
      if (['error', 'warning'].includes(msg.type())) messages.push(`${msg.type()}: ${msg.text()}`);
    });
    win.on('pageerror', (error) => messages.push(`pageerror: ${error.message}`));

    await win.waitForSelector('[data-panel="dashboard"].active', { timeout: 60000 });
    await win.waitForFunction(() => document.querySelector('#metric-picks')?.textContent !== '-', null, { timeout: 90000 });
    await win.waitForFunction(() => (
      (
        document.querySelector('#next-bet-card .next-bet-inner')
        && document.querySelector('#why-not-more-card')?.innerText?.trim()
        && (
          document.querySelectorAll('#home-top3-grid .home-top-card, #home-top3-grid .home-watch-card').length >= 1
          || /Aucun pari validé à miser|Top 3 incomplet/i.test(document.body.innerText || '')
        )
      )
      || /Erreur au démarrage|Données trop anciennes/i.test(document.body.innerText || '')
    ), null, { timeout: 45000 });

    await win.evaluate(() => {
      document.body.classList.add('expert-mode');
      document.querySelectorAll('[data-panel="dashboard"] > .expert-only, [data-panel="dashboard"] > .decision-terminal, [data-panel="dashboard"] > .metrics-grid, [data-panel="dashboard"] > .today-model-card').forEach((node) => {
        node.classList.remove('hidden');
      });
    });

    const dom = await win.evaluate(() => {
      const text = document.querySelector('[data-panel="dashboard"]')?.innerText || '';
      const rows = Array.from(document.querySelectorAll('#picks-body tr.clickable-row')).map((row) => row.innerText);
      const trackButtons = Array.from(document.querySelectorAll('[data-track-bet-key]')).map((btn) => btn.textContent.trim());
      const visible = (selector) => {
        const node = document.querySelector(selector);
        return node ? getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden' : false;
      };
      const expertLeakSelectors = [
        '.tab-panel[data-panel="dashboard"].active > .morning-brief',
        '.tab-panel[data-panel="dashboard"].active > .metrics-grid',
        '.tab-panel[data-panel="dashboard"].active > .today-model-card',
        '.tab-panel[data-panel="dashboard"].active > .decision-terminal',
        '.tab-panel[data-panel="dashboard"].active > #market-scanner-section',
        '.tab-panel[data-panel="dashboard"].active > #custom-dashboard'
      ];
      return {
        title: document.querySelector('#page-title')?.textContent || '',
        metric: Number(document.querySelector('#metric-picks')?.textContent || 0),
        rows: rows.length,
        timeline: document.querySelectorAll('#simple-pick-timeline .simple-timeline-card').length,
        trackButtons,
        trackButtonCount: trackButtons.length,
        alertText: document.querySelector('#today-funnel-alert')?.innerText || '',
        readyHeroText: document.querySelector('#ready-picks-hero')?.innerText || '',
        readyHeroDisplay: getComputedStyle(document.querySelector('#ready-picks-hero')).display,
        homeShellDisplay: getComputedStyle(document.querySelector('#betting-home-v2')).display,
        nextBetText: document.querySelector('#next-bet-card')?.innerText || '',
        homeTop3Count: document.querySelectorAll('#home-top3-grid .home-top-card').length,
        homeWatchCount: document.querySelectorAll('#home-top3-grid .home-watch-card').length,
        homeTopMarkets: Array.from(document.querySelectorAll('#home-top3-grid .home-top-card, #home-top3-grid .home-watch-card')).map((node) => node.dataset.homeMarket || ''),
        homeTopCards: Array.from(document.querySelectorAll('#home-top3-grid .home-top-card, #home-top3-grid .home-watch-card')).map((node) => node.innerText || ''),
        homeTableRows: document.querySelectorAll('#home-picks-table-body tr.clickable-row').length,
        homeTableMarkets: Array.from(document.querySelectorAll('#home-picks-table-body tr.clickable-row')).map((node) => node.dataset.homeMarket || ''),
        homeTableReadyMarkets: Array.from(document.querySelectorAll('#home-picks-table-body tr.clickable-row'))
          .filter((node) => /Je mise/i.test(node.innerText || ''))
          .map((node) => node.dataset.homeMarket || ''),
        homeSortButtons: Array.from(document.querySelectorAll('[data-home-sort]')).map((node) => node.textContent.trim()),
        homeCategoryCount: document.querySelectorAll('[data-cockpit-category]').length,
        homeCategoryTexts: Array.from(document.querySelectorAll('[data-cockpit-category]')).map((node) => node.innerText || ''),
        cockpitOpen: Boolean(document.querySelector('#cockpit-detail-section')?.open),
        cockpitDisplay: getComputedStyle(document.querySelector('#cockpit-detail-section')).display,
        cockpitSummary: document.querySelector('#cockpit-detail-section > summary')?.innerText || '',
        liveDisplay: getComputedStyle(document.querySelector('#live-cockpit')).display,
        stakeScenarioDisplay: getComputedStyle(document.querySelector('.compact-advanced')).display,
        expertHomeLeaks: expertLeakSelectors.filter((selector) => visible(selector)),
        dashboardText: text,
        liveText: document.querySelector('#live-cockpit')?.innerText || '',
        sideStatus: document.querySelector('#side-status')?.innerText || '',
        hasActionCopy: /PARI/i.test(text) && /COTE/i.test(text) && /MISE/i.test(text),
        hasStartedButton: trackButtons.some((label) => /déjà commencé/i.test(label)),
        hiddenAdvancedVisible: Boolean(document.querySelector('[data-tab="data"]:not(.hidden)')),
        nav: Array.from(document.querySelectorAll('.nav-btn:not(.hidden)')).map((node) => {
          const label = node.querySelector('.nav-label');
          return (label ? label.textContent : node.textContent).trim();
        })
      };
    });
    assert(/Aujourd|Picks|Paris|miser/i.test(dom.title), 'Terrain: la vue principale ne s’ouvre pas par défaut', dom);
    assert(/Prochain pari sérieux|Aucun spot exploitable/i.test(dom.nextBetText), 'Terrain: bloc prochain pari sérieux absent', dom);
    assert(!/@@\d/i.test(dom.dashboardText), 'Terrain: cote affichée avec double @', dom.dashboardText.match(/@@.{0,12}/g));
    assert(!(dom.trackButtonCount > 0 && /Aucun pari prêt aujourd’hui/i.test(dom.alertText)), 'Terrain: bannière 0 prêt contradictoire avec des boutons de mise', {
      alertText: dom.alertText,
      trackButtons: dom.trackButtons.slice(0, 5),
      readyHeroText: dom.readyHeroText.slice(0, 500)
    });
    // Sprint 51 : on vérifie la présence des labels-clés, pas l'ordre exact.
    const requiredNavLabels = ['aujourd', 'football', 'semaine', 'vainqueurs', 'buts', 'nuit', 'buteurs', 'combinés', 'surveiller', 'bilan', 'perdu', 'recherche', 'réglages'];
    const navLabels = dom.nav.map((l) => l.toLowerCase());
    const missingNav = requiredNavLabels.filter((label) => !navLabels.some((nav) => nav.includes(label)));
    assert(missingNav.length === 0, 'Terrain: navigation Parieur First incomplète', { missingNav, nav: dom.nav });
    assert(dom.nav.length <= 18, 'Terrain: navigation trop longue malgré les pages dédiées', { nav: dom.nav });
    assert(dom.homeShellDisplay !== 'none' && (dom.homeTop3Count + dom.homeWatchCount) >= 1, 'Terrain: accueil rapide sans spot visible', dom);
    const expectedTopCount = Math.min(3, dom.homeTableReadyMarkets.length);
    assert(dom.homeShellDisplay !== 'none' && (dom.homeTop3Count + dom.homeWatchCount) >= expectedTopCount && dom.homeSortButtons.length >= 4, 'Terrain: nouvel accueil Top 3 absent ou cassé', dom);
    assert(!dom.homeTopCards.some((text) => /Observation|Écarté|(?:^|\n)\s*(?:Mise\s*)?0(?:[,.]00)?\s*€/i.test(text)), 'Terrain: Top 3 contient une ligne cassée ou à mise nulle', dom.homeTopCards);
    assert(dom.homeTopCards.every((text) => /Je mise|À surveiller/i.test(text)), 'Terrain: Top 3 sans action claire', dom.homeTopCards);
    const tableMarketCount = new Set(dom.homeTableReadyMarkets.filter(Boolean)).size;
    const topMarketCount = new Set(dom.homeTopMarkets.filter(Boolean)).size;
    assert(tableMarketCount <= 1 || topMarketCount >= 2, 'Terrain: Top 3 trop monotone malgré plusieurs marchés prêts', { top: dom.homeTopMarkets, tableReady: dom.homeTableReadyMarkets, table: dom.homeTableMarkets });
    assert(dom.homeCategoryCount === 0, 'Terrain: catégories rendues sur l’accueil standard alors qu’elles ont leurs pages dédiées', dom);
    assert(!dom.cockpitOpen, 'Terrain: Cockpit détaillé ouvert par défaut, accueil trop chargé', dom);
    assert(dom.cockpitDisplay === 'none' && dom.readyHeroDisplay === 'none' && dom.liveDisplay === 'none' && dom.stakeScenarioDisplay === 'none', 'Terrain: accueil encore surchargé par des blocs secondaires', dom);
    assert(dom.expertHomeLeaks.length === 0, 'Terrain: le Mode expert pollue encore l’accueil À miser', dom.expertHomeLeaks);
    assert(!/Modèle aujourd'hui|Conseils du jour|Décision finale locale/i.test(dom.dashboardText), 'Terrain: blocs diagnostic visibles sur l’accueil rapide', dom.dashboardText.slice(0, 1800));
    assert(!/Écouter le brief|brief audio|SpeechSynthesis|TTS/i.test(dom.dashboardText), 'Terrain: brief audio revenu dans le parcours standard', dom.dashboardText.slice(0, 1800));
    assert(/Cockpit pronostics/i.test(dom.cockpitSummary), 'Terrain: catégorie Cockpit pronostics absente côté expert/catégories', dom);
    if (Number(todayFunnel.bookableEvents || 0) >= 30 && Number(todayFunnel.displayed || 0) < 10 && dom.trackButtonCount < 1) {
      assert(/trop strict|modèle trop strict/i.test(dom.alertText), 'Terrain: le garde-fou trop strict n’est pas visible', { todayFunnel, alertText: dom.alertText });
    }
    assert(dom.hasActionCopy, 'Terrain: format PARI/COTE/MISE absent', dom);
    assert(!/PARI\s*:?\s*Match nul/i.test(dom.dashboardText), 'Terrain: Match nul visible dans le cockpit standard', dom.dashboardText.slice(0, 1200));
    assert(!/À réparer/i.test(dom.dashboardText), 'Terrain: libellé expert "À réparer" visible dans le cockpit standard', dom.dashboardText.slice(0, 1200));
    assert(!/STATUS_SCHEDULED|LIVE estimé|live estimé/i.test(dom.liveText), 'Terrain: faux live détecté sur statut programmé', dom.liveText);
    assert(!dom.hasStartedButton, 'Terrain: bouton actionnable pour match déjà commencé', dom);
    assert(!dom.hiddenAdvancedVisible, 'Terrain: Avancé visible sans Mode expert', dom);

    await clickTabAndWait(win, 'combines', 'combines', '#combines-list');
    const combinesAudit = await win.evaluate(() => {
      const text = document.querySelector('[data-panel="combines"]')?.innerText || '';
      return {
        cards: document.querySelectorAll('#combines-list .combo-card').length,
        focus: document.querySelector('#combines-focus-card')?.innerText || '',
        text,
        hasAdvanced: /Handicap|Remboursé|Double chance|Score exact|HT\/FT|\b1N2\b|\bDNB\b|\bBTTS\b|Same-game|Best Edge|Kelly|edge/i.test(text)
      };
    });
    assert(/Meilleur combiné|Aucun combiné sain/i.test(combinesAudit.focus), 'Terrain: page Combinés sans résumé parieur en haut', combinesAudit.focus);
    assert(!(combinesAudit.cards && combinesAudit.hasAdvanced), 'Terrain: Combinés standard trop techniques', combinesAudit.text.slice(0, 1400));

    await clickTabAndWait(win, 'scorers', 'scorers', '#scorers-focus-card');
    const scorersAudit = await win.evaluate(() => ({
      focus: document.querySelector('#scorers-focus-card')?.innerText || '',
      cards: document.querySelectorAll('#scorers-list .scorer-card').length,
      text: document.querySelector('[data-panel="scorers"]')?.innerText || ''
    }));
    assert(/Meilleur buteur|Aucun buteur propre/i.test(scorersAudit.focus), 'Terrain: page Buteurs sans résumé parieur en haut', scorersAudit.focus);

    await win.locator('[data-tab="dashboard"]:visible').first().click();
    await win.waitForFunction(() => Boolean(document.querySelector('[data-panel="dashboard"].active')), null, { timeout: 10_000 });

    const winnerCategory = win.locator('[data-cockpit-category="winner"]:visible');
    if (await winnerCategory.count()) {
      await winnerCategory.first().click();
      await win.waitForFunction(() => Boolean(document.querySelector('[data-panel="category"].active')), null, { timeout: 5000 });
      const categoryState = await win.evaluate(() => ({
        active: Boolean(document.querySelector('[data-panel="category"].active')),
        title: document.querySelector('#category-page-title')?.textContent || '',
        rows: document.querySelectorAll('#category-picks-table-body tr.clickable-row').length,
        text: document.querySelector('[data-panel="category"]')?.innerText || ''
      }));
      assert(categoryState.active && /Vainqueur/i.test(categoryState.title) && (categoryState.rows > 0 || /Aucune ligne|Aucun spot/i.test(categoryState.text)), 'Terrain: catégorie Vainqueurs n’ouvre pas sa page dédiée', categoryState);
    }

    await win.locator('[data-tab="winners"]:visible').first().click();
    await win.waitForFunction(() => Boolean(document.querySelector('[data-panel="category"].active')), null, { timeout: 5000 });
    const navCategoryState = await win.evaluate(() => ({
      active: document.querySelector('.nav-btn.active')?.dataset.tab || '',
      title: document.querySelector('#page-title')?.textContent || '',
      categoryTitle: document.querySelector('#category-page-title')?.textContent || '',
      rows: document.querySelectorAll('#category-picks-table-body tr.clickable-row').length
    }));
    assert(navCategoryState.active === 'winners' && /Vainqueurs/i.test(navCategoryState.title) && /Vainqueur/i.test(navCategoryState.categoryTitle), 'Terrain: navigation Vainqueurs dédiée cassée', navCategoryState);

    const firstMatchCard = win.locator('[data-match-id]:visible').first();
    if (await firstMatchCard.count()) {
      await firstMatchCard.click();
      await win.waitForSelector('#match-modal:not(.hidden)', { timeout: 5000 });
      const modalState = await win.evaluate(() => ({
        visibleTabs: Array.from(document.querySelectorAll('#match-modal .modal-tab')).filter((node) => getComputedStyle(node).display !== 'none').map((node) => node.textContent.trim()),
        text: document.querySelector('#match-modal')?.innerText || '',
        advancedDetailsVisible: Boolean(Array.from(document.querySelectorAll('#match-modal .detail-expert-details, #match-modal .detail-audit')).find((node) => getComputedStyle(node).display !== 'none'))
      }));
      assert(modalState.visibleTabs.length <= 3, 'Terrain: fiche match encore trop chargée en onglets', modalState.visibleTabs);
      assert(!modalState.visibleTabs.some((label) => /compos|composition|cotes avanc|signaux|timeline|modèle|h2h|face-à-face/i.test(label)), 'Terrain: onglets secondaires visibles dans la fiche rapide', modalState.visibleTabs);
      assert(!modalState.advancedDetailsVisible, 'Terrain: détails techniques visibles dans la fiche rapide', modalState);
      assert(!/\bKelly\b|Marchés détaillés|Audit technique|Vue technique/i.test(modalState.text), 'Terrain: jargon technique visible dans la fiche rapide', modalState.text.slice(0, 1800));
      await win.locator('#modal-close').click();
      await win.waitForFunction(() => document.querySelector('#match-modal')?.classList.contains('hidden'), null, { timeout: 5000 });
    }

    const visibleTrackButtons = win.locator('[data-track-bet-key]:visible');
    if (await visibleTrackButtons.count()) {
      const beforeBets = await win.evaluate(() => Object.keys(localStorage)
        .filter((key) => key.startsWith('parisSportifUserBets'))
        .reduce((sum, key) => {
          try { return sum + JSON.parse(localStorage.getItem(key) || '[]').length; } catch { return sum; }
        }, 0));
      await win.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('[data-track-bet-key]')).find((node) => {
          const style = getComputedStyle(node);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
        if (btn) btn.click();
      });
      await win.waitForFunction((before) => {
        const status = document.querySelector('#side-status')?.innerText || '';
        const count = Object.keys(localStorage)
          .filter((key) => key.startsWith('parisSportifUserBets'))
          .reduce((sum, key) => {
            try { return sum + JSON.parse(localStorage.getItem(key) || '[]').length; } catch { return sum; }
          }, 0);
        return /Pari ajouté au suivi|Pari déjà suivi|Suivi|Coach|Pause|cap|bloqu|segment|récupération/i.test(status) || count > before;
      }, beforeBets, { timeout: 5000 });
    }

    const severe = messages.filter((message) => (
      message.startsWith('error:') || message.startsWith('pageerror:')
    ) && !isIgnorableConsoleMessage(message));
    assert(severe.length === 0, 'Terrain: erreurs console pendant usage réel', severe);

    console.log(`qa:terrain OK: refresh ${skipRefresh ? 'skip' : refreshMode}, health ${health.generated_at || data.generated_at}, ${todayEvents.length} events aujourd'hui, ${todayBookable.length} Winamax, funnel ${positiveSimpleToday} signaux simples positifs -> ${todayFunnel.displayed || 0} affichés, cockpit ${dashboard.length}, coverage24h ${coverage.displayed || 0}, launch ${launchMs}ms.`);
  } finally {
    await closeElectronApp(app);
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
