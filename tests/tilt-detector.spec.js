import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      localStorage.setItem('cookieConsent', 'accepted');
      localStorage.setItem('paris_sportif_onboarded_v1', '1');
      localStorage.setItem('paris_sportif_onboarded_v2', '1');
      localStorage.setItem('userPrefs', JSON.stringify({
        onboardingDone: true,
        level: 'confirme',
        consentLocalStorage: 'accepted',
      }));
      const now = Date.now();
      localStorage.setItem('paris_sportif_user_bets', JSON.stringify([
        { id: 'seed-1', matchId: 'm1', market: '1n2', key: '1', label: 'Test 1', odd: 1.8, stake: 3, settled: true, result: 'lost', pnl: -3, ts: now - 3000, settledTs: now - 3000 },
        { id: 'seed-2', matchId: 'm2', market: '1n2', key: '1', label: 'Test 2', odd: 1.8, stake: 6, settled: true, result: 'lost', pnl: -6, ts: now - 2000, settledTs: now - 2000 },
        { id: 'seed-3', matchId: 'm3', market: '1n2', key: '1', label: 'Test 3', odd: 1.8, stake: 9, settled: true, result: 'lost', pnl: -9, ts: now - 1000, settledTs: now - 1000 },
      ]));
    } catch (e) {}
  });
});

test('dashboard warns when personal losses and stakes signal tilt', async ({ page }) => {
  await page.goto('/pronostics.html#dashboard');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && document.querySelector('.v37-tilt-banner'), null, { timeout: 20_000 });

  const banner = page.locator('.v37-tilt-banner').first();
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('Pause recommandée');
  await expect(banner).toContainText("pertes d'affilée");
  await expect(banner).toContainText('mises en hausse');
});
