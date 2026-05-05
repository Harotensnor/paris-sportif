const { test, expect } = require('@playwright/test');

test.describe('Model V5 hierarchical Bayesian priors', () => {
  test('loads the V5 prior sidecar and applies it to predictions', async ({ page }) => {
    await page.goto('/pronostics.html?debug=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.BAYESIAN_PRIORS_V5 && window.predictMatch), null, { timeout: 15000 });

    const summary = await page.evaluate(() => window.getBayesianV5DebugSummary && window.getBayesianV5DebugSummary());
    expect(summary.loaded).toBeTruthy();
    expect(summary.teams).toBeGreaterThanOrEqual(1000);
    expect(summary.leagues).toBeGreaterThan(50);

    const applied = await page.evaluate(() => {
      const days = window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.days ? window.PRONOSTICS_DATA.days : {};
      const matches = Object.values(days).flat().filter(Boolean);
      for (const match of matches) {
        try {
          const pred = window.predictMatch(match);
          const prior = pred && pred.poisson && pred.poisson.bayesianPrior;
          if (prior && String(prior.version || '').includes('V5')) {
            return {
              id: match.id,
              version: prior.version,
              weight: prior.weight,
              homeSample: prior.homeSample,
              awaySample: prior.awaySample,
            };
          }
        } catch (err) {
          // Keep scanning; malformed legacy fixtures should not mask V5 coverage.
        }
      }
      return null;
    });
    expect(applied).toBeTruthy();
    expect(applied.weight).toBeGreaterThan(0.09);
    expect(applied.homeSample + applied.awaySample).toBeGreaterThan(0);
  });
});
