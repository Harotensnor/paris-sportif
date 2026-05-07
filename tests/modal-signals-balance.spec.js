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

test('detail modal separates supporting and opposing signals', async ({ page }) => {
  await page.goto('/pronostics.html#dashboard');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && document.querySelector('[data-pick-uid]'), null, { timeout: 20_000 });

  const pick = page.locator('.v36-table-row[data-pick-uid]:visible, .v36-table-card[data-pick-uid]:visible').first();
  await expect(pick).toBeVisible();
  await pick.click({ force: true });

  await expect(page.locator('#detail-modal.open')).toBeVisible({ timeout: 5_000 });
  const signals = page.locator('.why-bet__signals').first();
  await expect(signals).toBeVisible();
  await expect(signals).toContainText('Signaux pour');
  await expect(signals).toContainText('Signaux contre');
});

test('mitigated signal badge uses explicit caution wording when present', async ({ page }) => {
  await page.goto('/pronostics.html#dashboard');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && document.querySelector('[data-pick-uid]'), null, { timeout: 20_000 });

  const badge = page.locator('.v37-intel-chips i, .v36-table-card__signals i').filter({ hasText: 'Signaux mitigés - prudence' });
  const count = await badge.count();
  if (count > 0) {
    const titles = await badge.evaluateAll(nodes => nodes.map(node => node.getAttribute('title') || ''));
    expect(titles.some(title => /prudence|deux sens|neutralisent/i.test(title))).toBeTruthy();
    const visibleBadge = page.locator('.v37-intel-chips i:visible, .v36-table-card__signals i:visible').filter({ hasText: 'Signaux mitigés - prudence' });
    if (await visibleBadge.count()) {
      await expect(visibleBadge.first()).toBeVisible();
    }
  } else {
    await expect(page.locator('body')).not.toContainText('Signaux mitigés');
  }
});
