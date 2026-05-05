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

test('dashboard renders the local daily briefing and opens targeted insights', async ({ page }) => {
  const payload = await page.request.get('/daily_insights.json');
  expect(payload.ok()).toBe(true);
  const json = await payload.json();
  expect(json.schema).toBe('daily_insights_v1');
  expect(json.summary.insights).toBeGreaterThan(0);
  expect(Array.isArray(json.insights)).toBe(true);

  await page.goto('/pronostics.html#dashboard');
  await page.waitForFunction(
    () => window.PRONOSTICS_DATA && document.querySelector('.v37-daily-strip .v37-insight-row'),
    null,
    { timeout: 20_000 }
  );

  const strip = page.locator('.v37-daily-strip').first();
  await expect(strip).toBeVisible();
  await expect(strip).toContainText('Insights du jour');
  await expect(strip).toContainText('sources locales');

  const rows = strip.locator('.v37-insight-row');
  await expect(rows.first()).toBeVisible();
  await expect(rows).toHaveCount(Math.min(json.insights.length, 5));

  const targeted = strip.locator('.v37-insight-row[data-big-detail]');
  await expect(targeted.first()).toBeVisible();
  await targeted.first().click({ timeout: 5_000, force: true });
  await expect(page.locator('#detail-modal.open')).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('#why-bet-title')).toBeVisible();
});
