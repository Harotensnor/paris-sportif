import { test, expect } from '@playwright/test';

test('quarter Asian handicap and total markets are computed and shown in the detail modal', async ({ page }) => {
  await page.goto('/pronostics.html?debug=1');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && window.predictMatch && window.poissonMarketsExtended, null, { timeout: 15000 });

  const state = await page.evaluate(async () => {
    if (typeof window._ensureFullData === 'function') {
      try { await window._ensureFullData(); } catch (e) {}
    }
    const synthetic = window.poissonMarketsExtended(1.6, 1.15);
    const matches = Object.values(window.PRONOSTICS_DATA.days || {}).flat().filter(Boolean);
    const football = matches.find(m => {
      if (m?.sport !== 'football' || (m?.competitors || []).length < 2) return false;
      const pred = window.predictMatch(m);
      return !!(pred?.markets?.extended?.asianHandicapQuarter && pred?.markets?.extended?.asianTotalQuarter);
    });
    const pred = football ? window.predictMatch(football) : null;
    if (football && typeof window.openDetail === 'function') window.openDetail(football);
    return {
      syntheticAhLines: (synthetic?.asianHandicapQuarter || []).map(x => x.line),
      syntheticTotalLines: (synthetic?.asianTotalQuarter || []).map(x => x.line),
      hasPrediction: !!pred,
      ahCount: pred?.markets?.extended?.asianHandicapQuarterAll?.length || 0,
      totalCount: pred?.markets?.extended?.asianTotalQuarterAll?.length || 0,
      ahLabel: pred?.markets?.extended?.asianHandicapQuarter?.label || '',
      totalLabel: pred?.markets?.extended?.asianTotalQuarter?.label || '',
      modalText: document.querySelector('#detail-body')?.textContent || '',
    };
  });

  expect(state.syntheticAhLines).toEqual(expect.arrayContaining([-0.75, -0.25, 0.25, 0.75]));
  expect(state.syntheticTotalLines).toEqual(expect.arrayContaining([2.25, 2.75, 3.25]));
  expect(state.hasPrediction).toBe(true);
  expect(state.ahCount).toBeGreaterThanOrEqual(4);
  expect(state.totalCount).toBeGreaterThanOrEqual(3);
  expect(state.ahLabel).toContain('AH');
  expect(state.totalLabel).toContain('asiatique');
  expect(state.modalText).toContain('Asian Handicap');
  expect(state.modalText).toContain('Total asiatique');
});
