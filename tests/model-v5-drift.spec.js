const { test, expect } = require('@playwright/test');

test.describe('Model V5 feature drift detection', () => {
  test('loads KL drift artifact and proves synthetic drift is detected', async ({ page }) => {
    await page.goto('/pronostics.html?debug=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.FEATURE_DRIFT_V5), null, { timeout: 15000 });

    const summary = await page.evaluate(() => window.getFeatureDriftV5DebugSummary && window.getFeatureDriftV5DebugSummary());
    expect(summary.loaded).toBeTruthy();
    expect(summary.syntheticShiftDetected).toBeTruthy();
    expect(summary.features.length).toBeGreaterThan(3);
    expect(['ok', 'warning', 'critical']).toContain(summary.overall);
  });
});
