// Critical-flow e2e tests for paris-sportif.
//
// What we cover (5 flows that catch ~90% of user-facing regressions) :
//   1. Boot : page loads, no console errors, dashboard renders
//   2. Hub dropdowns : Pronos hub opens, items navigate to pages
//   3. Theme toggle : 3-state cycle (dark → light → auto → dark)
//   4. Tous page : filter bar + sort persist via localStorage
//   5. Date nav : contextual label updates (Hier/Aujourd'hui/Demain)
//
// What we DON'T cover (deliberate) :
//   • predictMatch correctness (covered by backtest_v2.py snapshot tests)
//   • Match detail modal (too data-dependent ; would need mock fixtures)
//   • Mobile drawer (covered indirectly by Pixel 5 viewport in config)

import { test, expect } from '@playwright/test';

const URL = '/pronostics.html';

test.describe('Boot', () => {
  test('loads without console errors and shows brand', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(URL);
    await expect(page.locator('.topbar-brand')).toBeVisible();
    // PRONOSTICS_DATA must be hydrated into window
    const hasData = await page.evaluate(() => !!(window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.days));
    expect(hasData).toBe(true);
    // No console errors during boot (warnings allowed)
    expect(errors.filter(e => !/favicon|sourcemap/i.test(e))).toEqual([]);
  });
});

test.describe('Hub navigation', () => {
  test('Pronos hub opens dropdown and item navigates to "Tous"', async ({ page }) => {
    await page.goto(URL);
    const hubBtn = page.locator('nav.topbar-nav .hub .hub-btn').filter({ hasText: /Pronos/i }).first();
    // Desktop only — on mobile the drawer takes a different path
    const isVisible = await hubBtn.isVisible().catch(() => false);
    test.skip(!isVisible, 'Hub-btn not visible on this viewport (mobile uses drawer)');
    await hubBtn.click();
    const dropdown = hubBtn.locator('xpath=ancestor::div[contains(@class,"hub")]/div[contains(@class,"hub-menu")]');
    await expect(dropdown).toBeVisible();
    // Click "Tous les pronos"
    await dropdown.locator('button[data-page="tous"]').click();
    // Should navigate to Tous page (filter bar appears)
    await expect(page.locator('[data-tous-sort]')).toBeVisible();
  });
});

test.describe('Theme toggle', () => {
  test('cycles dark → light → auto → dark and persists', async ({ page }) => {
    await page.goto(URL);
    const btn = page.locator('#theme-toggle');
    await expect(btn).toBeVisible();
    // Initial state
    const initial = (await btn.textContent()).trim();
    expect(['🌙', '☀️', '🌓']).toContain(initial);
    // Click 3 times — should cycle through all 3 states and back
    const seen = new Set();
    seen.add(initial);
    for (let i = 0; i < 3; i++) {
      await btn.click();
      seen.add((await btn.textContent()).trim());
    }
    expect(seen.size).toBe(3); // All 3 icons shown across cycle
    // Last click should put us back at the initial state
    const final = (await btn.textContent()).trim();
    expect(final).toBe(initial);
    // Persisted to localStorage
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('userPrefs') || '{}').theme);
    expect(['dark', 'light', 'auto']).toContain(stored);
  });
});

test.describe('Tous page', () => {
  test('filter bar sort + edge filter persist via localStorage', async ({ page }) => {
    await page.goto(URL);
    // Navigate via direct localStorage to bypass mobile/desktop nav differences
    await page.evaluate(() => {
      localStorage.setItem('currentPage', 'tous');
      if (typeof applyPageView === 'function') applyPageView();
    });
    await expect(page.locator('[data-tous-sort]')).toBeVisible();

    // Capture initial first-row id
    const before = await page.locator('.tous-row').first().getAttribute('data-match-id');
    test.skip(!before, 'No rows today — cannot test sort');

    // Change sort to "edge"
    await page.locator('[data-tous-sort]').selectOption('edge');
    await page.waitForFunction(() => localStorage.getItem('tousSort') === 'edge');

    // Reload — sort should persist
    await page.reload();
    await page.evaluate(() => {
      localStorage.setItem('currentPage', 'tous');
      if (typeof applyPageView === 'function') applyPageView();
    });
    await expect(page.locator('[data-tous-sort]')).toBeVisible();
    const sortValue = await page.locator('[data-tous-sort]').inputValue();
    expect(sortValue).toBe('edge');

    // Apply edge ≥ 5% filter
    await page.locator('[data-tous-edge]').selectOption('0.05');
    // Reset button should appear
    await expect(page.locator('[data-tous-reset]')).toBeVisible();
    // Click reset
    await page.locator('[data-tous-reset]').click();
    // localStorage cleared
    const cleared = await page.evaluate(() => ({
      filters: localStorage.getItem('tousFilters'),
      sort: localStorage.getItem('tousSort'),
    }));
    expect(cleared.filters).toBeNull();
    expect(cleared.sort).toBeNull();
  });
});

test.describe('Date nav', () => {
  test('contextual label updates when navigating days', async ({ page }) => {
    await page.goto(URL);
    const todayBtn = page.locator('#today-btn');
    const prev = page.locator('#prev-day');
    const next = page.locator('#next-day');

    // Initial : Aujourd'hui
    await expect(todayBtn).toContainText("Aujourd'hui");

    // Prev → Hier
    await prev.click();
    await expect(todayBtn).toContainText('Hier');

    // Next twice → Demain
    await next.click();
    await next.click();
    await expect(todayBtn).toContainText('Demain');

    // Click today-btn → back to Aujourd'hui
    await todayBtn.click();
    await expect(todayBtn).toContainText("Aujourd'hui");
  });
});

// v30 — New feature tests added in this autonomous session
test.describe('Crédibilité page', () => {
  test('shows calibration plot + performance breakdown sections', async ({ page }) => {
    await page.goto(URL);
    // Wait for backtest_report_v2.json to be fetched
    await page.waitForFunction(() => window.__backtestReportV2 != null, { timeout: 5000 });
    // Navigate to credibilite via direct localStorage
    await page.evaluate(() => {
      localStorage.setItem('currentPage', 'credibilite');
      if (typeof applyPageView === 'function') applyPageView();
    });
    // Check sections present
    await expect(page.locator('h2', { hasText: '📊 Performance par segment' })).toBeVisible();
    await expect(page.locator('h2', { hasText: '🎯 Calibration du modèle' })).toBeVisible();
    // SVG plot
    const svg = page.locator('svg[viewBox="0 0 380 280"]');
    await expect(svg).toBeVisible();
    // At least the diagonal line should be present
    await expect(svg.locator('line[stroke-dasharray="4,4"]')).toHaveCount(1);
  });
});

test.describe('Footer', () => {
  test('renders with GitHub link + page-link buttons that navigate', async ({ page }) => {
    await page.goto(URL);
    const footer = page.locator('footer.site-footer');
    await expect(footer).toBeVisible();
    // GitHub link
    const ghLink = footer.locator('a[href*="github.com"]');
    await expect(ghLink).toBeVisible();
    expect(await ghLink.getAttribute('href')).toContain('paris-sportif');
    // Click "Méthode" → navigate to credibilite
    await footer.locator('button.footer-link', { hasText: 'Méthode' }).click();
    await expect.poll(async () =>
      await page.evaluate(() => localStorage.getItem('currentPage'))
    ).toBe('credibilite');
  });
});

test.describe('Mes paris empty state', () => {
  test('shows 3 actionable CTAs when no tracked bets', async ({ page }) => {
    await page.goto(URL);
    // Ensure no tracked bets
    await page.evaluate(() => {
      localStorage.removeItem('paris_sportif_tracked_bets');
      localStorage.setItem('currentPage', 'mesparis');
      if (typeof applyPageView === 'function') applyPageView();
    });
    const wrap = page.locator('#mesparis-wrap');
    await expect(wrap.locator('button.page-btn[data-page="top"]')).toBeVisible();
    await expect(wrap.locator('button.page-btn[data-page="locks"]')).toBeVisible();
    await expect(wrap.locator('button.page-btn[data-page="tous"]')).toBeVisible();
    // Click "Top Pronos" CTA → navigate
    await wrap.locator('button.page-btn[data-page="top"]').click();
    await expect.poll(async () =>
      await page.evaluate(() => localStorage.getItem('currentPage'))
    ).toBe('top');
  });
});

test.describe('Help modal', () => {
  test('opens with ? key and lists keyboard shortcuts', async ({ page }) => {
    await page.goto(URL);
    // Press ? (Shift+/)
    await page.keyboard.press('Shift+/');
    const modal = page.locator('#__shortcuts-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Raccourcis clavier');
    await expect(modal).toContainText('Maj+T');
    await expect(modal).toContainText('Focus la recherche');
    // Esc closes
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden().catch(async () => {
      // Modal may be removed entirely from DOM
      await expect(page.locator('#__shortcuts-modal')).toHaveCount(0);
    });
  });
});

test.describe('Match modal — Reims regression', () => {
  test('clicking a Tous row opens modal with valid team names (no "undefined vs undefined")', async ({ page }) => {
    await page.goto(URL);
    await page.evaluate(() => {
      localStorage.setItem('currentPage', 'tous');
      if (typeof applyPageView === 'function') applyPageView();
    });
    const rows = page.locator('.tous-row[data-match-id]');
    const count = await rows.count();
    test.skip(count === 0, 'No rows today — cannot test modal');
    await rows.first().click();
    const title = page.locator('#detail-title');
    await expect(title).toBeVisible();
    const text = await title.textContent();
    expect(text).not.toMatch(/undefined/i);
    expect(text.trim()).not.toBe('vs');
  });
});
