import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      localStorage.setItem('cookieConsent', 'accepted');
      localStorage.setItem('paris_sportif_onboarded_v1', '1');
      localStorage.setItem('paris_sportif_onboarded_v2', '1');
      localStorage.setItem('userPrefs', JSON.stringify({
        onboardingDone: true,
        level: 'confirme',
        consentLocalStorage: 'accepted',
      }));
      localStorage.removeItem('paris_sportif_v36_home_filter');
    } catch (e) {}
  });
});

test('dashboard blind mode hides odds and edge in the dense table', async ({ page }) => {
  await page.goto('/pronostics.html#dashboard');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && document.querySelector('.v37-blind-toggle'), null, { timeout: 20_000 });

  const toggle = page.locator('.v37-blind-toggle').first();
  await expect(toggle).toBeVisible();
  await expect(toggle).toContainText('OFF');

  await toggle.click();
  await expect(page.locator('.v37-blind-toggle.is-active')).toContainText('ON');
  await expect(page.locator('.v37-blind-value').first()).toContainText(/Cote cachee|Edge cache/);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('paris_sportif_v36_home_filter') || '{}').blind);
  expect(stored).toBe(true);
});
