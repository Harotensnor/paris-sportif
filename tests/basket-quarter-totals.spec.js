import { test, expect } from '@playwright/test';

test('basket quarter totals expose Q1 to Q4 projections in detail modal', async ({ page }) => {
  await page.goto('/pronostics.html?debug=1');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && window.predictMatch, null, { timeout: 15000 });

  const state = await page.evaluate(async () => {
    if (typeof window._ensureFullData === 'function') {
      try { await window._ensureFullData(); } catch (e) {}
    }
    const matches = Object.values(window.PRONOSTICS_DATA.days || {}).flat().filter(Boolean);
    const basket = matches.find(m => {
      const pred = window.predictMatch(m);
      return /basket/i.test(String(m?.sport || '')) && (pred?.scores?.markets?.quarterTotalsByQuarter || []).length === 4;
    });
    const pred = basket ? window.predictMatch(basket) : null;
    if (basket && typeof window.openDetail === 'function') window.openDetail(basket);
    const quarters = pred?.scores?.markets?.quarterTotalsByQuarter || [];
    return {
      hasBasket: !!basket,
      quarterCount: quarters.length,
      labels: quarters.map(q => q.quarter),
      lineCounts: quarters.map(q => (q.lines || []).length),
      modalText: document.querySelector('[data-market-panel="basket-quarter-by-quarter"]')?.textContent || '',
    };
  });

  expect(state.hasBasket).toBe(true);
  expect(state.quarterCount).toBe(4);
  expect(state.labels).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
  expect(state.lineCounts.every(n => n >= 3)).toBe(true);
  expect(state.modalText).toContain('Q1');
  expect(state.modalText).toContain('Q4');
});
