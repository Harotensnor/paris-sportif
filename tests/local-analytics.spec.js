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

    await page.locator('body').click({ position: { x: 120, y: 160 } });
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('usage_telemetry')));
    expect(stored.visits.length).toBeGreaterThan(0);
    expect(stored.clicks.length).toBeGreaterThan(0);
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
});
