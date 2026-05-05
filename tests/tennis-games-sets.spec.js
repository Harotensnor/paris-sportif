import { test, expect } from '@playwright/test';

test('tennis model exposes match games, set games and set-count markets', async ({ page }) => {
  await page.goto('/pronostics.html?debug=1');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && window.predictMatch, null, { timeout: 15000 });

  const state = await page.evaluate(async () => {
    if (typeof window._ensureFullData === 'function') {
      try { await window._ensureFullData(); } catch (e) {}
    }
    const synthetic = window.tennisScorePrediction
      ? window.tennisScorePrediction({ sport: 'tennis', league_name: 'ATP Test', league_code: 'atp' }, 0.58)
      : null;
    const matches = Object.values(window.PRONOSTICS_DATA.days || {}).flat().filter(Boolean);
    const tennis = matches.find(m => {
      const pred = window.predictMatch(m);
      return m?.sport === 'tennis' && pred?.scores?.games?.lines?.length && pred?.scores?.games?.setLines?.length;
    });
    const pred = tennis ? window.predictMatch(tennis) : null;
    if (tennis && typeof window.openDetail === 'function') window.openDetail(tennis);
    return {
      hasTennis: !!tennis,
      bestOf: pred?.scores?.bestOf || 0,
      matchLines: pred?.scores?.games?.lines?.length || 0,
      setLines: pred?.scores?.games?.setLines?.length || 0,
      setScores: pred?.scores?.items?.length || 0,
      syntheticBestOf: synthetic?.bestOf || 0,
      syntheticMatchLines: synthetic?.games?.lines?.length || 0,
      syntheticSetLines: synthetic?.games?.setLines?.length || 0,
      syntheticSetScores: synthetic?.items?.length || 0,
      modalGames: document.querySelector('[data-market-panel="tennis-games"]')?.textContent || '',
      modalSetGames: document.querySelector('[data-market-panel="tennis-set-games"]')?.textContent || '',
      modalSetCount: document.querySelector('[data-market-panel="tennis-set-count"]')?.textContent || '',
    };
  });

  expect([3, 5]).toContain(state.syntheticBestOf);
  expect(state.syntheticMatchLines).toBeGreaterThanOrEqual(2);
  expect(state.syntheticSetLines).toBeGreaterThanOrEqual(2);
  expect(state.syntheticSetScores).toBeGreaterThanOrEqual(3);
  if (state.hasTennis) {
    expect([3, 5]).toContain(state.bestOf);
    expect(state.matchLines).toBeGreaterThanOrEqual(2);
    expect(state.setLines).toBeGreaterThanOrEqual(2);
    expect(state.setScores).toBeGreaterThanOrEqual(3);
    expect(state.modalGames).toContain('Total jeux match');
    expect(state.modalSetGames).toContain('set');
    expect(state.modalSetCount).toContain('Sets');
  }
});
