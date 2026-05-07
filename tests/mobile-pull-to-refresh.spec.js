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

test('mobile pull-to-refresh gives haptic ready state and refresh confirmation', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile-only pull-to-refresh invariant.');
  await page.addInitScript(() => {
    localStorage.setItem('userPrefs', JSON.stringify({ onboardingDone: true, level: 'confirme' }));
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pronostics.html?debug=1');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && document.querySelector('.v36-home-shell'), null, { timeout: 15000 });

  await page.evaluate(() => {
    window.scrollTo(0, 0);
    window.__ptrPolls = 0;
    window.__ptrVibrations = [];
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (pattern) => {
        window.__ptrVibrations.push(pattern);
        return true;
      },
    });
    window.pollData = () => new Promise((resolve) => {
      window.__ptrPolls += 1;
      setTimeout(resolve, 120);
    });
  });

  await dispatchTouch(page, 'body', 'touchstart', 180, 8);
  await dispatchTouch(page, 'body', 'touchmove', 180, 104);
  await page.waitForFunction(() => document.querySelector('.ptr-indicator.visible.ready')?.textContent?.includes('Relâche'), null, { timeout: 5000 });

  await dispatchTouch(page, 'body', 'touchend', 180, 104);
  await page.waitForFunction(() => document.querySelector('.ptr-indicator.refreshing')?.textContent?.includes('Rafraîchissement'), null, { timeout: 5000 });
  await page.waitForFunction(() => window.__ptrPolls === 1, null, { timeout: 5000 });
  await page.waitForFunction(() => window.__ptrVibrations.length >= 2, null, { timeout: 5000 });

  const toastText = await page.locator('#toast-host').textContent({ timeout: 5000 });
  expect(toastText).toContain('Données rafraîchies');
});
