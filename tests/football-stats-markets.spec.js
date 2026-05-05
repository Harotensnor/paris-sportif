import { test, expect } from '@playwright/test';

test('football stats markets cover corners cards and fouls in detail modal', async ({ page }) => {
  await page.goto('/pronostics.html?debug=1');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && window.TOTAL_CORNERS && window.TOTAL_CARDS && window.TOTAL_FOULS && window.getFootballStatsMarkets, null, { timeout: 15000 });

  const state = await page.evaluate(async () => {
    if (typeof window._ensureFullData === 'function') {
      try { await window._ensureFullData(); } catch (e) {}
    }
    const matches = Object.values(window.PRONOSTICS_DATA.days || {}).flat().filter(Boolean);
    const football = matches.find(m => {
      const stats = window.getFootballStatsMarkets(m);
      const pred = window.predictMatch(m);
      return m?.sport === 'football' && pred?.markets && stats?.corners?.rows?.length && stats?.cards?.rows?.length && stats?.fouls?.rows?.length;
    });
    const stats = football ? window.getFootballStatsMarkets(football) : null;
    if (football && typeof window.openDetail === 'function') window.openDetail(football);
    return {
      cornersEvents: window.TOTAL_CORNERS?.event_count || 0,
      cardsEvents: window.TOTAL_CARDS?.event_count || 0,
      foulsEvents: window.TOTAL_FOULS?.event_count || 0,
      hasFootball: !!football,
      cornersRows: stats?.corners?.rows?.length || 0,
      cardsRows: stats?.cards?.rows?.length || 0,
      foulsRows: stats?.fouls?.rows?.length || 0,
      modalText: document.querySelector('[data-market-panel="football-stats"]')?.textContent || '',
    };
  });

  expect(state.cornersEvents).toBeGreaterThanOrEqual(30);
  expect(state.cardsEvents).toBeGreaterThanOrEqual(30);
  expect(state.foulsEvents).toBeGreaterThanOrEqual(30);
  expect(state.hasFootball).toBe(true);
  expect(state.cornersRows).toBeGreaterThanOrEqual(4);
  expect(state.cardsRows).toBeGreaterThanOrEqual(4);
  expect(state.foulsRows).toBeGreaterThanOrEqual(3);
  expect(state.modalText).toContain('Marchés stats');
  expect(state.modalText).toContain('Corners');
  expect(state.modalText).toContain('Cartons');
  expect(state.modalText).toContain('Fautes');
});
