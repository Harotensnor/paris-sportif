#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { _electron: electron } = require('playwright');
const { createLegacyEngineService } = require('../src/engine/legacy-engine');

function fail(message, details) {
  const suffix = details ? ` ${JSON.stringify(details).slice(0, 2000)}` : '';
  throw new Error(`${message}${suffix}`);
}

function assert(condition, message, details) {
  if (!condition) fail(message, details);
}

function parisDay(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(value));
}

function eventListFromDays(days) {
  const events = [];
  if (!days || typeof days !== 'object') return events;
  Object.entries(days).forEach(([dayKey, value]) => {
    const rows = Array.isArray(value) ? value : Array.isArray(value?.events) ? value.events : [];
    rows.forEach((event) => events.push({ ...event, __dayKey: dayKey }));
  });
  return events;
}

function loadDataJs(root) {
  const file = path.join(root, 'data.js');
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/window\.PRONOSTICS_DATA\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
  if (!match) fail('data.js ne contient pas window.PRONOSTICS_DATA');
  return Function(`"use strict"; return (${match[1]});`)();
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

  if (!skipRefresh) {
    await run(process.platform === 'win32' ? 'python' : 'python3', ['desktop/bin/refresh_once.py', '--full'], { cwd: root });
  }

  const data = loadDataJs(root);
  const today = parisDay();
  const events = eventListFromDays(data.days || {});
  const todayEvents = events.filter((event) => parisDay(event.date || event.startDate || event.kickoff || event.__dayKey) === today);
  const todayBookable = todayEvents.filter((event) => event?.winamax?.available === true);
  const health = JSON.parse(fs.readFileSync(path.join(root, 'health.json'), 'utf8'));
  const generatedAt = Date.parse(health.generated_at || data.generated_at || '');
  assert(Number.isFinite(generatedAt), 'health.json/data.js sans generated_at exploitable');
  assert(Date.now() - generatedAt < 2 * 60 * 60 * 1000, 'Données terrain trop anciennes', { generated_at: health.generated_at || data.generated_at });

  const engine = createLegacyEngineService({ projectRoot: root });
  const analysis = engine.getAnalysis({ bankroll: 50, force: true });
  const dashboard = analysis.dashboardPicks || [];
  const todayFunnel = analysis.todayFunnel?.today || {};
  const coverage = analysis.coverage24h?.summary || {};
  const now = Date.now();
  const pastDashboard = dashboard.filter((pick) => Date.parse(pick.start || pick.date || pick.kickoff || '') <= now);
  assert(pastDashboard.length === 0, 'Terrain: le cockpit expose un match déjà commencé', pastDashboard.map((pick) => ({
    title: pick.title,
    market: pick.market,
    start: pick.start
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
    await win.waitForTimeout(1000);

    const dom = await win.evaluate(() => {
      const text = document.querySelector('[data-panel="dashboard"]')?.innerText || '';
      const rows = Array.from(document.querySelectorAll('#picks-body tr.clickable-row')).map((row) => row.innerText);
      const trackButtons = Array.from(document.querySelectorAll('[data-track-bet-key]')).map((btn) => btn.textContent.trim());
      return {
        title: document.querySelector('#page-title')?.textContent || '',
        metric: Number(document.querySelector('#metric-picks')?.textContent || 0),
        rows: rows.length,
        timeline: document.querySelectorAll('#simple-pick-timeline .simple-timeline-card').length,
        trackButtons,
        trackButtonCount: trackButtons.length,
        alertText: document.querySelector('#today-funnel-alert')?.innerText || '',
        readyHeroText: document.querySelector('#ready-picks-hero')?.innerText || '',
        homeCategoryCount: document.querySelectorAll('[data-cockpit-category]').length,
        cockpitOpen: Boolean(document.querySelector('#cockpit-detail-section')?.open),
        cockpitSummary: document.querySelector('#cockpit-detail-section > summary')?.innerText || '',
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
    assert(/Picks|Paris|miser/i.test(dom.title), 'Terrain: la vue Picks ne s’ouvre pas par défaut', dom);
    assert(!/@@\d/i.test(dom.dashboardText), 'Terrain: cote affichée avec double @', dom.dashboardText.match(/@@.{0,12}/g));
    assert(!(dom.trackButtonCount > 0 && /Aucun pari prêt aujourd’hui/i.test(dom.alertText)), 'Terrain: bannière 0 prêt contradictoire avec des boutons de mise', {
      alertText: dom.alertText,
      trackButtons: dom.trackButtons.slice(0, 5),
      readyHeroText: dom.readyHeroText.slice(0, 500)
    });
    // Sprint 51 : on vérifie la présence des labels-clés, pas l'ordre exact.
    const requiredNavLabels = ['miser', 'bilan', 'recherche', 'réglages'];
    const navLabels = dom.nav.map((l) => l.toLowerCase());
    const missingNav = requiredNavLabels.filter((label) => !navLabels.some((nav) => nav.includes(label)));
    assert(missingNav.length === 0, 'Terrain: navigation standard non simplifiée', { missingNav, nav: dom.nav });
    assert(dom.nav.length <= 5, 'Terrain: trop d’entrées visibles dans la navigation standard', { nav: dom.nav });
    assert(dom.rows >= 15 && dom.rows <= 28 && dom.timeline >= 8, 'Terrain: cockpit réel insuffisant', dom);
    assert(dom.homeCategoryCount >= 6, 'Terrain: catégories pronostics absentes de l’accueil compact', dom);
    assert(!dom.cockpitOpen, 'Terrain: Cockpit détaillé ouvert par défaut, accueil trop chargé', dom);
    assert(/Cockpit pronostics/i.test(dom.cockpitSummary), 'Terrain: catégorie Cockpit pronostics absente', dom);
    if (Number(todayFunnel.bookableEvents || 0) >= 30 && Number(todayFunnel.displayed || 0) < 10 && dom.trackButtonCount < 1) {
      assert(/trop strict|modèle trop strict/i.test(dom.alertText), 'Terrain: le garde-fou trop strict n’est pas visible', { todayFunnel, alertText: dom.alertText });
    }
    assert(dom.hasActionCopy, 'Terrain: format PARI/COTE/MISE absent', dom);
    assert(!/PARI\s*:?\s*Match nul/i.test(dom.dashboardText), 'Terrain: Match nul visible dans le cockpit standard', dom.dashboardText.slice(0, 1200));
    assert(!/À réparer/i.test(dom.dashboardText), 'Terrain: libellé expert "À réparer" visible dans le cockpit standard', dom.dashboardText.slice(0, 1200));
    assert(!/STATUS_SCHEDULED|LIVE estimé|live estimé/i.test(dom.liveText), 'Terrain: faux live détecté sur statut programmé', dom.liveText);
    assert(!dom.hasStartedButton, 'Terrain: bouton actionnable pour match déjà commencé', dom);
    assert(!dom.hiddenAdvancedVisible, 'Terrain: Avancé visible sans Mode expert', dom);

    const winnerCategory = win.locator('[data-cockpit-category="winner"]:visible');
    if (await winnerCategory.count()) {
      await winnerCategory.first().click();
      await win.waitForFunction(() => Boolean(document.querySelector('#cockpit-detail-section')?.open), null, { timeout: 5000 });
      const categoryState = await win.evaluate(() => ({
        open: Boolean(document.querySelector('#cockpit-detail-section')?.open),
        mode: localStorage.getItem('parisSportifPicksViewMode'),
        winnerVisible: Boolean(document.querySelector('[data-time-bucket="winner"]'))
      }));
      assert(categoryState.open && categoryState.mode === 'type' && categoryState.winnerVisible, 'Terrain: catégorie Vainqueurs n’ouvre pas le Cockpit dédié', categoryState);
    }

    const visibleTrackButtons = win.locator('[data-track-bet-key]:visible');
    if (await visibleTrackButtons.count()) {
      const beforeBets = await win.evaluate(() => JSON.parse(localStorage.getItem('parisSportifUserBets') || '[]').length);
      await visibleTrackButtons.first().click();
      await win.waitForFunction((before) => {
        const status = document.querySelector('#side-status')?.innerText || '';
        const count = JSON.parse(localStorage.getItem('parisSportifUserBets') || '[]').length;
        return /Pari ajouté au suivi|Pari déjà suivi|Suivi/i.test(status) || count > before;
      }, beforeBets, { timeout: 5000 });
    }

    const severe = messages.filter((message) => (
      message.startsWith('error:') || message.startsWith('pageerror:')
    ) && !isIgnorableConsoleMessage(message));
    assert(severe.length === 0, 'Terrain: erreurs console pendant usage réel', severe);

    console.log(`qa:terrain OK: health ${health.generated_at || data.generated_at}, ${todayEvents.length} events aujourd'hui, ${todayBookable.length} Winamax, funnel ${todayFunnel.simplePassingFilters || 0} positifs simples -> ${todayFunnel.displayed || 0} affichés, cockpit ${dashboard.length}, coverage24h ${coverage.displayed || 0}, launch ${launchMs}ms.`);
  } finally {
    await closeElectronApp(app);
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
