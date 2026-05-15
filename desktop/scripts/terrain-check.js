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
  assert(dashboard.length >= 10, 'Terrain: moins de 10 opportunités simples cockpit', { count: dashboard.length });
  if (Number(todayFunnel.bookableEvents || 0) >= 20 && Number(todayFunnel.simplePassingFilters || 0) >= 10) {
    assert(Number(todayFunnel.displayed || 0) >= 10, 'Terrain: 10+ signaux simples positifs mais moins de 10 affichés aujourd’hui', todayFunnel);
  }
  if (Number(todayFunnel.bookableEvents || 0) >= 20 && Number(todayFunnel.simplePassingFilters || 0) < 10) {
    const minimumVisible = Math.max(5, Number(todayFunnel.simplePassingFilters || 0) - 1);
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
      PARIS_DESKTOP_USER_DATA_DIR: userDataDir
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
        trackButtons: trackButtons.length,
        alertText: document.querySelector('#today-funnel-alert')?.innerText || '',
        dashboardText: text,
        liveText: document.querySelector('#live-cockpit')?.innerText || '',
        sideStatus: document.querySelector('#side-status')?.innerText || '',
        hasActionCopy: /PARI/i.test(text) && /COTE/i.test(text) && /MISE/i.test(text),
        hasStartedButton: trackButtons.some((label) => /déjà commencé/i.test(label)),
        hiddenAdvancedVisible: Boolean(document.querySelector('[data-tab="data"]:not(.hidden)')),
        nav: Array.from(document.querySelectorAll('.nav-btn:not(.hidden)')).map((node) => node.textContent.trim())
      };
    });
    assert(dom.title === 'Picks', 'Terrain: la vue Picks ne s’ouvre pas par défaut', dom);
    assert(dom.nav.join('|') === 'Picks|Bilan|Recherche|Réglages', 'Terrain: navigation standard non simplifiée', dom.nav);
    assert(dom.rows >= 10 && dom.rows <= 18 && dom.timeline >= 8, 'Terrain: cockpit réel insuffisant', dom);
    if (Number(todayFunnel.bookableEvents || 0) >= 30 && Number(todayFunnel.displayed || 0) < 10) {
      assert(/trop strict|modèle trop strict/i.test(dom.alertText), 'Terrain: le garde-fou trop strict n’est pas visible', { todayFunnel, alertText: dom.alertText });
    }
    assert(dom.hasActionCopy, 'Terrain: format PARI/COTE/MISE absent', dom);
    assert(!/STATUS_SCHEDULED|LIVE estimé|live estimé/i.test(dom.liveText), 'Terrain: faux live détecté sur statut programmé', dom.liveText);
    assert(!dom.hasStartedButton, 'Terrain: bouton actionnable pour match déjà commencé', dom);
    assert(!dom.hiddenAdvancedVisible, 'Terrain: Avancé visible sans Mode expert', dom);

    const visibleTrackButtons = win.locator('[data-track-bet-key]:visible');
    if (await visibleTrackButtons.count()) {
      await visibleTrackButtons.first().click();
      await win.waitForFunction(() => /Pari ajouté au suivi|Pari déjà suivi/.test(document.querySelector('#side-status')?.innerText || ''), null, { timeout: 5000 });
    }

    const severe = messages.filter((message) => (
      message.startsWith('error:') || message.startsWith('pageerror:')
    ) && !isIgnorableConsoleMessage(message));
    assert(severe.length === 0, 'Terrain: erreurs console pendant usage réel', severe);

    console.log(`qa:terrain OK: health ${health.generated_at || data.generated_at}, ${todayEvents.length} events aujourd'hui, ${todayBookable.length} Winamax, funnel ${todayFunnel.simplePassingFilters || 0} positifs simples -> ${todayFunnel.displayed || 0} affichés, cockpit ${dashboard.length}, coverage24h ${coverage.displayed || 0}, launch ${launchMs}ms.`);
  } finally {
    await app.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
