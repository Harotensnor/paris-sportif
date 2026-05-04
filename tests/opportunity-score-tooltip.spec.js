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
  const attrs = await score.evaluate(el => ({
    tooltip: el.getAttribute('data-tooltip'),
    title: el.getAttribute('title'),
    ariaLabel: el.getAttribute('aria-label'),
  }));

  expect(attrs.tooltip || '').toContain("Score d'opportunité");
  expect(attrs.tooltip || '').toContain('Décomposition');
  expect(attrs.tooltip || '').toContain('Stabilité signal');
  expect(attrs.tooltip || '').toContain('Fraîcheur data');
  expect(attrs.title).toBe(attrs.tooltip);
  expect(attrs.ariaLabel).toBe(attrs.tooltip);
});
