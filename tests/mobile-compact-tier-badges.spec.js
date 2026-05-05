import { test, expect } from '@playwright/test';

test('mobile cards use compact tier badge codes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pronostics.html');
  await page.waitForFunction(() => document.querySelector('.v36-table-card .v36-tier-badge b'), null, { timeout: 15000 });
  const labels = await page.locator('.v36-table-card .v36-tier-badge b').evaluateAll(nodes => nodes.slice(0, 12).map(node => node.textContent.trim()));
  expect(labels.length).toBeGreaterThan(0);
  for (const label of labels) {
    expect(['S', 'SO', 'V', 'B', 'O']).toContain(label);
    expect(label).not.toMatch(/^[1-5]$/);
  }
});
