const { test, expect } = require('@playwright/test');

test.describe('Performance shell', () => {
  test('loads ESM modules and workers without breaking the dashboard', async ({ page }) => {
    await page.goto('/pronostics.html#dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.PS_ESM), null, { timeout: 15000 });

    const status = await page.evaluate(async () => {
      const esm = window.PS_ESM;
      const age = esm.getDataAge();
      const workers = Object.keys(esm.workers || {});
      const quality = await esm.qualityDistribution([{ score: 42 }, { score: 81 }, { score: 67 }]);
      return {
        ageStatus: age.status,
        workers,
        qualityOk: quality.ok,
        qualityCount: quality.count,
        hasVitals: typeof window.__webVitals === 'function',
        hasLongTasks: typeof window.__longTasks === 'function',
      };
    });

    expect(status.ageStatus).toMatch(/fresh|stale|broken/);
    expect(status.workers).toEqual(expect.arrayContaining(['quality', 'backtest', 'bayesian']));
    expect(status.qualityOk).toBeTruthy();
    expect(status.qualityCount).toBe(3);
    expect(status.hasVitals).toBeTruthy();
    expect(status.hasLongTasks).toBeTruthy();
  });

  test('ships critical resource hints', async ({ page }) => {
    await page.goto('/pronostics.html#dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('link[rel="modulepreload"][href*="src/perf-bootstrap.js"]')).toHaveCount(1);
    await expect(page.locator('link[rel="preload"][href*="data_lite_72h.json"]')).toHaveCount(1);
    await expect(page.locator('style#perf-critical-css')).toHaveCount(1);
  });
});
