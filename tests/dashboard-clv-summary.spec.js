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
    } catch (e) {}
  });
});

test('dashboard exposes CLV tracking from the compact summary sidecar', async ({ page }) => {
  await page.goto('/pronostics.html#dashboard');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && document.querySelectorAll('.v37-clv-metric').length === 3, null, { timeout: 20_000 });

  const clv = page.locator('.v37-clv-strip').first();
  await expect(clv).toBeVisible();
  await expect(clv).toContainText('Closing Line Value');
  await expect(clv).toContainText('CLV moyen');
  await expect(clv).toContainText('Marché battu');
  await expect(clv).toContainText('observations');

  const metrics = clv.locator('.v37-clv-metric');
  await expect(metrics).toHaveCount(3);
});
