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
      const tracked = {};
      for (let i = 0; i < 12; i++) {
        tracked[`coach-${i}`] = {
          id: `coach-${i}`,
          status: 'gagné',
          sport: 'football',
          league: 'Premier League',
          odds: 1.82,
          stake: 10,
          kickoff: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
          added_at: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
        };
      }
      localStorage.setItem('paris_sportif_tracked_bets', JSON.stringify(tracked));
    } catch (e) {}
  });
});

test('dashboard surfaces personal pick suggestions in the main flow', async ({ page }) => {
  await page.goto('/pronostics.html#dashboard');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && document.querySelector('.v37-personal-strip'), null, { timeout: 20_000 });

  const strip = page.locator('.v37-personal-strip').first();
  await expect(strip).toBeVisible();
  await expect(strip).toContainText('Pour ton profil');
  await expect(strip).toContainText("3 picks recommandés aujourd'hui");
  await expect(strip).toContainText('paris trackés');
  await expect(strip.locator('.v37-personal-card')).toHaveCount(3);
});
