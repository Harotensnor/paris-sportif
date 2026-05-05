import { test, expect } from '@playwright/test';

const URL = '/pronostics.html#tous';
const SPORTS = ['football', 'tennis', 'basketball', 'baseball', 'hockey'];

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
    } catch (e) {}
  });
});

async function pickMatches(page) {
  return page.evaluate((sports) => {
    const days = window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.days || {};
    const events = Object.values(days).flat().filter(Boolean);
    const bySport = {};
    const normSport = (value) => String(value || '').toLowerCase();
    for (const sport of sports) {
      const match = events.find(e => normSport(e.sport || e.sport_key || e.sport_name).includes(sport));
      if (match) {
        const sides = Array.isArray(match.competitors) ? match.competitors : [];
        bySport[sport] = {
          id: String(match.id || ''),
          label: sides.map(c => c && c.name).filter(Boolean).slice(0, 2).join(' vs ') || match.name || sport,
        };
      }
    }
    return bySport;
  }, SPORTS);
}

async function openMatch(page, id) {
  await page.evaluate((matchId) => {
    const days = window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.days || {};
    const events = Object.values(days).flat().filter(Boolean);
    const match = events.find(e => String(e.id || '') === String(matchId));
    if (!match) throw new Error(`match ${matchId} not found`);
    if (typeof window.openDetail !== 'function') throw new Error('window.openDetail unavailable');
    window.openDetail(match);
  }, id);
  await expect(page.locator('#detail-modal.open')).toBeVisible({ timeout: 5000 });
  const techToggle = page.locator('#detail-modal.open [data-why-tech-toggle]');
  if (await techToggle.count()) {
    await techToggle.click();
    await expect(techToggle).toHaveAttribute('aria-expanded', 'true');
  }
}

test('detail modal tabs render and switch on representative sports', async ({ page }) => {
  test.setTimeout(90_000);
  const failures = [];
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));
  page.on('popup', popup => popup.close().catch(() => {}));

  await page.goto(URL);
  await page.waitForFunction(() => !!(window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.days), null, { timeout: 10000 });
  await page.evaluate(async () => {
    if (window.PRONOSTICS_DATA?._lite && typeof window._ensureFullData === 'function') {
      await window._ensureFullData();
    }
  });
  await page.waitForTimeout(700);
  const picks = await pickMatches(page);

  for (const sport of SPORTS) {
    const pick = picks[sport];
    if (!pick) continue;
    errors.length = 0;
    try {
      await openMatch(page, pick.id);
      const tabRoot = '#detail-modal.open .why-tech-panel:not([hidden])';
      const tabs = await page.locator(`${tabRoot} .md-tab`).evaluateAll(nodes =>
        nodes.map(n => ({
          key: n.getAttribute('data-mtab-toggle') || '',
          label: (n.textContent || '').trim().replace(/\s+/g, ' '),
        }))
      );
      expect(tabs.length, `${sport} should expose useful tabs`).toBeGreaterThanOrEqual(2);
      for (const tab of tabs) {
        const tabLocator = page.locator(`${tabRoot} .md-tab[data-mtab-toggle="${tab.key}"]`);
        await tabLocator.click();
        await expect(tabLocator).toHaveAttribute('aria-selected', 'true');
        const visibleSections = await page.locator(`${tabRoot} [data-mtab="${tab.key}"]`).evaluateAll(nodes =>
          nodes.filter(n => getComputedStyle(n).display !== 'none').length
        );
        expect(visibleSections, `${sport}/${tab.key} should show tab content`).toBeGreaterThan(0);
      }
      const realErrors = errors.filter(e =>
        !/favicon|sourcemap|Failed to load resource|net::ERR_ABORTED|40\d/i.test(e)
      );
      if (realErrors.length) failures.push(`${sport}: ${realErrors.join(' | ')}`);
      await page.keyboard.press('Escape').catch(() => {});
    } catch (err) {
      failures.push(`${sport} ${pick.label}: ${err.message}`);
      await page.keyboard.press('Escape').catch(() => {});
    }
  }

  expect(Object.keys(picks).length).toBeGreaterThanOrEqual(3);
  expect(failures).toEqual([]);
});
