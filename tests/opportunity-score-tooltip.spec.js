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

test('opportunity score exposes a visible legend and detailed tooltip copy', async ({ page }) => {
  await page.goto('/pronostics.html#dashboard');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && document.querySelector('.v37-opportunity'), null, { timeout: 20_000 });

  const legend = page.locator('.v37-score-legend').first();
  await expect(legend).toBeVisible();
  await expect(legend).toContainText("Score d'opportunité");
  await expect(legend).toContainText('80+');

  const score = page.locator('.v37-opportunity:visible, .v36-table-card__signals i[aria-label]:visible').first();
  await expect(score).toBeVisible();
  const tooltip = await score.getAttribute('data-tooltip');
  const title = await score.getAttribute('title');
  const ariaLabel = await score.getAttribute('aria-label');

  expect(tooltip || '').toContain("Score d'opportunité");
  expect(tooltip || '').toContain('Décomposition');
  expect(title).toBe(tooltip);
  expect(ariaLabel).toBe(tooltip);
});
