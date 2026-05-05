const { test, expect } = require('@playwright/test');

test.describe('Model V5 online learning versioning', () => {
  test('loads model_versions and exposes rollout guardrails', async ({ page }) => {
    await page.goto('/pronostics.html?debug=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.MODEL_VERSIONS_V5), null, { timeout: 15000 });

    const summary = await page.evaluate(() => window.getModelVersionsV5DebugSummary && window.getModelVersionsV5DebugSummary());
    expect(summary.loaded).toBeTruthy();
    expect(summary.current).toBe('v5.0');
    expect(summary.rolloutStages.length).toBeGreaterThanOrEqual(3);
    expect(summary.history.map(v => v.version)).toContain('v5.0');
    expect(summary.nextRecalibrationAt).toMatch(/T03:00:00Z$/);
  });
});
