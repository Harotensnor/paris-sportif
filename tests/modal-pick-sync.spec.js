import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    const fixedNow = new Date('2026-05-05T00:10:43Z').getTime();
    const RealDate = Date;
    class FixedDate extends RealDate {
      constructor(...args) {
        if (args.length === 0) return new RealDate(fixedNow);
        return new RealDate(...args);
      }
      static now() { return fixedNow; }
      static parse(value) { return RealDate.parse(value); }
      static UTC(...args) { return RealDate.UTC(...args); }
    }
    Object.setPrototypeOf(FixedDate, RealDate);
    window.Date = FixedDate;
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

test('dashboard rows open the exact same pick in the detail modal', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('/pronostics.html#dashboard');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && document.querySelector('[data-pick-uid]'), null, { timeout: 20_000 });
  await page.waitForTimeout(800);

  const selector = '.v36-table-row[data-pick-uid]:visible, .v36-table-card[data-pick-uid]:visible';
  const count = await page.locator(selector).count();
  expect(count, 'At least one visible V37 pick is required to verify row/modal sync').toBeGreaterThan(0);

  const rows = await page.locator(selector).evaluateAll((els, limit) => els.slice(0, limit).map(el => ({
    uid: el.getAttribute('data-pick-uid') || '',
    label: el.getAttribute('data-pick-label') || '',
    odd: el.getAttribute('data-pick-odd') || '',
    id: el.getAttribute('data-big-detail') || '',
  })), Math.min(50, count));
  const failures = [];
  for (const expected of rows) {
    const clicked = await page.evaluate(uid => {
      const el = Array.from(document.querySelectorAll('[data-pick-uid]'))
        .find(node => node.getAttribute('data-pick-uid') === uid);
      if (!el) return false;
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      el.click();
      return true;
    }, expected.uid);
    if (!clicked) {
      failures.push(`${expected.id}: row disappeared before click`);
      continue;
    }
    await expect(page.locator('#detail-modal.open')).toBeVisible({ timeout: 5_000 });
    const heading = (await page.locator('#why-bet-title').textContent().catch(() => '')) || '';
    const labelNeedle = expected.label.replace(/\s+/g, ' ').trim().slice(0, 34);
    if (labelNeedle && !heading.replace(/\s+/g, ' ').includes(labelNeedle)) {
      failures.push(`${expected.id}: row "${expected.label}" opened "${heading}"`);
    }
    if (expected.odd && !heading.includes(`@${expected.odd}`)) {
      failures.push(`${expected.id}: row odd @${expected.odd} opened "${heading}"`);
    }
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForFunction(() => !document.querySelector('#detail-modal.open'), null, { timeout: 3_000 }).catch(() => {});
  }

  const realErrors = errors.filter(e => !/favicon|sourcemap|Failed to load resource|net::ERR_ABORTED|40\d/i.test(e));
  expect(failures).toEqual([]);
  expect(realErrors).toEqual([]);
});
