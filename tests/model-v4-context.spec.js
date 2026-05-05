import { test, expect } from '@playwright/test';

test('V4 contextual sidecars load and are available to predictions', async ({ page }) => {
  await page.goto('/pronostics.html?debug=1');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && window.predictMatch && window.TEAM_PRIORS, null, { timeout: 15000 });

  const state = await page.evaluate(() => {
    const matches = Object.values(window.PRONOSTICS_DATA.days || {}).flat().filter(Boolean);
    const football = matches.find(m => m?.sport === 'football' && (m?.competitors || []).length >= 2);
    const any = matches.find(m => (m?.competitors || []).length >= 2) || football;
    const pred = any ? window.predictMatch(any) : null;
    const season = football ? window.getSeasonPhaseContext(football) : null;
    const competition = football ? window.getCompetitionContext(football) : null;
    const badges = any && pred ? window.buildV4ContextBadges(any, pred) : '';
    return {
      teamPriors: window.TEAM_PRIORS?.team_count || 0,
      footballPriors: window.TEAM_PRIORS?.football_team_count || 0,
      seasonLeagues: window.SEASON_PHASE?.league_count || 0,
      starPlayers: window.STAR_PLAYERS?.star_count || 0,
      xgDecayLeagues: window.XG_DECAY_PARAMS?.league_count || 0,
      travelMatches: window.TEAM_TRAVEL?.match_count || 0,
      scheduleMatches: window.SCHEDULE_DENSITY?.match_count || 0,
      refereeCount: window.REFEREE_STATS?.referee_count || 0,
      tennisPlayers: window.TENNIS_ELO_SURFACE?.player_count || 0,
      roleMatches: window.GOALIE_PITCHER_CONTEXT?.match_count || 0,
      stadiums: window.STADIUM_EFFECTS?.stadium_count || 0,
      coaches: window.COACH_TENURE?.team_count || 0,
      derbies: window.DERBIES?.pair_count || 0,
      extendedTeams: window.TEAM_STATS_EXTENDED?.team_count || 0,
      hasPrediction: !!pred,
      hasSeasonContext: !!season,
      hasCompetitionContext: !!competition,
      hasContextBadgeHtml: typeof badges === 'string' && badges.includes('v4-context-badges'),
      noHugeEdgeSkip: pred?.suspect_reason !== 'huge_edge_>15pt',
    };
  });

  expect(state.teamPriors).toBeGreaterThanOrEqual(800);
  expect(state.footballPriors).toBeGreaterThanOrEqual(800);
  expect(state.seasonLeagues).toBeGreaterThanOrEqual(5);
  expect(state.starPlayers).toBeGreaterThanOrEqual(200);
  expect(state.xgDecayLeagues).toBeGreaterThanOrEqual(5);
  expect(state.travelMatches).toBeGreaterThanOrEqual(20);
  expect(state.scheduleMatches).toBeGreaterThanOrEqual(20);
  expect(state.refereeCount).toBeGreaterThanOrEqual(50);
  expect(state.tennisPlayers).toBeGreaterThanOrEqual(100);
  expect(state.roleMatches).toBeGreaterThanOrEqual(10);
  expect(state.stadiums).toBeGreaterThanOrEqual(200);
  expect(state.coaches).toBeGreaterThanOrEqual(100);
  expect(state.derbies).toBeGreaterThanOrEqual(50);
  expect(state.extendedTeams).toBeGreaterThanOrEqual(100);
  expect(state.hasPrediction).toBe(true);
  expect(state.hasSeasonContext).toBe(true);
  expect(state.hasCompetitionContext).toBe(true);
  expect(state.hasContextBadgeHtml).toBe(true);
  expect(state.noHugeEdgeSkip).toBe(true);
});
