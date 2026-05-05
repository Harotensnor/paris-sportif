const { test, expect } = require('@playwright/test');

test.describe('Model V5 stacking meta learner', () => {
  test('loads stacking weights, exposes debug summary, and nudges predictions safely', async ({ page }) => {
    await page.goto('/pronostics.html?debug=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.STACKING_META_V5 && window.predictMatch), null, { timeout: 15000 });

    const summary = await page.evaluate(() => window.getStackingMetaV5DebugSummary && window.getStackingMetaV5DebugSummary());
    expect(summary.loaded).toBeTruthy();
    expect(summary.rows).toBeGreaterThanOrEqual(40);
    expect(summary.featureImportance.length).toBeGreaterThan(3);

    const sample = await page.evaluate(() => {
      const matches = Object.values((window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.days) || {}).flat().filter(Boolean);
      for (const match of matches) {
        try {
          const pred = window.predictMatch(match);
          if (pred && pred.stacking_meta_v5 && pred.stacking_meta_v5.status) {
            return pred.stacking_meta_v5;
          }
        } catch (err) {
          // Continue scanning.
        }
      }
      return null;
    });
    expect(sample).toBeTruthy();
    expect(Math.abs(sample.nudge || 0)).toBeLessThanOrEqual(0.025);
    expect(sample.rows).toBeGreaterThanOrEqual(40);
  });
});
