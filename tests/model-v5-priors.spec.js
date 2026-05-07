const { test, expect } = require('@playwright/test');

test.describe('Model V5 hierarchical Bayesian priors', () => {
  test('loads the V5 prior sidecar and applies it to predictions', async ({ page }) => {
    await page.goto('/pronostics.html?debug=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.BAYESIAN_PRIORS_V5 && window.predictMatch), null, { timeout: 15000 });

    const summary = await page.evaluate(() => window.getBayesianV5DebugSummary && window.getBayesianV5DebugSummary());
    expect(summary.loaded).toBeTruthy();
    expect(summary.teams).toBeGreaterThanOrEqual(1000);
    expect(summary.leagues).toBeGreaterThan(50);

    const applied = await page.evaluate(() => {
      const days = window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.days ? window.PRONOSTICS_DATA.days : {};
      const matches = Object.values(days).flat().filter(Boolean);
      for (const match of matches) {
        try {
          const pred = window.predictMatch(match);
          const prior = pred && pred.poisson && pred.poisson.bayesianPrior;
          if (prior && String(prior.version || '').includes('V5')) {
            return {
              id: match.id,
              version: prior.version,
              weight: prior.weight,
              homeSample: prior.homeSample,
              awaySample: prior.awaySample,
            };
          }
        } catch (err) {
          // Keep scanning; malformed legacy fixtures should not mask V5 coverage.
        }
      }
      const rows = Array.isArray(window.BAYESIAN_PRIORS_V5?.teams)
        ? window.BAYESIAN_PRIORS_V5.teams
        : Object.entries(window.BAYESIAN_PRIORS_V5?.teams || {}).map(([key, value]) => ({ key, ...value }));
      const footballRows = rows
        .map(row => Array.isArray(row) ? {
          key: row[0],
          team_name: row[1],
          sport: row[2],
          league: row[3],
        } : row)
        .filter(row => row && row.sport === 'football' && row.team_name)
        .slice(0, 2);
      if (footballRows.length >= 2) {
        const syntheticMatch = {
          id: 'synthetic_v5_prior_e2e',
          sport: 'football',
          league_code: footballRows[0].league || 'synthetic',
          league_name: footballRows[0].league || 'Synthetic League',
          date: new Date(Date.now() + 3600_000).toISOString(),
          completed: false,
          winamax: {
            available: true,
            markets: {
              '1n2': {
                home: 2.05,
                draw: 3.20,
                away: 3.40,
                home_name: footballRows[0].team_name,
                away_name: footballRows[1].team_name,
              },
            },
          },
          competitors: [
            { id: footballRows[0].key, name: footballRows[0].team_name, home_away: 'home' },
            { id: footballRows[1].key, name: footballRows[1].team_name, home_away: 'away' },
          ],
        };
        const pred = window.predictMatch(syntheticMatch);
        const prior = pred && pred.poisson && pred.poisson.bayesianPrior;
        if (prior && String(prior.version || '').includes('V5')) {
          return {
            id: syntheticMatch.id,
            version: prior.version,
            weight: prior.weight,
            homeSample: prior.homeSample,
            awaySample: prior.awaySample,
          };
        }
      }
      return null;
    });
    expect(applied).toBeTruthy();
    expect(applied.weight).toBeGreaterThan(0.09);
    expect(applied.homeSample + applied.awaySample).toBeGreaterThan(0);
  });
});
