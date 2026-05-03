import { test, expect } from '@playwright/test';

test.describe('model math guards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pronostics.html');
    await page.waitForFunction(
      () => window.__testAPI
        && typeof window.__testAPI._dixonColesTau === 'function'
        && typeof window.__testAPI.poissonTopScores === 'function',
      undefined,
      { timeout: 15000 }
    );
  });

  test('Dixon-Coles covers all four low-score tau cells including 1-1', async ({ page }) => {
    const out = await page.evaluate(() => {
      const tau = window.__testAPI._dixonColesTau;
      const rho = -0.13;
      return {
        t00: tau(0, 0, 1.2, 0.9, rho),
        t01: tau(0, 1, 1.2, 0.9, rho),
        t10: tau(1, 0, 1.2, 0.9, rho),
        t11: tau(1, 1, 1.2, 0.9, rho),
        t22: tau(2, 2, 1.2, 0.9, rho),
      };
    });

    expect(out.t00).toBeGreaterThan(1);
    expect(out.t01).toBeLessThan(1);
    expect(out.t10).toBeLessThan(1);
    expect(out.t11).toBeCloseTo(1.13, 4);
    expect(out.t22).toBe(1);
  });

  test('poissonTopScores never returns an empty list for zero or invalid lambdas', async ({ page }) => {
    const out = await page.evaluate(() => {
      const top = window.__testAPI.poissonTopScores;
      return {
        bothZero: top(0, 0, 3, 4, 'test'),
        homeZero: top(0, 1.4, 3, 4, 'test'),
        awayBad: top(1.2, NaN, 3, 4, 'test'),
      };
    });

    expect(out.bothZero).toHaveLength(3);
    expect(out.homeZero).toHaveLength(3);
    expect(out.awayBad).toHaveLength(3);
    expect(out.bothZero[0].home).toBe(0);
    expect(out.bothZero[0].away).toBe(0);
    for (const group of Object.values(out)) {
      expect(group.every(s => Number.isFinite(s.prob) && s.prob > 0)).toBe(true);
    }
  });
});
