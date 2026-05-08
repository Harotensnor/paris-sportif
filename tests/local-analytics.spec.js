import { test, expect } from '@playwright/test';

const URL = '/pronostics.html?docsNoTour=1';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('ps_privacy_ack_v2', '1');
    localStorage.setItem('ps_docs_onboarding_done_v1', '1');
    localStorage.setItem('userPrefs', JSON.stringify({ onboardingDone: true, level: 'confirme' }));
  });
});

test.describe('local analytics personalisation', () => {
  test('records usage locally and exposes a zero-network audit', async ({ page }) => {
    await page.goto(URL);
    await page.waitForFunction(() => Boolean(window.__localAnalyticsAudit && window.__localAnalytics));

    const audit = await page.evaluate(() => window.__localAnalyticsAudit());
    expect(audit.runtimeNetworkCalls).toBe(0);
    expect(audit.storageKey).toBe('usage_telemetry');

    await page.locator('button:visible, a[href]:visible').first().click({ force: true });
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('usage_telemetry')));
    expect(stored.visits.length).toBeGreaterThan(0);
    await expect.poll(async () => {
      return page.evaluate(() => JSON.parse(localStorage.getItem('usage_telemetry') || '{"clicks":[]}').clicks.length);
    }).toBeGreaterThan(0);
  });

  test('renders the personal dashboard and activity timeline', async ({ page }) => {
    await page.goto(`${URL}#my-dashboard`);
    await page.waitForFunction(() => Boolean(window.__localAnalyticsAudit));
    await expect(page.locator('#local-analytics-route')).toContainText('Mon dashboard');
    await expect(page.locator('#local-analytics-route')).toContainText('Picks que tu pourrais aimer');

    await page.goto(`${URL}#activity`);
    await expect(page.locator('#local-analytics-route')).toContainText('Activity');
    await expect(page.locator('[data-la-activity-filter]')).toBeVisible();
  });

  test('keeps recommendation state in localStorage only', async ({ page }) => {
    await page.goto(URL);
    await page.waitForFunction(() => Boolean(window.__localAnalytics));
    await page.evaluate(() => window.__localAnalytics.recordEvent('test_local_only', { sport: 'football' }));

    const result = await page.evaluate(() => ({
      telemetry: Boolean(localStorage.getItem('usage_telemetry')),
      audit: window.__localAnalyticsAudit().runtimeNetworkCalls,
      hasSendBeacon: Boolean(navigator.sendBeacon && false),
    }));
    expect(result.telemetry).toBe(true);
    expect(result.audit).toBe(0);
    expect(result.hasSendBeacon).toBe(false);
  });

  test('BUG-012 removes saved views card outside Tous', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop overlap regression.');
    await page.goto(`${URL}#tous`);
    await page.waitForFunction(() => Boolean(window.__localAnalyticsAudit));
    await expect(page.locator('[data-la-saved-views]')).toBeVisible({ timeout: 10000 });

    await page.goto(`${URL}#bilan`);
    await expect(page.locator('[data-la-saved-views]')).toHaveCount(0, { timeout: 10000 });
    const overlap = await page.evaluate(() => {
      const heading = document.querySelector('#bilan-wrap .page-h1, #bilan-wrap h1');
      const saved = document.querySelector('[data-la-saved-views]');
      if (!heading || !saved) return false;
      const a = heading.getBoundingClientRect();
      const b = saved.getBoundingClientRect();
      return !(b.right < a.left || b.left > a.right || b.bottom < a.top || b.top > a.bottom);
    });
    expect(overlap).toBe(false);
  });
});
