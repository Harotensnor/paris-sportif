import { test, expect } from '@playwright/test';

async function dispatchTouch(page, selector, type, x, y) {
  await page.evaluate(({ selector, type, x, y }) => {
    const el = document.querySelector(selector);
    const touch = { identifier: 1, target: el, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y };
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'touches', { value: type === 'touchend' || type === 'touchcancel' ? [] : [touch] });
    Object.defineProperty(event, 'targetTouches', { value: type === 'touchend' || type === 'touchcancel' ? [] : [touch] });
    Object.defineProperty(event, 'changedTouches', { value: [touch] });
    el.dispatchEvent(event);
  }, { selector, type, x, y });
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

  await dispatchTouch(page, '.modal-drag-handle', 'touchstart', 195, 710);
  await dispatchTouch(page, '.modal-drag-handle', 'touchmove', 195, 610);
  await dispatchTouch(page, '.modal-drag-handle', 'touchend', 195, 610);
  await page.waitForFunction(() => document.querySelector('#detail-modal.open .modal')?.dataset.sheetSnap === 'full', null, { timeout: 5000 });

  await dispatchTouch(page, '.modal-drag-handle', 'touchstart', 195, 610);
  await dispatchTouch(page, '.modal-drag-handle', 'touchmove', 195, 720);
  await dispatchTouch(page, '.modal-drag-handle', 'touchend', 195, 720);
  await page.waitForFunction(() => document.querySelector('#detail-modal.open .modal')?.dataset.sheetSnap === '90', null, { timeout: 5000 });

  await dispatchTouch(page, '.modal-drag-handle', 'touchstart', 195, 610);
  await dispatchTouch(page, '.modal-drag-handle', 'touchmove', 195, 720);
  await dispatchTouch(page, '.modal-drag-handle', 'touchend', 195, 720);
  await page.waitForFunction(() => document.querySelector('#detail-modal.open .modal')?.dataset.sheetSnap === '50', null, { timeout: 5000 });

  await dispatchTouch(page, '.modal-drag-handle', 'touchstart', 195, 610);
  await dispatchTouch(page, '.modal-drag-handle', 'touchmove', 195, 760);
  await dispatchTouch(page, '.modal-drag-handle', 'touchend', 195, 760);
  await page.waitForFunction(() => !document.querySelector('#detail-modal.open'), null, { timeout: 5000 });
});
