// SPA pages regression smoke (v34.33).
//
// The site exposes five official hubs. Legacy hashes are still accepted, but
// they must redirect to one of those hubs rather than resurrect old pages.

import { test, expect } from '@playwright/test';

const URL = '/pronostics.html';

const SPA_PAGES = [
  'dashboard',
  'top',
  'valeur',
  'plan-mise',
  'locks',
  'bilan',
  'historique',
  'performance',
  'tous',
  'calendrier',
  'combines',
  'buteurs',
  'compare',
  'credibilite',
  'backtest',
  'academie',
  'profil',
  'sante',
  'legal',
  'favoris',
  'alertes',
  'matchs',
  'montantes',
  'montante-jour',
  'montante-weekend',
  'montante-semaine',
  'simulator',
];

const HASH_EXPECTATIONS = {
  top: '#dashboard',
  locks: '#dashboard',
  matchs: '#dashboard',
  valeur: '#tous',
  'plan-mise': '#tous',
  calendrier: '#tous?view=calendar',
  combines: '#combines',
  buteurs: '#buteurs',
  compare: '#compare',
  favoris: '#profil',
  alertes: '#profil',
  bilan: '#bilan',
  historique: '#historique',
  backtest: '#backtest',
  credibilite: '#credibilite',
  simulator: '#profil',
  sante: '#profil',
  legal: '#profil',
  montantes: '#montantes',
  'montante-jour': '#montantes',
  'montante-weekend': '#montantes',
  'montante-semaine': '#montantes',
};

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      localStorage.setItem('userPrefs', JSON.stringify({
        onboardingDone: true,
        level: 'confirme',
        consentLocalStorage: 'accepted',
      }));
      localStorage.setItem('paris_sportif_onboarded_v2', '1');
      localStorage.setItem('cookieConsent', 'accepted');
    } catch (e) {}
  });
});

test('all SPA hash pages render without console errors or horizontal overflow', async ({ page, viewport }) => {
  test.setTimeout(120_000);
  const messages = [];
  page.on('console', msg => {
    if (msg.type() === 'error') messages.push(msg.text());
  });
  page.on('pageerror', err => messages.push(String(err)));

  for (const hash of SPA_PAGES) {
    messages.length = 0;
    await page.goto(`${URL}#${hash}`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await page.waitForFunction(() => !!(window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.days), null, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(hash === 'backtest' || hash === 'performance' ? 1800 : 900);

    const state = await page.evaluate(() => {
      const visible = el => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
      };
      const bottom = document.getElementById('mobile-bottom-nav');
      const br = bottom ? bottom.getBoundingClientRect() : null;
      return {
        hash: location.hash,
        hasHeading: [...document.querySelectorAll('h1,h2,h3')].some(visible),
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        bottomNavVisible: !bottom || innerWidth > 720 || (getComputedStyle(bottom).display === 'flex' && br.width > 300 && br.height > 40),
      };
    });

    const realErrors = messages.filter(e =>
      !/favicon|sourcemap/i.test(e) &&
      !/Failed to load resource.*40\d/i.test(e)
    );
    expect(realErrors, `${hash} console errors`).toEqual([]);
    expect(state.hash, `${hash} hash`).toBe(HASH_EXPECTATIONS[hash] || `#${hash}`);
    expect(state.hasHeading, `${hash} heading`).toBe(true);
    expect(state.overflowX, `${hash} overflow-x`).toBeLessThanOrEqual(0);
    if (viewport && viewport.width <= 720) {
      expect(state.bottomNavVisible, `${hash} mobile bottom nav`).toBe(true);
    }
  }
});

test('mobile bottom nav highlights the right intent for deep pages', async ({ page, viewport }) => {
  test.skip(viewport && viewport.width > 720, 'Mobile-only test');

  const cases = [
    ['#dashboard', 'Accueil'],
    ['#locks', 'Accueil'],
    ['#tous', 'Tous'],
    ['#historique', 'Mes paris'],
    ['#simulator', 'Plus'],
    ['#methodologie', 'Méthode'],
  ];

  for (const [hash, expected] of cases) {
    await page.goto(`${URL}${hash}`);
    await page.waitForFunction(() => !!document.querySelector('#mobile-bottom-nav .mbn-btn.active'), null, { timeout: 10000 });
    const activeLabels = await page.locator('#mobile-bottom-nav .mbn-btn.active .mbn-label').evaluateAll(els =>
      els.map(el => (el.textContent || '').trim())
    );
    expect(activeLabels, `${hash} active bottom intent`).toContain(expected);
  }
});
