const { test, expect } = require('@playwright/test');

test.describe('Extended sports coverage', () => {
  test('loads the coverage sidecar and renders the index', async ({ page }) => {
    await page.goto('/pronostics.html#sports-tous', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.SPORTS_COVERAGE_EXTENDED && window.getSportsCoverageExtended), null, { timeout: 15000 });

    const summary = await page.evaluate(() => window.getSportsCoverageExtended());
    expect(summary.sports.length).toBeGreaterThanOrEqual(11);
    expect(summary.summary.sports_total).toBeGreaterThanOrEqual(11);
    expect(summary.sports.some(s => s.key === 'combat' && s.bookable_events > 0)).toBeTruthy();
    expect(summary.sports.some(s => s.key === 'tennis_challenger_itf' && s.source_events > 0)).toBeTruthy();

    await expect(page.locator('#sports-coverage-wrap')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Couverture sports/i })).toBeVisible();
    await expect(page.locator('[data-sport-key="combat"]')).toContainText(/Bookable|Modèle prêt/);
  });

  test('renders a per-sport page with model and market details', async ({ page }) => {
    await page.goto('/pronostics.html#combat', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.SPORTS_COVERAGE_EXTENDED && document.querySelector('#sports-coverage-wrap')), null, { timeout: 15000 });

    await expect(page.locator('#sports-coverage-wrap h1')).toContainText(/Boxe \/ MMA/i);
    await expect(page.locator('[data-sport-key="combat"]')).toContainText(/striking|grappling|vainqueur/i);
    await expect(page.locator('[data-sports-route="sports-tous"]').first()).toBeVisible();
  });
});
