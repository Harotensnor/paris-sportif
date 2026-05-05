const { test, expect } = require('@playwright/test');

test.describe('Model V5 prediction intervals', () => {
  test('computes bootstrap P10-P90 intervals and shows them in the detail modal', async ({ page }) => {
    await page.goto('/pronostics.html?debug=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.predictMatch && window.PRONOSTICS_DATA), null, { timeout: 15000 });

    const sample = await page.evaluate(() => {
      const matches = Object.values((window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.days) || {}).flat().filter(Boolean);
      for (const match of matches) {
        try {
          const pred = window.predictMatch(match);
          const interval = pred && pred.prediction_interval_v5;
          const reliability = Number(pred?.reliability ?? pred?.pick?.prob);
          if (pred && Number.isFinite(reliability) && interval && Number.isFinite(interval.lo) && Number.isFinite(interval.hi)) {
            return {
              id: match.id,
              reliability,
              interval,
            };
          }
        } catch (err) {
          // Continue scanning.
        }
      }
      return null;
    });

    expect(sample).toBeTruthy();
    expect(sample.interval.method).toBe('bootstrap_v5_p10_p90');
    expect(sample.interval.runs).toBe(100);
    expect(sample.interval.lo).toBeLessThan(sample.reliability);
    expect(sample.interval.hi).toBeGreaterThan(sample.reliability);
    expect(sample.interval.width).toBeGreaterThan(0);

    await page.evaluate((id) => {
      const matches = Object.values((window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.days) || {}).flat().filter(Boolean);
      const match = matches.find((m) => String(m.id) === String(id));
      window.openDetail(match);
    }, sample.id);

    await expect(page.locator('[data-v5-prediction-interval="1"]').first()).toContainText(/confiance \d+-\d+%/);
  });
});
