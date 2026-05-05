import { test, expect } from '@playwright/test';

test('HT/FT exposes the full 9-combination matrix in football detail', async ({ page }) => {
  await page.goto('/pronostics.html?debug=1');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && window.predictMatch && window.openDetail, null, { timeout: 15000 });

  const state = await page.evaluate(async () => {
    if (typeof window._ensureFullData === 'function') {
      try { await window._ensureFullData(); } catch (e) {}
    }
    const matches = Object.values(window.PRONOSTICS_DATA.days || {}).flat().filter(Boolean);
    const football = matches.find(m => {
      if (m?.sport !== 'football' || (m?.competitors || []).length < 2) return false;
      const pred = window.predictMatch(m);
      return (pred?.markets?.extended?.htftAll || []).length === 9;
    });
    const pred = football ? window.predictMatch(football) : null;
    if (football) window.openDetail(football);
    return {
      hasFootball: !!football,
      htftCount: pred?.markets?.extended?.htftAll?.length || 0,
      modalTitle: document.querySelector('[data-market-panel="htft-all"]')?.textContent || '',
      modalRows: document.querySelectorAll('[data-market-panel="htft-all"] [data-htft-key]').length,
    };
  });

  expect(state.hasFootball).toBe(true);
  expect(state.htftCount).toBe(9);
  expect(state.modalTitle).toContain('HT/FT');
  expect(state.modalRows).toBe(9);
});
