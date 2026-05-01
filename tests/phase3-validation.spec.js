// Tests Playwright validation finale — Phase 3 (audit final)
// Lance : npx playwright test tests/phase3-validation.spec.js
// 6/6 verts requis avant déploiement validé.
const { test, expect } = require('@playwright/test');

const BASE = 'https://harotensnor.github.io/paris-sportif/pronostics.html';

test('data is fresh (< 1h)', async ({ page }) => {
  await page.goto(BASE + '#dashboard');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.generated_at, { timeout: 15000 });
  const age = await page.evaluate(() => {
    const d = window.PRONOSTICS_DATA;
    return (Date.now() - new Date(d.generated_at).getTime()) / 3600000;
  });
  expect(age).toBeLessThan(1);
});

test('no golf in data', async ({ page }) => {
  await page.goto(BASE + '#dashboard');
  await page.waitForFunction(() => window.PRONOSTICS_DATA, { timeout: 15000 });
  const sports = await page.evaluate(() => {
    const d = window.PRONOSTICS_DATA;
    return [...new Set(Object.values(d.days).flat().map(e => e.sport).filter(Boolean))];
  });
  expect(sports).not.toContain('golf');
});

test('trust strip does not overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1568, height: 900 });
  await page.goto(BASE + '#dashboard');
  await page.waitForTimeout(2000);
  const ok = await page.evaluate(() => {
    const ts = document.querySelector('.trust-strip');
    if (!ts) return true;  // strip hidden = pas d'overflow
    return ts.getBoundingClientRect().width <= window.innerWidth + 1;
  });
  expect(ok).toBe(true);
});

test('modal has 6 decision tiles', async ({ page }) => {
  await page.goto(BASE + '#top');
  await page.waitForTimeout(3000);
  // Click sur la première card pick disponible
  const card = page.locator('.pick-row, .top-pick-card, .top-pick').first();
  if (await card.count() > 0) {
    await card.click();
    await page.waitForTimeout(1500);
  }
  const tiles = await page.locator('.decision-tile').count();
  expect(tiles).toBe(6);
});

test('theme has Auto option', async ({ page }) => {
  await page.goto(BASE + '#profil');
  await page.waitForTimeout(2000);
  await expect(page.locator('[data-theme="auto"]')).toBeVisible();
});

test('pick rows have team logos', async ({ page }) => {
  await page.goto(BASE + '#top');
  await page.waitForTimeout(3000);
  const logos = await page.locator('.pick-row .team__logo').count();
  expect(logos).toBeGreaterThan(0);
});
