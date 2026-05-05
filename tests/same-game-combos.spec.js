import { test, expect } from '@playwright/test';

test('same-game builders expose correlation-adjusted multibets', async ({ page }) => {
  await page.goto('/pronostics.html?debug=1#combines');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && window.buildCombines && window.estimateSameGameComboProb, null, { timeout: 15000 });

  const state = await page.evaluate(async () => {
    if (typeof window._ensureFullData === 'function') {
      try { await window._ensureFullData(); } catch (e) {}
    }
    const matches = Object.values(window.PRONOSTICS_DATA.days || {}).flat().filter(Boolean);
    const windows = [
      { minMinutes: 0, maxMinutes: 120 },
      { minMinutes: 120, maxMinutes: 360 },
      { minMinutes: 360, maxMinutes: 1440 },
      { minMinutes: 1440, maxMinutes: 4320 },
    ];
    const allCombos = windows.flatMap(w => window.buildCombines(matches, w));
    const sameGame = allCombos.filter(c => c.sameGame || /builder/.test(String(c.type || '')));
    const distinctMatches = new Set(sameGame.map(c => String(c.legs?.[0]?.m?.id || '')));
    const adjusted = sameGame.filter(c =>
      Number.isFinite(c.rawCombinedProb)
      && Number.isFinite(c.combinedProb)
      && c.rawCombinedProb > 0
      && c.combinedProb > 0
      && Math.abs(c.rawCombinedProb - c.combinedProb) > 0.0001
      && Number(c.correlationAvg || 0) > 0
    );
    return {
      total: allCombos.length,
      sameGame: sameGame.length,
      distinctMatches: distinctMatches.size,
      adjusted: adjusted.length,
      examples: sameGame.slice(0, 3).map(c => ({
        type: c.type,
        raw: c.rawCombinedProb,
        adjusted: c.combinedProb,
        corr: c.correlationAvg,
        desc: c.desc,
      })),
    };
  });

  expect(state.total).toBeGreaterThan(0);
  expect(state.sameGame).toBeGreaterThanOrEqual(10);
  expect(state.distinctMatches).toBeGreaterThanOrEqual(1);
  expect(state.adjusted).toBeGreaterThanOrEqual(10);
  expect(state.examples.some(x => String(x.desc || '').includes('corrélation'))).toBe(true);
});
