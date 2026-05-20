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
  if (!mainText.includes("instant: '--instant'")) throw new Error('Mode Synchro instant absent côté main process');
  if (!mainText.includes("fast: '--fast'")) throw new Error('Mode Synchro rapide absent côté main process');
  if (!rendererText.includes("startRefresh(mode = 'instant'")) throw new Error('Le refresh UI par défaut doit lancer la synchro instant');

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

    await win.waitForFunction(() => Boolean(document.querySelector('[data-panel="dashboard"].active')), null, { timeout: 20000 });
    await win.waitForFunction(() => document.querySelector('#metric-picks')?.textContent !== '-', null, { timeout: 25000 });
    await win.waitForFunction(() => (
      document.querySelector('#next-bet-card .next-bet-inner')
      && document.querySelector('#why-not-more-card')?.innerText?.trim()
      && (() => {
        const top = document.querySelector('#home-top3-grid');
        const topText = top?.innerText || '';
        return top?.querySelectorAll('.home-top-card, .home-watch-card').length >= 1
          || /Aucun spot exploitable|Erreur au démarrage|Données trop anciennes/i.test(topText);
      })()
    ), null, { timeout: 30000 });
    const homeReadyMs = Date.now() - launchedAt;

    const home = await win.evaluate(() => ({
      title: document.querySelector('#page-title')?.textContent || '',
      refreshLabel: document.querySelector('#refresh-btn')?.textContent || '',
      rows: document.querySelectorAll('#home-picks-table-body tr.clickable-row').length,
      nextBetText: document.querySelector('#next-bet-card')?.innerText || '',
      whyNotMoreText: document.querySelector('#why-not-more-card')?.innerText || '',
      topGridText: document.querySelector('#home-top3-grid')?.innerText || '',
      topCards: document.querySelectorAll('#home-top3-grid .home-top-card').length,
      watchCards: document.querySelectorAll('#home-top3-grid .home-watch-card').length,
      categories: document.querySelectorAll('[data-cockpit-category]').length,
      tableCollapsed: document.querySelector('.home-table-card')?.open === false,
      categoriesCollapsed: document.querySelector('.home-categories-panel')?.open === false,
      visibleHomePanels: Array.from(document.querySelectorAll('[data-panel="dashboard"].active > *'))
        .filter((node) => getComputedStyle(node).display !== 'none')
        .map((node) => node.id || node.className || node.tagName),
      nav: Array.from(document.querySelectorAll('.nav-btn:not(.hidden)')).map((node) => node.innerText.trim()),
      dashboardText: document.querySelector('[data-panel="dashboard"]')?.innerText || '',
      standardExpertVisible: Boolean(document.querySelector('[data-tab="data"]:not(.hidden)'))
    }));
    if (!/Aujourd|Picks|Paris|miser/i.test(home.title)) throw new Error(`Vue par défaut invalide: ${home.title}`);
    if (!/Synchro instant/i.test(home.refreshLabel)) throw new Error(`Bouton refresh non instantané: ${home.refreshLabel}`);
    if (!/Prochain pari sérieux|Aucun spot exploitable/i.test(home.nextBetText)) {
      throw new Error(`Bloc prochain pari sérieux absent: ${home.nextBetText.slice(0, 300)}`);
    }
    if (!/Pourquoi pas plus/i.test(home.whyNotMoreText)) {
      throw new Error(`Bloc Pourquoi pas plus absent: ${home.whyNotMoreText.slice(0, 300)}`);
    }
    const topEmptyAllowed = /Aucun spot exploitable|Erreur au démarrage|Données trop anciennes/i.test(home.topGridText);
    if ((!home.topCards && !home.watchCards && !topEmptyAllowed)) {
      throw new Error(`Accueil rapide incomplet: ${JSON.stringify(home)}`);
    }
    if (home.visibleHomePanels.some((name) => /home-category-grid|home-categories-panel|home-table-card/i.test(String(name)))) {
      throw new Error(`Accueil trop chargé: tableau/catégories ne doivent pas être visibles ${JSON.stringify(home.visibleHomePanels)}`);
    }
    if (home.standardExpertVisible) throw new Error('Mode expert visible en standard');
    if (/Écouter le brief|brief audio|SpeechSynthesis|TTS|Meilleure cote|Multi-bookmaker/i.test(home.dashboardText)) {
      throw new Error(`Texte indésirable sur accueil: ${home.dashboardText.slice(0, 900)}`);
    }

    await win.evaluate(() => document.querySelector('[data-tab="football"]')?.click());
    await win.waitForFunction(() => (
      document.querySelector('[data-panel="category"].active')
      && (
        document.querySelectorAll('#category-picks-table-body tr.clickable-row').length >= 1
        || /Aucune ligne|Aucun spot/i.test(document.querySelector('[data-panel="category"]')?.innerText || '')
      )
    ), null, { timeout: 12000 });
    const cockpit = await win.evaluate(() => ({
      rows: document.querySelectorAll('#category-picks-table-body tr.clickable-row').length,
      top: document.querySelectorAll('#category-top3-grid .home-top-card, #category-top3-grid .home-watch-card').length,
      text: document.querySelector('[data-panel="category"]')?.innerText || ''
    }));
    if (cockpit.rows < 1 && !/Aucune ligne|Aucun spot/i.test(cockpit.text)) {
      throw new Error(`Page catégorie Football non rendue après clic: ${JSON.stringify(cockpit).slice(0, 900)}`);
    }

    // Le smoke rapide reste volontairement court : les pages lourdes
    // (Récupération/Bilan/Avancé) sont couvertes par le smoke complet.
    await win.evaluate(() => document.querySelector('[data-tab="preferences"]')?.click());
    await win.waitForSelector('#pref-bankroll', { timeout: 8000 });

    const severe = messages.filter((message) => (
      message.startsWith('error:') || message.startsWith('pageerror:')
    ) && !isIgnorableConsoleMessage(message));
    if (severe.length) throw new Error(`Erreurs console: ${severe.join(' | ')}`);
    const visibleSpots = home.topCards + home.watchCards;
    console.log(`Desktop fast smoke OK: accueil ${visibleSpots} spot(s) visibles (${home.topCards} prêts, ${home.watchCards} à surveiller), ${home.categories} catégorie(s) cachée(s), prêt ${homeReadyMs}ms, parcours ${Date.now() - launchedAt}ms.`);
  } finally {
    await closeElectronApp(app);
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
