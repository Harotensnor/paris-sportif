// v33.34 — Tests fixture-based pour evaluateModelPick.
//
// evaluateModelPick(match, pred) → 'won' | 'lost' | null
//
// Invariants testés :
//   1. Match non-completed → null
//   2. STATUS_RETIRED / WALKOVER / FORFEIT / POSTPONED / CANCELED → null (void)
//   3. Pick "1" + home gagne → 'won'
//   4. Pick "1" + home perd → 'lost'
//   5. Pick "X" + nul → 'won'
//   6. Pick "X" + non-nul → 'lost'
//   7. Tennis sans score numérique mais avec competitor.winner → fallback
import { test, expect } from '@playwright/test';

const URL = '/pronostics.html';

const _make = (overrides) => ({
  id: 'fixture-eval',
  date: '2030-01-01T18:00Z',
  sport: 'football',
  league_code: 'eng.1',
  league_name: 'Premier League',
  status: 'STATUS_FINAL',
  completed: true,
  competitors: [
    { id: '1', name: 'Home', abbr: 'HOM', home_away: 'home', score: '2', winner: true },
    { id: '2', name: 'Away', abbr: 'AWY', home_away: 'away', score: '1', winner: false },
  ],
  ...overrides,
});

const CASES = [
  {
    name: 'Match non-completed → null',
    match: _make({ completed: false }),
    pred: { pick: { key: '1', label: 'Home' } },
    expected: null,
  },
  {
    name: 'STATUS_RETIRED → null (void)',
    match: _make({ status: 'STATUS_RETIRED' }),
    pred: { pick: { key: '1', label: 'Home' } },
    expected: null,
  },
  {
    name: 'STATUS_WALKOVER → null',
    match: _make({ status: 'STATUS_WALKOVER' }),
    pred: { pick: { key: '1', label: 'Home' } },
    expected: null,
  },
  {
    name: 'STATUS_POSTPONED → null',
    match: _make({ status: 'STATUS_POSTPONED' }),
    pred: { pick: { key: '1', label: 'Home' } },
    expected: null,
  },
  {
    name: 'Pick "1" + home gagne 2-1 → won',
    match: _make(),
    pred: { pick: { key: '1', label: 'Home' } },
    expected: 'won',
  },
  {
    name: 'Pick "2" + home gagne 2-1 → lost',
    match: _make(),
    pred: { pick: { key: '2', label: 'Away' } },
    expected: 'lost',
  },
  {
    name: 'Pick "X" + 2-1 → lost (pas de nul)',
    match: _make(),
    pred: { pick: { key: 'X', label: 'Draw' } },
    expected: 'lost',
  },
  {
    name: 'Pick "X" + 2-2 → won',
    match: _make({
      competitors: [
        { id: '1', name: 'Home', home_away: 'home', score: '2', winner: false },
        { id: '2', name: 'Away', home_away: 'away', score: '2', winner: false },
      ],
    }),
    pred: { pick: { key: 'X', label: 'Draw' } },
    expected: 'won',
  },
  {
    name: 'Tennis sans score mais winner=true côté home → "1" gagne',
    match: _make({
      sport: 'tennis',
      league_code: 'atp',
      competitors: [
        { id: '1', name: 'Home', home_away: 'home', score: null, winner: true },
        { id: '2', name: 'Away', home_away: 'away', score: null, winner: false },
      ],
    }),
    pred: { pick: { key: '1', label: 'Home' } },
    expected: 'won',
  },
];

test.describe('evaluateModelPick — fixture-based smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
    await page.waitForFunction(
      () => window.__testAPI && typeof window.__testAPI.evaluateModelPick === 'function',
      { timeout: 15000 }
    );
  });

  for (const c of CASES) {
    test(`evaluateModelPick "${c.name}"`, async ({ page }) => {
      const result = await page.evaluate(({ match, pred }) => {
        try {
          return { ok: true, value: window.__testAPI.evaluateModelPick(match, pred) };
        } catch (e) {
          return { ok: false, err: e.message };
        }
      }, c);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(c.expected);
    });
  }

  test('evaluateModelPick est idempotent', async ({ page }) => {
    const result = await page.evaluate(() => {
      const m = {
        id: 'fixture-idem',
        completed: true,
        status: 'STATUS_FINAL',
        sport: 'football',
        competitors: [
          { home_away: 'home', score: '3', winner: true },
          { home_away: 'away', score: '0', winner: false },
        ],
      };
      const pred = { pick: { key: '1', label: 'Home' } };
      const a = window.__testAPI.evaluateModelPick(m, pred);
      const b = window.__testAPI.evaluateModelPick(m, pred);
      return { same: a === b, value: a };
    });
    expect(result.same).toBe(true);
    expect(result.value).toBe('won');
  });
});
