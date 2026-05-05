// Tests Playwright validation finale — Phase 3 (audit final).
// These checks target the current V37 dashboard locally, not the public cache.
const { test, expect } = require('@playwright/test');

const BASE = '/pronostics.html';

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
      localStorage.removeItem('paris_sportif_v36_home_filter');
    } catch (e) {}
  });
});

async function waitForDashboardPicks(page) {
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
}

test('data snapshot is current and actionable', async ({ page }) => {
  await page.goto(`${BASE}#dashboard`);
  await page.waitForFunction(() => window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.generated_at, { timeout: 15_000 });
  await page.evaluate(async () => {
    if (window.PRONOSTICS_DATA?._lite && typeof window._ensureFullData === 'function') {
      await window._ensureFullData();
    }
  });
  const state = await page.evaluate(() => {
    const d = window.PRONOSTICS_DATA;
    const events = [];
    const walk = (value) => {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach(walk);
        return;
      }
      if (typeof value !== 'object') return;
      if (value.id || value.competitors || value.winamax) {
        events.push(value);
        return;
      }
      Object.values(value).forEach(walk);
    };
    walk(d.days || {});
    const generatedAt = new Date(d.generated_at).getTime();
    const winamax = events.filter(e => e?.winamax?.available === true);
    return {
      ageHours: (Date.now() - generatedAt) / 3_600_000,
      today: d.today || '',
      events: events.length,
      winamax: winamax.length,
    };
  });
  expect(state.ageHours).toBeGreaterThanOrEqual(0);
  expect(state.ageHours).toBeLessThan(6);
  expect(state.events).toBeGreaterThan(50);
  expect(state.winamax).toBeGreaterThan(30);
});

test('no golf in data', async ({ page }) => {
  await page.goto(`${BASE}#dashboard`);
  await page.waitForFunction(() => window.PRONOSTICS_DATA, { timeout: 15_000 });
  const sports = await page.evaluate(() => {
    const d = window.PRONOSTICS_DATA;
    return [...new Set(Object.values(d.days || {}).flat().map(e => e.sport).filter(Boolean))];
  });
  expect(sports).not.toContain('golf');
});

test('trust strip does not overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1568, height: 900 });
  await page.goto(`${BASE}#dashboard`);
  await waitForDashboardPicks(page);
  const ok = await page.evaluate(() => {
    const ts = document.querySelector('.trust-strip');
    if (!ts) return true;
    return ts.getBoundingClientRect().width <= window.innerWidth + 1;
  });
  expect(ok).toBe(true);
});

test('dense pick click opens the matching why modal', async ({ page }) => {
  await page.goto(`${BASE}#dashboard`);
  await waitForDashboardPicks(page);
  const pick = page.locator('.v36-table-row[data-pick-uid]:visible, .v36-table-card[data-pick-uid]:visible').first();
  const label = await pick.getAttribute('data-pick-label');
  const odd = await pick.getAttribute('data-pick-odd');
  expect(label || '').not.toBe('');
  await pick.click();
  await expect(page.locator('#detail-modal.open')).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('#why-bet-title')).toContainText(label, { timeout: 5_000 });
  if (odd) await expect(page.locator('#why-bet-title')).toContainText(`@${odd}`);
  expect(await page.locator('#detail-modal.open .md-tab').count()).toBeGreaterThanOrEqual(2);
});

test('theme has Auto option wired', async ({ page }) => {
  await page.goto(`${BASE}#profil`);
  await expect(page.locator('[data-theme="auto"]').first()).toBeAttached({ timeout: 10_000 });
});

test('dense dashboard exposes team identity and score legend', async ({ page }) => {
  await page.goto(`${BASE}#dashboard`);
  await waitForDashboardPicks(page);
  const state = await page.evaluate(() => {
    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const picks = [
      ...document.querySelectorAll('.v36-picks-table tbody .v36-table-row'),
      ...document.querySelectorAll('.v36-table-cards .v36-table-card'),
    ].filter(visible);
    const matchLabels = [
      ...document.querySelectorAll('.v36-cell-match, .v36-table-card strong'),
    ].filter(visible).map(el => (el.textContent || '').trim()).filter(Boolean);
    return {
      visiblePicks: picks.length,
      namedMatches: matchLabels.length,
      tones: [...new Set(picks.map(el => el.getAttribute('data-tone')).filter(Boolean))],
      legend: document.querySelector('.v37-score-legend')?.textContent || '',
      scoreTooltip: document.querySelector('.v37-opportunity')?.getAttribute('data-tooltip') || '',
    };
  });
  expect(state.visiblePicks).toBeGreaterThanOrEqual(30);
  expect(state.namedMatches).toBeGreaterThan(10);
  expect(state.tones).toEqual(expect.arrayContaining(['safe', 'solid', 'value', 'big', 'out']));
  expect(state.legend).toContain("Score d'opportunité");
  expect(state.scoreTooltip).toContain('Décomposition');
});
