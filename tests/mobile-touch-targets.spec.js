import { test, expect } from '@playwright/test';

async function visibleTouchTargets(page, selector) {
  return page.evaluate((selector) => {
    return [...document.querySelectorAll(selector)]
      .filter((el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && rect.width > 0
          && rect.height > 0
          && rect.bottom >= 0
          && rect.top <= window.innerHeight;
      })
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          label: (el.textContent || el.getAttribute('aria-label') || el.className || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 60),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      });
  }, selector);
}

test('mobile primary touch targets are at least 48px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pronostics.html?debug=1');
  await page.waitForFunction(() => document.querySelector('.v36-filter-strip') && document.querySelector('.v36-table-card'), null, { timeout: 15000 });

  const dashboardTargets = await visibleTouchTargets(page, [
    '.v36-filter-chip',
    '.v37-day-chip',
    '.v36-sort-btn',
    '.v37-blind-toggle',
    '.v36-table-card',
    '.topbar button',
    '.topbar a[role="button"]',
    '.mobile-bottom-nav button',
  ].join(','));
  expect(dashboardTargets.length).toBeGreaterThan(8);
  expect(dashboardTargets.filter(t => t.width < 48 || t.height < 48)).toEqual([]);

  await page.evaluate(() => {
    const match = Object.values(window.PRONOSTICS_DATA.days || {}).flat().find(Boolean);
    window.openDetail(match);
  });
  await page.waitForFunction(() => document.querySelector('#detail-modal.open .modal-drag-handle'), null, { timeout: 5000 });

  const modalTargets = await visibleTouchTargets(page, '#detail-modal .modal-drag-handle, #detail-modal button, #detail-modal a');
  expect(modalTargets.filter(t => t.width < 48 || t.height < 48)).toEqual([]);
});
