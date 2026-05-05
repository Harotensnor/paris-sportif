import { test, expect } from '@playwright/test';

test('profile toggles novice and expert display modes', async ({ page }) => {
  await page.goto('/pronostics.html#profil');
  await page.getByRole('button', { name: /Mode\s+Novice|Mode\s+Expert/ }).click();
  await expect(page.locator('#profile-ui-mode')).toBeVisible({ timeout: 15000 });

  await expect(page.locator('html')).toHaveAttribute('data-ui-mode', 'novice');
  await expect(page.locator('#profile-ui-mode .novice-only')).toBeVisible();
  await expect(page.locator('#profile-ui-mode .expert-only')).toBeHidden();

  await page.locator('[data-ui-mode-btn="expert"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-ui-mode', 'expert');
  await expect(page.locator('#profile-ui-mode .expert-only')).toBeVisible();
  await expect(page.locator('#profile-ui-mode .novice-only')).toBeHidden();
  await expect(page.locator('[data-ui-mode-btn="expert"]')).toHaveClass(/is-active/);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('userPrefs') || '{}').uiMode)).toBe('expert');

  await page.locator('[data-ui-mode-btn="novice"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-ui-mode', 'novice');
  await expect(page.locator('[data-ui-mode-btn="novice"]')).toHaveClass(/is-active/);
});
