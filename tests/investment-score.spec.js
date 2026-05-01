import { test, expect } from '@playwright/test';

test.describe('capital engine', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pronostics.html');
    await page.waitForFunction(
      () => window.__testAPI
        && typeof window.__testAPI.investmentScore === 'function'
        && typeof window.__testAPI.oddsDisciplineProfile === 'function',
      { timeout: 15000 }
    );
  });

  test('rejects low odds unless EV buffer is very large', async ({ page }) => {
    const res = await page.evaluate(() => {
      const dq = { score: 4, max: 4 };
      return window.__testAPI.investmentScore(0.87, 1.10, dq);
    });
    expect(res.profile.zone).toBe('micro');
    expect(res.action).toBe('skip');
    expect(res.score).toBeLessThanOrEqual(35);
  });

  test('rewards the profitable odds sweet spot', async ({ page }) => {
    const res = await page.evaluate(() => {
      const dq = { score: 4, max: 4 };
      return window.__testAPI.investmentScore(0.61, 1.95, dq);
    });
    expect(res.profile.zone).toBe('sweet');
    expect(res.action).toBe('bet');
    expect(res.ev).toBeGreaterThan(0.15);
    expect(res.score).toBeGreaterThanOrEqual(60);
  });

  test('downgrades long odds without a bigger EV cushion', async ({ page }) => {
    const res = await page.evaluate(() => {
      const dq = { score: 3, max: 4 };
      return window.__testAPI.investmentScore(0.27, 4.10, dq);
    });
    expect(res.profile.zone).toBe('variance');
    expect(res.action).not.toBe('bet');
    expect(res.score).toBeLessThanOrEqual(62);
  });
});
