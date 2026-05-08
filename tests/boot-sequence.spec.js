import { test, expect } from '@playwright/test';

const URL = '/pronostics.html';

async function visibleBootPrompts(page) {
  return page.evaluate(() => {
    const visible = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const styles = getComputedStyle(el);
      return styles.display !== 'none' && styles.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    return [
      visible('#consent-banner') ? 'consent' : null,
      visible('.onboard-overlay') ? 'onboarding' : null,
      visible('.docs-modal') ? 'docs' : null,
      visible('.privacy-modal') ? 'privacy' : null,
    ].filter(Boolean);
  });
}

test('BUG-002 first visit serializes consent, onboarding, and docs tour', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      Object.defineProperty(Navigator.prototype, 'webdriver', {
        configurable: true,
        get: () => false,
      });
    } catch (_) {}
  });

  await page.goto(URL + '?bootAudit=1');

  await expect(page.locator('#consent-banner')).toBeVisible({ timeout: 10000 });
  await expect.poll(() => visibleBootPrompts(page)).toEqual(['consent']);

  await page.locator('#consent-accept').click();
  await expect(page.locator('.onboard-overlay')).toBeVisible({ timeout: 10000 });
  await expect.poll(() => visibleBootPrompts(page)).toEqual(['onboarding']);

  await page.locator('.onboard-overlay [data-skip]').click();
  await expect(page.locator('.docs-modal')).toBeVisible({ timeout: 10000 });
  await expect.poll(() => visibleBootPrompts(page)).toEqual(['docs']);

  await page.locator('[data-docs-tour-skip]').click();
  await expect.poll(async () => page.evaluate(() => {
    try {
      const step = JSON.parse(localStorage.getItem('boot_step') || '{}');
      return step.active === 'done' && step.done.includes('consent') && step.done.includes('onboarding') && step.done.includes('docs');
    } catch (_) {
      return false;
    }
  })).toBe(true);
});
