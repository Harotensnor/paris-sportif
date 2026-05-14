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
  expect(mainText).toContain('process.memoryUsage()');
  expect(htmlText).toContain('design-tokens.css');
  expect(rendererText).toContain('30 * 60 * 1000');
  expect(rendererText).toContain('5 * 60 * 1000');
  expect(rendererText).toContain('REFRESH_URGENT_INTERVAL_MS');
  expect(rendererText).toContain('visibilitychange');
  expect(rendererText).toContain('Notification');
  expect(rendererText).toContain('scheduleBackgroundRefresh();');
  expect(rendererText).toContain('renderHelp');
  expect(rendererText).toContain('renderCalendar');
  expect(rendererText).toContain('sendExternalAlert');
  expect(rendererText).toContain('autoSettleUserBets');
  expect(rendererText).toContain('settlementEligibility');
  expect(rendererText).toContain('ultimateBetCandidate');
  expect(rendererText).toContain('renderTemporalCockpit');
  expect(rendererText).toContain('trackScorerBet');
  expect(rendererText).toContain('aiAssist');
  expect(rendererText).toContain('WEB_ENRICHMENT_KEY');
  expect(rendererText).toContain('openFocusMode');
  expect(rendererText).toContain('showLossFeedbackPrompt');
  expect(rendererText).toContain('MODEL_ADJUSTMENTS_KEY');
  expect(rendererText).toContain('coachDecisionForBet');
  expect(rendererText).toContain('applyImportedProfile');
  expect(rendererText).toContain("'/api/webhook/send'");
  expect(mainText).toContain('/api/webhook/send');
  expect(mainText).toContain('/api/webhook/log');
  expect(mainText).toContain('/api/profile/backup');
  expect(mainText).toContain('/api/ai/assist');
  expect(mainText).toContain('/api/ai/enrich');
  expect(mainText).toContain('/api/update/check');
  expect(mainText).toContain('/api/refresh/cancel');

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
      filters: Boolean(document.querySelector('#pick-search') && document.querySelector('#pick-sort') && document.querySelector('#pick-market-filter')),
      morning: Boolean(document.querySelector('#morning-brief') && document.querySelector('#morning-grid .morning-card')),
      ultimate: Boolean(document.querySelector('#ultimate-bet-card')),
      timeSections: document.querySelectorAll('#time-cockpit .time-section').length,
      focusButtons: document.querySelectorAll('[data-focus-pick-key]').length,
      marketChips: document.querySelectorAll('#market-snapshot .market-chip, #market-snapshot .empty').length,
      performanceMetric: document.querySelector('#metric-boot-time')?.textContent || '',
      refreshPolicy: document.querySelector('#refresh-policy')?.textContent || '',
      caption: document.querySelector('#picks-caption')?.textContent || '',
      rows: document.querySelectorAll('#picks-body tr.clickable-row').length
    }));
    expect(dashboard.ready).toBeGreaterThanOrEqual(10);
    expect(dashboard.buttons).toBeGreaterThanOrEqual(20);
    expect(dashboard.rows).toBeGreaterThanOrEqual(20);
    expect(dashboard.pnl).toContain('€');
    expect(dashboard.sparkline).toBe(true);
    expect(dashboard.exportBets).toBe(true);
    expect(dashboard.filters).toBe(true);
    expect(dashboard.morning).toBe(true);
    expect(dashboard.ultimate).toBe(true);
    expect(dashboard.timeSections).toBe(5);
    expect(dashboard.focusButtons).toBeGreaterThan(0);
    expect(dashboard.marketChips).toBeGreaterThan(0);
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
    await win.click('[data-tab="history"]');
    await expect(win.locator('#model-performance-grid')).toContainText('ROI');
    await expect(win.locator('#model-performance-grid')).toContainText('CLV');
    await expect(win.locator('#learning-audit-grid')).toBeVisible();
    await expect(win.locator('#user-bets-body')).toBeVisible();
    await win.click('[data-tab="preferences"]');
    await expect(win.locator('#pref-bankroll')).toBeVisible();
    await expect(win.locator('#pref-stake-mode')).toBeVisible();
    await expect(win.locator('#pref-webhook-url')).toBeVisible();
    await expect(win.locator('#pref-coach-enabled')).toBeVisible();
    await expect(win.locator('#pref-ai-enabled')).toBeVisible();
    await expect(win.locator('#pref-ai-provider')).toBeVisible();
    await expect(win.locator('#pref-web-enrichment-enabled')).toBeVisible();
    await expect(win.locator('#test-web-enrichment-btn')).toBeVisible();
    await expect(win.locator('#pref-auto-update-enabled')).toBeVisible();
    await expect(win.locator('#check-update-btn')).toBeVisible();
    await expect(win.locator('#export-profile-btn')).toBeVisible();
    await expect(win.locator('#import-profile-btn')).toBeVisible();
    await expect(win.locator('#preference-warning-grid')).toBeVisible();
    await win.evaluate(() => {
      document.querySelector('#pref-webhook-url').value = `${window.location.origin}/api/webhook/test`;
    });
    await win.click('#test-webhook-btn');
    await expect(win.locator('#webhook-status')).toContainText(/Webhook test|Webhook en erreur|URL webhook/i);
    await win.click('#test-webhook-suite-btn');
    await expect(win.locator('#webhook-status')).toContainText(/notifications critiques|Webhook en erreur|URL webhook/i);
    await win.click('#test-web-enrichment-btn');
    await expect(win.locator('#side-status')).toContainText(/Enrichissement|Aucun pick/i);
    await win.click('[data-tab="help"]');
    await expect(win.locator('#glossary-grid')).toContainText('CLV');
    await expect(win.locator('#glossary-grid')).toContainText('Kelly');
    await win.click('[data-tab="calendar"]');
    await expect(win.locator('#calendar-grid .calendar-day').first()).toBeVisible();
    await win.click('#calendar-grid .calendar-day');
    await expect(win.locator('#page-title')).toHaveText('Accueil');
    await win.click('[data-tab="pipeline"]');
    await expect(win.locator('#pipeline-progress')).toBeVisible();
    await expect(win.locator('#web-enrichment-summary')).toBeVisible();
    await expect(win.locator('#pipeline-live-log')).toBeVisible();
    await win.keyboard.press('Control+Shift+L');
    await expect(win.locator('#log-drawer:not(.hidden)')).toBeVisible();
    await win.click('#log-drawer-close');
    await win.keyboard.press('Control+1');
    await expect(win.locator('#page-title')).toHaveText('Accueil');

    await win.click('[data-tab="scorers"]');
    await expect(win.locator('#scorer-search')).toBeVisible();
    await expect(win.locator('#scorer-sort')).toBeVisible();
    await expect(win.locator('[data-track-scorer-id]').first()).toBeVisible();
    await win.click('[data-tab="dashboard"]');

    await win.click('[data-track-bet-key]');
    await win.waitForFunction(() => /1 en cours/.test(document.querySelector('#user-pnl-sub')?.textContent || ''), null, { timeout: 5_000 });
    await expect(win.locator('[data-track-bet-key]').first()).toContainText('Suivi');
    await win.click('[data-tab="history"]');
    await expect(win.locator('#auto-settlement-grid')).toBeVisible();
    await expect(win.locator('#model-self-audit-grid')).toBeVisible();
    await expect(win.locator('#personal-insights-grid')).toBeVisible();
    await win.fill('[data-bet-tags-id]', 'favori, test');
    await win.fill('[data-bet-note-id]', 'Pari suivi pendant le test complet.');
    await win.locator('[data-bet-note-id]').blur();
    await expect(win.locator('#user-bets-tag-filter')).toContainText('favori');
    await win.selectOption('#user-bets-tag-filter', 'favori');
    await expect(win.locator('#user-bets-body')).toContainText('Pari suivi pendant le test complet.');
    await win.click('[data-settle-status="won"]');
    await expect(win.locator('#user-bets-body')).toContainText('Gagné');
    await win.click('[data-tab="dashboard"]');
    await win.locator('[data-focus-pick-key]').first().click();
    await expect(win.locator('#focus-overlay:not(.hidden)')).toBeVisible();
    await expect(win.locator('#focus-ticket')).toContainText(/@|mise/i);
    await win.click('#focus-close-top');
    await expect(win.locator('#focus-overlay')).toBeHidden();
    await win.locator('[data-panel="dashboard"].active [data-track-bet-key]').nth(1).click();
    await win.waitForFunction(() => /1 en cours/.test(document.querySelector('#user-pnl-sub')?.textContent || ''), null, { timeout: 5_000 });
    await win.click('[data-tab="history"]');
    await win.selectOption('#user-bets-tag-filter', 'all');
    await win.locator('[data-settle-status="lost"]').first().click();
    await expect(win.locator('#loss-feedback-modal:not(.hidden)')).toBeVisible();
    await win.click('[data-loss-feedback="missed_signal"]');
    await expect(win.locator('#user-bets-body')).toContainText('Feedback');
    await expect(win.locator('#learning-feedback-grid')).toContainText('Signal raté');
    await win.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('parisSportifPreferences') || '{}');
      localStorage.setItem('parisSportifPreferences', JSON.stringify({ ...raw, coachEnabled: true, dailyBetLimit: 1 }));
    });
    await win.click('[data-tab="dashboard"]');
    await win.locator('[data-track-bet-key]').nth(1).click();
    await expect(win.locator('#side-status')).toContainText(/Coach|limite/i);

    await win.evaluate(async () => {
      const archiveText = await fetch('/results_archive.jsonl', { cache: 'no-store' }).then((response) => response.text());
      const result = archiveText.split(/\r?\n/)
        .map((line) => {
          try { return JSON.parse(line); } catch { return null; }
        })
        .filter((row) => row && row.completed && Array.isArray(row.competitors) && row.competitors.some((team) => team && team.name && team.winner === true))[0];
      const winner = result.competitors.find((team) => team.winner === true);
      const older = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const future = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
      const eligibleBet = {
        id: 'auto-settle-fixture',
        key: `auto:${result.id}`,
        matchId: result.id,
        sourceEventId: result.id,
        title: result.name,
        sport: result.sport,
        league: result.league_name,
        start: result.date,
        market: '1N2',
        marketKey: '1n2',
        label: winner.name,
        odd: 2,
        openingOdd: 2,
        lastSeenOdd: 2,
        stake: 5,
        probability: 0.6,
        edge: 0.1,
        status: 'pending',
        pnl: 0,
        tags: [],
        note: '',
        day: older.slice(0, 10),
        createdAt: older
      };
      const futureBet = {
        ...eligibleBet,
        id: 'future-auto-settle-guard',
        key: `future:${result.id}`,
        start: future,
        day: future.slice(0, 10),
        createdAt: new Date().toISOString(),
        note: 'Doit rester pending avant kickoff'
      };
      const phantomBet = {
        ...futureBet,
        id: 'phantom-auto-settle-rollback',
        key: `phantom:${result.id}`,
        status: 'won',
        pnl: 5,
        settlementSource: 'auto',
        settlementReason: 'Ancien faux positif',
        note: 'Doit être annulé par le garde-fou'
      };
      localStorage.setItem('parisSportifUserBets', JSON.stringify([futureBet, phantomBet, eligibleBet]));
      location.reload();
    });
    await win.waitForSelector('[data-panel="dashboard"].active', { timeout: 60_000 });
    await win.click('[data-tab="history"]');
    await expect(win.locator('#auto-settlement-grid')).toContainText(/Résolus auto|1/);
    await expect(win.locator('#auto-settlement-grid')).toContainText(/Refusés sécurité|1/);
    await expect(win.locator('#auto-settlement-grid')).toContainText(/Fantômes annulés|1/);
    await expect(win.locator('#user-bets-body')).toContainText('Gagné');
    await expect(win.locator('#user-bets-body')).toContainText('Pending');

    await win.click('[data-tab="dashboard"]');
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
