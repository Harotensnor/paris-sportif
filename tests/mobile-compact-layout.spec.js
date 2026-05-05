import { test, expect } from '@playwright/test';

test('mobile dashboard uses compact vertical pick cards under 720px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pronostics.html?debug=1');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && document.querySelector('.v36-table-card'), null, { timeout: 15000 });

  const state = await page.evaluate(() => {
    const card = document.querySelector('.v36-table-card');
    const table = document.querySelector('.v36-picks-table');
    const tier = card?.querySelector('.v36-tier-badge');
    const tierText = tier?.querySelector('em');
    const tierSymbol = tier?.querySelector('b');
    const odd = card?.querySelector('.v36-table-card__line b');
    const rect = card?.getBoundingClientRect();
    return {
      bodyClass: document.body.className,
      tableDisplay: table ? getComputedStyle(table).display : '',
      cardDisplay: card ? getComputedStyle(card).display : '',
      cardColumns: card ? getComputedStyle(card).gridTemplateColumns : '',
      cardRight: rect ? Math.round(rect.right) : 0,
      viewportWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      tierTextDisplay: tierText ? getComputedStyle(tierText).display : '',
      tierAbbr: tierSymbol ? getComputedStyle(tierSymbol, '::after').content : '',
      oddSize: odd ? parseFloat(getComputedStyle(odd).fontSize) : 0,
      minHeight: card ? parseFloat(getComputedStyle(card).minHeight) : 0,
    };
  });

  expect(state.bodyClass).toContain('agent-home');
  expect(state.tableDisplay).toBe('none');
  expect(state.cardDisplay).toBe('grid');
  expect(state.cardColumns).toContain('px');
  expect(state.cardRight).toBeLessThanOrEqual(state.viewportWidth + 2);
  expect(state.scrollWidth).toBeLessThanOrEqual(state.viewportWidth + 2);
  expect(state.tierTextDisplay).toBe('none');
  expect(state.tierAbbr).toMatch(/"?(S|SO|V|B|O)"?/);
  expect(state.oddSize).toBeGreaterThanOrEqual(20);
  expect(state.minHeight).toBeGreaterThanOrEqual(120);
});
