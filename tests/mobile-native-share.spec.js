import { test, expect } from '@playwright/test';

test('detail modal share button uses native share with a #match deep link', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (payload) => {
        window.__lastSharePayload = payload;
      },
    });
  });

  await page.goto('/pronostics.html');
  await page.waitForFunction(() => document.querySelector('.v36-table-card[data-big-detail]'), null, { timeout: 15000 });
  const firstId = await page.locator('.v36-table-card[data-big-detail]').first().getAttribute('data-big-detail');
  await page.locator('.v36-table-card[data-big-detail]').first().click();
  await page.waitForFunction(() => document.querySelector('#detail-modal.open'), null, { timeout: 8000 });
  await page.locator('#share-detail').click();

  const payload = await page.evaluate(() => window.__lastSharePayload || null);
  expect(payload).toBeTruthy();
  expect(payload.url).toContain(`#match/${encodeURIComponent(String(firstId))}`);
  expect(payload.url).not.toContain('?match=');

  await page.goto(payload.url);
  await page.waitForFunction(() => document.querySelector('#detail-modal.open'), null, { timeout: 8000 });
  await expect(page.locator('#detail-title')).toHaveAttribute('data-match-id', String(firstId));
});
