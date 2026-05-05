import { test, expect } from '@playwright/test';

test('first and last team to score markets are derived from Poisson football model', async ({ page }) => {
  await page.goto('/pronostics.html?debug=1');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && window.predictMatch, null, { timeout: 15000 });

  const state = await page.evaluate(async () => {
    if (typeof window._ensureFullData === 'function') {
      try { await window._ensureFullData(); } catch (e) {}
    }
    const matches = Object.values(window.PRONOSTICS_DATA.days || {}).flat().filter(Boolean);
    const football = matches.find(m => {
      const pred = window.predictMatch(m);
      return m?.sport === 'football' && pred?.markets?.extended?.firstGoal && pred?.markets?.extended?.lastGoal;
    });
    const pred = football ? window.predictMatch(football) : null;
    if (football && typeof window.openDetail === 'function') window.openDetail(football);
    const all = pred?.markets?.extended?.firstLastGoalAll || [];
    return {
      hasFootball: !!football,
      allCount: all.length,
      firstLabel: pred?.markets?.extended?.firstGoal?.label || '',
      lastLabel: pred?.markets?.extended?.lastGoal?.label || '',
      probSumFirst: all.filter(x => x.type === 'first').reduce((s, x) => s + Number(x.prob || 0), 0),
      modalText: document.querySelector('#detail-body')?.textContent || '',
    };
  });

  expect(state.hasFootball).toBe(true);
  expect(state.allCount).toBe(5);
  expect(state.firstLabel).toContain('premier but');
  expect(state.lastLabel).toContain('dernier but');
  expect(state.probSumFirst).toBeGreaterThan(0.98);
  expect(state.probSumFirst).toBeLessThan(1.02);
  expect(state.modalText).toContain('ordre des buts');
});
