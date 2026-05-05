import { test, expect } from '@playwright/test';

test('MLB pitcher props and NHL period markets are loaded and rendered when available', async ({ page }) => {
  await page.goto('/pronostics.html?debug=1');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && window.MLB_PLAYER_PROPS && window.NHL_PLAYOFF_MARKETS && window.getMlbPlayerProps && window.getNhlPlayoffMarkets, null, { timeout: 15000 });

  const state = await page.evaluate(async () => {
    if (typeof window._ensureFullData === 'function') {
      try { await window._ensureFullData(); } catch (e) {}
    }
    const matches = Object.values(window.PRONOSTICS_DATA.days || {}).flat().filter(Boolean);
    const baseball = matches.find(m => m?.sport === 'baseball' && window.getMlbPlayerProps(m).length);
    const hockey = matches.find(m => m?.sport === 'hockey' && window.getNhlPlayoffMarkets(m));
    const baseballProps = baseball ? window.getMlbPlayerProps(baseball) : [];
    const nhlMarkets = hockey ? window.getNhlPlayoffMarkets(hockey) : null;
    if (baseball && typeof window.openDetail === 'function') window.openDetail(baseball);
    const mlbModal = document.querySelector('[data-market-panel="mlb-props"]')?.textContent || '';
    if (hockey && typeof window.openDetail === 'function') window.openDetail(hockey);
    const nhlModal = document.querySelector('[data-market-panel="nhl-props"]')?.textContent || '';
    return {
      mlbEvents: window.MLB_PLAYER_PROPS?.event_count || 0,
      mlbProps: window.MLB_PLAYER_PROPS?.prop_count || 0,
      nhlEvents: window.NHL_PLAYOFF_MARKETS?.event_count || 0,
      nhlMarkets: window.NHL_PLAYOFF_MARKETS?.market_count || 0,
      hasBaseball: !!baseball,
      hasHockey: !!hockey,
      baseballProps: baseballProps.length,
      hasStrikeouts: baseballProps.some(p => p.market === 'pitcher_strikeouts'),
      hasHrAllowed: baseballProps.some(p => p.market === 'pitcher_home_run_allowed'),
      nhlHasFirstPeriod: !!nhlMarkets?.markets?.first_period_total_1_5,
      mlbModal,
      nhlModal,
    };
  });

  expect(state.mlbEvents).toBeGreaterThanOrEqual(10);
  expect(state.mlbProps).toBeGreaterThanOrEqual(20);
  expect(state.nhlEvents).toBeGreaterThanOrEqual(5);
  expect(state.nhlMarkets).toBeGreaterThanOrEqual(20);
  expect(state.hasBaseball).toBe(true);
  expect(state.hasHockey).toBe(true);
  expect(state.baseballProps).toBeGreaterThan(0);
  expect(state.hasStrikeouts).toBe(true);
  expect(state.hasHrAllowed).toBe(true);
  expect(state.nhlHasFirstPeriod).toBe(true);
  expect(state.mlbModal).toContain('strikeouts');
  expect(state.nhlModal).toContain('1ère période');
});
