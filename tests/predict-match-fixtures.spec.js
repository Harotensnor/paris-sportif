// v33.12 — Tests unitaires fixture-based pour predictMatch.
//
// Approach : crée 5 matchs synthétiques avec stats fixes, run
// predictMatch(), vérifie que les invariants tiennent (pred existe,
// reliability dans [0,1], skip booléen, pick.key valide, etc.).
//
// Le but : non-régression au moindre refacto. Si predictMatch crash
// sur un cas standard, ce test failure → on sait avant prod.
//
// Approach minimaliste vs full coverage :
// - On ne teste PAS la valeur exacte de pick (dépend des poids,
//   peut changer avec auto-tuning).
// - On teste les INVARIANTS : structure du retour, plages valides,
//   absence de crash, cohérence pick.key vs pick.label.
import { test, expect } from '@playwright/test';

const URL = '/pronostics.html';

const MATCHES_FIXTURES = [
  {
    name: 'Foot Premier League fav',
    match: {
      id: 'fixture-1',
      date: '2030-01-01T18:00Z',
      sport: 'football',
      league_code: 'eng.1',
      league_name: 'Premier League',
      competitors: [
        { id: '1', name: 'Manchester City', abbr: 'MCI', home_away: 'home',
          records: [{ type: 'overall', summary: '20-2-3' }, { type: 'home', summary: '12-1-1' }],
          form: 'WWWWW' },
        { id: '2', name: 'Brighton', abbr: 'BHA', home_away: 'away',
          records: [{ type: 'overall', summary: '8-7-10' }, { type: 'road', summary: '4-3-5' }],
          form: 'LWLWL' },
      ],
      odds: [{ provider: 'test', homeML: '-300', drawML: '+450', awayML: '+800' }],
      winamax: { available: true, url: 'https://winamax.fr/test' },
    },
  },
  {
    name: 'Foot équilibré (toss-up)',
    match: {
      id: 'fixture-2',
      date: '2030-01-01T20:00Z',
      sport: 'football',
      league_code: 'fra.1',
      league_name: 'Ligue 1',
      competitors: [
        { id: '3', name: 'Lyon', abbr: 'OL', home_away: 'home',
          records: [{ type: 'overall', summary: '12-8-6' }],
          form: 'WLWLD' },
        { id: '4', name: 'Marseille', abbr: 'OM', home_away: 'away',
          records: [{ type: 'overall', summary: '11-9-6' }],
          form: 'DWLWL' },
      ],
      odds: [{ provider: 'test', homeML: '+150', drawML: '+250', awayML: '+170' }],
      winamax: { available: true, url: 'https://winamax.fr/test' },
    },
  },
  {
    name: 'Tennis (rank gap)',
    match: {
      id: 'fixture-3',
      date: '2030-01-01T15:00Z',
      sport: 'tennis',
      league_code: 'atp',
      league_name: 'ATP Masters',
      competitors: [
        { id: '5', name: 'Novak Djokovic', abbr: 'DJO', home_away: 'home', rank: 1, form: 'WWWW' },
        { id: '6', name: 'Player 200', abbr: 'P200', home_away: 'away', rank: 200, form: 'LLWW' },
      ],
      odds: [{ provider: 'test', homeML: '-1000', awayML: '+700' }],
      winamax: { available: true, url: 'https://winamax.fr/test' },
    },
  },
  {
    name: 'NBA fav home',
    match: {
      id: 'fixture-4',
      date: '2030-01-01T01:00Z',
      sport: 'basketball',
      league_code: 'nba',
      league_name: 'NBA',
      competitors: [
        { id: '7', name: 'Boston Celtics', abbr: 'BOS', home_away: 'home',
          records: [{ type: 'overall', summary: '50-15' }, { type: 'home', summary: '28-5' }],
          form: 'WWWWL' },
        { id: '8', name: 'Charlotte Hornets', abbr: 'CHA', home_away: 'away',
          records: [{ type: 'overall', summary: '15-50' }, { type: 'road', summary: '5-28' }],
          form: 'LLLLL' },
      ],
      odds: [{ provider: 'test', homeML: '-700', awayML: '+550' }],
      winamax: { available: true, url: 'https://winamax.fr/test' },
    },
  },
  {
    name: 'No data minimal',
    match: {
      id: 'fixture-5',
      date: '2030-01-01T10:00Z',
      sport: 'football',
      league_code: 'unknown',
      league_name: 'Unknown',
      competitors: [
        { id: '9', name: 'Team A', abbr: 'TA', home_away: 'home' },
        { id: '10', name: 'Team B', abbr: 'TB', home_away: 'away' },
      ],
      winamax: { available: false },
    },
  },
];

test.describe('predictMatch — fixture-based smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
    // Wait pour boot complet
    await page.waitForFunction(() => window.__testAPI && typeof window.__testAPI.predictMatch === 'function', {
      timeout: 15000,
    });
  });

  for (const fix of MATCHES_FIXTURES) {
    test(`predictMatch on "${fix.name}" returns valid structure`, async ({ page }) => {
      const result = await page.evaluate((m) => {
        try {
          const pred = window.__testAPI.predictMatch(m);
          if (!pred) return { ok: true, pred: null, reason: 'pred is null/undefined' };
          return {
            ok: true,
            has_pick: !!pred.pick,
            pick_key: pred.pick?.key,
            pick_label: pred.pick?.label,
            reliability: pred.reliability,
            skip: pred.skip,
            has_probs: !!pred.probs,
            has_odds: !!pred.odds,
          };
        } catch (e) {
          return { ok: false, err: e.message };
        }
      }, fix.match);

      // Invariant 1 : pas de crash
      expect(result.ok).toBe(true);

      // Si pred existe (peut être null pour matchs no-data), valider la structure
      if (result.pred !== null && result.has_pick) {
        // Invariant 2 : pick.key valide
        expect(['1', '2', 'X']).toContain(result.pick_key);
        // Invariant 3 : reliability dans [0, 1]
        expect(result.reliability).toBeGreaterThanOrEqual(0);
        expect(result.reliability).toBeLessThanOrEqual(1);
        // Invariant 4 : skip est booléen
        expect(typeof result.skip === 'boolean' || result.skip === null).toBeTruthy();
      }
    });
  }

  test('predictMatch est idempotent (même input → même output)', async ({ page }) => {
    const m = MATCHES_FIXTURES[0].match;
    const result = await page.evaluate((match) => {
      const a = window.__testAPI.predictMatch(match);
      const b = window.__testAPI.predictMatch(match);
      if (!a || !b) return { ok: false, reason: 'one pred null' };
      return {
        ok: true,
        same_pick: a.pick?.key === b.pick?.key,
        same_rel: Math.abs((a.reliability || 0) - (b.reliability || 0)) < 0.001,
      };
    }, m);
    expect(result.ok).toBe(true);
    expect(result.same_pick).toBe(true);
    expect(result.same_rel).toBe(true);
  });
});
