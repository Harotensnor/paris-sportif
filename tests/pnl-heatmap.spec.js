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
      localStorage.setItem('paris_sportif_user_bets', JSON.stringify([
        { id: 'pnl-1', matchId: 'a', market: '1n2', key: '1', label: 'A', odd: 2.0, stake: 10, settled: true, result: 'won', pnl: 10, ts: now - 5 * day, settledTs: now - 5 * day },
        { id: 'pnl-2', matchId: 'b', market: 'ou25', key: 'over', label: 'B', odd: 1.8, stake: 8, settled: true, result: 'lost', pnl: -8, ts: now - 4 * day, settledTs: now - 4 * day },
        { id: 'pnl-3', matchId: 'c', market: 'btts', key: 'yes', label: 'C', odd: 1.9, stake: 6, settled: true, result: 'won', pnl: 5.4, ts: now - 2 * day, settledTs: now - 2 * day },
      ]));
    } catch (e) {}
  });
});

test('performance displays personal P&L heatmap from tracked bets', async ({ page }) => {
  await page.goto('/pronostics.html#performance');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && document.querySelector('.perf-user-heatmap'), null, { timeout: 20_000 });

  const heatmap = page.locator('.perf-user-heatmap').first();
  await expect(heatmap).toBeVisible();
  await expect(heatmap).toContainText('Calendrier P&L personnel');
  await expect(heatmap).toContainText('365 jours de discipline');
  await expect(heatmap).toContainText('P&L total');
  await expect(heatmap.locator('[data-pnl-day]')).toHaveCount(365);
});
