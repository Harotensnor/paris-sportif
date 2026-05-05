const { test, expect } = require('@playwright/test');

test.describe('Model V5 deep backtest', () => {
  test('loads deep breakdowns and exposes worst zones in debug', async ({ page }) => {
    await page.goto('/pronostics.html?debug=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.BACKTEST_DEEP_V5 && window.getBacktestDeepV5DebugSummary), null, { timeout: 15000 });

    const summary = await page.evaluate(() => window.getBacktestDeepV5DebugSummary());
    expect(summary.loaded).toBeTruthy();
    expect(summary.rows).toBeGreaterThan(0);
    expect(summary.date_range.start).toBeTruthy();
    expect(summary.date_range.end).toBeTruthy();
    expect(summary.worst_zones.length).toBeGreaterThanOrEqual(5);

    const families = await page.evaluate(() => Object.keys(window.BACKTEST_DEEP_V5.breakdowns || {}));
    expect(families).toEqual(expect.arrayContaining(['sport', 'league', 'odds_bucket', 'market', 'month', 'weather']));
  });
});
