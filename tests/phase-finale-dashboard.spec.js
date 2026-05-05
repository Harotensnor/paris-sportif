import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem('autoRefreshDoneAt', String(Date.now()));
      localStorage.setItem('cookieConsent', 'accepted');
      localStorage.setItem('paris_sportif_onboarded_v1', '1');
      localStorage.setItem('paris_sportif_onboarded_v2', '1');
      localStorage.setItem('userPrefs', JSON.stringify({
        onboardingDone: true,
        level: 'confirme',
        consentLocalStorage: 'accepted',
      }));
    } catch (e) {}
  });
});

test('phase finale: dashboard remains full when legacy filters stored "all"', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('paris_sportif_v36_home_filter', JSON.stringify({
        sport: 'all',
        tier: 'all',
        time: 'all',
        search: '',
        sort: 'tier',
        date: 'all',
        includeLive: false,
      }));
    } catch (e) {}
  });

  await page.goto('/pronostics.html#dashboard');
  await page.waitForFunction(() => {
    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const rows = [...document.querySelectorAll('.v36-picks-table tbody .v36-table-row')].filter(visible);
    const cards = [...document.querySelectorAll('.v36-table-cards .v36-table-card')].filter(visible);
    return Math.max(rows.length, cards.length) >= 30;
  }, null, { timeout: 20_000 });

  const state = await page.evaluate(() => {
    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const rows = [...document.querySelectorAll('.v36-picks-table tbody .v36-table-row')].filter(visible);
    const cards = [...document.querySelectorAll('.v36-table-cards .v36-table-card')].filter(visible);
    const picks = rows.length ? rows : cards;
    return {
      visiblePicks: picks.length,
      tones: [...new Set(picks.map(el => el.getAttribute('data-tone')).filter(Boolean))].sort(),
      legend: document.querySelector('.v37-score-legend')?.textContent || '',
      scoreTooltip: document.querySelector('.v37-opportunity, .v36-table-card__signals i[aria-label]')?.getAttribute('data-tooltip')
        || document.querySelector('.v37-opportunity, .v36-table-card__signals i[aria-label]')?.getAttribute('aria-label')
        || '',
    };
  });

  expect(state.visiblePicks).toBeGreaterThanOrEqual(30);
  expect(state.tones).toEqual(expect.arrayContaining(['safe', 'solid', 'value', 'big', 'out']));
  expect(state.legend).toContain("Score d'opportunité");
  expect(state.scoreTooltip).toContain("Score d'opportunité");
  expect(state.scoreTooltip).toContain('Décomposition');
});

test('phase finale: dashboard debug mode exposes real filtering counters', async ({ page }) => {
  const logs = [];
  page.on('console', (msg) => {
    if (msg.text().includes('[v37 debug]')) logs.push(msg.text());
  });

  await page.goto('/pronostics.html?debug=1#dashboard');
  await expect(page.locator('[data-v37-debug-panel]')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(() => {
    const panel = document.querySelector('[data-v37-debug-panel]');
    return !!panel && panel.textContent.includes('terminalScanPool') && panel.textContent.includes('v36PickPool');
  });
  await page.waitForFunction(() => {
    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const rows = [...document.querySelectorAll('.v36-picks-table tbody .v36-table-row')].filter(visible);
    const cards = [...document.querySelectorAll('.v36-table-cards .v36-table-card')].filter(visible);
    return Math.max(rows.length, cards.length) >= 30;
  }, null, { timeout: 20_000 });

  const state = await page.evaluate(() => {
    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const panel = document.querySelector('[data-v37-debug-panel]');
    const rows = [...document.querySelectorAll('.v36-picks-table tbody .v36-table-row')].filter(visible);
    const cards = [...document.querySelectorAll('.v36-table-cards .v36-table-card')].filter(visible);
    return {
      panelText: panel?.textContent || '',
      rows: Math.max(rows.length, cards.length),
      emptyHelp: document.querySelector('.v37-empty-pool-help')?.textContent || '',
    };
  });

  expect(state.panelText).toContain('Raisons de rejet');
  expect(state.panelText).toContain('Filtres actifs');
  expect(state.rows).toBeGreaterThanOrEqual(30);
  expect(state.emptyHelp).toBe('');
  expect(logs.length).toBeGreaterThanOrEqual(1);
});

test('phase finale: dashboard history date keeps past picks explicit', async ({ page }) => {
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  await page.goto(`/pronostics.html?debug=1#dashboard?date=${yesterday}`);

  await expect(page.locator('[data-v37-debug-panel]')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(() => {
    const panel = document.querySelector('[data-v37-debug-panel] pre');
    return !!panel && panel.textContent.includes('"activeDate"');
  });

  const state = await page.evaluate(() => {
    const panel = document.querySelector('[data-v37-debug-panel] pre');
    const debug = JSON.parse(panel?.textContent || '{}');
    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const rows = [...document.querySelectorAll('.v36-picks-table tbody .v36-table-row')].filter(visible);
    const cards = [...document.querySelectorAll('.v36-table-cards .v36-table-card')].filter(visible);
    return {
      debug,
      visiblePicks: Math.max(rows.length, cards.length),
      resultCells: document.querySelectorAll('.v37-result').length,
      hasHistoryFooter: !!document.querySelector('.v37-history-footer'),
      emptyHelp: document.querySelector('.v37-empty-pool-help')?.textContent || '',
    };
  });

  expect(state.debug.activeDate).toBe(yesterday);
  expect(state.debug.dateSource).toBe('url');
  expect(state.debug.historyMode).toBe(true);
  if (state.debug.v36PickPool > 0) {
    expect(state.visiblePicks).toBeGreaterThan(0);
    expect(state.resultCells).toBeGreaterThan(0);
    expect(state.hasHistoryFooter).toBe(true);
  } else {
    expect(state.emptyHelp).not.toContain('Chargement');
  }
});
