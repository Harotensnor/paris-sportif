const { test, expect } = require('@playwright/test');

test.describe('Model V5 cold-start handling', () => {
  test('loads cold-start audit and applies the +2pt edge requirement context', async ({ page }) => {
    await page.goto('/pronostics.html?debug=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.COLD_START_V5 && window.getColdStartContextV5), null, { timeout: 15000 });

    const summary = await page.evaluate(() => window.getColdStartV5DebugSummary && window.getColdStartV5DebugSummary());
    expect(summary.loaded).toBeTruthy();
    expect(summary.coverage.teams).toBeGreaterThanOrEqual(1000);
    expect(summary.coverage.cold_teams).toBeGreaterThan(0);
    expect(summary.policy.edge_required_bonus).toBeCloseTo(0.02, 5);

    const context = await page.evaluate(() => {
      const row = (window.COLD_START_V5.teams || [])[0];
      const match = {
        sport: row[2],
        league_code: row[3],
        competitors: [
          { name: row[1], short: row[1], home_away: 'home' },
          { name: 'Synthetic league average opponent', short: 'League avg', home_away: 'away' },
        ],
      };
      return window.getColdStartContextV5(match);
    });

    expect(context.active).toBeTruthy();
    expect(context.edge_required_bonus).toBeCloseTo(0.02, 5);
    expect(context.variance_multiplier).toBeGreaterThanOrEqual(1.2);
    expect(context.teams.length).toBeGreaterThan(0);
  });
});
