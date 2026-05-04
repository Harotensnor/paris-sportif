import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      localStorage.setItem('cookieConsent', 'accepted');
      localStorage.setItem('paris_sportif_onboarded_v1', '1');
      localStorage.setItem('paris_sportif_onboarded_v2', '1');
      localStorage.setItem('paris_sportif_perf_tab_v1', 'global');
      localStorage.setItem('userPrefs', JSON.stringify({
        onboardingDone: true,
        level: 'confirme',
        consentLocalStorage: 'accepted',
      }));
      const day = 24 * 60 * 60 * 1000;
      const now = Date.now();
      const bets = [];
      for (let i = 0; i < 24; i++) {
        const won = i % 3 !== 0;
        const stake = 10;
        const odd = 1.85;
        bets.push({
          id: `proj-${i}`,
          matchId: `m-${i}`,
          market: '1n2',
          key: '1',
          label: `Projection ${i}`,
          odd,
          stake,
          settled: true,
          result: won ? 'won' : 'lost',
          pnl: won ? stake * (odd - 1) : -stake,
          ts: now - (24 - i) * day,
          settledTs: now - (24 - i) * day,
        });
      }
      localStorage.setItem('paris_sportif_user_bets', JSON.stringify(bets));
    } catch (e) {}
  });
});

test('performance displays bankroll growth projections', async ({ page }) => {
  await page.goto('/pronostics.html#performance');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && document.querySelector('.perf-bankroll-projector'), null, { timeout: 20_000 });

  const projector = page.locator('.perf-bankroll-projector').first();
  await expect(projector).toBeVisible();
  await expect(projector).toContainText('Projecteur bankroll');
  await expect(projector).toContainText('1000€ simulés');
  await expect(projector).toContainText('Prudente');
  await expect(projector).toContainText('Équilibrée');
  await expect(projector).toContainText('Agressive');
  await expect(projector.locator('svg')).toHaveCount(3);
});
