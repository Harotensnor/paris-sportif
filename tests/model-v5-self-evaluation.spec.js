const { test, expect } = require('@playwright/test');

test.describe('Model V5 self-evaluation', () => {
  test('estimates confidence-in-confidence and surfaces it in the detail modal', async ({ page }) => {
    await page.goto('/pronostics.html?debug=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.selfEvaluateConfidenceV5 && window.predictMatch), null, { timeout: 15000 });

    const sample = await page.evaluate(() => {
      const data = window.PRONOSTICS_DATA || {};
      const events = Object.values(data.days || {}).flat().filter(Boolean);
      for (const match of events) {
        if (!match || match.completed) continue;
        const pred = window.predictMatch(match);
        if (pred && pred.self_evaluation_v5) {
          window.openDetail(match);
          return { matchId: match.id, self: pred.self_evaluation_v5 };
        }
      }
      return { matchId: null, self: null };
    });

    expect(sample.self).toBeTruthy();
    expect(sample.self.confidence_in_confidence).toBeGreaterThanOrEqual(0);
    expect(sample.self.confidence_in_confidence).toBeLessThanOrEqual(1);
    expect(sample.self.label).toBeTruthy();

    await expect(page.locator('body')).toContainText('méta-confiance', { timeout: 15000 });
  });
});
