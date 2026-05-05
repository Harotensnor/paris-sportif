import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem('autoRefreshDoneAt', String(Date.now()));
      localStorage.setItem('cookieConsent', 'accepted');
      localStorage.setItem('paris_sportif_onboarded_v1', '1');
      localStorage.setItem('paris_sportif_onboarded_v2', '1');
      localStorage.setItem('userPrefs', JSON.stringify({
        onboardingDone: true,
        level: 'confirme',
        consentLocalStorage: 'accepted',
      }));
    } catch (e) {}
  });
});

test('phase finale: dashboard remains full when legacy filters stored "all"', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('paris_sportif_v36_home_filter', JSON.stringify({
        sport: 'all',
        tier: 'all',
        time: 'all',
        search: '',
        sort: 'tier',
        date: 'all',
        includeLive: false,
      }));
    } catch (e) {}
  });

  await page.goto('/pronostics.html#dashboard');
  await page.waitForFunction(() => {
    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const rows = [...document.querySelectorAll('.v36-picks-table tbody .v36-table-row')].filter(visible);
    const cards = [...document.querySelectorAll('.v36-table-cards .v36-table-card')].filter(visible);
    return Math.max(rows.length, cards.length) >= 30;
  }, null, { timeout: 20_000 });

  const state = await page.evaluate(() => {
    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const rows = [...document.querySelectorAll('.v36-picks-table tbody .v36-table-row')].filter(visible);
    const cards = [...document.querySelectorAll('.v36-table-cards .v36-table-card')].filter(visible);
    const picks = rows.length ? rows : cards;
    return {
      visiblePicks: picks.length,
      tones: [...new Set(picks.map(el => el.getAttribute('data-tone')).filter(Boolean))].sort(),
      legend: document.querySelector('.v37-score-legend')?.textContent || '',
      scoreTooltip: document.querySelector('.v37-opportunity, .v36-table-card__signals i[aria-label]')?.getAttribute('data-tooltip')
        || document.querySelector('.v37-opportunity, .v36-table-card__signals i[aria-label]')?.getAttribute('aria-label')
        || '',
    };
  });

  expect(state.visiblePicks).toBeGreaterThanOrEqual(30);
  expect(state.tones).toEqual(expect.arrayContaining(['safe', 'solid', 'value', 'big', 'out']));
  expect(state.legend).toContain("Score d'opportunité");
  expect(state.scoreTooltip).toContain("Score d'opportunité");
  expect(state.scoreTooltip).toContain('Décomposition');
});
