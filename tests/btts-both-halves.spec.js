import { test, expect } from '@playwright/test';

test('BTTS in both halves is computed from split Poisson halves', async ({ page }) => {
  await page.goto('/pronostics.html?debug=1');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && window.predictMatch, null, { timeout: 15000 });

  const state = await page.evaluate(async () => {
    if (typeof window._ensureFullData === 'function') {
      try { await window._ensureFullData(); } catch (e) {}
    }
    const matches = Object.values(window.PRONOSTICS_DATA.days || {}).flat().filter(Boolean);
    const football = matches.find(m => {
      const pred = window.predictMatch(m);
      return m?.sport === 'football' && pred?.markets?.extended?.bttsBothHalves;
    });
    const pred = football ? window.predictMatch(football) : null;
    if (football && typeof window.openDetail === 'function') window.openDetail(football);
    const raw = pred?.markets?.extended?.raw?.bttsBothHalves || null;
    return {
      hasFootball: !!football,
      label: pred?.markets?.extended?.bttsBothHalves?.label || '',
      yes: raw?.yes,
      no: raw?.no,
      firstHalf: raw?.first_half_yes,
      secondHalf: raw?.second_half_yes,
      modalText: document.querySelector('#detail-body')?.textContent || '',
    };
  });

  expect(state.hasFootball).toBe(true);
  expect(state.label).toContain('BTTS dans les 2 mi-temps');
  expect(state.yes).toBeGreaterThanOrEqual(0);
  expect(state.yes).toBeLessThanOrEqual(1);
  expect(state.no + state.yes).toBeGreaterThan(0.99);
  expect(state.no + state.yes).toBeLessThan(1.01);
  expect(state.firstHalf).toBeGreaterThanOrEqual(0);
  expect(state.secondHalf).toBeGreaterThanOrEqual(0);
  expect(state.modalText).toContain('BTTS deux mi-temps');
});
