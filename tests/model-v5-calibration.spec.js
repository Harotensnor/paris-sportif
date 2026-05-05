const { test, expect } = require('@playwright/test');

test.describe('Model V5 probability calibration', () => {
  test('loads calibration method choices and keeps corrections gated by Brier improvement', async ({ page }) => {
    await page.goto('/pronostics.html?debug=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.CALIBRATION_METHOD_V5), null, { timeout: 15000 });

    const summary = await page.evaluate(() => window.getCalibrationMethodV5DebugSummary && window.getCalibrationMethodV5DebugSummary());
    expect(summary.loaded).toBeTruthy();
    expect(summary.policy).toContain('0.005');
    expect(Object.keys(summary.bySport).length).toBeGreaterThan(0);
    for (const row of Object.values(summary.bySport)) {
      if (row.active) {
        expect(row.improvement).toBeGreaterThanOrEqual(0.005);
      }
    }
  });
});
