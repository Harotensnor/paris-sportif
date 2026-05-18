#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { _electron: electron } = require('playwright');

async function firstWindow(app) {
  return app.windows()[0] || app.waitForEvent('window', { timeout: 12000 });
}

async function closeElectronApp(app) {
  if (!app) return;
  try {
    await Promise.race([
      app.close(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('app.close timeout')), 4000))
    ]);
  } catch {
    const proc = typeof app.process === 'function' ? app.process() : null;
    if (proc && !proc.killed) proc.kill('SIGKILL');
  }
}

function isIgnorableConsoleMessage(message) {
  return /Failed to load resource:\s*net::ERR_(EMPTY_RESPONSE|ABORTED|NO_BUFFER_SPACE|NETWORK_CHANGED|TIMED_OUT)/i.test(String(message || ''));
}

async function main() {
  const root = path.resolve(__dirname, '..', '..');
  const desktopRoot = path.join(root, 'desktop');
  const electronExe = path.join(desktopRoot, 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
  if (!fs.existsSync(electronExe)) throw new Error(`Electron introuvable: ${electronExe}`);

  const rendererText = fs.readFileSync(path.join(desktopRoot, 'src', 'renderer', 'renderer.js'), 'utf8');
  const mainText = fs.readFileSync(path.join(desktopRoot, 'src', 'main.js'), 'utf8');
  if (/fetch\(\s*['"]https?:\/\//i.test(rendererText)) throw new Error('Fetch internet direct détecté dans le renderer');
  if (!mainText.includes("fast: '--fast'")) throw new Error('Mode Synchro rapide absent côté main process');
  if (!rendererText.includes("startRefresh(mode = 'fast'")) throw new Error('Le refresh UI par défaut ne lance pas la synchro rapide');

  const messages = [];
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paris-sportif-smoke-fast-'));
  const testPort = 25000 + Math.floor(Math.random() * 2000);
  const launchedAt = Date.now();
  const app = await electron.launch({
    executablePath: electronExe,
    cwd: desktopRoot,
    acceptDownloads: false,
    env: {
      ...process.env,
      PARIS_DESKTOP_PORT: String(testPort),
      PARIS_DESKTOP_USER_DATA_DIR: userDataDir,
      PARIS_DESKTOP_TEST_ISOLATED: '1',
      PARIS_DESKTOP_DISABLE_AUTOMATION: '1'
    },
    args: ['.']
  });

  try {
    const win = await firstWindow(app);
    win.on('console', (msg) => {
      if (['error', 'warning'].includes(msg.type())) messages.push(`${msg.type()}: ${msg.text()}`);
    });
    win.on('pageerror', (error) => messages.push(`pageerror: ${error.message}`));

    await win.waitForSelector('[data-panel="dashboard"].active', { timeout: 20000 });
    await win.waitForFunction(() => document.querySelector('#metric-picks')?.textContent !== '-', null, { timeout: 25000 });
    await win.waitForFunction(() => (
      document.querySelectorAll('#home-picks-table-body tr.clickable-row').length >= 3
      || /Erreur au démarrage|Données trop anciennes/i.test(document.body.innerText || '')
    ), null, { timeout: 15000 });

    const home = await win.evaluate(() => ({
      title: document.querySelector('#page-title')?.textContent || '',
      refreshLabel: document.querySelector('#refresh-btn')?.textContent || '',
      rows: document.querySelectorAll('#home-picks-table-body tr.clickable-row').length,
      topCards: document.querySelectorAll('#home-top3-grid .home-top-card').length,
      categories: document.querySelectorAll('[data-cockpit-category]').length,
      nav: Array.from(document.querySelectorAll('.nav-btn:not(.hidden)')).map((node) => node.innerText.trim()),
      dashboardText: document.querySelector('[data-panel="dashboard"]')?.innerText || '',
      standardExpertVisible: Boolean(document.querySelector('[data-tab="data"]:not(.hidden)'))
    }));
    if (!/Picks|Paris|miser/i.test(home.title)) throw new Error(`Vue par défaut invalide: ${home.title}`);
    if (!/Synchro rapide/i.test(home.refreshLabel)) throw new Error(`Bouton refresh non raccourci: ${home.refreshLabel}`);
    const protectedNoBet = /Aucun pari validé|0\s+Je mise|Pas de mise recommandée/i.test(home.dashboardText);
    if (home.rows < 3 || (!protectedNoBet && home.topCards < 1) || home.categories < 6) {
      throw new Error(`Accueil rapide incomplet: ${JSON.stringify(home)}`);
    }
    if (home.standardExpertVisible) throw new Error('Mode expert visible en standard');
    if (/Écouter le brief|brief audio|SpeechSynthesis|TTS|Meilleure cote|Multi-bookmaker/i.test(home.dashboardText)) {
      throw new Error(`Texte indésirable sur accueil: ${home.dashboardText.slice(0, 900)}`);
    }

    await win.locator('[data-tab="recovery"]:visible').first().click();
    await win.waitForSelector('[data-panel="recovery"].active #recovery-summary-grid', { timeout: 8000 });
    const recovery = await win.evaluate(() => ({
      postDay: Boolean(document.querySelector('#recovery-postday-grid')),
      missedSignals: Boolean(document.querySelector('#recovery-missed-signals-grid')),
      durableFamilies: Boolean(document.querySelector('#recovery-durable-family-grid')),
      text: document.querySelector('[data-panel="recovery"]')?.innerText || ''
    }));
    if (!recovery.postDay || !recovery.missedSignals || !recovery.durableFamilies || !/Ce que le modèle aurait dû voir|Familles durables/i.test(recovery.text)) {
      throw new Error(`Page récupération incomplète: ${JSON.stringify(recovery).slice(0, 900)}`);
    }
    await win.locator('[data-tab="preferences"]:visible').first().click();
    await win.waitForSelector('#pref-bankroll', { timeout: 8000 });

    const severe = messages.filter((message) => (
      message.startsWith('error:') || message.startsWith('pageerror:')
    ) && !isIgnorableConsoleMessage(message));
    if (severe.length) throw new Error(`Erreurs console: ${severe.join(' | ')}`);
    console.log(`Desktop fast smoke OK: accueil ${home.rows} lignes, ${home.topCards} top, ${home.categories} catégories, boot ${Date.now() - launchedAt}ms.`);
  } finally {
    await closeElectronApp(app);
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
