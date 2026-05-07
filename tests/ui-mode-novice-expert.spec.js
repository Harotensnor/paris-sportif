import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
    prefs.onboardingDone = true;
    prefs.level = prefs.level || 'confirme';
    localStorage.setItem('userPrefs', JSON.stringify(prefs));
    localStorage.setItem('paris_sportif_onboarded_v1', '1');
    localStorage.setItem('paris_sportif_onboarded_v2', '1');
  });
});

test('profile toggles novice and expert display modes', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/pronostics.html#profil', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#profil-wrap', { timeout: 20000 });
  await page.evaluate(() => {
    document.querySelectorAll('details.profile-accordion,details.profile-compact-details')
      .forEach((details) => { details.open = true; });
  });
  await page.locator('#profile-ui-mode').scrollIntoViewIfNeeded();
  await expect(page.locator('#profile-ui-mode')).toBeVisible({ timeout: 20000 });

  await expect(page.locator('html')).toHaveAttribute('data-ui-mode', 'novice');
  await expect(page.locator('#profile-ui-mode .novice-only')).toBeVisible();
  await expect(page.locator('#profile-ui-mode .expert-only')).toBeHidden();

  await page.locator('#profile-ui-mode [data-ui-mode-btn="expert"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-ui-mode', 'expert');
  await expect(page.locator('#profile-ui-mode .expert-only')).toBeVisible();
  await expect(page.locator('#profile-ui-mode .novice-only')).toBeHidden();
  await expect(page.locator('#profile-ui-mode [data-ui-mode-btn="expert"]')).toHaveClass(/is-active/);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('userPrefs') || '{}').uiMode)).toBe('expert');

  await page.locator('#profile-ui-mode [data-ui-mode-btn="novice"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-ui-mode', 'novice');
  await expect(page.locator('#profile-ui-mode [data-ui-mode-btn="novice"]')).toHaveClass(/is-active/);
});
