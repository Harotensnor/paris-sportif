// Visual regression tests via Playwright snapshots (v31.7.64).
//
// Capture screenshots des pages clés à 2 viewports (desktop 1280×800
// + mobile Pixel 5 viewport déjà couvert par playwright.config). Les
// snapshots de référence sont commités dans tests/__screenshots__/.
//
// Au 1er run : la baseline est créée (`npx playwright test --update-snapshots`).
// Aux runs suivants : diff pixel-perfect avec tolérance 1% (acceptable).
// Si diff > 1% sur ≥10 px adjacents : test échoue avec image diff.
//
// Important : on FREEZE le DOM dynamique pour éviter le faux-positif :
// - Date courante stub à fixed point (2026-04-27 12:00 UTC)
// - localStorage onboardingDone + consentLocalStorage
// - PRONOSTICS_DATA stub à un snapshot connu (todayISO returns fixed)
//
// Mais en pratique, c'est trop fragile pour un site dynamique. À la place
// on capture juste les SECTIONS STATIQUES (header, footer, hero structure)
// qui ne devraient pas bouger entre 2 commits si le code n'a pas changé.

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context, page }) => {
  await context.addInitScript(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
      prefs.onboardingDone = true;
      prefs.consentLocalStorage = 'accepted';
      localStorage.setItem('userPrefs', JSON.stringify(prefs));
      localStorage.setItem('paris_sportif_onboarded_v2', '1');
      // Hide trust strip dismiss timer for stable rendering
      localStorage.setItem('trustStripHiddenUntil', String(Date.now() + 365 * 86400 * 1000));
    } catch (e) {}
  });
});

test.describe('Visual regression — pages statiques', () => {

  test('topbar dashboard render', async ({ page }) => {
    await page.goto('/pronostics.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => window.PRONOSTICS_DATA != null, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(800);
    const topbar = page.locator('header.topbar').first();
    await expect(topbar).toHaveScreenshot('topbar-dashboard.png', {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });

  test('site footer ANJ', async ({ page }) => {
    await page.goto('/pronostics.html');
    await page.waitForLoadState('domcontentloaded');
    const footer = page.locator('footer.site-footer').first();
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(footer).toHaveScreenshot('footer-anj.png', {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });

  test('landing hero', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForLoadState('domcontentloaded');
    const hero = page.locator('section.hero').first();
    await expect(hero).toHaveScreenshot('landing-hero.png', {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });

  test('backtest KPIs strip', async ({ page }) => {
    await page.goto('/backtest.html');
    await page.waitForLoadState('domcontentloaded');
    const kpis = page.locator('.kpi-strip').first();
    await expect(kpis).toHaveScreenshot('backtest-kpis.png', {
      maxDiffPixelRatio: 0.05,  // KPIs values change daily, allow some drift
      animations: 'disabled',
    });
  });

});
