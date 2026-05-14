const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, expect, _electron: electron } = require('@playwright/test');

const root = path.resolve(__dirname, '..', '..');
const electronExe = path.join(root, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');

async function firstWindow(app) {
  return app.windows()[0] || app.waitForEvent('window', { timeout: 60_000 });
}

function isIgnorableConsoleMessage(message) {
  return /Failed to load resource:\s*net::ERR_(EMPTY_RESPONSE|ABORTED)/i.test(String(message || ''));
}

test('Sprint 11 desktop is simple, actionable and Winamax-only', async () => {
  const rendererText = fs.readFileSync(path.join(root, 'desktop', 'src', 'renderer', 'renderer.js'), 'utf8');
  const htmlText = fs.readFileSync(path.join(root, 'desktop', 'src', 'renderer', 'index.html'), 'utf8');
  const mainText = fs.readFileSync(path.join(root, 'desktop', 'src', 'main.js'), 'utf8');

  expect(rendererText).not.toMatch(/fetch\(\s*['"]https?:\/\//i);
  expect(htmlText).not.toMatch(/<\s*(iframe|webview)\b/i);
  expect(`${rendererText}\n${mainText}\n${htmlText}`).not.toMatch(/api\/odds|MULTI_BOOKMAKER|oddsApi|the-odds-api|Meilleure cote/i);
  expect(mainText).toContain('contextIsolation: true');
  expect(mainText).toContain('sandbox: true');
  expect(mainText).toContain('setWindowOpenHandler');
  expect(mainText).toContain("permission === 'notifications'");
  expect(rendererText).toContain('todayFunnel');
  expect(rendererText).toContain('renderSimpleTimeline');
  expect(rendererText).toContain('antiTiltStatus');
  expect(rendererText).toContain('applyExpertMode');

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paris-sportif-pw-'));
  const messages = [];
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

    await win.waitForSelector('[data-panel="dashboard"].active', { timeout: 60_000 });
    await win.waitForFunction(() => document.querySelector('#metric-picks')?.textContent !== '-', null, { timeout: 90_000 });

    const cockpit = await win.evaluate(() => ({
      title: document.querySelector('#page-title')?.textContent || '',
      nav: Array.from(document.querySelectorAll('.nav-btn:not(.hidden)')).map((node) => node.textContent.trim()),
      metric: Number(document.querySelector('#metric-picks')?.textContent || 0),
      rows: document.querySelectorAll('#picks-body tr.clickable-row').length,
      timeline: document.querySelectorAll('#simple-pick-timeline .simple-timeline-card').length,
      trackButtons: document.querySelectorAll('[data-track-bet-key]').length,
      bankroll: document.querySelector('#simple-bankroll')?.textContent || '',
      pnl: document.querySelector('#simple-pnl')?.textContent || '',
      combines: Boolean(document.querySelector('#simple-combines-section')),
      scorers: Boolean(document.querySelector('#simple-scorers-section')),
      expertHidden: !document.querySelector('[data-tab="data"]:not(.hidden)'),
      multibookText: document.body.textContent.includes('Multi-bookmaker') || document.body.textContent.includes('Meilleure cote')
    }));
    expect(cockpit.title).toBe('Picks');
    expect(cockpit.nav).toEqual(['Picks', 'Bilan', 'Réglages']);
    expect(cockpit.metric).toBeGreaterThanOrEqual(5);
    expect(cockpit.rows).toBeGreaterThanOrEqual(5);
    expect(cockpit.timeline).toBeGreaterThanOrEqual(5);
    expect(cockpit.trackButtons).toBeGreaterThanOrEqual(5);
    expect(cockpit.bankroll).toContain('€');
    expect(cockpit.pnl).toContain('€');
    expect(cockpit.combines).toBe(true);
    expect(cockpit.scorers).toBe(true);
    expect(cockpit.expertHidden).toBe(true);
    expect(cockpit.multibookText).toBe(false);

    await win.click('[data-track-bet-key]');
    await win.waitForFunction(() => /1 en cours/.test(document.querySelector('#user-pnl-sub')?.textContent || ''), null, { timeout: 5_000 });
    await expect(win.locator('[data-track-bet-key]').first()).toContainText('Suivi');

    await win.keyboard.press('Control+2');
    await expect(win.locator('#page-title')).toHaveText('Bilan');
    await win.keyboard.press('Control+3');
    await expect(win.locator('#page-title')).toHaveText('Réglages');
    await expect(win.locator('#pref-bankroll')).toBeVisible();
    await expect(win.locator('#pref-anti-tilt-strict')).toBeVisible();
    await expect(win.locator('#pref-expert-mode')).toBeVisible();
    await expect(win.locator('#pref-multibook-enabled')).toHaveCount(0);
    await expect(win.locator('#pref-odds-api-key')).toHaveCount(0);

    await win.check('#pref-expert-mode');
    await win.click('#save-preferences-btn');
    await expect(win.locator('[data-tab="data"]:not(.hidden)')).toBeVisible();
    await win.click('[data-tab="data"]');
    await expect(win.locator('#quality-report-grid')).toBeVisible();

    await win.click('[data-tab="dashboard"]');
    await win.click('#help-panel-btn');
    await expect(win.locator('#help-panel:not(.hidden)')).toContainText('Edge');
    await win.click('#help-panel-close');
    await expect(win.locator('#help-panel')).toBeHidden();

    await win.click('#picks-body tr.clickable-row td[data-label="Match"]');
    await win.waitForSelector('#match-modal:not(.hidden)', { timeout: 10_000 });
    await expect(win.locator('#modal-content')).toContainText('Puis-je miser ?');
    await expect(win.locator('#modal-content')).toContainText('Cote Winamax');
    await expect(win.locator('#modal-content')).not.toContainText('Meilleure cote');
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
