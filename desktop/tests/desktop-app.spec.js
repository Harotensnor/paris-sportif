const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, expect, _electron: electron } = require('@playwright/test');

const root = path.resolve(__dirname, '..', '..');
const electronExe = path.join(root, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');

async function firstWindow(app) {
  return app.windows()[0] || app.waitForEvent('window', { timeout: 60_000 });
}

test('desktop cockpit is actionable and stable', async () => {
  const rendererText = fs.readFileSync(path.join(root, 'desktop', 'src', 'renderer', 'renderer.js'), 'utf8');
  const htmlText = fs.readFileSync(path.join(root, 'desktop', 'src', 'renderer', 'index.html'), 'utf8');
  const mainText = fs.readFileSync(path.join(root, 'desktop', 'src', 'main.js'), 'utf8');

  expect(rendererText).not.toMatch(/fetch\(\s*['"]https?:\/\//i);
  expect(htmlText).not.toMatch(/<\s*(iframe|webview)\b/i);
  expect(mainText).toContain('contextIsolation: true');
  expect(mainText).toContain('sandbox: true');
  expect(mainText).toContain('setWindowOpenHandler');
  expect(mainText).toContain("permission === 'notifications'");
  expect(htmlText).toContain('design-tokens.css');
  expect(rendererText).toContain('30 * 60 * 1000');
  expect(rendererText).toContain('REFRESH_URGENT_INTERVAL_MS');
  expect(rendererText).toContain('visibilitychange');
  expect(rendererText).toContain('Notification');
  expect(rendererText).toContain('scheduleBackgroundRefresh();');

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

    const dashboard = await win.evaluate(() => ({
      ready: Number(document.querySelector('#metric-picks')?.textContent || 0),
      buttons: document.querySelectorAll('[data-track-bet-key]').length,
      pnl: document.querySelector('#user-pnl-total')?.textContent || '',
      sparkline: Boolean(document.querySelector('#user-pnl-sparkline svg')),
      exportBets: Boolean(document.querySelector('#export-user-bets-btn')),
      filters: Boolean(document.querySelector('#pick-search') && document.querySelector('#pick-sort')),
      performanceMetric: document.querySelector('#metric-boot-time')?.textContent || '',
      refreshPolicy: document.querySelector('#refresh-policy')?.textContent || '',
      caption: document.querySelector('#picks-caption')?.textContent || '',
      rows: document.querySelectorAll('#picks-body tr.clickable-row').length
    }));
    expect(dashboard.ready).toBeGreaterThanOrEqual(10);
    expect(dashboard.buttons).toBeGreaterThanOrEqual(10);
    expect(dashboard.rows).toBeGreaterThanOrEqual(10);
    expect(dashboard.pnl).toContain('€');
    expect(dashboard.sparkline).toBe(true);
    expect(dashboard.exportBets).toBe(true);
    expect(dashboard.filters).toBe(true);
    expect(dashboard.performanceMetric).toMatch(/s|\.{3}/);
    expect(dashboard.refreshPolicy).toMatch(/Auto-refresh|Mode économie/);

    await win.fill('#pick-search', 'paris');
    await expect(win.locator('#picks-body')).toContainText(/Paris|Aucun pick/i);
    await win.fill('#pick-search', '');
    await win.selectOption('#pick-sort', 'kickoff');
    await expect(win.locator('#picks-body tr.clickable-row').first()).toBeVisible();
    await win.evaluate(() => document.activeElement && document.activeElement.blur());

    await win.keyboard.press('Control+2');
    await expect(win.locator('#page-title')).toHaveText('Tous les matchs');
    await win.keyboard.press('Control+3');
    await expect(win.locator('#page-title')).toHaveText('Agent');
    await win.keyboard.press('Control+4');
    await expect(win.locator('#page-title')).toHaveText('Données');
    await win.keyboard.press('Control+1');
    await expect(win.locator('#page-title')).toHaveText('Accueil');

    await win.click('[data-track-bet-key]');
    await win.waitForFunction(() => /1 en cours/.test(document.querySelector('#user-pnl-sub')?.textContent || ''), null, { timeout: 5_000 });
    await expect(win.locator('[data-track-bet-key]').first()).toContainText('Suivi');

    await win.click('#picks-body tr.clickable-row td[data-label="Match"]');
    await win.waitForSelector('#match-modal:not(.hidden)', { timeout: 10_000 });
    await expect(win.locator('#modal-content')).toContainText('Puis-je miser ?');
    await expect(win.locator('#modal-content')).toContainText('Signaux clés');
    await expect(win.locator('#modal-content')).toContainText('Audit technique');
    const overflow = await win.evaluate(() => {
      const modal = document.querySelector('#match-modal .modal');
      const content = document.querySelector('#modal-content');
      return Boolean(
        (modal && modal.scrollWidth > modal.clientWidth + 2) ||
        (content && content.scrollWidth > content.clientWidth + 2)
      );
    });
    expect(overflow).toBe(false);

    const severe = messages.filter((message) => message.startsWith('error:') || message.startsWith('pageerror:'));
    expect(severe).toEqual([]);
  } finally {
    await app.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
});
