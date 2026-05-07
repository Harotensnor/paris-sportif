import { test, expect } from '@playwright/test';

test('football player props sidecar feeds the Buteurs page', async ({ page }) => {
  await page.goto('/pronostics.html#buteurs');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && window.FOOTBALL_PLAYER_PROPS && window.getFootballPlayerProps, null, { timeout: 15000 });

  const state = await page.evaluate(() => {
    const events = Object.values(window.PRONOSTICS_DATA.days || {}).flat()
      .filter(m => m?.sport === 'football' && m?.winamax?.available === true && !m.completed);
    const liveWithProps = events.find(m => window.getFootballPlayerProps(m).length);
    const sampleSidecar = Object.entries(window.FOOTBALL_PLAYER_PROPS?.events || {})
      .find(([, rows]) => Array.isArray(rows) && rows.length);
    const firstRow = sampleSidecar && sampleSidecar[1][0];
    const syntheticMatch = sampleSidecar ? {
      id: sampleSidecar[0],
      uid: sampleSidecar[0],
      sport: 'football',
      completed: false,
      winamax: { available: true },
      competitors: [
        { name: Array.isArray(firstRow) ? firstRow[1] : firstRow?.teamName, home_away: 'home' },
        { name: 'Adversaire test', home_away: 'away' },
      ],
    } : null;
    const firstWithProps = liveWithProps || syntheticMatch;
    const props = firstWithProps ? window.getFootballPlayerProps(firstWithProps) : [];
    return {
      eventCount: window.FOOTBALL_PLAYER_PROPS?.event_count || 0,
      propCount: window.FOOTBALL_PLAYER_PROPS?.prop_count || 0,
      pageTitle: document.querySelector('#buteurs-wrap h1')?.textContent || '',
      visible: getComputedStyle(document.querySelector('#buteurs-wrap')).display !== 'none',
      sampleProps: props.length,
      hasAnytime: props.some(p => (p.prob || 0) > 0),
      hasFirstGoal: props.some(p => (p.firstGoalProb || 0) > 0),
      hasTwoPlus: props.some(p => (p.twoPlusProb || 0) > 0),
      hasCards: props.some(p => (p.cardProb || 0) > 0),
    };
  });

  expect(state.eventCount).toBeGreaterThanOrEqual(10);
  expect(state.propCount).toBeGreaterThanOrEqual(50);
  expect(state.visible).toBe(true);
  expect(state.pageTitle).toContain('Buteurs');
  expect(state.sampleProps).toBeGreaterThan(0);
  expect(state.hasAnytime).toBe(true);
  expect(state.hasFirstGoal).toBe(true);
  expect(state.hasTwoPlus).toBe(true);
  expect(state.hasCards).toBe(true);
});
