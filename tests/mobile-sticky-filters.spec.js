import { test, expect } from '@playwright/test';

test('mobile dashboard filters stay sticky and compact during long scroll', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile-only sticky filter invariant.');
  await page.addInitScript(() => {
    localStorage.setItem('userPrefs', JSON.stringify({ onboardingDone: true, level: 'confirme' }));
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pronostics.html?debug=1');
  await page.waitForFunction(() => document.querySelector('.v36-filter-strip') && document.querySelector('.v36-table-card'), null, { timeout: 15000 });

  const initialTop = await page.locator('.v36-filter-strip').evaluate((el) => Math.round(el.getBoundingClientRect().top));
  expect(initialTop).toBeGreaterThanOrEqual(0);

  await page.evaluate(() => window.scrollTo(0, 720));
  await page.waitForFunction(() => document.body.classList.contains('v36-mobile-filter-compact'), null, { timeout: 5000 });

  const compact = await page.locator('.v36-filter-strip').evaluate((el) => {
    const chip = el.querySelector('.v36-filter-chip:not(.is-active)') || el.querySelector('.v36-filter-chip');
    const active = el.querySelector('.v36-filter-chip.is-active');
    return {
      top: Math.round(el.getBoundingClientRect().top),
      position: getComputedStyle(el).position,
      chipWidth: chip ? Math.round(chip.getBoundingClientRect().width) : 0,
      activeWidth: active ? Math.round(active.getBoundingClientRect().width) : 0,
    };
  });
  expect(['sticky', 'fixed']).toContain(compact.position);
  expect(compact.top).toBeGreaterThanOrEqual(0);
  expect(compact.chipWidth).toBeLessThanOrEqual(56);
  expect(compact.activeWidth).toBeGreaterThanOrEqual(compact.chipWidth);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => !document.body.classList.contains('v36-mobile-filter-compact'), null, { timeout: 5000 });
});
