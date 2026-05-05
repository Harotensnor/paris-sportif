import { test, expect } from '@playwright/test';

test('mobile quick filters update the dashboard filter state', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pronostics.html');
  await page.waitForFunction(() => document.querySelector('.v36-mobile-quick [data-v36-quick]'), null, { timeout: 15000 });

  await expect(page.locator('.v36-mobile-quick')).toBeVisible();
  await page.locator('[data-v36-quick="football"]').click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('paris_sportif_v36_home_filter') || '{}').sport)).toBe('football');
  await expect(page.locator('[data-v36-quick="football"]')).toHaveClass(/is-active/);

  await page.locator('[data-v36-quick="edge"]').click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('paris_sportif_v36_home_filter') || '{}').sort)).toBe('edge');
  await expect(page.locator('[data-v36-quick="edge"]')).toHaveClass(/is-active/);

  await page.locator('[data-v36-quick="today"]').click();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('paris_sportif_v36_home_filter') || '{}'));
  expect(state.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  const hash = await page.evaluate(() => location.hash);
  expect(hash).toContain('#dashboard?date=');
});
