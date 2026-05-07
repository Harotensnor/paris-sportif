import { test, expect } from '@playwright/test';

test('V4 team priors load and blend into football predictions', async ({ page }) => {
  await page.goto('/pronostics.html');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && window.TEAM_PRIORS && window.predictMatch, null, { timeout: 15000 });
  await page.waitForFunction(() => {
    const footballMatches = Object.values(window.PRONOSTICS_DATA?.days || {})
      .flat()
      .filter(m => m?.sport === 'football' && (m?.competitors || []).length >= 2);
    return footballMatches.some(m => window.predictMatch(m)?.poisson?.bayesianPrior);
  }, null, { timeout: 15000 });
  const state = await page.evaluate(() => {
    const footballMatches = Object.values(window.PRONOSTICS_DATA.days || {})
      .flat()
      .filter(m => m?.sport === 'football' && (m?.competitors || []).length >= 2);
    const pred = footballMatches
      .map(m => window.predictMatch(m))
      .find(p => p?.poisson?.bayesianPrior);
    return {
      teamCount: window.TEAM_PRIORS?.team_count || 0,
      footballTeamCount: window.TEAM_PRIORS?.football_team_count || 0,
      hasPrediction: !!pred,
      hasPrior: !!(pred?.poisson?.bayesianPrior),
    };
  });
  expect(state.teamCount).toBeGreaterThanOrEqual(800);
  expect(state.footballTeamCount).toBeGreaterThanOrEqual(800);
  expect(state.hasPrediction).toBe(true);
  expect(state.hasPrior).toBe(true);
});
