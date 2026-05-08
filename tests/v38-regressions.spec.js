import { test, expect } from '@playwright/test';

const URL = '/pronostics.html';
const HEAVY_BOOT = [
  'data.js',
  'bayesian_priors.js',
  'cold_start_v5.js',
  'team_priors.js',
];

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
      prefs.onboardingDone = true;
      localStorage.setItem('userPrefs', JSON.stringify(prefs));
      localStorage.setItem('boot_step', JSON.stringify({ active: 'done', done: ['consent', 'onboarding', 'docs'], updated_at: new Date().toISOString() }));
      sessionStorage.setItem('autoRefreshDoneAt', String(Date.now()));
      localStorage.removeItem('usage_telemetry_prefs');
    } catch (e) {}
  });
});

test.describe('V38 boot and routing', () => {
  test('dashboard boots on lite data without heavy sidecars or data.js', async ({ page }) => {
    const requested = [];
    page.on('request', req => requested.push(req.url()));

    await page.goto(URL + '#dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      document.querySelector('#dashboard-wrap')?.dataset.dashboardRenderedOnce === '1' &&
      document.querySelector('#footer-version')?.textContent?.trim()?.startsWith('v38'),
      null,
      { timeout: 20000 }
    );
    await page.waitForTimeout(1600);

    const state = await page.evaluate(() => ({
      footer: document.querySelector('#footer-version')?.textContent?.trim() || '',
      appVersion: window.PS_APP_VERSION || '',
      lite: Boolean(window.PRONOSTICS_DATA?._lite),
      h1: document.querySelector('#spa-route-h1')?.textContent?.trim() || '',
      lazy: window.PS_LAZY_SIGNAL_STATUS || null,
    }));

    expect(state.footer).toMatch(/^v38/);
    expect(state.appVersion).toMatch(/^v38/);
    expect(state.lite).toBe(true);
    expect(state.h1).toBe('Pronostics du jour');
    for (const asset of HEAVY_BOOT) {
      expect(requested.some(url => url.includes(asset)), `${asset} must not boot on dashboard`).toBe(false);
    }
    expect(state.lazy?.loaded || 0).toBe(0);
  });

  test('each key SPA route exposes a coherent route H1 and active content', async ({ page }) => {
    const cases = [
      ['dashboard', 'Pronostics du jour', '#dashboard-wrap'],
      ['tous', 'Tous les matchs détectés', '#tous-wrap'],
      ['performance', 'Performance modèle', '#performance-wrap'],
      ['academie', 'Comprendre les bons paris', '#academie-wrap'],
      ['profil', 'Profil et réglages', '#profil-wrap'],
      ['sante', 'Santé du site', '#sante-wrap'],
      ['compare', 'Comparer 2 jours', '#compare-wrap'],
      ['combines', 'Combinés', '#combines-wrap'],
    ];
    for (const [hash, title, wrapSelector] of cases) {
      await page.goto(URL + '#' + hash, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(({ title, wrapSelector }) => {
        const h1 = document.querySelector('#spa-route-h1');
        const wrap = document.querySelector(wrapSelector);
        if (!h1 || !wrap || wrap.hidden) return false;
        const rect = wrap.getBoundingClientRect();
        return h1.textContent.trim() === title && rect.width > 0 && rect.height > 0 && wrap.textContent.trim().length > 20;
      }, { title, wrapSelector }, { timeout: 20000 });
      const firstH1 = await page.locator('h1').first().textContent();
      expect(firstH1.trim()).toBe(title);
      const navItem = page.locator(`.page-btn[data-page="${hash}"]`).first();
      if (await navItem.count()) await expect(navItem).toHaveClass(/active/);
    }
  });
});

test.describe('V38 detail sheet', () => {
  test('valid match opens as a full-screen guided sheet and Escape cleans hash', async ({ page }) => {
    await page.goto(URL + '#dashboard', { waitUntil: 'domcontentloaded' });
    const matchId = await page.evaluate(() => {
      const days = window.PRONOSTICS_DATA?.days || {};
      for (const arr of Object.values(days)) {
        const match = (arr || []).find(m => m && m.id);
        if (match) return String(match.id);
      }
      return '';
    });
    test.skip(!matchId, 'No match in lite data');

    await page.evaluate(id => { location.hash = `#match/${id}/synthese`; }, matchId);
    await page.waitForFunction(() => document.querySelector('#detail-modal.open .modal'), null, { timeout: 15000 });

    const metrics = await page.evaluate(() => {
      const modal = document.querySelector('#detail-modal .modal');
      const r = modal.getBoundingClientRect();
      return {
        width: r.width,
        height: r.height,
        vw: innerWidth,
        vh: innerHeight,
        tabs: document.querySelectorAll('[data-component="detail-tabs"] [data-v38-detail-tab], .v38-detail-tabs .v38-detail-tab').length,
        title: document.querySelector('#detail-title')?.textContent?.trim() || '',
      };
    });

    expect(metrics.width).toBeGreaterThan(metrics.vw * 0.8);
    expect(metrics.height).toBeGreaterThan(metrics.vh * 0.75);
    expect(metrics.tabs).toBeGreaterThanOrEqual(3);
    expect(metrics.title.length).toBeGreaterThan(3);

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#detail-modal')?.classList.contains('open'), null, { timeout: 5000 });
    expect(await page.evaluate(() => location.hash.startsWith('#match/'))).toBe(false);
  });

  test('invalid match hash resets without opening a ghost modal', async ({ page }) => {
    await page.goto(URL + '#dashboard', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { location.hash = '#match/000000/synthese'; });
    await page.waitForTimeout(900);
    const state = await page.evaluate(() => ({
      hash: location.hash,
      open: document.querySelector('#detail-modal')?.classList.contains('open') || false,
      rect: (() => {
        const modal = document.querySelector('#detail-modal .modal');
        if (!modal) return null;
        const r = modal.getBoundingClientRect();
        return { width: r.width, height: r.height };
      })(),
    }));
    expect(state.open).toBe(false);
    expect(state.hash.startsWith('#match/')).toBe(false);
  });
});

test.describe('V38 polish contracts', () => {
  test('Cmd-K/search palette has a stable selector and saved views card stays hidden when empty', async ({ page }) => {
    await page.goto(URL + '#tous', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#tous-wrap') && !document.querySelector('#tous-wrap').hidden, null, { timeout: 20000 });
    await expect(page.locator('[data-component="cmd-k"].command-palette')).toHaveCount(1);
    await expect(page.locator('[data-la-saved-views]')).toHaveCount(0);
    const badgeTitle = await page.locator('#count-sante-alerts').getAttribute('title');
    expect(badgeTitle || '').toMatch(/alerte|santé/i);
  });
});
