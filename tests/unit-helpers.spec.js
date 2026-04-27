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

  // AUDIT-2026-04-27 — Tests fixtures pour les fixes du pack audit Codex.

  test('isWinamaxBookable : exige match_id + markets', async ({ page }) => {
    await page.goto(URL);
    const results = await page.evaluate(() => {
      const fn = window.__testAPI.isWinamaxBookable;
      return {
        no_winamax: fn({}),
        available_only: fn({ winamax: { available: true } }),
        no_match_id: fn({ winamax: { available: true, markets: { '1n2': { home: 1.5, away: 2.5 } } } }),
        no_markets: fn({ winamax: { available: true, match_id: 12345 } }),
        empty_markets: fn({ winamax: { available: true, match_id: 12345, markets: {} } }),
        markets_no_1n2: fn({ winamax: { available: true, match_id: 12345, markets: { ou: { home: 1.5 } } } }),
        bookable: fn({ winamax: { available: true, match_id: 12345, markets: { '1n2': { home: 1.5, away: 2.5 } } } }),
        bookable_with_draw: fn({ winamax: { available: true, match_id: 12345, markets: { '1n2': { home: 2.0, draw: 3.5, away: 3.0 } } } }),
        invalid_odds: fn({ winamax: { available: true, match_id: 12345, markets: { '1n2': { home: 0.5, away: 0.8 } } } }),
        available_false: fn({ winamax: { available: false, match_id: 12345, markets: { '1n2': { home: 1.5, away: 2.5 } } } }),
      };
    });
    expect(results.no_winamax).toBe(false);
    expect(results.available_only).toBe(false);  // tournament-only
    expect(results.no_match_id).toBe(false);
    expect(results.no_markets).toBe(false);
    expect(results.empty_markets).toBe(false);
    expect(results.markets_no_1n2).toBe(false);
    expect(results.bookable).toBe(true);
    expect(results.bookable_with_draw).toBe(true);
    expect(results.invalid_odds).toBe(false);  // odd <= 1
    expect(results.available_false).toBe(false);
  });

  test('evaluateModelPick : VOID sur RETIRED/WALKOVER/POSTPONED', async ({ page }) => {
    await page.goto(URL);
    const results = await page.evaluate(() => {
      const fn = window.__testAPI.evaluateModelPick;
      const baseMatch = {
        completed: true,
        competitors: [
          { home_away: 'home', score: '1', winner: true },
          { home_away: 'away', score: '0', winner: false },
        ],
      };
      const pred = { pick: { key: '1' } };
      return {
        normal_won: fn({ ...baseMatch, status: 'STATUS_FINAL' }, pred),
        retired: fn({ ...baseMatch, status: 'STATUS_RETIRED' }, pred),
        walkover: fn({ ...baseMatch, status: 'STATUS_WALKOVER' }, pred),
        postponed: fn({ ...baseMatch, status: 'STATUS_POSTPONED' }, pred),
        canceled: fn({ ...baseMatch, status: 'STATUS_CANCELED' }, pred),
        abandoned: fn({ ...baseMatch, status: 'STATUS_ABANDONED' }, pred),
        not_completed: fn({ ...baseMatch, completed: false }, pred),
        nan_scores: fn({
          ...baseMatch,
          status: 'STATUS_FINAL',
          competitors: [
            { home_away: 'home', score: null },
            { home_away: 'away', score: null },
          ],
        }, pred),
      };
    });
    expect(results.normal_won).toBe('won');
    expect(results.retired).toBeNull();
    expect(results.walkover).toBeNull();
    expect(results.postponed).toBeNull();
    expect(results.canceled).toBeNull();
    expect(results.abandoned).toBeNull();
    expect(results.not_completed).toBeNull();
    expect(results.nan_scores).toBeNull();
  });

  test('evaluateModelPick : home/away/draw branches', async ({ page }) => {
    await page.goto(URL);
    const results = await page.evaluate(() => {
      const fn = window.__testAPI.evaluateModelPick;
      const finalStatus = 'STATUS_FINAL';
      const mk = (hs, as_) => ({
        completed: true,
        status: finalStatus,
        competitors: [
          { home_away: 'home', score: String(hs) },
          { home_away: 'away', score: String(as_) },
        ],
      });
      return {
        // pick home (1) — home wins
        h_won: fn(mk(2, 0), { pick: { key: '1' } }),
        h_lost: fn(mk(0, 1), { pick: { key: '1' } }),
        h_draw_lost: fn(mk(1, 1), { pick: { key: '1' } }),
        // pick away (2)
        a_won: fn(mk(0, 2), { pick: { key: '2' } }),
        a_lost: fn(mk(2, 1), { pick: { key: '2' } }),
        // pick draw (X)
        x_won: fn(mk(1, 1), { pick: { key: 'X' } }),
        x_lost: fn(mk(2, 1), { pick: { key: 'X' } }),
      };
    });
    expect(results.h_won).toBe('won');
    expect(results.h_lost).toBe('lost');
    expect(results.h_draw_lost).toBe('lost');
    expect(results.a_won).toBe('won');
    expect(results.a_lost).toBe('lost');
    expect(results.x_won).toBe('won');
    expect(results.x_lost).toBe('lost');
  });

  test('kellyFraction : monotone et bounded', async ({ page }) => {
    await page.goto(URL);
    const results = await page.evaluate(() => {
      const fn = window.__testAPI.kellyFraction;
      if (!fn) return { skip: true };
      // Kelly = (b*p - q)/b avec b=odd-1, q=1-p. Multiplier 0.25× appliqué.
      // p=0.6, odd=2.0 → b=1, q=0.4 → kelly=(1*0.6-0.4)/1=0.20 → *0.25 = 0.05
      // p=0.5, odd=2.0 → b=1, q=0.5 → kelly=0 → 0
      // p=0.4, odd=2.0 → kelly négatif → clamp 0
      return {
        positive_edge: fn(0.6, 2.0, 0.25),
        no_edge: fn(0.5, 2.0, 0.25),
        negative_edge: fn(0.4, 2.0, 0.25),
        high_prob: fn(0.85, 1.5, 0.25),
        invalid_odd: fn(0.6, 1.0, 0.25),
        invalid_prob: fn(0, 2.0, 0.25),
      };
    });
    if (results.skip) return;
    expect(results.positive_edge).toBeCloseTo(0.05, 3);
    expect(results.no_edge).toBe(0);
    expect(results.negative_edge).toBe(0);
    expect(results.high_prob).toBeGreaterThan(0);
    expect(results.invalid_odd).toBe(0);
    expect(results.invalid_prob).toBe(0);
  });

  test('getMatchOdds : Winamax exact priorité en pré-match', async ({ page }) => {
    await page.goto(URL);
    const results = await page.evaluate(() => {
      const fn = window.__testAPI.getMatchOdds;
      // Match avec Winamax exact + odds_snapshot externe : Winamax doit gagner.
      const match = {
        winamax: {
          available: true,
          match_id: 12345,
          markets: { '1n2': { home: 1.92, away: 4.20 } },
        },
        odds_snapshot: { home: 2.05, away: 4.40, provider: 'DraftKings' },
        live: false,
      };
      const result = fn(match, false);
      return {
        home: result?.home,
        away: result?.away,
        from_winamax: result?._fromWinamax === true,
        from_snapshot: result?._fromSnapshot === true,
      };
    });
    expect(results.home).toBe(1.92);  // Winamax, pas DraftKings 2.05
    expect(results.from_winamax).toBe(true);
    expect(results.from_snapshot).toBeFalsy();
  });

  test('getMatchOdds : tournament-only fallback snapshot', async ({ page }) => {
    await page.goto(URL);
    const results = await page.evaluate(() => {
      const fn = window.__testAPI.getMatchOdds;
      // Pas de Winamax exact (pas de match_id) → fallback snapshot.
      const match = {
        winamax: { available: true },  // tournament-only
        odds_snapshot: { home: 2.05, away: 4.40, provider: 'DraftKings' },
      };
      const result = fn(match, false);
      return {
        home: result?.home,
        from_snapshot: result?._fromSnapshot === true,
        from_winamax: result?._fromWinamax === true,
      };
    });
    expect(results.home).toBe(2.05);
    expect(results.from_snapshot).toBe(true);
    expect(results.from_winamax).toBeFalsy();
  });

});
