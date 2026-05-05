import { test, expect } from '@playwright/test';

test.describe('v35 market scanner', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pronostics.html');
    await page.waitForFunction(
      () => window.__testAPI
        && typeof window.__testAPI.buildMarketCandidates === 'function'
        && typeof window.__testAPI.scoreMarketCandidate === 'function'
        && typeof window.__testAPI.formatWinamaxPickLabel === 'function',
      undefined,
      { timeout: 15000 }
    );
  });

  test('builds only exact Winamax market candidates', async ({ page }) => {
    const candidates = await page.evaluate(() => {
      const match = {
        id: 'v35-fixture',
        sport: 'football',
        date: new Date(Date.now() + 3600_000).toISOString(),
        competitors: [
          { homeAway: 'home', name: 'Freiburg', short: 'Freiburg' },
          { homeAway: 'away', name: 'Wolfsburg', short: 'Wolfsburg' },
        ],
        winamax: {
          available: true,
          markets: {
            '1n2': { home: 2.10, draw: 3.40, away: 3.20 },
            ou: [
              { market: 'ou', side: 'over', line: 2.5, odd: 2.05, label: 'Plus de 2,5' },
              { market: 'ou', side: 'under', line: 2.5, odd: 1.78, label: 'Moins de 2,5' },
            ],
            btts_rows: [
              { market: 'btts', side: 'yes', odd: 1.92, label: 'Oui' },
              { market: 'btts', side: 'no', odd: 1.82, label: 'Non' },
            ],
            dnb_rows: [
              { market: 'dnb', side: 'home', odd: 1.55, label: 'Home remboursé si nul' },
            ],
            team_total: [
              { market: 'team_total', team: 'home', side: 'over', line: 0.5, odd: 1.44, label: 'Home plus de 0,5' },
            ],
            ht_ou: [
              { market: 'ht_ou', side: 'over', line: 0.5, odd: 1.48, label: 'Plus de 0,5' },
              { market: 'ht_ou', side: 'under', line: 0.5, odd: 2.55, label: 'Moins de 0,5' },
            ],
            corners_ou: [
              { market: 'corners_ou', side: 'over', line: 8.5, odd: 1.92, label: 'Plus de 8,5' },
              { market: 'corners_ou', side: 'under', line: 8.5, odd: 1.86, label: 'Moins de 8,5' },
            ],
            cards_ou: [
              { market: 'cards_ou', side: 'over', line: 3.5, odd: 1.88, label: 'Plus de 3,5' },
              { market: 'cards_ou', side: 'under', line: 3.5, odd: 1.90, label: 'Moins de 3,5' },
            ],
          },
        },
      };
      const pred = {
        pick: { key: '1', prob: 0.58, label: 'Home gagne' },
        reliability: 0.58,
        odds: { home: 2.10, draw: 3.40, away: 3.20 },
        poisson: { xgH: 1.65, xgA: 1.28 },
        referee: { name: 'Test Ref', yellowPerGame: 4.7, games: 18, tier: 'strict' },
        markets: {
          btts: { prob: 0.54, side: 'yes', key: 'BTTS_Y' },
          extended: {
            raw: {
              ou25: { over: 0.57, under: 0.43 },
              ouHT05: { over: 0.69, under: 0.31 },
              dnb: { home: 0.68, away: 0.32 },
              teamTotals: { home_over_05: 0.76 },
            },
          },
        },
      };
      return window.__testAPI.buildMarketCandidates(match, pred).map(c => ({
        market: c.market,
        key: c.key,
        source: c.source,
        exact: c.exact,
        odd: c.odd,
        ev: c.ev,
        edge: c.edge,
        label: c.label,
        shortLabel: c.shortLabel,
        marketTooltip: c.marketTooltip,
        marketName: c.marketName,
        semanticGroup: c.semanticGroup,
      }));
    });

    expect(candidates.length).toBeGreaterThanOrEqual(5);
    expect(candidates.every(c => c.source === 'winamax_exact' && c.exact === true)).toBe(true);
    expect(candidates.map(c => c.market)).toEqual(expect.arrayContaining(['1n2', 'ou25', 'btts', 'dnb', 'teamTotal', 'htTotal', 'cornersTotal', 'cardsTotal']));
    expect(candidates.find(c => c.market === 'ou25' && c.key === 'O2.5').ev).toBeGreaterThan(0);
    const teamTotal = candidates.find(c => c.market === 'teamTotal');
    expect(teamTotal.label).toBe('Freiburg marque au moins 1 but');
    expect(teamTotal.shortLabel).toBe('Freiburg marque au moins 1 but');
    expect(teamTotal.marketTooltip).toContain('seuls les buts de Freiburg comptent');
    expect(teamTotal.marketName).toBe('Total équipe');
    expect(teamTotal.semanticGroup).toBe('team_total_goals');
    expect(candidates.find(c => c.market === '1n2' && c.key === '1').label).toBe('Freiburg (victoire domicile)');
    expect(candidates.find(c => c.market === 'dnb').label).toBe('Freiburg (nul remboursé)');
    expect(candidates.find(c => c.market === 'btts' && c.key === 'BTTS_Y').label).toBe('Les deux équipes marquent (oui)');
    expect(candidates.find(c => c.market === 'htTotal' && c.key === 'HT_O0.5').label).toBe('Plus de 0,5 buts en 1re mi-temps');
    expect(candidates.find(c => c.market === 'cornersTotal' && c.key === 'CORN_O8.5').label).toBe('Plus de 8,5 corners');
    expect(candidates.find(c => c.market === 'cardsTotal' && c.key === 'CARD_O3.5').label).toBe('Plus de 3,5 cartons jaunes');
    expect(candidates.map(c => c.label).join(' | ')).not.toMatch(/\bDNB\s+[12]\b|BTTS Oui|équipe seulement|^1 ·|^2 ·/);
  });

  test('formats rare markets in beginner-safe Winamax-style French', async ({ page }) => {
    const labels = await page.evaluate(() => {
      const api = window.__testAPI;
      const match = {
        sport: 'football',
        competitors: [
          { homeAway: 'home', name: 'Almería' },
          { homeAway: 'away', name: 'AS Roma' },
        ],
      };
      const fmt = (market, key, label, row, extra) => api.formatWinamaxPickLabel(match, market, key, label, row, extra);
      return {
        homeMinus05: fmt('handicap', 'home:-0.5', 'Almeria -0.5', { side: 'home', line: -0.5, odd: 1.80 }, {}).label,
        awayMinus1: fmt('handicap', 'away:-1', 'AS Rome -1', { side: 'away', line: -1, odd: 2.20 }, {}).label,
        dnbAway: fmt('dnb', 'DNB_2', 'DNB 2', { side: 'away', odd: 1.65 }, {}).label,
        dc12: fmt('doubleChance', '12', 'Double chance 12', { side: '12', odd: 1.40 }, {}).label,
        htX: fmt('ht_1n2', 'HT_X', 'Mi-temps X', { side: 'draw', odd: 2.05 }, {}).label,
        bttsNo: fmt('btts', 'BTTS_N', 'BTTS Non', { side: 'no', odd: 1.92 }, {}).label,
        awayUnder05: fmt('teamTotal', 'away:U0.5', 'Total buts AS Rome — moins de 0,5', { team: 'away', side: 'under', line: 0.5, odd: 3.20 }, {}).label,
        dnbTooltip: fmt('dnb', 'DNB_1', 'DNB 1', { side: 'home', odd: 1.55 }, {}).tooltip,
        handicapTooltip: fmt('handicap', 'away:-1', 'AS Rome -1', { side: 'away', line: -1, odd: 2.20 }, {}).tooltip,
      };
    });

    expect(labels.homeMinus05).toBe('Almería gagne (handicap -0,5)');
    expect(labels.awayMinus1).toBe("AS Roma gagne par 2+ buts d'écart");
    expect(labels.dnbAway).toBe('AS Roma (nul remboursé)');
    expect(labels.dc12).toBe('Domicile ou Extérieur (pas de nul)');
    expect(labels.htX).toBe('Match nul à la mi-temps');
    expect(labels.bttsNo).toBe('Au moins une équipe ne marque pas');
    expect(labels.awayUnder05).toBe('AS Roma ne marque pas (0 but)');
    expect(labels.dnbTooltip).toContain('mise remboursée');
    expect(labels.handicapTooltip).toContain('gagner avec 2+ buts');
    expect(Object.values(labels).join(' | ')).not.toMatch(/\bDNB\s+[12]\b|BTTS (Oui|Non)|Mi-temps [12X]|Total buts .*équipe seulement/);
  });

  test('keeps strict Winamax mode clean while allowing indicative fallback explicitly', async ({ page }) => {
    const result = await page.evaluate(() => {
      const match = { id: 'no-bookmaker-market', sport: 'football', winamax: { available: true, markets: {} } };
      const pred = {
        pick: { key: '1', prob: 0.72, label: 'Home' },
        reliability: 0.72,
        odds: { home: 1.35, draw: 4.20, away: 7.00 },
        markets: { btts: { prob: 0.61 }, extended: { raw: { ou25: { over: 0.63, under: 0.37 } } } },
      };
      return {
        strict: window.__testAPI.buildMarketCandidates(match, pred, { requireExact: true }).length,
        indicative: window.__testAPI.buildMarketCandidates(match, pred, { requireExact: false }).filter(c => c.source === 'cote_indicative').length,
      };
    });
    expect(result.strict).toBe(0);
    expect(result.indicative).toBeGreaterThanOrEqual(1);
  });

  test('exposes exact basket period totals and baseball F5 totals', async ({ page }) => {
    const result = await page.evaluate(() => {
      const basket = {
        sport: 'basketball',
        competitors: [
          { homeAway: 'home', name: 'Paris Basket' },
          { homeAway: 'away', name: 'Monaco' },
        ],
        winamax: {
          available: true,
          markets: {
            basket_first_half_total: [
              { market: 'basket_first_half_total', side: 'over', line: 82.5, odd: 1.91, label: 'Plus de 82,5' },
              { market: 'basket_first_half_total', side: 'under', line: 82.5, odd: 1.87, label: 'Moins de 82,5' },
            ],
            basket_quarter_total: [
              { market: 'basket_quarter_total', side: 'over', line: 41.5, odd: 1.90, label: 'Plus de 41,5' },
              { market: 'basket_quarter_total', side: 'under', line: 41.5, odd: 1.88, label: 'Moins de 41,5' },
            ],
          },
        },
      };
      const basketPred = {
        pick: { key: '1', prob: 0.58, label: 'Paris Basket gagnent' },
        reliability: 0.58,
        scores: {
          markets: {
            firstHalfTotals: [{ line: 82.5, pOver: 0.57, pUnder: 0.43 }],
            quarterTotals: [{ line: 41.5, pOver: 0.55, pUnder: 0.45 }],
          },
        },
      };
      const baseball = {
        sport: 'baseball',
        competitors: [
          { homeAway: 'home', name: 'Cubs' },
          { homeAway: 'away', name: 'Cardinals' },
        ],
        winamax: {
          available: true,
          markets: {
            baseball_f5_total: [
              { market: 'baseball_f5_total', side: 'over', line: 4.5, odd: 1.94, label: 'Plus de 4,5' },
              { market: 'baseball_f5_total', side: 'under', line: 4.5, odd: 1.84, label: 'Moins de 4,5' },
            ],
          },
        },
      };
      const baseballPred = {
        pick: { key: '1', prob: 0.56, label: 'Cubs gagnent' },
        reliability: 0.56,
        scores: { markets: { totalsF5: [{ line: 4.5, pOver: 0.58, pUnder: 0.42 }] } },
      };
      return {
        basket: window.__testAPI.buildMarketCandidates(basket, basketPred).map(c => ({ market: c.market, key: c.key, label: c.label })),
        baseball: window.__testAPI.buildMarketCandidates(baseball, baseballPred).map(c => ({ market: c.market, key: c.key, label: c.label })),
      };
    });

    expect(result.basket.map(c => c.market)).toEqual(expect.arrayContaining(['basketFirstHalfTotal', 'basketQuarterTotal']));
    expect(result.basket.find(c => c.market === 'basketFirstHalfTotal').label).toBe('Plus de 82,5 points en 1re mi-temps');
    expect(result.basket.find(c => c.market === 'basketQuarterTotal').label).toBe('Plus de 41,5 points au 1er quart-temps');
    expect(result.baseball.find(c => c.market === 'baseballF5Total').label).toBe('Plus de 4,5 runs sur 5 premières manches');
  });

  test('downgrades micro odds unless the value buffer is exceptional', async ({ page }) => {
    const scored = await page.evaluate(() => {
      const match = { id: 'micro-odd', sport: 'football', winamax: { available: true } };
      const pred = { pick: { key: '1', prob: 0.78 }, reliability: 0.78 };
      return window.__testAPI.scoreMarketCandidate(
        { market: '1n2', key: '1', pickKey: '1', odd: 1.08, prob: 0.78, rel: 0.78, source: 'winamax_exact', exact: true },
        match,
        pred
      );
    });
    expect(scored.discipline.zone).toBe('micro');
    expect(scored.investment.action).toBe('skip');
  });
});
