import { test, expect } from '@playwright/test';

test.describe('market consistency guard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pronostics.html');
    await page.waitForFunction(
      () => window.__testAPI
        && typeof window.__testAPI.isPairConsistent === 'function'
        && typeof window.__testAPI.validateMarketConsistency === 'function',
      undefined,
      { timeout: 15000 }
    );
  });

  test('detects impossible score/market combinations', async ({ page }) => {
    const results = await page.evaluate(() => {
      const api = window.__testAPI;
      const score = s => ({ market: 'exactScore', key: s, pickValue: s, label: `Score ${s}` });
      const m = (market, key, extra = {}) => ({ market, key, pickKey: key, label: `${market} ${key}`, ...extra });
      const cases = [
        ['1-0 + BTTS Yes', score('1-0'), m('btts', 'BTTS_Y', { side: 'yes' }), false],
        ['1-0 + BTTS No', score('1-0'), m('btts', 'BTTS_N', { side: 'no' }), true],
        ['0-0 + over 2.5', score('0-0'), m('ou25', 'O2.5', { side: 'over', line: 2.5 }), false],
        ['0-0 + under 2.5', score('0-0'), m('ou25', 'U2.5', { side: 'under', line: 2.5 }), true],
        ['2-1 + BTTS Yes', score('2-1'), m('btts', 'BTTS_Y', { side: 'yes' }), true],
        ['2-1 + BTTS No', score('2-1'), m('btts', 'BTTS_N', { side: 'no' }), false],
        ['1-0 + 1N2 1', score('1-0'), m('1n2', '1'), true],
        ['1-0 + 1N2 X', score('1-0'), m('1n2', 'X'), false],
        ['0-2 + BTTS Yes', score('0-2'), m('btts', 'BTTS_Y', { side: 'yes' }), false],
        ['0-2 + 1N2 2', score('0-2'), m('1n2', '2'), true],
        ['1-0 + DC X2', score('1-0'), m('doubleChance', 'X2'), false],
        ['1-0 + DC 1X', score('1-0'), m('doubleChance', '1X'), true],
        ['1-1 + DC 12', score('1-1'), m('doubleChance', '12'), false],
        ['1-1 + DC X2', score('1-1'), m('doubleChance', 'X2'), true],
        ['1-1 + DNB 1', score('1-1'), m('dnb', 'DNB_1', { side: 'home' }), false],
        ['2-0 + DNB 1', score('2-0'), m('dnb', 'DNB_1', { side: 'home' }), true],
        ['2-0 + DNB 2', score('2-0'), m('dnb', 'DNB_2', { side: 'away' }), false],
        ['BTTS Yes + under 1.5', m('btts', 'BTTS_Y', { side: 'yes' }), m('ou15', 'U1.5', { side: 'under', line: 1.5 }), false],
        ['BTTS Yes + under 2.5', m('btts', 'BTTS_Y', { side: 'yes' }), m('ou25', 'U2.5', { side: 'under', line: 2.5 }), true],
        ['1N2 1 + DC X2', m('1n2', '1'), m('doubleChance', 'X2'), false],
        ['1N2 2 + DC 1X', m('1n2', '2'), m('doubleChance', '1X'), false],
        ['1N2 X + DC 12', m('1n2', 'X'), m('doubleChance', '12'), false],
        ['same total over/under conflict', m('ou25', 'O2.5', { side: 'over', line: 2.5 }), m('ou25', 'U2.5', { side: 'under', line: 2.5 }), false],
        ['different total lines can coexist', m('ou15', 'O1.5', { side: 'over', line: 1.5 }), m('ou25', 'U2.5', { side: 'under', line: 2.5 }), true],
        ['same BTTS conflict', m('btts', 'BTTS_Y', { side: 'yes' }), m('btts', 'BTTS_N', { side: 'no' }), false],
      ];
      return cases.map(([name, a, b, expected]) => ({ name, expected, actual: api.isPairConsistent(a, b) }));
    });

    for (const row of results) expect(row.actual, row.name).toBe(row.expected);
  });

  test('keeps only candidates consistent with the selected exact score', async ({ page }) => {
    const result = await page.evaluate(() => {
      const api = window.__testAPI;
      const score = { market: 'exactScore', key: '1-0', pickValue: '1-0', label: 'Score 1-0' };
      const candidates = [
        score,
        { market: 'btts', key: 'BTTS_Y', side: 'yes', label: 'BTTS Oui' },
        { market: 'btts', key: 'BTTS_N', side: 'no', label: 'BTTS Non' },
        { market: 'ou25', key: 'O2.5', side: 'over', line: 2.5, label: 'Over 2.5' },
        { market: 'ou25', key: 'U2.5', side: 'under', line: 2.5, label: 'Under 2.5' },
        { market: '1n2', key: '1', label: 'Home' },
        { market: '1n2', key: 'X', label: 'Draw' },
        { market: 'doubleChance', key: 'X2', label: 'X2' },
        { market: 'doubleChance', key: '1X', label: '1X' },
      ];
      const out = api.validateMarketConsistency(candidates, { anchor: score });
      return {
        consistent: out.consistent.map(c => c.label),
        contradicted: out.contradicted.map(c => c.label),
        reasons: out.contradicted.map(c => c.consistencyConflict && c.consistencyConflict.reason).filter(Boolean),
      };
    });

    expect(result.consistent).toEqual(expect.arrayContaining(['Score 1-0', 'BTTS Non', 'Under 2.5', 'Home', '1X']));
    expect(result.contradicted).toEqual(expect.arrayContaining(['BTTS Oui', 'Over 2.5', 'Draw', 'X2']));
    expect(result.reasons.some(r => r.includes('Score 1-0'))).toBe(true);
  });
});
