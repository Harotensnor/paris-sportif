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

// The onboarding modal (`.onboard-overlay`, z-index 9999) appears 800ms after
// boot if `userPrefs.onboardingDone` isn't set. In a fresh Playwright context
// localStorage is empty, so the overlay covers every interactive element and
// every click-based test ends up "intercepted by .onboard-overlay". Pre-stamp
// the flag via addInitScript so the modal short-circuits before painting.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
      prefs.onboardingDone = true;
      localStorage.setItem('userPrefs', JSON.stringify(prefs));
    } catch (e) {}
  });
});

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
    // No console errors during boot (warnings allowed). The ESPN CDN serves
    // 404s for some league/team logos (e.g. esp_1, ger_1) — these surface as
    // "Failed to load resource: 404" but they're cosmetic (the <img> just
    // renders a broken icon) and we filter them too so the test stays signal,
    // not noise.
    const realErrors = errors.filter(e =>
      !/favicon|sourcemap/i.test(e) &&
      !/Failed to load resource.*40\d/i.test(e)
    );
    expect(realErrors).toEqual([]);
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
    await page.evaluate(() => { location.hash = '#tous'; });
    await page.waitForFunction(() => localStorage.getItem('currentPage') === 'tous', { timeout: 5000 });
    await expect(page.locator('[data-tous-sort]')).toBeVisible();

    // Capture initial first-row id
    const before = await page.locator('.tous-row').first().getAttribute('data-match-id');
    test.skip(!before, 'No rows today — cannot test sort');

    // Change sort to "edge"
    await page.locator('[data-tous-sort]').selectOption('edge');
    await page.waitForFunction(() => localStorage.getItem('tousSort') === 'edge');

    // Reload — sort should persist
    await page.reload();
    await page.evaluate(() => { location.hash = '#tous'; });
    await page.waitForFunction(() => localStorage.getItem('currentPage') === 'tous', { timeout: 5000 });
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
    // Date nav is hidden on the dashboard (`body.agent-home` rule). Navigate
    // to a page where the topbar shows the date arrows (Tous works).
    await page.evaluate(() => { location.hash = '#tous'; });
    await page.waitForFunction(() => localStorage.getItem('currentPage') === 'tous', { timeout: 5000 });
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
    // Navigate to credibilite via hash so the global currentPage var stays in sync
    await page.evaluate(() => { location.hash = '#credibilite'; });
    await page.waitForFunction(() => localStorage.getItem('currentPage') === 'credibilite', { timeout: 5000 });
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
    // Ensure no tracked bets, then navigate via hash
    await page.evaluate(() => { localStorage.removeItem('paris_sportif_tracked_bets'); });
    await page.evaluate(() => { location.hash = '#mesparis'; });
    await page.waitForFunction(() => localStorage.getItem('currentPage') === 'mesparis', { timeout: 5000 });
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
    // Press ? (Shift+/ on US/FR keyboards). Playwright sends `Shift+/` as
    // key='/' with shiftKey=true, which our `/` handler swallows for the
    // search focus shortcut. Pressing `?` directly produces e.key='?' and
    // hits the help modal handler.
    await page.keyboard.press('?');
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
    await page.evaluate(() => { location.hash = '#tous'; });
    await page.waitForFunction(() => localStorage.getItem('currentPage') === 'tous', { timeout: 5000 });
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

// v30 — Tests for last batch of features
test.describe('Hash navigation (PWA shortcuts)', () => {
  test('location.hash=#locks navigates to Locks page', async ({ page }) => {
    await page.goto(URL + '#locks');
    await expect.poll(async () =>
      await page.evaluate(() => localStorage.getItem('currentPage'))
    ).toBe('locks');
    // Locks wrap should be visible (children > 0)
    await page.waitForFunction(() => {
      const w = document.getElementById('locks-wrap');
      return w && w.children.length > 0;
    }, { timeout: 3000 });
  });
});

test.describe('Daily P&L chip (with corrupted bet data)', () => {
  test('renders without NaN/Invalid Date even when bet fields are strings', async ({ page }) => {
    await page.goto(URL);
    const todayIso = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
    await page.evaluate((iso) => {
      // Inject mix of valid + corrupted bets
      localStorage.setItem('paris_sportif_tracked_bets', JSON.stringify({
        b1: { added_at: `${iso}T08:00:00Z`, stake: 'abc', odds: 'xyz', status: 'gagné' },
        b2: { added_at: `${iso}T10:00:00Z`, stake: 5, odds: 2.0, status: 'gagné' },
        b3: { added_at: 'bad-date', stake: 3, odds: 1.8, status: 'perdu' },
      }));
    }, todayIso);
    // Force re-render after the corrupted bets are seeded; dashboard is the
    // default page so we just call applyPageView (no nav change needed).
    await page.evaluate(() => { if (typeof applyPageView === 'function') applyPageView(); });
    const dashWrap = page.locator('#dashboard-wrap');
    const txt = await dashWrap.innerText();
    expect(txt).not.toMatch(/\bNaN\b/);
    expect(txt).not.toMatch(/Invalid Date/i);
    expect(txt).not.toMatch(/undefined/i);
    // Daily P&L chip should be visible
    await expect(dashWrap.locator('text=AUJOURD\'HUI').first()).toBeVisible();
    // Cleanup
    await page.evaluate(() => localStorage.removeItem('paris_sportif_tracked_bets'));
  });
});

test.describe('Notif toggle button', () => {
  test('renders in topbar with appropriate state', async ({ page }) => {
    await page.goto(URL);
    const notifBtn = page.locator('#notif-toggle');
    await expect(notifBtn).toBeVisible();
    const icon = await notifBtn.textContent();
    expect(['🔕', '🔔']).toContain(icon.trim());
  });
});

test.describe('Health indicator', () => {
  test('renders dot with appropriate color/title', async ({ page }) => {
    await page.goto(URL);
    const healthBtn = page.locator('#health-indicator');
    await expect(healthBtn).toBeVisible();
    // Title should describe pipeline state once health.json fetched
    await expect.poll(async () => await healthBtn.getAttribute('title'), {
      timeout: 5000
    }).toMatch(/Pipeline|sant|chargement|indisponible/i);
  });
});

test.describe('Custom modals (replace prompt/confirm)', () => {
  test('_showStakePrompt opens with quick presets and resolves on Valider', async ({ page }) => {
    await page.goto(URL);
    await page.waitForFunction(() => typeof window._showStakePrompt === 'function');
    // Trigger modal
    const valuePromise = page.evaluate(() => window._showStakePrompt('5', 'Test mise'));
    const modal = page.locator('#__stake-prompt-modal');
    await expect(modal).toBeVisible();
    // Quick preset 10€
    await modal.locator('[data-quick="10"]').click();
    await expect(modal.locator('#__stake-input')).toHaveValue('10');
    // Click valider
    await modal.locator('#__stake-ok').click();
    expect(await valuePromise).toBe('10');
  });

  test('_showConfirm danger style + cancel returns false', async ({ page }) => {
    await page.goto(URL);
    await page.waitForFunction(() => typeof window._showConfirm === 'function');
    const valuePromise = page.evaluate(() => window._showConfirm({
      title: 'Test',
      body: 'Body',
      confirmLabel: 'Yes',
      cancelLabel: 'No',
      danger: true,
    }));
    const modal = page.locator('#__confirm-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('#__confirm-ok')).toContainText('Yes');
    // Click cancel
    await modal.locator('#__confirm-cancel').click();
    expect(await valuePromise).toBe(false);
  });

  test('_showConfirm Escape key resolves false', async ({ page }) => {
    await page.goto(URL);
    await page.waitForFunction(() => typeof window._showConfirm === 'function');
    const valuePromise = page.evaluate(() => window._showConfirm({ title: 'Test', body: 'Body' }));
    await expect(page.locator('#__confirm-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    expect(await valuePromise).toBe(false);
  });
});

// Regression guard for the Winamax 1n2 alignment bug fixed in b6b8e1b.
// fetch_winamax_catalog.py persists `home_name` / `away_name` selection
// labels alongside the {home, away} odds so patch_winamax_markets can
// detect when Winamax stored its 'home' selection under what is actually
// ESPN's away competitor (frequent on tennis where the favorite is listed
// first regardless of match-title order). Without these labels, the
// alignment patch silently no-ops and we surface absurd edges (Fils @6.00
// vs Nava on clay was the canary that caught it).
test.describe('Winamax 1n2 alignment integrity', () => {
  test('every winamax.markets.1n2 with labels matches ESPN competitors order', async ({ page }) => {
    await page.goto(URL);
    // Wait for the lazy-loaded full payload (the inline LITE blob covers
    // today; data.js is fetched right after first paint and merged in).
    await page.waitForFunction(() => {
      const d = window.PRONOSTICS_DATA;
      return d && d.days && Object.keys(d.days).length > 1;
    }, { timeout: 8000 });

    const result = await page.evaluate(() => {
      function tokens(s) {
        if (!s) return new Set();
        const norm = String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
        const parts = norm.split(/\s+/).filter(Boolean);
        const out = new Set(parts);
        if (parts.length >= 2) out.add(parts.join(''));
        return out;
      }
      const days = window.PRONOSTICS_DATA?.days || {};
      let total = 0, misaligned = 0;
      const samples = [];
      for (const evs of Object.values(days)) {
        for (const ev of (evs || [])) {
          const n12 = ev?.winamax?.markets?.['1n2'];
          if (!n12 || !n12.home_name || !n12.away_name) continue;
          const comps = ev.competitors || [];
          if (comps.length !== 2) continue;
          const espnHome = comps[0]?.name || '';
          const espnAway = comps[1]?.name || '';
          if (!espnHome || !espnAway) continue;
          total++;
          const wxHomeT = tokens(n12.home_name);
          const espnHomeT = tokens(espnHome);
          const espnAwayT = tokens(espnAway);
          const homeShared = [...wxHomeT].some(t => espnHomeT.has(t));
          const awayShared = [...wxHomeT].some(t => espnAwayT.has(t));
          // Misaligned when Winamax 'home' matches ESPN 'away' but NOT
          // ESPN 'home'. Same logic as patch_winamax_markets._align_markets_to_espn.
          if (awayShared && !homeShared) {
            misaligned++;
            if (samples.length < 5) {
              samples.push({
                espn: `${espnHome} vs ${espnAway}`,
                wx: `${n12.home_name} vs ${n12.away_name}`,
                odds: `${n12.home} | ${n12.away}`,
              });
            }
          }
        }
      }
      return { total, misaligned, samples };
    });

    if (result.misaligned > 0) {
      console.error('Winamax misalignments:', JSON.stringify(result.samples, null, 2));
    }
    expect(result.total).toBeGreaterThan(0);  // sanity : the labels feature is shipped
    expect(result.misaligned).toBe(0);
  });
});
