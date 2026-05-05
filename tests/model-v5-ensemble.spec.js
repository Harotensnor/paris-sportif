const { test, expect } = require('@playwright/test');

test.describe('Model V5 adaptive ensemble weights', () => {
  test('loads bounded adaptive weights and exposes debug summary', async ({ page }) => {
    await page.goto('/pronostics.html?debug=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.ENSEMBLE_ADAPTIVE_V5), null, { timeout: 15000 });

    const summary = await page.evaluate(() => window.getAdaptiveEnsembleV5DebugSummary && window.getAdaptiveEnsembleV5DebugSummary());
    expect(summary.loaded).toBeTruthy();
    expect(summary.status).toBe('ok');
    expect(Object.keys(summary.weights).length).toBeGreaterThanOrEqual(6);
    const total = Object.values(summary.weights).reduce((acc, value) => acc + Number(value || 0), 0);
    expect(total).toBeGreaterThan(0.98);
    expect(total).toBeLessThan(1.02);

    const xgWeight = await page.evaluate(() => window.getAdaptiveComponentWeightV5 && window.getAdaptiveComponentWeightV5('Buts attendus', 0.4, { sport: 'football' }));
    expect(xgWeight).toBeGreaterThan(0.03);
    expect(xgWeight).toBeLessThan(0.56);
  });
});
