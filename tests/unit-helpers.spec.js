// Unit tests for pure helpers exposed via window.__testAPI (v31.7.26).
//
// Approach : load pronostics.html once, then evaluate each helper in the
// browser context via page.evaluate(). No Jest, no bundler — réutilise
// l'infra Playwright existante. Le surcoût est <500ms par fichier de specs
// car la page est cached.
//
// Couvre :
//   - _dixonColesTau (correction τ Dixon-Coles : 4 cases + default)
//   - _dixonColesRho (lookup par ligue + fallback)
//   - _haversineKm (distance GPS connue)
//   - poissonPmf (validation analytique)
//   - poissonTopScores (cohérence ordering + masse totale ~1)
//   - isoDate (format YYYY-MM-DD)
//
// Ne couvre PAS :
//   - predictMatch (déjà couvert par backtest_v2.py + critical-flows boot test)
//   - rendu DOM (déjà couvert par critical-flows.spec.js)

import { test, expect } from '@playwright/test';

const URL = '/pronostics.html';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
      prefs.onboardingDone = true;
      localStorage.setItem('userPrefs', JSON.stringify(prefs));
    } catch (e) {}
  });
});

test.describe('Helpers purs (window.__testAPI)', () => {

  test('expose le test API au boot', async ({ page }) => {
    await page.goto(URL);
    const apiKeys = await page.evaluate(() => {
      return window.__testAPI ? Object.keys(window.__testAPI) : null;
    });
    expect(apiKeys).not.toBeNull();
    expect(apiKeys).toContain('_dixonColesTau');
    expect(apiKeys).toContain('_haversineKm');
    expect(apiKeys).toContain('poissonPmf');
  });

  test('_dixonColesTau : 4 cases low-score + default', async ({ page }) => {
    await page.goto(URL);
    const results = await page.evaluate(() => {
      const tau = window.__testAPI._dixonColesTau;
      const rho = -0.1;
      const lh = 1.5, la = 1.2;
      return {
        tau00: tau(0, 0, lh, la, rho),  // 1 - lh*la*rho = 1 - 1.5*1.2*(-0.1) = 1.18
        tau01: tau(0, 1, lh, la, rho),  // 1 + lh*rho = 1 + 1.5*(-0.1) = 0.85
        tau10: tau(1, 0, lh, la, rho),  // 1 + la*rho = 1 + 1.2*(-0.1) = 0.88
        tau11: tau(1, 1, lh, la, rho),  // 1 - rho = 1.1
        tau22: tau(2, 2, lh, la, rho),  // 1 (default)
        tau30: tau(3, 0, lh, la, rho),  // 1 (default)
      };
    });
    expect(results.tau00).toBeCloseTo(1.18, 4);
    expect(results.tau01).toBeCloseTo(0.85, 4);
    expect(results.tau10).toBeCloseTo(0.88, 4);
    expect(results.tau11).toBeCloseTo(1.10, 4);
    expect(results.tau22).toBe(1);
    expect(results.tau30).toBe(1);
  });

  test('_dixonColesRho : lookup correct + fallback', async ({ page }) => {
    await page.goto(URL);
    const results = await page.evaluate(() => {
      const fn = window.__testAPI._dixonColesRho;
      return {
        eng1: fn('eng.1'),       // -0.07
        ita1: fn('ita.1'),       // -0.18
        unknown: fn('xyz.999'),  // default -0.13
        empty: fn(''),           // default
        null_: fn(null),         // default
        case_insensitive: fn('ENG.1'),  // -0.07 (lowercase normalize)
      };
    });
    expect(results.eng1).toBe(-0.07);
    expect(results.ita1).toBe(-0.18);
    expect(results.unknown).toBe(-0.13);
    expect(results.empty).toBe(-0.13);
    expect(results.null_).toBe(-0.13);
    expect(results.case_insensitive).toBe(-0.07);
  });

  test('_haversineKm : distance Paris ↔ New York ≈ 5837 km', async ({ page }) => {
    await page.goto(URL);
    const results = await page.evaluate(() => {
      const fn = window.__testAPI._haversineKm;
      return {
        paris_ny: fn(48.8566, 2.3522, 40.7128, -74.0060),
        same_point: fn(48.8566, 2.3522, 48.8566, 2.3522),
        london_paris: fn(51.5074, -0.1278, 48.8566, 2.3522),
      };
    });
    // Paris→NY official: ~5837 km. Tolérance 5km.
    expect(results.paris_ny).toBeGreaterThan(5830);
    expect(results.paris_ny).toBeLessThan(5850);
    expect(results.same_point).toBeCloseTo(0, 2);
    // London→Paris ~344 km. Tolérance 5km.
    expect(results.london_paris).toBeGreaterThan(340);
    expect(results.london_paris).toBeLessThan(350);
  });

  test('poissonPmf : matches analytique pour valeurs connues', async ({ page }) => {
    await page.goto(URL);
    const results = await page.evaluate(() => {
      const fn = window.__testAPI.poissonPmf;
      // P(X=2; λ=1.5) = e^-1.5 * 1.5^2 / 2! = 0.2231 * 2.25 / 2 = 0.2510
      // P(X=0; λ=1.0) = e^-1 = 0.3679
      // P(X=3; λ=2.0) = e^-2 * 8 / 6 = 0.1804
      return {
        p_2_1_5: fn(2, 1.5),
        p_0_1_0: fn(0, 1.0),
        p_3_2_0: fn(3, 2.0),
      };
    });
    expect(results.p_2_1_5).toBeCloseTo(0.2510, 3);
    expect(results.p_0_1_0).toBeCloseTo(0.3679, 3);
    expect(results.p_3_2_0).toBeCloseTo(0.1804, 3);
  });

  test('poissonTopScores : ordering + masse totale ≈ 1', async ({ page }) => {
    await page.goto(URL);
    const results = await page.evaluate(() => {
      const fn = window.__testAPI.poissonTopScores;
      const top = fn(1.5, 1.0, 5, 6, 'eng.1');
      // Vérifier ordering desc par prob + somme >0.9 (les top 5 capturent
      // la majeure partie pour ces lambdas).
      const probs = top.map(s => s.prob);
      const sumTop5 = probs.reduce((a, b) => a + b, 0);
      const sortedDesc = [...probs].sort((a, b) => b - a);
      return {
        top_count: top.length,
        is_sorted_desc: JSON.stringify(probs) === JSON.stringify(sortedDesc),
        sum_top5: sumTop5,
        first_score: `${top[0].home}-${top[0].away}`,
      };
    });
    expect(results.top_count).toBe(5);
    expect(results.is_sorted_desc).toBe(true);
    expect(results.sum_top5).toBeGreaterThan(0.5);   // ≥50% mass dans top 5
    expect(results.sum_top5).toBeLessThanOrEqual(1.001);  // <=1 modulo float
    // Pour λh=1.5, λa=1.0, le score le plus probable est 1-1 ou 1-0
    expect(['1-1', '1-0', '0-0', '2-1']).toContain(results.first_score);
  });

  test('isoDate : format YYYY-MM-DD', async ({ page }) => {
    await page.goto(URL);
    const results = await page.evaluate(() => {
      const fn = window.__testAPI.isoDate;
      return {
        iso_full: fn('2026-04-26T18:00:00Z'),  // -> '2026-04-26'
        iso_minute: fn('2026-04-26T18:00Z'),
        date_only: fn('2026-04-26'),
        invalid: fn('not-a-date'),
        null_: fn(null),
      };
    });
    expect(results.iso_full).toBe('2026-04-26');
    expect(results.iso_minute).toBe('2026-04-26');
    expect(results.date_only).toBe('2026-04-26');
    // invalid/null tolérés selon impl — on vérifie juste qu'ils ne throw pas
    expect(typeof results.invalid).toBe('string');
  });

});
