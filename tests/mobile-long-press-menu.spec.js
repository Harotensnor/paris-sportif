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

async function openContextMenu(page) {
  await dispatchTouch(page, '.v36-table-card', 'touchstart', 190, 520);
  await page.waitForFunction(() => document.querySelector('.v36-context-menu'), null, { timeout: 5000 });
  await dispatchTouch(page, '.v36-table-card', 'touchend', 190, 520);
}

test('mobile long-press card menu exposes favorite compare track and open actions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pronostics.html?debug=1');
  await page.waitForFunction(() => document.querySelector('.v36-table-card[data-big-detail][data-pick-uid]'), null, { timeout: 15000 });
  await page.evaluate(() => {
    localStorage.removeItem('paris_sportif_favorite_match_ids');
    localStorage.removeItem('tousComparePickIds');
    localStorage.removeItem('paris_sportif_user_bets');
  });

  const firstId = await page.locator('.v36-table-card').first().getAttribute('data-big-detail');

  await openContextMenu(page);
  await expect(page.locator('.v36-context-menu')).toContainText('Ajouter aux favoris');
  await expect(page.locator('.v36-context-menu')).toContainText('Comparer');
  await expect(page.locator('.v36-context-menu')).toContainText('Suivre ce pari');
  await page.locator('[data-v36-context-action="favorite"]').click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('paris_sportif_favorite_match_ids') || '[]').length)).toBe(1);

  await openContextMenu(page);
  await page.locator('[data-v36-context-action="compare"]').click();
  const compareIds = await page.evaluate(() => JSON.parse(localStorage.getItem('tousComparePickIds') || '[]'));
  expect(compareIds).toContain(String(firstId));

  await openContextMenu(page);
  await page.locator('[data-v36-context-action="track"]').click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('paris_sportif_user_bets') || '[]').length)).toBe(1);

  await openContextMenu(page);
  await page.locator('[data-v36-context-action="open"]').click();
  await page.waitForFunction(() => document.querySelector('#detail-modal.open'), null, { timeout: 5000 });
});
