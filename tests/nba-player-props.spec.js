import { test, expect } from '@playwright/test';

test('NBA/WNBA player props sidecar exposes points rebounds assists and threes', async ({ page }) => {
  await page.goto('/pronostics.html?debug=1');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && window.NBA_PLAYER_PROPS && window.getNbaPlayerProps, null, { timeout: 15000 });
  await page.evaluate(async () => {
    if (window.PRONOSTICS_DATA?._lite && typeof window._ensureFullData === 'function') {
      await window._ensureFullData();
    }
  });

  const state = await page.evaluate(() => {
    const events = Object.values(window.PRONOSTICS_DATA.days || {}).flat()
      .filter(m => m?.sport === 'basketball' && m?.winamax?.available === true && !m.completed);
    const firstWithProps = events.find(m => window.getNbaPlayerProps(m).length);
    const props = firstWithProps ? window.getNbaPlayerProps(firstWithProps) : [];
    const markets = new Set(props.map(p => p.market));
    return {
      eventCount: window.NBA_PLAYER_PROPS?.event_count || 0,
      propCount: window.NBA_PLAYER_PROPS?.prop_count || 0,
      sampleProps: props.length,
      hasPoints: markets.has('player_points'),
      hasRebounds: markets.has('player_rebounds'),
      hasAssists: markets.has('player_assists'),
      hasThrees: markets.has('player_threes'),
      allFinite: props.every(p => Number.isFinite(p.line) && Number.isFinite(p.mean) && Number.isFinite(p.overProb)),
    };
  });

  expect(state.eventCount).toBeGreaterThanOrEqual(5);
  expect(state.propCount).toBeGreaterThanOrEqual(100);
  expect(state.sampleProps).toBeGreaterThan(0);
  expect(state.hasPoints).toBe(true);
  expect(state.hasRebounds).toBe(true);
  expect(state.hasAssists).toBe(true);
  expect(state.hasThrees).toBe(true);
  expect(state.allFinite).toBe(true);
});
