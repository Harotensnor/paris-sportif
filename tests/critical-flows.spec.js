// Critical-flow e2e tests for paris-sportif.
//
// What we cover (5 flows that catch ~90% of user-facing regressions) :
//   1. Boot : page loads, no console errors, dashboard renders
//   2. Hub dropdowns : Pronos hub opens, items navigate to pages
//   3. Theme selector : core dark/light/auto choices persist among premium themes
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

test.describe('Sticky layout', () => {
  test('BUG-001 keeps dashboard sticky chrome attached to the viewport', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop sticky stack is covered here; mobile filters have their own sticky spec.');
    await page.goto(URL + '#dashboard');
    await page.waitForFunction(() =>
      window.PRONOSTICS_DATA &&
      document.querySelector('header.topbar') &&
      document.querySelector('nav.topbar-nav.v36-sidebar') &&
      document.querySelector('.v36-table-toolbar') &&
      document.querySelector('.v36-picks-table thead th'),
      null,
      { timeout: 15000 }
    );

    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForFunction(() => window.scrollY > 500, null, { timeout: 5000 });

    const state = await page.evaluate(() => {
      const metric = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const styles = getComputedStyle(el);
        return {
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          height: Math.round(rect.height),
          position: styles.position,
          display: styles.display,
        };
      };
      return {
        scrollY: Math.round(window.scrollY),
        viewportH: window.innerHeight,
        bodyOverflowY: getComputedStyle(document.body).overflowY,
        bodyOverflowX: getComputedStyle(document.body).overflowX,
        topbar: metric('header.topbar'),
        nav: metric('nav.topbar-nav.v36-sidebar'),
        toolbar: metric('.v36-table-toolbar'),
        tableHead: metric('.v36-picks-table thead th'),
      };
    });

    expect(state.bodyOverflowY).toBe('visible');
    expect(state.bodyOverflowX).toBe('visible');
    expect(state.topbar.position).toBe('sticky');
    expect(state.nav.position).toBe('sticky');
    expect(state.toolbar.position).toBe('sticky');
    expect(state.tableHead.position).toBe('sticky');
    expect(state.topbar.top).toBeGreaterThanOrEqual(0);
    expect(state.topbar.top).toBeLessThan(70);
    expect(state.nav.top).toBeGreaterThanOrEqual(state.topbar.top);
    expect(state.nav.top).toBeLessThan(150);
    expect(state.toolbar.top).toBeGreaterThanOrEqual(0);
    expect(state.toolbar.top).toBeLessThan(state.viewportH / 2);
    expect(state.tableHead.top).toBeGreaterThanOrEqual(state.toolbar.bottom - 4);
    expect(state.tableHead.top).toBeLessThan(state.toolbar.bottom + 90);
  });

  test('BUG-004/011 keeps secondary page headers above the fold', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop audit viewport regression.');
    const cases = [
      ['performance', '#performance-wrap .page-h1', '#performance-wrap [data-perf-tab]'],
      ['compare', '#compare-wrap h1', null],
      ['sante', '#sante-wrap .page-h1', null],
    ];
    for (const [hash, headingSelector, secondarySelector] of cases) {
      await page.goto(URL + '#' + hash);
      await page.waitForFunction((selector) => {
        const el = document.querySelector(selector);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }, headingSelector, { timeout: 15000 });
      await page.waitForTimeout(hash === 'performance' ? 1400 : 600);
      const state = await page.evaluate(({ headingSelector, secondarySelector }) => {
        const metric = selector => {
          const el = selector ? document.querySelector(selector) : null;
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { y: Math.round(r.top), bottom: Math.round(r.bottom) };
        };
        return {
          heading: metric(headingSelector),
          secondary: metric(secondarySelector),
          filtersVisible: (() => {
            const filters = document.getElementById('filters');
            return !!filters && getComputedStyle(filters).display !== 'none' && filters.getBoundingClientRect().height > 0;
          })(),
        };
      }, { headingSelector, secondarySelector });
      expect(state.heading.y, `${hash} heading y`).toBeLessThan(320);
      expect(state.filtersVisible, `${hash} empty filters hidden`).toBe(false);
      if (secondarySelector) expect(state.secondary.y, `${hash} sub-tabs y`).toBeLessThan(440);
    }
  });
});

test.describe('Historique archive', () => {
  test('BUG-010 paginates the archive instead of rendering a 100k px page', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop audit viewport regression.');
    await page.goto(URL + '#historique');
    await page.waitForFunction(() =>
      localStorage.getItem('currentPage') === 'historique' &&
      (document.querySelector('.hist-pick-row') || document.querySelector('.bilan-empty')),
      null,
      { timeout: 15000 }
    );

    const firstPage = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      rows: document.querySelectorAll('.hist-pick-row').length,
      hasPager: !!document.querySelector('.hist-pagination [data-hist-page]'),
      pageLabel: document.querySelector('.hist-pagination')?.textContent || '',
    }));

    expect(firstPage.scrollHeight).toBeLessThan(30000);
    expect(firstPage.rows).toBeLessThanOrEqual(50);

    if (firstPage.hasPager && /Page\s+1\//i.test(firstPage.pageLabel)) {
      const next = page.locator('.hist-pagination [data-hist-page]:not([disabled])').filter({ hasText: /Suivant/i }).first();
      await next.click();
      await page.waitForFunction(() => localStorage.getItem('historiqueArchivePage') === '2', null, { timeout: 5000 });
      const secondPage = await page.evaluate(() => ({
        scrollHeight: document.documentElement.scrollHeight,
        rows: document.querySelectorAll('.hist-pick-row').length,
      }));
      expect(secondPage.scrollHeight).toBeLessThan(30000);
      expect(secondPage.rows).toBeLessThanOrEqual(50);
    }
  });
});

test.describe('Hub navigation', () => {
  test('Explorer hub opens dropdown and item navigates to "Tous"', async ({ page }) => {
    await page.goto(URL);
    const hubBtn = page.locator('nav.topbar-nav .hub .hub-btn').filter({ hasText: /Explorer/i }).first();
    // Desktop only — on mobile the drawer takes a different path
    const isVisible = await hubBtn.isVisible().catch(() => false);
    test.skip(!isVisible, 'Hub-btn not visible on this viewport (mobile uses drawer)');
    await hubBtn.click();
    const dropdown = hubBtn.locator('xpath=ancestor::div[contains(@class,"hub")]/div[contains(@class,"hub-menu")]');
    await expect(dropdown).toBeVisible();
    // Click "Tous les matchs"
    await dropdown.locator('button[data-page="tous"]').click();
    // Should navigate to Tous page (filter bar appears)
    await expect(page.locator('[data-tous-sort]')).toBeVisible();
  });
});

test.describe('Theme toggle', () => {
  test('profile theme selector exposes dark/light/auto and persists', async ({ page }) => {
    await page.goto(URL + '#profil');
    await page.waitForFunction(() => localStorage.getItem('currentPage') === 'profil', { timeout: 5000 });
    const buttons = page.locator('[data-theme-btn]');
    await expect(buttons).toHaveCount(7);
    await expect(page.locator('[data-theme-btn="dark"]')).toHaveCount(1);
    await expect(page.locator('[data-theme-btn="light"]')).toHaveCount(1);
    await expect(page.locator('[data-theme-btn="auto"]')).toHaveCount(1);
    await page.locator('[data-theme-btn="light"]').evaluate(el => el.click());
    await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('userPrefs') || '{}').theme)).toBe('light');
    await page.locator('[data-theme-btn="auto"]').evaluate(el => el.click());
    await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('userPrefs') || '{}').theme)).toBe('auto');
    await page.locator('[data-theme-btn="dark"]').evaluate(el => el.click());
    await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('userPrefs') || '{}').theme)).toBe('dark');
  });

  test('BUG-009 light theme covers dashboard table controls', async ({ page }) => {
    await page.addInitScript(() => {
      const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
      prefs.theme = 'light';
      prefs.onboardingDone = true;
      localStorage.setItem('userPrefs', JSON.stringify(prefs));
    });
    await page.goto(URL + '#dashboard');
    await page.waitForFunction(() =>
      document.documentElement.dataset.theme === 'light' &&
      document.querySelector('.v36-table-panel') &&
      document.querySelector('.v37-day-chip') &&
      document.querySelector('.v36-picks-table thead th'),
      null,
      { timeout: 15000 }
    );

    const colors = await page.evaluate(() => {
      const rgb = (value) => {
        const m = String(value || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?/);
        if (!m) return [0, 0, 0];
        const alpha = m[4] == null ? 1 : Number(m[4]);
        const base = [Number(m[1]), Number(m[2]), Number(m[3])];
        return base.map(n => Math.round(n * alpha + 255 * (1 - alpha)));
      };
      const lum = (selector, prop = 'backgroundColor') => {
        const el = document.querySelector(selector);
        if (!el) return 0;
        const [r, g, b] = rgb(getComputedStyle(el)[prop]);
        return Math.round((r + g + b) / 3);
      };
      return {
        panel: lum('.v36-table-panel'),
        toolbar: lum('.v36-table-toolbar'),
        header: lum('.v36-picks-table thead th'),
        chip: lum('.v37-day-chip'),
        cta: lum('.v37-track-inline'),
      };
    });

    expect(colors.panel).toBeGreaterThan(215);
    expect(colors.toolbar).toBeGreaterThan(215);
    expect(colors.header).toBeGreaterThan(215);
    expect(colors.chip).toBeGreaterThan(215);
    expect(colors.cta).toBeGreaterThan(190);
  });
});

test.describe('Tous page', () => {
  test('filter bar sort + edge filter persist via localStorage', async ({ page, isMobile }) => {
    test.skip(isMobile, 'La vue mobile Tous utilise les cartes; le tri select est couvert en desktop.');
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
    const resetButton = page.locator('[data-tous-reset]').first();
    await expect(resetButton).toBeVisible();
    // Click reset
    await resetButton.click();
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
    await page.goto(URL + '#dashboard');
    const dayNav = page.locator('.v37-day-nav');
    await expect(dayNav).toBeVisible({ timeout: 10000 });
    await expect(dayNav.locator('[data-v37-day]')).toHaveCount(5);
    const labels = await dayNav.locator('[data-v37-day] b').evaluateAll(els =>
      els.map(el => (el.textContent || '').trim())
    );
    expect(labels).toEqual(['7 jours', 'J-2', 'Hier', "Aujourd'hui", 'Demain']);
    expect(labels.join(' ')).not.toMatch(/J\+2|J\+3|J\+4|J\+5/);
    await dayNav.getByRole('button', { name: /Hier/i }).click();
    await expect.poll(async () => page.evaluate(() => {
      const f = JSON.parse(localStorage.getItem('paris_sportif_v36_home_filter') || '{}');
      return f.date || '';
    })).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await dayNav.getByRole('button', { name: /Aujourd'hui/i }).click();
    const today = await page.evaluate(() => new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' }));
    await expect.poll(async () => page.evaluate(() => {
      const f = JSON.parse(localStorage.getItem('paris_sportif_v36_home_filter') || '{}');
      return f.date || '';
    })).toBe(today);
  });
});

test.describe('Audit UX polish', () => {
  test('BUG-014 centers Ctrl+K search palette on secondary pages', async ({ page, viewport }) => {
    test.skip(viewport && viewport.width < 900, 'Desktop command-palette audit.');
    await page.goto(URL + '#academie');
    await page.waitForFunction(() => document.querySelector('#search'), null, { timeout: 10000 });

    await page.keyboard.press('Control+K');
    await page.locator('#search').fill('paris');
    await expect(page.locator('#search-suggest')).toBeVisible({ timeout: 5000 });

    const box = await page.locator('#search-suggest').boundingBox();
    const width = await page.evaluate(() => window.innerWidth);
    expect(box).not.toBeNull();
    expect(Math.abs((box.x + box.width / 2) - (width / 2))).toBeLessThan(24);
    expect(box.width).toBeLessThanOrEqual(740);
  });

  test('BUG-015/016/017/018/019/020/021/022 dashboard minor UX regressions stay fixed', async ({ page, viewport }) => {
    test.skip(viewport && viewport.width < 900, 'Desktop audit viewport.');
    await page.setViewportSize({ width: 1707, height: 900 });
    await page.goto(URL + '#dashboard');
    await page.waitForFunction(() =>
      document.querySelector('.v37-day-nav') &&
      document.querySelector('.v36-table-toolbar') &&
      document.querySelector('nav.topbar-nav .v36-nav-item[data-page="performance"]'),
      null,
      { timeout: 15000 }
    );

    const riskText = await page.locator('.rg-risk-bar').evaluate(el =>
      (el.textContent || '').replace(/\s+/g, ' ').trim()
    );
    expect(riskText).toContain('Jouer comporte des risques : endettement, isolement, dépendance.');

    await expect(page.locator('nav.topbar-nav .v36-nav-item[data-page="performance"]')).toContainText(/Mes paris/i);
    await expect(page.locator('nav.topbar-nav .v36-nav-item[data-page="performance"]')).toContainText(/Performance/i);

    const cta = page.locator('.v37-track-inline').first();
    if (await cta.count()) {
      const box = await cta.boundingBox();
      if (box) expect(box.width).toBeLessThanOrEqual(300);
    }

    const checkbox = await page.locator('.v37-live-toggle input[type="checkbox"]').evaluate(el => {
      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        borderWidth: parseFloat(cs.borderTopWidth),
        borderStyle: cs.borderTopStyle,
      };
    });
    expect(checkbox.width).toBeLessThanOrEqual(24);
    expect(checkbox.height).toBeLessThanOrEqual(24);
    expect(checkbox.borderWidth).toBeGreaterThanOrEqual(1);
    expect(checkbox.borderStyle).not.toBe('none');

    const badge = await page.locator('#count-sante-alerts').evaluate(el => ({
      text: (el.textContent || '').trim(),
      title: el.getAttribute('title') || '',
      aria: el.getAttribute('aria-label') || '',
      kind: el.getAttribute('data-badge-kind') || '',
    }));
    expect(badge.kind).toBe('site-health-alerts');
    expect(`${badge.title} ${badge.aria}`).toMatch(/alerte|Aucune/i);
    expect(badge.text).toMatch(/^$|^[0-9]$|^9\+$/);

    const stale = await page.evaluate(() => {
      if (typeof window.__v37IsStaleLive !== 'function') return null;
      return window.__v37IsStaleLive({
        live: true,
        date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      });
    });
    expect(stale).toBe(true);

    const trigger = page.locator('[data-big-detail]').first();
    test.skip(await trigger.count() === 0, 'No pick available to open detail modal.');
    await trigger.click();
    await expect(page.locator('#detail-modal.open, .modal-backdrop.open')).toBeVisible({ timeout: 5000 });
    const modalSize = await page.locator('#detail-modal .modal').evaluate(el => {
      const r = el.getBoundingClientRect();
      return { width: r.width, height: r.height, vw: innerWidth, vh: innerHeight };
    });
    expect(modalSize.width).toBeGreaterThanOrEqual(modalSize.vw * 0.8);
    expect(modalSize.height).toBeGreaterThanOrEqual(modalSize.vh * 0.75);
  });
});

// v30 — New feature tests added in this autonomous session
test.describe('Crédibilité page', () => {
  test('shows calibration plot + performance breakdown sections', async ({ page }) => {
    await page.goto(URL + '#credibilite');
    await page.waitForFunction(() => localStorage.getItem('currentPage') === 'credibilite', { timeout: 5000 });
    const pageText = page.locator('#app, main, body').first();
    await expect(pageText).toContainText(/MÉTHODE & PREUVES|Comment ça marche/i, { timeout: 10000 });
    await expect(pageText).toContainText(/Calibration|Brier|ROI|modèle/i);
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
    // Click "Backtest" → dedicated backtest view
    await footer.locator('button.footer-link[data-page-link="backtest"]').click();
    await expect.poll(async () =>
      await page.evaluate(() => localStorage.getItem('currentPage'))
    ).toBe('backtest');
  });
});

// v30 — "Mes paris empty state" test retiré : la page elle-même est partie
// (Théo n'enregistre pas ses paris sur le site).

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

  test('BUG-005 Escape closes detail modal and restores dashboard hash', async ({ page }) => {
    await page.goto(URL + '#dashboard');
    await page.waitForFunction(() =>
      localStorage.getItem('currentPage') === 'dashboard' &&
      window.PRONOSTICS_DATA &&
      typeof window.openDetail === 'function',
      null,
      { timeout: 15000 }
    );
    const matchId = await page.evaluate(() => {
      const events = Object.values(window.PRONOSTICS_DATA.days || {}).flat().filter(Boolean);
      return String((events.find(event => event && event.id) || {}).id || '');
    });
    test.skip(!matchId, 'No match available to open detail modal.');

    await page.evaluate((id) => { location.hash = `#match/${id}`; }, matchId);
    await expect(page.locator('#detail-modal.open')).toBeVisible({ timeout: 10000 });
    await expect.poll(async () => page.evaluate(() => location.hash)).toMatch(/^#match\//);

    await page.keyboard.press('Escape');
    await expect(page.locator('#detail-modal.open')).toHaveCount(0);
    await expect.poll(async () => page.evaluate(() => location.hash)).toBe('#dashboard');

    await page.reload();
    await expect(page.locator('#detail-modal.open')).toHaveCount(0);
    await expect.poll(async () => page.evaluate(() => location.hash)).toBe('#dashboard');

    await page.evaluate(() => { location.hash = '#match/__missing_critical__'; });
    await expect.poll(async () => page.evaluate(() => location.hash)).toBe('#dashboard');
    await expect(page.locator('#detail-modal.open')).toHaveCount(0);
  });
});

// v30 — Tests for last batch of features
test.describe('Hash navigation (PWA shortcuts)', () => {
  test('legacy #locks hash redirects explicitly to Tous locks intent', async ({ page }) => {
    await page.goto(URL + '#locks');
    await expect.poll(async () =>
      await page.evaluate(() => localStorage.getItem('currentPage'))
    ).toBe('tous');
    await expect.poll(async () => page.evaluate(() => location.hash)).toBe('#tous?legacy=locks');
    await expect(page.locator('[data-tous-tab]').first()).toBeVisible({ timeout: 10000 });
  });
});

// v30 — "Daily P&L chip" test retiré : le chip lui-même est parti avec
// les paris trackés. Le dashboard reste sain (test "Boot" couvre déjà
// le rendu sans erreur console).

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
  test('health control exposes pipeline state even when hidden in V37 topbar', async ({ page }) => {
    await page.goto(URL);
    const healthBtn = page.locator('#health-indicator');
    await expect(healthBtn).toHaveCount(1);
    await expect.poll(async () => await healthBtn.getAttribute('title'), { timeout: 5000 })
      .toMatch(/Pipeline|sant|chargement|indisponible/i);
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
    await page.goto(URL + '#tous');
    // v38 keeps data.js out of the dashboard boot path. For this integrity
    // check we explicitly hydrate the full payload on a data-heavy route.
    await page.evaluate(() => window._ensureFullData ? window._ensureFullData() : null);
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

// v31 — Smoke tests on the static editorial pages introduced post-audit.
// Each page must :
//  1. Load with status 200 (no 404 on deploy)
//  2. Have the expected canonical URL pointing to itself
//  3. Have a JSON-LD block (structured data presence)
//  4. Have an h1 that's not empty
//  5. Have working cross-links back to / (for nav cohesion)
test.describe('Static editorial pages — SEO sanity', () => {
  const STATIC_PAGES = [
    { url: '/index.html',                    h1Pattern: /Pronostics/, canonical: 'https://harotensnor.github.io/paris-sportif/' },
    { url: '/legal.html',                    h1Pattern: /Légal/,      canonical: 'legal.html' },
    { url: '/methodologie.html',             h1Pattern: /Méthodologie/, canonical: 'methodologie.html' },
    { url: '/academie.html',                 h1Pattern: /Académie/,   canonical: 'academie.html' },
    { url: '/comment-lire-un-prono.html',    h1Pattern: /lire un pronostic/i, canonical: 'comment-lire-un-prono.html' },
    { url: '/backtest.html',                 h1Pattern: /Backtest/,   canonical: 'backtest.html' },
    { url: '/credibilite.html',              h1Pattern: /honnête/i,   canonical: 'credibilite.html' },
  ];

  for (const page of STATIC_PAGES) {
    test(`${page.url} — indexable + canonical + JSON-LD`, async ({ page: pwPage }) => {
      const response = await pwPage.goto(page.url);
      expect(response.status()).toBeLessThan(400);

      // h1 present and matches expected pattern
      const h1 = await pwPage.locator('h1').first().textContent();
      expect(h1).toBeTruthy();
      expect(h1).toMatch(page.h1Pattern);

      // canonical link
      const canonicalHref = await pwPage.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonicalHref).toContain(page.canonical);

      // JSON-LD structured data
      const ldCount = await pwPage.locator('script[type="application/ld+json"]').count();
      expect(ldCount).toBeGreaterThan(0);

      // Cross-link back to /
      const homeLink = pwPage.locator('a[href="./"]').first();
      expect(await homeLink.count()).toBeGreaterThan(0);
    });
  }
});

test.describe('feed.xml — RSS structure', () => {
  test('valid RSS 2.0 with channel + items', async ({ page }) => {
    const response = await page.goto('/feed.xml');
    expect(response.status()).toBeLessThan(400);
    const xml = await response.text();
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('<channel>');
    expect(xml).toContain('<title>Paris-Sportif');
    expect(xml).toContain('<atom:link');
    expect(xml).toContain('<lastBuildDate>');
  });
});

test.describe('humans.txt + security.txt', () => {
  test('humans.txt 200 + content', async ({ page }) => {
    const response = await page.goto('/humans.txt');
    expect(response.status()).toBeLessThan(400);
    const txt = await response.text();
    expect(txt).toContain('Boulnois');
    expect(txt).toContain('TEAM');
  });
  test('.well-known/security.txt 200 + RFC 9116 fields', async ({ page }) => {
    const response = await page.goto('/.well-known/security.txt');
    expect(response.status()).toBeLessThan(400);
    const txt = await response.text();
    expect(txt).toContain('Contact:');
    expect(txt).toContain('Expires:');
    expect(txt).toContain('Canonical:');
  });
});

// =========================================================================
// v31.7.4 — Tests des features récentes (Montante / Modal Contexte / Mobile)
// =========================================================================
test.describe('Montante (séquentielle)', () => {
  test('Montante du weekend ouvre la route Montantes', async ({ page }) => {
    await page.goto(URL + '#montante-weekend');
    await page.waitForFunction(() => localStorage.getItem('currentPage') === 'montantes', { timeout: 5000 });
    await expect(page.getByRole('heading', { name: /Montante/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('Montante du jour redirige aussi vers Montantes', async ({ page }) => {
    await page.goto(URL + '#montante-jour');
    await page.waitForFunction(() => localStorage.getItem('currentPage') === 'montantes', { timeout: 5000 });
    await expect(page.getByRole('heading', { name: /Montante/i }).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Modal détail enrichie', () => {
  test('Section Contexte du match presente sur modal foot', async ({ page }) => {
    await page.goto(URL);
    await page.waitForFunction(() => !!(window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.days));
    // Ouvre un evenement reel. Le dataset live peut ne pas contenir de match foot a venir.
    const opened = await page.evaluate(() => {
      const data = window.PRONOSTICS_DATA || {};
      const events = Object.values(data.days || {}).flat().filter(Boolean);
      const event = events.find(m => m.sport === 'football')
        || events.find(m => !m.completed)
        || events[0];
      if (!event || typeof window.openDetail !== 'function') return false;
      window.openDetail(event);
      return true;
    });
    test.skip(!opened, 'Aucun evenement disponible pour le smoke modal.');
    await expect(page.locator('#detail-modal.open, .modal-backdrop.open')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#detail-title')).toBeVisible();
    // Section Contexte du match doit etre visible
    await expect(page.locator('text=/Contexte du match/i').first()).toBeAttached();
    // La synthese doit exposer du contenu d'analyse, meme si le libelle varie selon le sport/marche.
    const analysisBlocks = page.locator('#detail-modal .modal-body, #detail-modal .md-body, #detail-modal .md-tab');
    await expect(analysisBlocks.first()).toBeVisible();
  });

  test('Modal mobile : sections collapsibles fonctionnent', async ({ page, viewport }) => {
    test.skip(viewport && viewport.width > 720, 'Mobile-only test');
    await page.goto(URL);
    await page.waitForFunction(() => !!(window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.days));
    const opened = await page.evaluate(() => {
      const data = window.PRONOSTICS_DATA || {};
      const events = Object.values(data.days || {}).flat().filter(Boolean);
      const event = events.find(m => m.sport === 'football')
        || events.find(m => !m.completed)
        || events[0];
      if (!event || typeof window.openDetail !== 'function') return false;
      window.openDetail(event);
      return true;
    });
    test.skip(!opened, 'Aucun evenement disponible pour le smoke modal mobile.');
    await expect(page.locator('#detail-modal.open, .modal-backdrop.open')).toBeVisible({ timeout: 3000 });
    const tabs = await page.locator('.md-tab').count();
    const sections = await page.locator('.modal-body .section').count();
    expect(tabs + sections).toBeGreaterThan(1);
  });
});

test.describe('Sidebar 5 catégories (desktop)', () => {
  test('Sidebar contient les hubs actuels', async ({ page, viewport }) => {
    test.skip(viewport && viewport.width < 1100, 'Desktop sidebar mode requires >=1100px');
    await page.goto(URL);
    const hubs = await page.locator('nav.topbar-nav .v36-nav-item').evaluateAll(els =>
      els.map(el => el.dataset.page)
    );
    expect(hubs).toEqual(['dashboard', 'tous', 'performance', 'academie', 'profil']);
  });
});

test.describe('Mobile bottom nav', () => {
  test('Bottom nav affiche les intentions V37 principales', async ({ page, viewport }) => {
    test.skip(viewport && viewport.width > 720, 'Mobile-only test');
    await page.goto(URL);
    const items = await page.locator('#mobile-bottom-nav .mbn-btn').evaluateAll(els =>
      els.map(el => (el.querySelector('.mbn-label') || {}).textContent || '')
    );
    expect(items.length).toBe(5);
    expect(items).toEqual(['Accueil', 'Tous', 'Mes paris', 'Méthode', 'Plus']);
  });

  test('Bouton Menu mobile ouvre la sidebar drawer', async ({ page, viewport }) => {
    test.skip(viewport && viewport.width > 720, 'Mobile-only test');
    await page.goto(URL);
    await page.locator('#mbn-menu-btn').click();
    await expect(page.locator('body')).toHaveClass(/sidebar-open/);
  });
});

test.describe('Top page', () => {
  test('Alias #top redirige vers Tous avec intention legacy top', async ({ page }) => {
    await page.goto(URL + '#top');
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('currentPage'))).toBe('tous');
    await expect.poll(async () => page.evaluate(() => location.hash)).toContain('legacy=top');
    await expect(page.locator('#tous-wrap')).toContainText(/Tous les matchs détectés/i, { timeout: 10000 });
  });
});
