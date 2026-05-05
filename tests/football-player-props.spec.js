import { test, expect } from '@playwright/test';

test('football player props sidecar feeds the Buteurs page', async ({ page }) => {
  await page.goto('/pronostics.html#buteurs');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && window.FOOTBALL_PLAYER_PROPS && window.getFootballPlayerProps, null, { timeout: 15000 });

  const state = await page.evaluate(() => {
    const events = Object.values(window.PRONOSTICS_DATA.days || {}).flat()
      .filter(m => m?.sport === 'football' && m?.winamax?.available === true && !m.completed);
    const firstWithProps = events.find(m => window.getFootballPlayerProps(m).length);
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
