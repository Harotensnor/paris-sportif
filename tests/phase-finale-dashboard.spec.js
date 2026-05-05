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
      debug: JSON.parse(document.querySelector('[data-v37-debug-panel] pre')?.textContent || '{}'),
    };
  });

  expect(state.panelText).toContain('Raisons de rejet');
  expect(state.panelText).toContain('Filtres actifs');
  expect(state.rows).toBeGreaterThanOrEqual(30);
  expect(state.emptyHelp).toBe('');
  expect(state.debug.scoreHistogram?.['50-79']?.count).toBeGreaterThan(0);
  expect(state.debug.scoreHistogram?.['<50']?.count).toBeGreaterThan(0);
  expect(state.debug.top30MarketDistinct).toBeGreaterThanOrEqual(5);
  expect(state.debug.oddsSnapshotCoverage?.pct).toBeGreaterThanOrEqual(80);
  expect(state.debug.qualityCounters?.dedupExactRemoved).toBeGreaterThanOrEqual(0);
  expect(state.debug.qualityCounters?.sameMatchContradictionsRemoved).toBeGreaterThanOrEqual(0);
  expect(logs.length).toBeGreaterThanOrEqual(1);
});

test('phase finale: dashboard quality caps score, edge and market repetition', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('paris_sportif_v36_home_filter', JSON.stringify({
        sport: '',
        tier: '',
        time: '',
        q: '',
        sort: 'tier',
        date: 'all',
        includeLive: false,
      }));
    } catch (e) {}
  });

  await page.goto('/pronostics.html?debug=1&fakeAgeMin=5#dashboard');
  await page.waitForFunction(() => (
    document.querySelectorAll('.v36-picks-table tbody .v36-table-row').length
    || document.querySelectorAll('.v36-table-cards .v36-table-card').length
  ) >= 30, null, { timeout: 20_000 });

  const state = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.v36-picks-table tbody .v36-table-row')];
    const scores = rows
      .map(row => Number(row.querySelector('.v37-opportunity')?.dataset.score || row.querySelector('.v37-opportunity')?.textContent || NaN))
      .filter(Number.isFinite);
    const edges = rows
      .map(row => Number((row.children[8]?.textContent || '').replace('%', '').replace('+', '').replace(',', '.')))
      .filter(Number.isFinite);
    const labels = rows.map(row => row.children[5]?.innerText || '');
    const ids = rows.map(row => row.getAttribute('data-big-detail') || '');
    const perMatch = ids.reduce((acc, id) => {
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {});
    return {
      rows: rows.length,
      uniqueScores: new Set(scores).size,
      highScores: scores.filter(score => score >= 80).length,
      maxScore: Math.max(...scores),
      maxEdge: Math.max(...edges),
      ht15Count: labels.filter(label => /1re mi-temps/i.test(label) && /1,5|1\.5/i.test(label)).length,
      maxPerMatch: Math.max(...Object.values(perMatch)),
      tierText: document.querySelector('.v36-table-toolbar')?.innerText || '',
    };
  });

  expect(state.rows).toBeGreaterThanOrEqual(30);
  expect(state.maxScore).toBeLessThan(100);
  expect(state.uniqueScores).toBeGreaterThan(10);
  expect(state.highScores).toBeGreaterThan(0);
  expect(state.highScores).toBeLessThanOrEqual(Math.ceil(state.rows * 0.12));
  expect(state.maxEdge).toBeLessThanOrEqual(25);
  expect(state.ht15Count).toBeLessThanOrEqual(5);
  expect(state.maxPerMatch).toBeLessThanOrEqual(2);
  expect(state.tierText).not.toContain('0 Outsider');
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

test('phase finale: dashboard auto-recovers from Theo stale stored day', async ({ page }) => {
  const dataResponse = await page.request.get('/data.js');
  const dataText = await dataResponse.text();
  const today = /"today"\s*:\s*"([^"]+)"/.exec(dataText)?.[1] || new Date().toISOString().slice(0, 10);

  await page.addInitScript(({ today }) => {
    try {
      localStorage.setItem('paris_sportif_v36_home_filter', JSON.stringify({
        sport: '',
        tier: '',
        time: '',
        q: '',
        sort: 'tier',
        date: today,
        includeLive: false,
      }));
    } catch (e) {}
  }, { today });

  await page.goto('/pronostics.html?debug=1&fakeAgeMin=397#dashboard');
  await expect(page.locator('[data-v37-debug-panel]')).toBeVisible({ timeout: 20_000 });
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
    const debug = JSON.parse(document.querySelector('[data-v37-debug-panel] pre')?.textContent || '{}');
    const rows = [...document.querySelectorAll('.v36-picks-table tbody .v36-table-row')].filter(visible);
    const cards = [...document.querySelectorAll('.v36-table-cards .v36-table-card')].filter(visible);
    return {
      debug,
      visiblePicks: Math.max(rows.length, cards.length),
      heading: document.querySelector('h1')?.textContent || '',
      filterNotice: document.querySelector('.v37-empty-pool-help.is-info')?.textContent || '',
    };
  });

  expect(state.visiblePicks).toBeGreaterThanOrEqual(30);
  expect(state.debug.activeDate).toBe('all');
  expect(['auto_all_horizon', 'localStorage']).toContain(state.debug.dateSource);
  expect(state.debug._dataAgeMin).toBeGreaterThanOrEqual(390);
  expect(state.heading).not.toContain('0 picks visibles');
});
