import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      localStorage.setItem('cookieConsent', 'accepted');
      localStorage.setItem('paris_sportif_onboarded_v1', '1');
      localStorage.setItem('paris_sportif_onboarded_v2', '1');
      localStorage.setItem('userPrefs', JSON.stringify({ onboardingDone: true, level: 'confirme', consentLocalStorage: 'accepted' }));
      localStorage.removeItem('paris_sportif_user_bets');
      localStorage.removeItem('paris_sportif_winamax_clicks_v1');
    } catch (e) {}
  });
});

async function storageState(page) {
  return page.evaluate(() => {
    const userBets = JSON.parse(localStorage.getItem('paris_sportif_user_bets') || '[]');
    const wx = JSON.parse(localStorage.getItem('paris_sportif_winamax_clicks_v1') || '{"count":0}');
    return {
      userBets: Array.isArray(userBets) ? userBets.length : 0,
      winamaxClicks: Number(wx.count || 0),
    };
  });
}

test('Big Bet conversion path opens modal, tracks Winamax click and records bet', async ({ page }) => {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  page.on('popup', popup => popup.close().catch(() => {}));

  await page.goto('/pronostics.html#dashboard');
  await page.waitForSelector('[data-big-detail]:visible', { timeout: 15000 });
  const detailCta = page.locator('[data-big-detail]:visible').first();
  await expect(detailCta).toBeVisible();
  await detailCta.click();
  await expect(page.locator('#detail-modal.open')).toBeVisible();
  await expect(page.locator('#detail-title')).not.toHaveText('');

  const beforeWx = await storageState(page);
  const wx = await page.evaluate(() => {
    const link = document.querySelector('#detail-modal.open [data-modal-winamax-click]');
    if (!link) return { clicked: false, href: '' };
    const block = (ev) => ev.preventDefault();
    link.addEventListener('click', block, { capture: true, once: true });
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return { clicked: true, href: link.href || '' };
  });
  expect(wx.clicked).toBe(true);
  expect(wx.href).toContain('winamax.fr/paris-sportifs/match/');
  const afterWx = await storageState(page);
  expect(afterWx.winamaxClicks).toBeGreaterThan(beforeWx.winamaxClicks);

  await page.keyboard.press('Escape');
  const beforeBet = await storageState(page);
  const trackCta = page.locator('.action-focus-trackbet:visible').first();
  await expect(trackCta).toBeVisible();
  await trackCta.click();
  await page.waitForTimeout(500);
  const afterBet = await storageState(page);
  expect(afterBet.userBets).toBeGreaterThan(beforeBet.userBets);

  const realErrors = errors.filter(e => !/favicon|sourcemap|Failed to load resource|net::ERR_ABORTED|40\d/i.test(e));
  expect(realErrors).toEqual([]);
});
