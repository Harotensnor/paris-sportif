const { test, expect } = require('@playwright/test');

test.describe('Model V5 feature engineering', () => {
  test('exposes advanced feature families and ranking in debug', async ({ page }) => {
    await page.goto('/pronostics.html?debug=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.FEATURE_ENGINEERING_V5), null, { timeout: 15000 });

    const summary = await page.evaluate(() => window.getFeatureEngineeringV5DebugSummary && window.getFeatureEngineeringV5DebugSummary());
    expect(summary.loaded).toBeTruthy();
    expect(summary.featureCount).toBeGreaterThanOrEqual(10);
    expect(summary.topFeatures.length).toBeGreaterThan(5);
    expect(Object.keys(summary.families)).toEqual(expect.arrayContaining([
      'interactions',
      'polynomial_degree_2',
      'rolling_windows',
      'cyclic',
    ]));
  });
});
