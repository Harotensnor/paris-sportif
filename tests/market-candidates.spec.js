import { test, expect } from '@playwright/test';

test.describe('v35 market scanner', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pronostics.html');
    await page.waitForFunction(
      () => window.__testAPI
        && typeof window.__testAPI.buildMarketCandidates === 'function'
        && typeof window.__testAPI.scoreMarketCandidate === 'function',
      undefined,
      { timeout: 15000 }
    );
  });

  test('builds only exact Winamax market candidates', async ({ page }) => {
    const candidates = await page.evaluate(() => {
      const match = {
        id: 'v35-fixture',
        sport: 'football',
        date: new Date(Date.now() + 3600_000).toISOString(),
        competitors: [
          { homeAway: 'home', name: 'Freiburg', short: 'Freiburg' },
          { homeAway: 'away', name: 'Wolfsburg', short: 'Wolfsburg' },
        ],
        winamax: {
          available: true,
          markets: {
            '1n2': { home: 2.10, draw: 3.40, away: 3.20 },
            ou: [
              { market: 'ou', side: 'over', line: 2.5, odd: 2.05, label: 'Plus de 2,5' },
              { market: 'ou', side: 'under', line: 2.5, odd: 1.78, label: 'Moins de 2,5' },
            ],
            btts_rows: [
              { market: 'btts', side: 'yes', odd: 1.92, label: 'Oui' },
              { market: 'btts', side: 'no', odd: 1.82, label: 'Non' },
            ],
            dnb_rows: [
              { market: 'dnb', side: 'home', odd: 1.55, label: 'Home remboursé si nul' },
            ],
            team_total: [
              { market: 'team_total', team: 'home', side: 'over', line: 0.5, odd: 1.44, label: 'Home plus de 0,5' },
            ],
          },
        },
      };
      const pred = {
        pick: { key: '1', prob: 0.58, label: 'Home gagne' },
        reliability: 0.58,
        odds: { home: 2.10, draw: 3.40, away: 3.20 },
        markets: {
          btts: { prob: 0.54, side: 'yes', key: 'BTTS_Y' },
          extended: {
            raw: {
              ou25: { over: 0.57, under: 0.43 },
              dnb: { home: 0.68, away: 0.32 },
              teamTotals: { home_over_05: 0.76 },
            },
          },
        },
      };
      return window.__testAPI.buildMarketCandidates(match, pred).map(c => ({
        market: c.market,
        key: c.key,
        source: c.source,
        exact: c.exact,
        odd: c.odd,
        ev: c.ev,
        edge: c.edge,
        label: c.label,
        semanticGroup: c.semanticGroup,
      }));
    });

    expect(candidates.length).toBeGreaterThanOrEqual(5);
    expect(candidates.every(c => c.source === 'winamax_exact' && c.exact === true)).toBe(true);
    expect(candidates.map(c => c.market)).toEqual(expect.arrayContaining(['1n2', 'ou25', 'btts', 'dnb', 'teamTotal']));
    expect(candidates.find(c => c.market === 'ou25' && c.key === 'O2.5').ev).toBeGreaterThan(0);
    const teamTotal = candidates.find(c => c.market === 'teamTotal');
    expect(teamTotal.label).toContain('Total buts Freiburg');
    expect(teamTotal.label).toContain('équipe seulement');
    expect(teamTotal.semanticGroup).toBe('team_total_goals');
  });

  test('does not invent an actionable market without Winamax odds', async ({ page }) => {
    const count = await page.evaluate(() => {
      const match = { id: 'no-bookmaker-market', sport: 'football', winamax: { available: true, markets: {} } };
      const pred = {
        pick: { key: '1', prob: 0.72, label: 'Home' },
        reliability: 0.72,
        odds: { home: 1.35, draw: 4.20, away: 7.00 },
        markets: { btts: { prob: 0.61 }, extended: { raw: { ou25: { over: 0.63, under: 0.37 } } } },
      };
      return window.__testAPI.buildMarketCandidates(match, pred).length;
    });
    expect(count).toBe(0);
  });

  test('downgrades micro odds unless the value buffer is exceptional', async ({ page }) => {
    const scored = await page.evaluate(() => {
      const match = { id: 'micro-odd', sport: 'football', winamax: { available: true } };
      const pred = { pick: { key: '1', prob: 0.78 }, reliability: 0.78 };
      return window.__testAPI.scoreMarketCandidate(
        { market: '1n2', key: '1', pickKey: '1', odd: 1.08, prob: 0.78, rel: 0.78, source: 'winamax_exact', exact: true },
        match,
        pred
      );
    });
    expect(scored.discipline.zone).toBe('micro');
    expect(scored.investment.action).toBe('skip');
  });
});
