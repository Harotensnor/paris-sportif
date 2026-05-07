import { test, expect } from '@playwright/test';

async function dragHandle(page, deltaY) {
  const box = await page.locator('.modal-drag-handle').boundingBox();
  if (!box) throw new Error('Missing modal drag handle box');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + deltaY, { steps: 6 });
  await page.mouse.up();
}

test('mobile detail modal is a draggable bottom sheet with snap points', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pronostics.html?debug=1');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && window.openDetail, null, { timeout: 15000 });

  await page.evaluate(() => {
    const days = Object.values(window.PRONOSTICS_DATA.days || {});
    const match = days.flat().find(Boolean);
    window.openDetail(match);
  });

  await page.waitForFunction(() => document.querySelector('#detail-modal.open .modal[data-sheet-snap="90"]'), null, { timeout: 5000 });
  await expect(page.locator('.modal-drag-handle')).toBeVisible();

  await dragHandle(page, -110);
  await page.waitForFunction(() => document.querySelector('#detail-modal.open .modal')?.dataset.sheetSnap === 'full', null, { timeout: 5000 });

  await dragHandle(page, 110);
  await page.waitForFunction(() => document.querySelector('#detail-modal.open .modal')?.dataset.sheetSnap === '90', null, { timeout: 5000 });

  await dragHandle(page, 110);
  await page.waitForFunction(() => document.querySelector('#detail-modal.open .modal')?.dataset.sheetSnap === '50', null, { timeout: 5000 });

  await dragHandle(page, 180);
  await page.waitForFunction(() => !document.querySelector('#detail-modal.open'), null, { timeout: 5000 });
});
