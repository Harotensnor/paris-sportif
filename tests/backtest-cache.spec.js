import { test, expect } from '@playwright/test';

test('backtest report fetch is shared and browser-cache friendly', async ({ page }) => {
  let hits = 0;
  const report = {
    generated_at: new Date().toISOString(),
    overall: { n: 42, brier: 0.22 },
    calibration: [],
    by_sport: {},
  };

  await page.route('**/backtest_report_v2.json*', async route => {
    hits += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(report),
    });
  });

  await page.goto('/pronostics.html#dashboard');
  await page.waitForFunction(
    () => window.__testAPI && typeof window.__testAPI._fetchBacktestReportV2 === 'function',
    undefined,
    { timeout: 15000 }
  );
  await page.waitForFunction(
    () => window.__modelCalibration && window.__modelCalibration.total_n === 42,
    undefined,
    { timeout: 15000 }
  );

  const out = await page.evaluate(async () => {
    const a = await window.__testAPI._fetchBacktestReportV2();
    const b = await window.__testAPI._fetchBacktestReportV2();
    return {
      same: a === b,
      totalN: window.__modelCalibration ? window.__modelCalibration.total_n : null,
    };
  });

  expect(hits).toBe(1);
  expect(out.same).toBe(true);
  expect(out.totalN).toBe(42);
});
