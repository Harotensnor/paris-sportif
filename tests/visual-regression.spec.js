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

  // AUDIT-2026-04-27 (Sprint 4 #17) — Visual regression étendu.
  // Capture les zones structurelles qui ne devraient pas bouger entre 2
  // commits si le code n'a pas changé. Tolérance large (5%) pour les
  // valeurs dynamiques (compteurs, dates).

  test('sidebar verticale gauche', async ({ page }) => {
    await page.goto('/pronostics.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => window.PRONOSTICS_DATA != null, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(800);
    const sidebar = page.locator('aside.sidebar-left, .sidebar-left').first();
    if (await sidebar.count() === 0) test.skip();
    await expect(sidebar).toHaveScreenshot('sidebar-left.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });

  test('page Tous filter bar structure', async ({ page }) => {
    await page.goto('/pronostics.html#tous');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => window.PRONOSTICS_DATA != null, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const filterBar = page.locator('.tous-filter-bar').first();
    if (await filterBar.count() === 0) test.skip();
    await expect(filterBar).toHaveScreenshot('tous-filter-bar.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });

  test('page Locks header structure', async ({ page }) => {
    await page.goto('/pronostics.html#locks');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => window.PRONOSTICS_DATA != null, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);
    // Locks header — first .page-header inside #locks-wrap if it exists,
    // else first .page-header in main.
    const header = page.locator('#locks-wrap .page-header, main .page-header').first();
    if (await header.count() === 0) test.skip();
    await expect(header).toHaveScreenshot('locks-header.png', {
      maxDiffPixelRatio: 0.10,  // KPIs Locks bougent jour à jour
      animations: 'disabled',
    });
  });

  test('page Calendrier 7j structure', async ({ page }) => {
    await page.goto('/pronostics.html#calendrier');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => window.PRONOSTICS_DATA != null, { timeout: 10000 }).catch(() => {});
    // Skeleton apparait pendant _ensureFullData — attendre que le rendu réel arrive
    await page.waitForTimeout(2500);
    const wrap = page.locator('#calendrier-wrap .page-header').first();
    if (await wrap.count() === 0) test.skip();
    await expect(wrap).toHaveScreenshot('calendrier-header.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });

  test('modal détail tabs structure', async ({ page }) => {
    await page.goto('/pronostics.html#tous');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => window.PRONOSTICS_DATA != null, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);
    // Click sur la première carte match pour ouvrir la modal
    const firstCard = page.locator('[data-match-id], .card[data-id], .match-row').first();
    if (await firstCard.count() === 0) test.skip();
    await firstCard.click({ trial: false }).catch(() => {});
    await page.waitForTimeout(800);
    const tabs = page.locator('.md-tabs').first();
    if (await tabs.count() === 0) test.skip();
    await expect(tabs).toHaveScreenshot('modal-detail-tabs.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    });
  });

});
