import { test, expect } from '@playwright/test';

const URL = '/pronostics.html';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const done = {
      active: 'done',
      done: ['consent', 'onboarding', 'docs'],
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem('boot_step', JSON.stringify(done));
    localStorage.setItem('ps_docs_onboarding_done_v1', '1');
    localStorage.setItem('ps_privacy_ack_v2', '1');
    localStorage.setItem('paris_sportif_onboarded_v2', '1');
    sessionStorage.setItem('autoRefreshDoneAt', String(Date.now()));
  });
});

test('NEW-A keeps heavy signal modules out of the initial boot path', async ({ page }) => {
  await page.goto(URL + '#dashboard');
  await page.waitForFunction(() => window.PS_APP_SHELL && window.PRONOSTICS_DATA, null, { timeout: 15000 });
  await page.waitForTimeout(2200);

  const state = await page.evaluate(() => {
    const heavy = ['data.js', 'bayesian_priors.js', 'cold_start_v5.js', 'team_priors.js'];
    const resources = performance.getEntriesByType('resource').map(entry => entry.name);
    const status = window.PS_LAZY_SIGNAL_STATUS || {};
    return {
      lazyCount: document.querySelectorAll('script[type="text/plain"][data-ps-lazy-script]').length,
      loadedHeavyScripts: heavy.filter(name => document.querySelector(`script[src*="${name}"]`)),
      fetchedHeavyResources: heavy.filter(name => resources.some(url => url.includes(name))),
      scheduled: window.__psLazySignalsScheduled === true,
      lazyLoaded: status.loaded || 0,
      lazyPending: status.pending || 0,
    };
  });

  expect(state.lazyCount).toBeGreaterThan(20);
  expect(state.loadedHeavyScripts).toEqual([]);
  expect(state.fetchedHeavyResources).toEqual([]);
  expect(state.scheduled).toBe(true);
  expect(state.lazyLoaded).toBe(0);
  expect(state.lazyPending).toBeGreaterThan(20);
});

test('BUG-005 closes detail modals by cleaning #match hashes', async ({ page }) => {
  await page.goto(URL + '#dashboard');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && typeof window.openDetail === 'function', null, { timeout: 15000 });

  const matchId = await page.evaluate(() => {
    const events = Object.values(window.PRONOSTICS_DATA.days || {}).flat().filter(Boolean);
    return String((events.find(event => event && event.id) || {}).id || '');
  });
  test.skip(!matchId, 'Aucun match disponible dans le dataset local.');

  await page.evaluate((id) => { location.hash = `#match/${id}`; }, matchId);
  await expect(page.locator('#detail-modal.open')).toBeVisible({ timeout: 5000 });
  await page.keyboard.press('Escape');
  await expect.poll(async () => page.evaluate(() => location.hash)).not.toMatch(/^#match\//);
  await expect(page.locator('#detail-modal.open')).toHaveCount(0);

  await page.evaluate(() => { location.hash = '#match/__missing_round2__'; });
  await expect.poll(async () => page.evaluate(() => location.hash)).not.toMatch(/^#match\//);
  await expect(page.locator('#detail-modal.open')).toHaveCount(0);
});

test('NEW-B and BUG-001 keep tablet nav visible and toolbar sticky', async ({ page }) => {
  await page.setViewportSize({ width: 852, height: 900 });
  await page.goto(URL + '#dashboard');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && typeof window.applyPageView === 'function', null, { timeout: 15000 });
  await page.evaluate(() => {
    window.PRONOSTICS_DATA.generated_at = new Date().toISOString();
    localStorage.setItem('paris_sportif_v36_home_filter', JSON.stringify({ date: 'all', sort: 'tier' }));
    window.applyPageView();
  });
  await page.waitForFunction(() =>
    document.querySelector('#mobile-bottom-nav') &&
    document.querySelector('.v36-table-toolbar') &&
    document.querySelector('.v36-picks-table thead th'),
    null,
    { timeout: 15000 }
  );

  const nav = await page.locator('#mobile-bottom-nav').evaluate(el => {
    const rect = el.getBoundingClientRect();
    const styles = getComputedStyle(el);
    return {
      display: styles.display,
      top: Math.round(rect.top),
      height: Math.round(rect.height),
    };
  });
  expect(nav.display).toBe('flex');
  expect(nav.height).toBeGreaterThan(40);
  expect(nav.top).toBeLessThan(850);

  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForFunction(() => window.scrollY > 500, null, { timeout: 5000 });
  const toolbar = await page.locator('.v36-table-toolbar').evaluate(el => {
    const rect = el.getBoundingClientRect();
    const styles = getComputedStyle(el);
    return {
      position: styles.position,
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
    };
  });
  expect(toolbar.position).toBe('sticky');
  expect(toolbar.top).toBeGreaterThanOrEqual(0);
  expect(toolbar.top).toBeLessThan(260);

  const tableHead = await page.locator('.v36-picks-table thead th').first().evaluate(el => {
    const rect = el.getBoundingClientRect();
    const styles = getComputedStyle(el);
    return {
      position: styles.position,
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
    };
  });
  expect(tableHead.position).toBe('static');
  expect(tableHead.bottom).toBeLessThanOrEqual(toolbar.top + 1);
});

test('NEW-D preserves completed boot_step across reloads', async ({ page }) => {
  await page.goto(URL + '#dashboard');
  await page.waitForFunction(() => window.__psBootSequence && window.PS_APP_SHELL, null, { timeout: 15000 });
  await page.reload();
  await page.waitForFunction(() => window.__psBootSequence && window.PS_APP_SHELL, null, { timeout: 15000 });

  const bootStep = await page.evaluate(() => JSON.parse(localStorage.getItem('boot_step') || '{}'));
  expect(bootStep.active).toBe('done');
  expect(bootStep.done).toEqual(expect.arrayContaining(['consent', 'onboarding', 'docs']));
  await expect(page.locator('.docs-modal, .onboard-overlay')).toHaveCount(0);
});
