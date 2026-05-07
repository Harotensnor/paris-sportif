import { test, expect } from '@playwright/test';

test('basket quarter totals expose Q1 to Q4 projections in detail modal', async ({ page }) => {
  await page.goto('/pronostics.html?debug=1');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && window.predictMatch, null, { timeout: 15000 });

  const state = await page.evaluate(async () => {
    if (typeof window._ensureFullData === 'function') {
      try { await window._ensureFullData(); } catch (e) { window.__basketQuarterProbeError = String(e && e.message || e); }
    }
    const basket = {
      id: 'probe-basket-qtotals',
      date: '2030-01-01T01:00:00Z',
      sport: 'basketball',
      league_code: 'nba',
      league_name: 'NBA',
      competitors: [
        {
          id: 'bos',
          name: 'Boston Celtics',
          abbr: 'BOS',
          home_away: 'home',
          last5: [
            { gf: 118, ga: 104 },
            { gf: 121, ga: 110 },
            { gf: 113, ga: 101 },
            { gf: 125, ga: 119 },
            { gf: 116, ga: 108 },
          ],
          nba_stats: { pf_avg: 119.2, pa_avg: 108.4 },
          records: [{ type: 'overall', summary: '52-18' }, { type: 'home', summary: '29-6' }],
          form: 'WWWWL',
        },
        {
          id: 'cha',
          name: 'Charlotte Hornets',
          abbr: 'CHA',
          home_away: 'away',
          last5: [
            { gf: 101, ga: 116 },
            { gf: 97, ga: 122 },
            { gf: 108, ga: 117 },
            { gf: 104, ga: 111 },
            { gf: 99, ga: 115 },
          ],
          nba_stats: { pf_avg: 103.8, pa_avg: 115.6 },
          records: [{ type: 'overall', summary: '18-52' }, { type: 'road', summary: '7-28' }],
          form: 'LLLLW',
        },
      ],
      odds: [{ provider: 'fixture', homeML: '-700', awayML: '+550' }],
      winamax: { available: true, exact: true, url: 'https://www.winamax.fr/' },
    };
    const pred = window.predictMatch(basket);
    if (typeof window.openDetail === 'function') window.openDetail(basket);
    const quarters = pred?.scores?.markets?.quarterTotalsByQuarter || [];
    return {
      hasBasket: /basket/i.test(String(basket.sport || '')),
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
