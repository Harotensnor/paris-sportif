import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      localStorage.setItem('cookieConsent', 'accepted');
      localStorage.setItem('paris_sportif_onboarded_v1', '1');
      localStorage.setItem('paris_sportif_onboarded_v2', '1');
      localStorage.setItem('paris_sportif_v36_filters', JSON.stringify({ date: 'all', sort: 'tier' }));
      localStorage.setItem('userPrefs', JSON.stringify({
        onboardingDone: true,
        level: 'confirme',
        consentLocalStorage: 'accepted',
      }));
    } catch (e) {}
  });
});

test('dashboard exposes a deeper multi-market table', async ({ page }) => {
  await page.goto('/pronostics.html#dashboard');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && document.querySelectorAll('.v36-table-row[data-pick-uid]').length >= 80, null, { timeout: 20_000 });

  const visiblePicks = page.locator('.v36-table-row[data-pick-uid]:visible, .v36-table-card[data-pick-uid]:visible');
  await expect(visiblePicks.first()).toBeVisible();
  expect(await visiblePicks.count()).toBeGreaterThanOrEqual(20);

  const rows = page.locator('.v36-table-row[data-pick-uid]');
  expect(await rows.count()).toBeGreaterThanOrEqual(80);
  const markets = await page.locator('.v36-table-row[data-pick-uid] .v36-cell-pick em').evaluateAll(nodes =>
    [...new Set(nodes.map(node => node.textContent?.trim()).filter(Boolean))]
  );
  expect(markets.length).toBeGreaterThanOrEqual(5);
  expect(markets.some(label => /Mi-temps|Total équipe|Score exact|Résultat \+ BTTS|Deux équipes marquent|Double chance/.test(label))).toBeTruthy();

  const sportSection = page.locator('.v37-sport-picks');
  await expect(sportSection).toBeVisible();
  expect(await sportSection.locator('.v37-sport-lane').count()).toBeGreaterThanOrEqual(3);
});
