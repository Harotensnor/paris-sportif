const { test, expect } = require('@playwright/test');

test.describe('Model V5 multi-task learning', () => {
  test('loads the gated multi-task artifact and exposes no-worse Brier by market', async ({ page }) => {
    await page.goto('/pronostics.html?debug=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.MULTITASK_V5 && window.getMultitaskV5DebugSummary), null, { timeout: 15000 });

    const summary = await page.evaluate(() => window.getMultitaskV5DebugSummary());
    expect(summary.loaded).toBeTruthy();
    expect(summary.tasks).toEqual(expect.arrayContaining(['1n2', 'ou_25', 'btts', 'exact_score']));
    for (const task of ['1n2', 'ou_25', 'btts', 'exact_score']) {
      const row = summary.by_market[task];
      expect(row).toBeTruthy();
      expect(row.v5_brier).toBeLessThanOrEqual(row.baseline_brier + 0.000001);
    }

    const policy = await page.evaluate(() => window.getMultitaskV5MarketPolicy('btts:BTTS_Y'));
    expect(policy.task).toBe('btts');
    expect(policy.loss_weight).toBeGreaterThan(0);
  });
});
