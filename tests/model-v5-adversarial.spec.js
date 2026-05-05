const { test, expect } = require('@playwright/test');

test.describe('Model V5 adversarial validation', () => {
  test('loads train/test drift diagnostics and proves synthetic drift is detected', async ({ page }) => {
    await page.goto('/pronostics.html?debug=1#sante', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.ADVERSARIAL_VALIDATION_V5 && window.getAdversarialValidationV5DebugSummary), null, { timeout: 15000 });

    const summary = await page.evaluate(() => window.getAdversarialValidationV5DebugSummary());
    expect(summary.loaded).toBeTruthy();
    expect(summary.rows).toBeGreaterThan(0);
    expect(summary.train_rows).toBeGreaterThan(0);
    expect(summary.test_rows).toBeGreaterThan(0);
    expect(summary.auc).toBeGreaterThanOrEqual(0);
    expect(summary.auc).toBeLessThanOrEqual(1);
    expect(summary.threshold_auc).toBe(0.6);
    expect(summary.top_numeric_shifts.length).toBeGreaterThan(0);
    expect(summary.synthetic_check.drift_detected).toBeTruthy();
    expect(summary.synthetic_check.auc).toBeGreaterThan(0.6);

    const healthCheck = await page.evaluate(() => {
      const health = window.computeSiteHealth ? window.computeSiteHealth() : { checks: [] };
      return health.checks.find(c => c.key === 'adversarial-validation-v5') || null;
    });
    expect(healthCheck).toBeTruthy();
    expect(healthCheck.label).toContain('Adversarial validation V5');
    expect(healthCheck.value).toContain('AUC');
  });
});
