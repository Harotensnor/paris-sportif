const { test, expect } = require('@playwright/test');

test.describe('UX design system v3', () => {
  test('loads the component showcase and switches premium themes', async ({ page }) => {
    await page.goto('/components-showcase.html', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /Components showcase/i })).toBeVisible();
    await expect(page.locator('link[href*="app-design-v3.css"]')).toHaveCount(1);
    await expect(page.locator('.btn-primary').first()).toBeVisible();
    await expect(page.locator('.table-base')).toBeVisible();
    await expect(page.locator('.empty-state-base')).toBeVisible();

    await page.getByRole('button', { name: 'Ocean' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'ocean');

    await page.getByRole('button', { name: 'Mono' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'mono');
  });

  test('profile exposes all premium theme choices', async ({ page }) => {
    await page.goto('/pronostics.html#profil', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#profil-wrap', { timeout: 15000 });
    await page.evaluate(() => document.querySelectorAll('details.profile-accordion').forEach((details) => { details.open = true; }));

    for (const theme of ['ocean', 'sunset', 'forest', 'mono', 'auto', 'dark', 'light']) {
      await expect(page.locator(`[data-theme-btn="${theme}"]`).first()).toBeVisible();
    }

    await page.locator('[data-theme-btn="forest"]').first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'forest');
  });

  test('touch targets and focus affordances stay measurable', async ({ page }) => {
    await page.goto('/components-showcase.html', { waitUntil: 'domcontentloaded' });

    const box = await page.getByRole('button', { name: 'Primaire' }).boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(40);

    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    expect(outline).not.toBe('none');
  });
});
