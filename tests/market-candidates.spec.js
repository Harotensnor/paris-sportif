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
          },
        },
      };
      const pred = {
        pick: { key: '1', prob: 0.58, label: 'Home gagne' },
        reliability: 0.58,
        odds: { home: 2.10, draw: 3.40, away: 3.20 },
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
    expect(candidates.map(c => c.market)).toEqual(expect.arrayContaining(['1n2', 'ou25', 'btts', 'dnb', 'teamTotal', 'htTotal']));
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

  test('does not invent an actionable market without Winamax odds', async ({ page }) => {
    const count = await page.evaluate(() => {
      const match = { id: 'no-bookmaker-market', sport: 'football', winamax: { available: true, markets: {} } };
      const pred = {
        pick: { key: '1', prob: 0.72, label: 'Home' },
        reliability: 0.72,
        odds: { home: 1.35, draw: 4.20, away: 7.00 },
        markets: { btts: { prob: 0.61 }, extended: { raw: { ou25: { over: 0.63, under: 0.37 } } } },
      };
      return window.__testAPI.buildMarketCandidates(match, pred).length;
    });
    expect(count).toBe(0);
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
