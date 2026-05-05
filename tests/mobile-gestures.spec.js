import { test, expect } from '@playwright/test';

async function dispatchTouch(page, selector, type, x, y) {
  await page.evaluate(({ selector, type, x, y }) => {
    const el = document.querySelector(selector);
    const touch = { identifier: 1, target: el, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y };
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'touches', { value: type === 'touchend' ? [] : [touch] });
    Object.defineProperty(event, 'targetTouches', { value: type === 'touchend' ? [] : [touch] });
    Object.defineProperty(event, 'changedTouches', { value: [touch] });
    el.dispatchEvent(event);
  }, { selector, type, x, y });
}

test('mobile dashboard supports date swipe and card swipe-to-detail', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pronostics.html?debug=1');
  await page.waitForFunction(() => {
    const shell = document.querySelector('.v36-home-shell');
    return window.PRONOSTICS_DATA && shell && shell.parentElement?.__v36MobileSwipeWired && document.querySelector('.v36-table-card');
  }, null, { timeout: 15000 });

  const before = await page.evaluate(() => {
    localStorage.removeItem('paris_sportif_v36_home_filter');
    return new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
  });

  await dispatchTouch(page, '.v36-home-shell', 'touchstart', 330, 360);
  await dispatchTouch(page, '.v36-home-shell', 'touchend', 90, 352);
  await page.waitForFunction((today) => {
    const filters = JSON.parse(localStorage.getItem('paris_sportif_v36_home_filter') || '{}');
    return filters.date && filters.date !== today;
  }, before, { timeout: 5000 });

  const dateState = await page.evaluate(() => JSON.parse(localStorage.getItem('paris_sportif_v36_home_filter') || '{}').date);
  expect(dateState).toMatch(/^\d{4}-\d{2}-\d{2}$/);

  await page.waitForFunction(() => document.querySelector('.v36-table-card'), null, { timeout: 10000 });
  await dispatchTouch(page, '.v36-table-card', 'touchstart', 180, 520);
  await dispatchTouch(page, '.v36-table-card', 'touchend', 184, 390);
  await page.waitForFunction(() => document.querySelector('#detail-modal.open, .modal.open, .modal.show'), null, { timeout: 5000 });

  const modalOpen = await page.evaluate(() => Boolean(document.querySelector('#detail-modal.open, .modal.open, .modal.show')));
  expect(modalOpen).toBe(true);
});
