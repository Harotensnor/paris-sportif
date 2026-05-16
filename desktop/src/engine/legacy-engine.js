const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const modelUtils = require('./model-utils');
const bettingUtils = require('./betting-utils');
const contentUtils = require('./content-utils');
const historyUtils = require('./history-utils');
const calibrationUtils = require('./calibration-utils');
const contextUtils = require('./context-utils');

function createLegacyEngineService({ projectRoot }) {
  const root = path.resolve(projectRoot);
  const dataPath = path.join(root, 'data.js');
  const legacyPath = path.resolve(__dirname, 'runtime', 'legacy-app.js');
  const lineupsPath = path.join(root, 'lineups_soccer.json');
  const sofaEventsPath = path.join(root, 'sofascore_events.json');
  const starPlayersPath = path.join(root, 'star_players.json');
  const winamaxMarketsPath = path.join(root, 'winamax_markets.json');
  const h2hPath = path.join(root, 'h2h_extended.json');
  const matchContextPath = path.join(root, 'match_context.json');
  const signalGapPath = path.join(root, 'signal_gap_report.json');
  const contextBacktestPath = path.join(root, 'context_backtest_report.json');
  const decisionBacktestPath = path.join(root, 'decision_backtest_report.json');
  const decisionTuningPath = path.join(root, 'decision_tuning_report.json');
  const decisionShadowPath = path.join(root, 'decision_shadow_report.json');
  const oddsGuardrailsPath = path.join(root, 'odds_guardrails_report.json');
  const agentBlockerBacktestPath = path.join(root, 'agent_blocker_backtest.json');
  const agentGuardrailRecommendationsPath = path.join(root, 'agent_guardrail_recommendations.json');
  const stakeReductionBacktestPath = path.join(root, 'stake_reduction_backtest.json');
  const signalConflictBacktestPath = path.join(root, 'signal_conflict_backtest.json');
  const scorerQualityPath = path.join(root, 'scorer_quality_report.json');
  const scorerCandidatesSummaryPath = path.join(root, 'scorer_candidates_summary.json');
  const scorerSettlementPath = path.join(root, 'scorer_candidates_settlement.json');
  const scorerPendingAuditPath = path.join(root, 'scorer_pending_audit.json');
  const prematchFocusPath = path.join(root, 'prematch_focus_report.json');
  const prematchExecutionPath = path.join(root, 'prematch_execution_plan.json');
  const signalCoverageTrendPath = path.join(root, 'signal_coverage_trend.json');
  const nextActionsPath = path.join(root, 'next_actions_report.json');
  const sourceFreshnessPlanPath = path.join(root, 'source_freshness_plan.json');
  const contextRepairPlanPath = path.join(root, 'context_repair_plan.json');
  const refreshPriorityPlanPath = path.join(root, 'refresh_priority_plan.json');
  const prebetChecklistPath = path.join(root, 'prebet_checklist_report.json');
  const prebetChecklistBacktestPath = path.join(root, 'prebet_checklist_backtest.json');
  const teamIdentityGraphPath = path.join(root, 'team_identity_graph.json');
  const matchDecisionTimelinePath = path.join(root, 'match_decision_timeline.json');
  const agentBankrollSimulationPath = path.join(root, 'agent_bankroll_simulation.json');
  const smartPreparePlanPath = path.join(root, 'smart_prepare_plan.json');
  const sourceRegistryPath = path.join(root, 'source_registry.json');
  const sourceQuarantinePath = path.join(root, 'source_quarantine.json');
  const optionalSourcesPlanPath = path.join(root, 'optional_sources_plan.json');
  const criticalIssueReportPath = path.join(root, 'critical_issue_report.json');
  const dataConsistencyReportPath = path.join(root, 'data_consistency_report.json');
  const uiIntegrityReportPath = path.join(root, 'ui_integrity_report.json');
  const pickIntegrityReportPath = path.join(root, 'pick_integrity_report.json');
  const coverageRepairEnginePath = path.join(root, 'coverage_repair_engine.json');
  const sourceCoverageTargetsPath = path.join(root, 'source_coverage_targets.json');
  const leagueSignalQualityPath = path.join(root, 'league_signal_quality.json');
  const modelLabReportPath = path.join(root, 'model_lab_report.json');
  const probabilityCalibrationPath = path.join(root, 'probability_calibration_report.json');
  const policyCandidateRegistryPath = path.join(root, 'policy_candidate_registry.json');
  const sourceHealthReportPath = path.join(root, 'source_health_report.json');
  const clvSummaryPath = path.join(root, 'clv_summary.json');
  const picksHistorySummaryPath = path.join(root, 'picks_history_summary.json');
  let current = null;
  let currentKey = null;
  let analysisCache = null;
  let analysisCacheKey = null;

  function optionalFileKey(filePath) {
    if (!fs.existsSync(filePath)) return 'missing';
    const stat = fs.statSync(filePath);
    return `${stat.mtimeMs}:${stat.size}`;
  }

  function fileKey() {
    const dataStat = fs.statSync(dataPath);
    const legacyStat = fs.statSync(legacyPath);
    return `${dataStat.mtimeMs}:${dataStat.size}:${legacyStat.mtimeMs}:${legacyStat.size}:${optionalFileKey(lineupsPath)}:${optionalFileKey(sofaEventsPath)}:${optionalFileKey(starPlayersPath)}:${optionalFileKey(winamaxMarketsPath)}:${optionalFileKey(h2hPath)}:${optionalFileKey(matchContextPath)}:${optionalFileKey(signalGapPath)}:${optionalFileKey(contextBacktestPath)}:${optionalFileKey(decisionBacktestPath)}:${optionalFileKey(decisionTuningPath)}:${optionalFileKey(decisionShadowPath)}:${optionalFileKey(oddsGuardrailsPath)}:${optionalFileKey(agentBlockerBacktestPath)}:${optionalFileKey(agentGuardrailRecommendationsPath)}:${optionalFileKey(stakeReductionBacktestPath)}:${optionalFileKey(signalConflictBacktestPath)}:${optionalFileKey(scorerQualityPath)}:${optionalFileKey(scorerCandidatesSummaryPath)}:${optionalFileKey(scorerSettlementPath)}:${optionalFileKey(scorerPendingAuditPath)}:${optionalFileKey(prematchFocusPath)}:${optionalFileKey(prematchExecutionPath)}:${optionalFileKey(signalCoverageTrendPath)}:${optionalFileKey(nextActionsPath)}:${optionalFileKey(sourceFreshnessPlanPath)}:${optionalFileKey(contextRepairPlanPath)}:${optionalFileKey(refreshPriorityPlanPath)}:${optionalFileKey(prebetChecklistPath)}:${optionalFileKey(prebetChecklistBacktestPath)}:${optionalFileKey(teamIdentityGraphPath)}:${optionalFileKey(matchDecisionTimelinePath)}:${optionalFileKey(agentBankrollSimulationPath)}:${optionalFileKey(smartPreparePlanPath)}:${optionalFileKey(sourceRegistryPath)}:${optionalFileKey(sourceQuarantinePath)}:${optionalFileKey(optionalSourcesPlanPath)}:${optionalFileKey(criticalIssueReportPath)}:${optionalFileKey(dataConsistencyReportPath)}:${optionalFileKey(uiIntegrityReportPath)}:${optionalFileKey(pickIntegrityReportPath)}:${optionalFileKey(coverageRepairEnginePath)}:${optionalFileKey(sourceCoverageTargetsPath)}:${optionalFileKey(leagueSignalQualityPath)}:${optionalFileKey(modelLabReportPath)}:${optionalFileKey(probabilityCalibrationPath)}:${optionalFileKey(policyCandidateRegistryPath)}:${optionalFileKey(sourceHealthReportPath)}:${optionalFileKey(clvSummaryPath)}:${optionalFileKey(picksHistorySummaryPath)}`;
  }

  function closeCurrent() {
    if (current && current.dom && current.dom.window) {
      try {
        current.dom.window.close();
      } catch {
        // best effort cleanup only
      }
    }
    current = null;
    currentKey = null;
    analysisCache = null;
    analysisCacheKey = null;
  }

  function localFetch(input) {
    const raw = typeof input === 'string' ? input : input && input.url;
    const url = new URL(raw || '/', 'http://127.0.0.1/');
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
      const rel = decodeURIComponent(url.pathname.replace(/^\/+/, '')) || 'index.html';
      const filePath = path.resolve(root, rel);
      if (!filePath.startsWith(root)) {
        return Promise.resolve(new Response('Forbidden', { status: 403 }));
      }
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        return Promise.resolve(new Response('Not found', { status: 404 }));
      }
      return Promise.resolve(new Response(fs.readFileSync(filePath), { status: 200 }));
    }
    return fetch(input);
  }

  function makeDom(logs) {
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', (error) => logs.push(`jsdom: ${error.message}`));
    virtualConsole.on('error', (message) => logs.push(`error: ${message}`));
    virtualConsole.on('warn', (message) => logs.push(`warn: ${message}`));

    return new JSDOM('<!doctype html><html><head><meta id="theme-color-meta"><title></title></head><body><main></main></body></html>', {
      url: 'http://127.0.0.1/desktop-engine/',
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      virtualConsole,
      beforeParse(window) {
        window.fetch = localFetch;
        window.setInterval = () => 0;
        window.clearInterval = () => {};
        window.matchMedia = window.matchMedia || (() => ({
          matches: false,
          addEventListener() {},
          removeEventListener() {},
          addListener() {},
          removeListener() {}
        }));
        window.requestIdleCallback = window.requestIdleCallback || ((callback) => {
          return window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 1 }), 0);
        });
        window.cancelIdleCallback = window.cancelIdleCallback || window.clearTimeout;
        window.scrollTo = () => {};
        window.open = () => null;
        window.confirm = () => false;
        window.alert = () => {};
        window.Notification = { permission: 'denied', requestPermission: async () => 'denied' };
        window.ResizeObserver = class {
          observe() {}
          unobserve() {}
          disconnect() {}
        };
        window.IntersectionObserver = class {
          observe() {}
          unobserve() {}
          disconnect() {}
        };
        window.CSS = window.CSS || {
          escape(value) {
            return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
          }
        };
        window.document.execCommand = () => false;
        Object.defineProperty(window.navigator, 'serviceWorker', {
          value: {
            controller: null,
            addEventListener() {},
            register: async () => ({})
          },
          configurable: true
        });
        Object.defineProperty(window.navigator, 'clipboard', {
          value: { writeText: async () => {} },
          configurable: true
        });
      }
    });
  }

  function ensureEngine({ force = false } = {}) {
    const nextKey = fileKey();
    if (!force && current && currentKey === nextKey) return current;

    closeCurrent();
    const started = Date.now();
    const logs = [];
    const dom = makeDom(logs);
    const win = dom.window;
    win.eval(fs.readFileSync(dataPath, 'utf8'));
    win.eval(fs.readFileSync(legacyPath, 'utf8'));

    if (typeof win.predictMatch !== 'function' || !win.__testAPI) {
      try {
        dom.window.close();
      } catch {
        // best effort cleanup only
      }
      throw new Error('Moteur de calcul incomplet');
    }

    current = {
      dom,
      win,
      logs,
      loadedAt: new Date().toISOString(),
      loadMs: Date.now() - started
    };
    currentKey = nextKey;
    return current;
  }

  function eventListFromDays(days) {
    const events = [];
    if (!days || typeof days !== 'object') return events;
    for (const [dayKey, dayValue] of Object.entries(days)) {
      const rows = Array.isArray(dayValue)
        ? dayValue
        : Array.isArray(dayValue && dayValue.events)
          ? dayValue.events
          : [];
      for (const event of rows) events.push({ ...event, __dayKey: dayKey });
    }
    return events;
  }

  function getTeamNames(match) {
    const competitors = Array.isArray(match && match.competitors) ? match.competitors : [];
    const home = competitors.find((c) => c && c.home_away === 'home') || competitors[0] || {};
    const away = competitors.find((c) => c && c.home_away === 'away') || competitors[1] || {};
    return {
      home: home.name || match.home || match.homeTeam || 'Domicile',
      away: away.name || match.away || match.awayTeam || 'Extérieur'
    };
  }

  function normalizeTeamKey(value) {
    return modelUtils.normalizeTeamKey(value);
  }

  function readLineupsIndex() {
    if (!fs.existsSync(lineupsPath)) return {};
    try {
      const parsed = JSON.parse(fs.readFileSync(lineupsPath, 'utf8'));
      const events = parsed && parsed.events && typeof parsed.events === 'object' ? parsed.events : {};
      return enrichLineupsWithSofaTimes(events);
    } catch {
      return {};
    }
  }

  function readSofascoreEventTimes() {
    if (!fs.existsSync(sofaEventsPath)) return new Map();
    try {
      const parsed = JSON.parse(fs.readFileSync(sofaEventsPath, 'utf8'));
      const groups = parsed && parsed.events && typeof parsed.events === 'object'
        ? Object.values(parsed.events)
        : [];
      const rows = groups.flatMap((group) => Array.isArray(group) ? group : []);
      return new Map(rows.map((event) => [
        String(event?.id || '').replace(/^sofa_/, ''),
        { date: event?.date || null, name: event?.name || null }
      ]));
    } catch {
      return new Map();
    }
  }

  function enrichLineupsWithSofaTimes(events) {
    const times = readSofascoreEventTimes();
    if (!times.size) return events;
    return Object.fromEntries(Object.entries(events).map(([key, entry]) => {
      const meta = times.get(String(entry?.sofa_event_id || ''));
      if (!meta || entry.date) return [key, entry];
      return [key, { ...entry, date: meta.date, sofa_name: meta.name }];
    }));
  }

  function readStarPlayersIndex() {
    if (!fs.existsSync(starPlayersPath)) return {};
    try {
      const parsed = JSON.parse(fs.readFileSync(starPlayersPath, 'utf8'));
      return parsed && parsed.teams && typeof parsed.teams === 'object' ? parsed.teams : {};
    } catch {
      return {};
    }
  }

  function readWinamaxMarketsIndex() {
    if (!fs.existsSync(winamaxMarketsPath)) return {};
    try {
      const parsed = JSON.parse(fs.readFileSync(winamaxMarketsPath, 'utf8'));
      return parsed && parsed.matches && typeof parsed.matches === 'object' ? parsed.matches : {};
    } catch {
      return {};
    }
  }

  function winamaxMarketEntryForMatch(winamaxMarketsIndex, match) {
    if (!match || !winamaxMarketsIndex || typeof winamaxMarketsIndex !== 'object') return null;
    const ids = [
      match?.winamax?.match_id,
      match?.match_id,
      match?.id,
      match?.uid,
      String(match?.id || '').replace(/^espn_/, ''),
      String(match?.id || '').replace(/^sofa_/, '')
    ].filter(Boolean).map(String);
    for (const id of ids) {
      if (winamaxMarketsIndex[id]) return winamaxMarketsIndex[id];
    }
    return null;
  }

  function attachWinamaxMarkets(match, winamaxMarketsIndex) {
    const entry = winamaxMarketEntryForMatch(winamaxMarketsIndex, match);
    const markets = entry?.markets || entry?.odds || null;
    if (!markets || typeof markets !== 'object') return match;
    const winamax = match?.winamax || {};
    return {
      ...match,
      winamax: {
        ...winamax,
        markets,
        full_markets_count: Number(winamax.full_markets_count || entry?.odds?.all_markets?.length || entry?.markets?.all_markets?.length || 0),
        full_market_keys: Array.isArray(winamax.full_market_keys)
          ? winamax.full_market_keys
          : Object.keys(markets),
        details_fetched_at: winamax.details_fetched_at || entry?.details_fetched_at || entry?.fetched_at || null
      }
    };
  }

  function readH2hIndex() {
    if (!fs.existsSync(h2hPath)) return {};
    try {
      const parsed = JSON.parse(fs.readFileSync(h2hPath, 'utf8'));
      return parsed && parsed.events && typeof parsed.events === 'object' ? parsed.events : {};
    } catch {
      return {};
    }
  }

  function readJsonSidecar(filePath, fallback = {}) {
    if (!fs.existsSync(filePath)) return fallback;
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function readMatchContextIndex() {
    return readJsonSidecar(matchContextPath, {});
  }

  function readSignalGapReport() {
    return readJsonSidecar(signalGapPath, {});
  }

  function readContextBacktestReport() {
    return readJsonSidecar(contextBacktestPath, {});
  }

  function readDecisionBacktestReport() {
    return readJsonSidecar(decisionBacktestPath, {});
  }

  function readDecisionTuningReport() {
    return readJsonSidecar(decisionTuningPath, {});
  }

  function readDecisionShadowReport() {
    return readJsonSidecar(decisionShadowPath, {});
  }

  function readOddsGuardrailsReport() {
    return readJsonSidecar(oddsGuardrailsPath, {});
  }

  function readAgentBlockerBacktestReport() {
    return readJsonSidecar(agentBlockerBacktestPath, {});
  }

  function readAgentGuardrailRecommendationsReport() {
    return readJsonSidecar(agentGuardrailRecommendationsPath, {});
  }

  function readStakeReductionBacktestReport() {
    return readJsonSidecar(stakeReductionBacktestPath, {});
  }

  function readSignalConflictBacktestReport() {
    return readJsonSidecar(signalConflictBacktestPath, {});
  }

  function readScorerQualityReport() {
    return readJsonSidecar(scorerQualityPath, {});
  }

  function readScorerCandidatesSummary() {
    return readJsonSidecar(scorerCandidatesSummaryPath, {});
  }

  function readScorerSettlementReport() {
    return readJsonSidecar(scorerSettlementPath, {});
  }

  function readScorerPendingAuditReport() {
    return readJsonSidecar(scorerPendingAuditPath, {});
  }

  function readPrematchFocusReport() {
    return readJsonSidecar(prematchFocusPath, {});
  }

  function readPrematchExecutionReport() {
    return readJsonSidecar(prematchExecutionPath, {});
  }

  function readSignalCoverageTrendReport() {
    return readJsonSidecar(signalCoverageTrendPath, {});
  }

  function readNextActionsReport() {
    return readJsonSidecar(nextActionsPath, {});
  }

  function readSourceFreshnessPlanReport() {
    return readJsonSidecar(sourceFreshnessPlanPath, {});
  }

  function readContextRepairPlanReport() {
    return readJsonSidecar(contextRepairPlanPath, {});
  }

  function readRefreshPriorityPlanReport() {
    return readJsonSidecar(refreshPriorityPlanPath, {});
  }

  function readPrebetChecklistReport() {
    return readJsonSidecar(prebetChecklistPath, {});
  }

  function readPrebetChecklistBacktestReport() {
    return readJsonSidecar(prebetChecklistBacktestPath, {});
  }

  function readTeamIdentityGraphReport() {
    return readJsonSidecar(teamIdentityGraphPath, {});
  }

  function readMatchDecisionTimelineReport() {
    return readJsonSidecar(matchDecisionTimelinePath, {});
  }

  function readAgentBankrollSimulationReport() {
    return readJsonSidecar(agentBankrollSimulationPath, {});
  }

  function readSmartPreparePlanReport() {
    return readJsonSidecar(smartPreparePlanPath, {});
  }

  function readSourceRegistryReport() {
    return readJsonSidecar(sourceRegistryPath, {});
  }

  function readSourceQuarantineReport() {
    return readJsonSidecar(sourceQuarantinePath, {});
  }

  function readOptionalSourcesPlanReport() {
    return readJsonSidecar(optionalSourcesPlanPath, {});
  }

  function readCriticalIssueReport() {
    return readJsonSidecar(criticalIssueReportPath, {});
  }

  function readDataConsistencyReport() {
    return readJsonSidecar(dataConsistencyReportPath, {});
  }

  function readUiIntegrityReport() {
    return readJsonSidecar(uiIntegrityReportPath, {});
  }

  function readPickIntegrityReport() {
    return readJsonSidecar(pickIntegrityReportPath, {});
  }

  function readCoverageRepairEngineReport() {
    return readJsonSidecar(coverageRepairEnginePath, {});
  }

  function readSourceCoverageTargetsReport() {
    return readJsonSidecar(sourceCoverageTargetsPath, {});
  }

  function readLeagueSignalQualityReport() {
    return readJsonSidecar(leagueSignalQualityPath, {});
  }

  function readModelLabReport() {
    return readJsonSidecar(modelLabReportPath, {});
  }

  function readProbabilityCalibrationReport() {
    return readJsonSidecar(probabilityCalibrationPath, {});
  }

  function readPicksHistorySummary() {
    return readJsonSidecar(picksHistorySummaryPath, {});
  }

  function readPolicyCandidateRegistryReport() {
    return readJsonSidecar(policyCandidateRegistryPath, {});
  }

  function readSourceHealthReport() {
    return readJsonSidecar(sourceHealthReportPath, {});
  }

  function readClvSummaryReport() {
    return readJsonSidecar(clvSummaryPath, {});
  }

  function teamNameVariants(team) {
    return modelUtils.teamNameVariants(team);
  }

  function findLineupForMatch(lineupsIndex, match) {
    return modelUtils.findLineupForMatch(lineupsIndex, match);
  }

  function matchWithLineups(match, lineupEntry) {
    return modelUtils.matchWithLineups(match, lineupEntry);
  }

  function normalizeRefereeForModel(match) {
    return modelUtils.normalizeRefereeForModel(match);
  }

  function h2hForMatch(h2hIndex, match) {
    const ids = [
      match?.id,
      match?.event_id,
      match?.uid,
      String(match?.id || '').replace(/^espn_/, ''),
      String(match?.id || '').replace(/^sofa_/, '')
    ].filter(Boolean).map(String);
    return ids.map((id) => h2hIndex[id]).find(Boolean) || null;
  }

  function enrichMatchForModel(match, lineupsIndex, h2hIndex = {}, matchContextIndex = {}) {
    let next = match;
    const lineupEntry = findLineupForMatch(lineupsIndex, match);
    if (lineupEntry) next = matchWithLineups(next, lineupEntry);
    const referee = normalizeRefereeForModel(next);
    if (referee && !next.referee) next = { ...next, referee };
    const h2h = h2hForMatch(h2hIndex, next);
    if (h2h && !next.h2h) next = { ...next, h2h };
    const context = contextUtils.contextForMatch(matchContextIndex, next);
    if (context && !next.context) next = { ...next, context };
    return next;
  }

  function hasLineup(match) {
    return modelUtils.hasLineup(match);
  }

  function hasUsableReferee(match) {
    return modelUtils.hasUsableReferee(match);
  }

  function buildSignalCoverage(events) {
    return modelUtils.buildSignalCoverage(events);
  }

  function findStarPlayersForTeam(starPlayersIndex, team, leagueCode) {
    const variants = new Set(teamNameVariants(team));
    const direct = Object.entries(starPlayersIndex).find(([key, entry]) => {
      return variants.has(normalizeTeamKey(key)) || variants.has(normalizeTeamKey(entry?.team));
    });
    const entry = direct && direct[1];
    const players = Array.isArray(entry?.players) ? entry.players : [];
    return players
      .filter((player) => player && player.sport === 'football')
      .filter((player) => !leagueCode || !player.league || player.league === leagueCode)
      .filter((player) => !/^g$/i.test(String(player.position || '')))
      .slice(0, 8);
  }

  function fallbackScorersFromStars(match, pred, starPlayersIndex) {
    const competitors = Array.isArray(match && match.competitors) ? match.competitors : [];
    const home = competitors.find((c) => c && c.home_away === 'home') || competitors[0] || {};
    const away = competitors.find((c) => c && c.home_away === 'away') || competitors[1] || {};
    const poisson = pred && pred.poisson ? pred.poisson : {};
    const sides = [
      { team: home, teamXg: Number(poisson.xgH) || 1.15, isHome: true },
      { team: away, teamXg: Number(poisson.xgA) || 1.05, isHome: false }
    ];
    const rows = [];
    for (const side of sides) {
      const players = findStarPlayersForTeam(starPlayersIndex, side.team, match.league_code);
      for (const player of players) {
        const pos = String(player.position || '').toUpperCase();
        const posMultiplier = pos === 'F' ? 1.05 : pos === 'M' ? 0.72 : 0.25;
        const primaryRate = Math.max(Number(player.xG_per_match) || 0, Number(player.goals_per_match) || 0);
        const fallbackRate = Math.min(0.35, 0.08 + (Number(player.star_score) || 0) * 0.025);
        const rate = primaryRate > 0 ? primaryRate : fallbackRate * posMultiplier;
        const teamScale = Math.max(0.65, Math.min(1.45, side.teamXg / 1.25));
        const lambda = Math.max(0.02, Math.min(0.95, rate * teamScale));
        const prob = 1 - Math.exp(-lambda);
        rows.push({
          name: player.name,
          pos,
          captain: false,
          pid: player.pid || null,
          starScore: Number(player.star_score) || 0,
          xGPerMatch: Number(player.xG_per_match) || 0,
          goalsPerMatch: Number(player.goals_per_match) || 0,
          teamName: side.team?.name || player.team || '',
          teamShort: side.team?.short || side.team?.name || player.team || '',
          teamAbbr: side.team?.abbr || '',
          isHome: side.isHome,
          prob,
          impliedOdd: prob > 0 ? 1 / prob : null,
          source: 'star_players'
        });
      }
    }
    return rows.sort((a, b) => b.prob - a.prob);
  }

  function cleanLabel(value, fallback = '-') {
    if (value == null || value === '') return fallback;
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (Array.isArray(value)) return value.map((item) => cleanLabel(item, '')).filter(Boolean).join(', ') || fallback;
    if (typeof value === 'object') {
      return cleanLabel(
        value.label ?? value.name ?? value.title ?? value.pick ?? value.side ?? value.key ?? value.market,
        fallback
      );
    }
    return fallback;
  }

  function cleanTitle(value, fallback = '-') {
    return cleanLabel(value, fallback).replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, '').trim() || fallback;
  }

  function formatMarketName(value) {
    const key = String(value || '').trim();
    const normalized = key.toLowerCase().replace(/[\s_-]+/g, '');
    const labels = {
      '1n2': '1N2',
      matchwinner: 'Vainqueur',
      teamtotal: 'Total équipe',
      basketballtotal: 'Total basket',
      baskettotal: 'Total basket',
      hockeytotal: 'Total buts',
      baseballtotal: 'Total runs',
      httotal: 'Total mi-temps',
      htou: 'Total mi-temps',
      halftimetotal: 'Total mi-temps',
      ht1n2: '1N2 mi-temps',
      btts: 'BTTS',
      resultbtts: 'Résultat + BTTS',
      doublechance: 'Double chance',
      handicap: 'Handicap',
      dnb: 'Remboursé si nul',
      exactscore: 'Score exact',
      ou: 'Over/Under',
      ou15: 'O/U 1.5',
      ou25: 'O/U 2.5',
      ou35: 'O/U 3.5',
      tennisgames: 'Jeux tennis',
      tennissets: 'Sets tennis'
    };
    if (labels[normalized]) return labels[normalized];
    return key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\bou(\d)(\d)\b/i, 'O/U $1.$2')
      .replace(/\bht\b/i, 'MT')
      .trim() || 'Marché';
  }

  function simpleMarketGroup(value) {
    const key = calibrationUtils.normalizeMarketKey(value || '');
    const compact = String(key || value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (/^(1n2|vainqueur|matchwinner|winner|moneyline)$/.test(compact)) return 'winner';
    if (/^(ou|ou15|ou25|ou35|overunder|totalgoals|httotal|htou|halftimetotal)$/.test(compact)) return 'goals';
    if (/^(btts|les2equipes|bothteamstoscore)$/.test(compact)) return 'btts';
    if (/^(scorer|buteur|playergoal|goalscorer)$/.test(compact)) return 'scorer';
    if (/^(ht1n2|ht_1n2|halftime1n2|mitempsvainqueur)$/.test(compact)) return 'halftime';
    return '';
  }

  function isSimpleUserMarket(row) {
    return Boolean(simpleMarketGroup(row?.marketKey || row?.market)) && !isDrawSelection(row);
  }

  function isSimpleMarketCandidate(candidate) {
    return Boolean(simpleMarketGroup(candidate?.market || candidate?.key || ''));
  }

  function isDrawSelection(row) {
    const marketGroup = simpleMarketGroup(row?.marketKey || row?.market);
    if (marketGroup !== 'winner' && marketGroup !== 'halftime') return false;
    const value = String([
      row?.label,
      row?.pickLabel,
      row?.pick,
      row?.selection,
      row?.side,
      row?.value
    ].filter(Boolean).join(' ')).toLowerCase();
    const compact = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '');
    return /(^|[^a-z])(?:nul|draw|match\s*nul|egalite)(?:[^a-z]|$)/i.test(value)
      || compact === 'x'
      || compact === 'n'
      || compact === 'nul'
      || compact === 'draw'
      || compact === 'matchnul'
      || compact === 'egalite';
  }

  function normalizePickLabel(match, market, value, fallback = 'Pick') {
    const raw = cleanLabel(value, fallback);
    const compact = raw.trim();
    const teams = getTeamNames(match);
    const sidePrefix = compact.match(/^(1|2|n|x)\s*[-:]\s*(.+)$/i);
    if (sidePrefix && sidePrefix[2]) return sidePrefix[2].trim();

    const key = compact.toLowerCase();
    const marketKey = String(market || '').toLowerCase();
    if (marketKey === '1n2' || marketKey === 'vainqueur' || marketKey === 'matchwinner') {
      if (key === '1' || key === 'home' || key === 'domicile') return teams.home;
      if (key === '2' || key === 'away' || key === 'exterieur' || key === 'extérieur') return teams.away;
      if (key === 'n' || key === 'x' || key === 'draw' || key === 'nul') return 'Nul';
    }
    if (key === 'over') return 'Plus';
    if (key === 'under') return 'Moins';
    if (key === 'yes') return 'Oui';
    if (key === 'no') return 'Non';
    return compact || fallback;
  }

  function isUpcoming(match) {
    if (!match || match.completed) return false;
    const ts = Date.parse(match.date || match.startDate || '');
    return Number.isFinite(ts) && ts > Date.now();
  }

  function startTimestamp(row) {
    return Date.parse(row?.start || row?.date || row?.kickoff || row?.startDate || '');
  }

  function isFutureStart(row, now = Date.now()) {
    const ts = startTimestamp(row);
    return Number.isFinite(ts) && ts > now;
  }

  function isDashboardDisplayCandidate(row) {
    if (!row || row.status === 'skip') return false;
    if (!isSimpleUserMarket(row)) return false;
    if (!isFutureStart(row)) return false;
    if (!(Number(row.odd || 0) > 1)) return false;
    if (isNightCoverageCandidate(row)) return true;
    // Sprint 42 : pour les picks confiance limitée (fallback cote-based
    // Winamax sur sports tennis/baseball/basket/hockey hors couverture
    // nuit), on accepte un edge légèrement négatif jusqu'à -0.04. Le pick
    // restera "À surveiller" sans bouton Je mise — l'utilisateur le voit
    // pour information mais le filtre fiable empêche la mise impulsive.
    if (row.limitedConfidence === true) {
      const odd = Number(row?.odd || 0);
      const edge = Number(row?.safeEdge ?? row?.edge ?? 0);
      if (odd >= 1.30 && odd <= 4.50 && edge >= -0.04) {
        return row.safeAssessment?.displayable !== false || edge >= -0.04;
      }
    }
    if (!(Number(row.safeEdge ?? row.edge ?? 0) >= 0.01)) return false;
    if (row.safeAssessment?.displayable === false) return false;
    return true;
  }

  function isNightCoverageCandidate(row) {
    const ts = startTimestamp(row);
    if (!Number.isFinite(ts) || ts <= Date.now() || ts > Date.now() + 48 * 60 * 60 * 1000) return false;
    const hour = parisHour(ts);
    // Fenêtre nuit élargie 0h-7h Paris (couvre matchs US west coast jusqu'à
    // 06h30 Paris + matchs Asie matin) — user a demandé "+ de pronos la nuit
    // tout sport".
    if (!(hour >= 0 && hour < 7)) return false;
    if (isDrawSelection(row)) return false;
    const sport = String(row?.sport || '').toLowerCase();
    const market = simpleMarketGroup(row?.marketKey || row?.market);
    // Sports nuit élargis : ajout du tennis (tournois Asie/Australie) et
    // de mma/boxe/rugby qui peuvent avoir des matchs nocturnes.
    if (!['baseball', 'basketball', 'hockey', 'football', 'tennis', 'mma', 'boxe', 'rugby'].includes(sport)) return false;
    // Tous les marchés simples acceptés (winner, goals, btts, scorer, halftime).
    if (!market) return false;
    const edge = Number(row?.safeEdge ?? row?.edge ?? 0);
    const probability = Number(row?.probability || 0);
    const odd = Number(row?.odd || 0);
    // Cote max élargie à 5.00 (vs 4.00) pour intégrer plus d'outsiders nuit.
    if (!(odd >= 1.30 && odd <= 5.00)) return false;
    return edge >= -0.08 && probability >= 0.32 && row?.contextGate?.gate !== 'skip';
  }

  function isBookable(match) {
    const winamax = match && match.winamax;
    return Boolean(winamax && winamax.available === true && winamax.match_id && winamax.markets && winamax.markets['1n2']);
  }

  function dedupeUpcomingBookable(events) {
    const seen = new Set();
    return events
      .filter(isUpcoming)
      .filter(isBookable)
      .filter((match) => {
        const key = match?.winamax?.match_id
          ? `wnx:${match.winamax.match_id}`
          : `raw:${match?.id || match?.uid || match?.date || ''}:${match?.name || match?.shortName || ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function stakeFor(win, probability, odd, bankroll) {
    return bettingUtils.stakeFor(probability, odd, bankroll, {
      kellyFn: typeof win.kellyFraction === 'function' ? win.kellyFraction.bind(win) : null
    });
  }

  function bestFromPrediction(win, match, pred) {
    return bettingUtils.bestFromPrediction(win, match, pred, {
      cleanLabel,
      formatMarketName,
      normalizePickLabel
    });
  }

  function candidateScore(candidate) {
    const investment = Number(candidate?.investment?.score);
    const ev = Number(candidate?.ev);
    const edge = Number(candidate?.edge);
    const prob = Number(candidate?.prob ?? candidate?.rel);
    return [
      Number.isFinite(investment) ? investment : 0,
      Number.isFinite(ev) ? ev : 0,
      Number.isFinite(edge) ? edge : 0,
      Number.isFinite(prob) ? prob : 0
    ];
  }

  function runtimeMarketCandidates(win, match, pred) {
    const api = win?.__testAPI || {};
    const build = typeof api.buildMarketCandidates === 'function' ? api.buildMarketCandidates : null;
    if (!build || !match || !pred) return [];
    let candidates = [];
    try {
      candidates = build(match, pred, { requireExact: true }) || [];
    } catch {
      candidates = [];
    }
    const seen = new Set();
    return (Array.isArray(candidates) ? candidates : [])
      .filter((candidate) => {
        const odd = Number(candidate?.odd);
        const prob = Number(candidate?.prob ?? candidate?.rel);
        const edge = Number(candidate?.edge);
        if (!(odd > 1) || !(prob > 0) || !(edge > 0)) return false;
        if (odd > 18) return false;
        if (candidate?.source && candidate.source !== 'winamax_exact') return false;
        if (candidate?.investment?.action === 'skip') return false;
        const marketKey = calibrationUtils.normalizeMarketKey(candidate.market || candidate.key || '');
        const labelKey = compactKey(candidate.label || candidate.pickKey || candidate.key || candidate.side || '');
        const key = `${marketKey}:${labelKey}:${odd.toFixed(2)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => {
        const left = candidateScore(a);
        const right = candidateScore(b);
        for (let index = 0; index < left.length; index += 1) {
          if (right[index] !== left[index]) return right[index] - left[index];
        }
        return 0;
      });
  }

  function alternativeRowsFromCandidates(win, match, pred, best, baseRow, bankroll) {
    const candidates = runtimeMarketCandidates(win, match, pred);
    if (!candidates.length) return [];
    const primaryMarket = calibrationUtils.normalizeMarketKey(best?.best?.market || best?.best?.key || pred?.market || baseRow.market);
    const primaryLabel = compactKey(baseRow.label || best?.label || '');
    const rows = [];
    const seenMarkets = new Set();
    const orderedCandidates = [
      ...candidates.filter(isSimpleMarketCandidate),
      ...candidates.filter((candidate) => !isSimpleMarketCandidate(candidate))
    ];
    for (const candidate of orderedCandidates) {
      const marketKey = calibrationUtils.normalizeMarketKey(candidate.market || candidate.key || '');
      const market = formatMarketName(candidate.market || marketKey);
      const label = normalizePickLabel(match, market, candidate.label || candidate.pickLabel || candidate.pickKey || candidate.key || candidate.side, 'Pick');
      const labelKey = compactKey(label);
      if (marketKey === primaryMarket && labelKey === primaryLabel) continue;
      if (seenMarkets.has(marketKey)) continue;
      seenMarkets.add(marketKey);
      const odd = Number(candidate.odd) || 0;
      const probability = Number(candidate.prob ?? candidate.rel) || 0;
      const edge = Number(candidate.edge) || (odd > 1 && probability > 0 ? probability - (1 / odd) : 0);
      const stake = stakeFor(win, probability, odd, bankroll);
      if (!(edge > 0) || !(stake > 0)) continue;
      rows.push({
        market,
        marketKey,
        label,
        odd,
        probability,
        edge,
        stake,
        status: edge >= 0.05 ? 'bet' : 'watch',
        statusLabel: edge >= 0.08 ? 'Priorité multi-marché' : edge >= 0.05 ? 'Jouable multi-marché' : 'À surveiller',
        pickSource: 'runtime_market_candidate',
        isMarketAlternative: true,
        primaryMarket: baseRow.market,
        marketCandidate: {
          market: candidate.market || marketKey,
          key: candidate.key || candidate.pickKey || null,
          source: candidate.source || 'winamax_exact',
          ev: Number(candidate.ev) || null,
          score: Number(candidate.investment?.score) || null
        }
      });
      if (rows.length >= 5) break;
    }
    return rows;
  }

  function matchWinnerOptions(match) {
    const teams = getTeamNames(match);
    const markets = match?.winamax?.markets || {};
    const rows = [];
    const minOdd = isFootballMatch(match) ? 1.08 : 1.20;
    const push = (side, odd, label, source = 'winamax_market') => {
      const value = Number(odd);
      if (!(value >= minOdd && value <= 2.40)) return;
      if (!['home', 'away'].includes(side)) return;
      rows.push({
        side,
        odd: value,
        label: cleanLabel(label, side === 'home' ? teams.home : teams.away),
        source
      });
    };
    const marketRows = Array.isArray(markets.match_winner) ? markets.match_winner : [];
    for (const row of marketRows) push(row?.side, row?.odd, row?.label, row?.source || 'winamax_detail');
    const n12 = markets['1n2'] || {};
    push('home', n12.home, n12.home_name || teams.home);
    push('away', n12.away, n12.away_name || teams.away);
    const seen = new Map();
    for (const row of rows) {
      const key = row.side;
      if (!seen.has(key) || Number(row.odd) < Number(seen.get(key).odd)) seen.set(key, row);
    }
    return Array.from(seen.values()).sort((a, b) => a.odd - b.odd);
  }

  function isFootballMatch(match) {
    const sport = String(match?.sport || match?.sport_name || match?.league || '').toLowerCase();
    return /soccer|football|foot/.test(sport) && !/américain|american|nfl/.test(sport);
  }

  function selectedWinnerSide(row) {
    const group = simpleMarketGroup(row?.marketKey || row?.market);
    if (group !== 'winner') return '';
    const value = String([
      row?.side,
      row?.selection,
      row?.label,
      row?.pickLabel,
      row?.pick
    ].filter(Boolean).join(' ')).toLowerCase();
    if (/\b(home|domicile|1)\b/.test(value)) return 'home';
    if (/\b(away|exterieur|extérieur|2)\b/.test(value)) return 'away';
    const teams = getTeamNames(row?.match || row || {});
    const labelKey = compactKey(value);
    const homeKey = compactKey(teams.home || '');
    const awayKey = compactKey(teams.away || '');
    if (homeKey && labelKey.includes(homeKey)) return 'home';
    if (awayKey && labelKey.includes(awayKey)) return 'away';
    return '';
  }

  function poissonPmf(lambda, goals) {
    const l = Math.max(0.05, Math.min(4.8, Number(lambda) || 1.1));
    const k = Math.max(0, Math.min(12, Number(goals) || 0));
    let factorial = 1;
    for (let index = 2; index <= k; index += 1) factorial *= index;
    return Math.exp(-l) * (l ** k) / factorial;
  }

  function twoGoalSafetyForWinner(row) {
    const match = row?.match || {};
    if (!isFootballMatch(match) || isDrawSelection(row)) return null;
    const side = selectedWinnerSide(row);
    if (!side) return null;
    const poisson = row?.pred?.poisson || {};
    const baseWinProb = Math.max(0.30, Math.min(0.86, Number(row?.probability || row?.safeConfidence || 0.55) || 0.55));
    let homeXg = Number(poisson.xgH ?? poisson.homeXg ?? poisson.home);
    let awayXg = Number(poisson.xgA ?? poisson.awayXg ?? poisson.away);
    if (!(homeXg > 0) || !(awayXg > 0)) {
      const selectedXg = 0.90 + baseWinProb * 1.35;
      const opponentXg = 1.95 - baseWinProb * 1.10;
      homeXg = side === 'home' ? selectedXg + 0.12 : opponentXg;
      awayXg = side === 'away' ? selectedXg : Math.max(0.55, opponentXg - 0.05);
    }
    homeXg = Math.max(0.45, Math.min(3.25, homeXg));
    awayXg = Math.max(0.35, Math.min(3.10, awayXg));
    let margin2Plus = 0;
    for (let homeGoals = 0; homeGoals <= 8; homeGoals += 1) {
      for (let awayGoals = 0; awayGoals <= 8; awayGoals += 1) {
        const prob = poissonPmf(homeXg, homeGoals) * poissonPmf(awayXg, awayGoals);
        if (side === 'home' && homeGoals - awayGoals >= 2) margin2Plus += prob;
        if (side === 'away' && awayGoals - homeGoals >= 2) margin2Plus += prob;
      }
    }
    const homeBonus = side === 'home' ? 0.035 : 0.010;
    const leadTwoProbability = Math.max(
      margin2Plus,
      Math.min(0.92, margin2Plus * 1.18 + baseWinProb * 0.06 + homeBonus)
    );
    const boost = Math.min(0.045, leadTwoProbability * (side === 'home' ? 0.070 : 0.055));
    return {
      eligible: true,
      side,
      leadTwoProbability,
      finalMarginTwoProbability: margin2Plus,
      homeXg,
      awayXg,
      probabilityBoost: boost,
      label: `${Math.round(leadTwoProbability * 100)}% sécurité 2-0`,
      source: 'winamax_early_payout_model'
    };
  }

  function applyWinamaxTwoGoalRule(row, win, bankroll) {
    const safety = twoGoalSafetyForWinner(row);
    if (!safety || !(safety.probabilityBoost > 0)) return row;
    const beforeProbability = Number(row?.probability || 0) || 0;
    const beforeEdge = Number(row?.edge || 0) || 0;
    const probability = Math.min(0.88, beforeProbability + safety.probabilityBoost);
    const odd = Number(row?.odd || 0);
    const edge = odd > 1 ? Math.max(beforeEdge, probability - (1 / odd)) : beforeEdge;
    const stake = edge > 0 && odd > 1 ? stakeFor(win, probability, odd, bankroll) : Number(row?.stake || 0);
    return {
      ...row,
      probability,
      edge,
      stake: Math.max(Number(row?.stake || 0) || 0, stake),
      modelStake: Math.max(Number(row?.modelStake || 0) || 0, stake),
      winamaxTwoGoalRule: {
        ...safety,
        beforeProbability,
        beforeEdge,
        afterProbability: probability,
        afterEdge: edge
      },
      reason: [
        row?.reason,
        `Filet Winamax 2-0 estimé à ${Math.round(safety.leadTwoProbability * 100)}% sur ce Vainqueur.`
      ].filter(Boolean).join(' ')
    };
  }

  function oddsBasedFallback(win, match, bankroll) {
    const options = matchWinnerOptions(match);
    if (options.length < 1) return null;
    const favorite = options[0];
    const challenger = options[1];
    const gap = challenger ? challenger.odd / favorite.odd : 1;
    const sportKey = String(match?.sport || '').toLowerCase();
    const qualityScore = Number(match?.context?.quality?.score || 0);
    const majorNightSport = /basket|baseball|hockey|football américain|nfl/.test(sportKey);
    const footballTwoGoalCandidate = isFootballMatch(match)
      && favorite.side === 'home'
      && favorite.odd >= 1.08
      && favorite.odd <= 2.35
      && (!challenger || gap >= 1.03)
      && qualityScore >= 0;
    const strongFavorite = favorite.odd >= 1.30 && favorite.odd <= 1.55;
    const clearMarketFavorite = challenger && favorite.odd <= 1.78 && gap >= 1.10;
    const widerMarketFavorite = challenger && favorite.odd <= 1.92 && gap >= 1.18 && (qualityScore >= 45 || majorNightSport);
    if (!(strongFavorite || clearMarketFavorite || widerMarketFavorite || footballTwoGoalCandidate)) return null;
    const implied = 1 / favorite.odd;
    const gapBonus = Math.min(0.030, Math.max(0, (gap - 1.10) * 0.024));
    const contextBonus = qualityScore >= 75 ? 0.012 : qualityScore >= 60 ? 0.006 : 0;
    const sportBonus = /basket|baseball|hockey|tennis|football américain|nfl|mma/.test(sportKey) ? 0.008 : 0;
    const twoGoalBonus = footballTwoGoalCandidate ? 0.010 : 0;
    const priceBonus = strongFavorite ? 0.010 : 0;
    const edge = Math.min(0.065, 0.016 + gapBonus + contextBonus + sportBonus + priceBonus + twoGoalBonus);
    if (!(edge >= 0.012)) return null;
    const probabilityCap = footballTwoGoalCandidate ? 0.94 : 0.78;
    const probability = Math.max(0.30, Math.min(probabilityCap, implied + edge));
    const stake = 0;
    const modelStake = Math.max(0.10, Math.min(1.50, Number((Math.max(1, bankroll) * 0.004).toFixed(2))));
    return {
      best: {
        market: '1n2',
        key: '1n2',
        odd: favorite.odd,
        prob: probability,
        edge,
        source: 'winamax_odds_fallback'
      },
      market: 'Vainqueur',
      marketKey: '1n2',
      label: favorite.label,
      side: favorite.side,
      selection: favorite.side,
      odd: favorite.odd,
      probability,
      edge,
      stake,
      modelStake,
      status: 'watch',
      statusLabel: 'Confiance limitée · à surveiller',
      pickSource: 'winamax_odds_fallback',
      limitedConfidence: true,
      confidenceTrust: {
        score: Math.round(Math.max(45, Math.min(62, probability * 100 - 6))),
        level: 'limité',
        drivers: ['Cote Winamax claire', footballTwoGoalCandidate ? 'Filet 2-0 possible' : gap >= 1.35 ? 'Favori net' : 'Favori modéré']
      },
      contextQuality: {
        ...(match?.context?.quality || {}),
        score: Number.isFinite(qualityScore) && qualityScore > 0 ? qualityScore : 55,
        tier: qualityScore >= 70 ? 'correct' : 'limité',
        critical_missing: []
      },
      contextGate: {
        gate: 'odds_fallback',
        agentEligible: true,
        label: footballTwoGoalCandidate ? 'Confiance limitée : cote Winamax + filet 2-0 à vérifier' : 'Confiance limitée : cote Winamax + contexte léger',
        warnings: [footballTwoGoalCandidate ? 'Vainqueur à surveiller : vérifier la règle 2-0 sur Winamax' : 'Signal basé sur la cote Winamax, à surveiller avant mise']
      },
      modelSkipOverridden: true
    };
  }

  function fallbackAlternativeRow(fallback, primaryMarket) {
    if (!fallback) return null;
    return {
      market: fallback.market,
      marketKey: fallback.marketKey,
      label: fallback.label,
      side: fallback.side,
      selection: fallback.selection || fallback.side,
      odd: fallback.odd,
      probability: fallback.probability,
      edge: fallback.edge,
      stake: fallback.stake,
      modelStake: fallback.modelStake,
      status: fallback.status,
      statusLabel: fallback.statusLabel,
      pickSource: fallback.pickSource,
      limitedConfidence: fallback.limitedConfidence,
      confidenceTrust: fallback.confidenceTrust,
      contextQuality: fallback.contextQuality,
      contextGate: fallback.contextGate,
      modelSkipOverridden: fallback.modelSkipOverridden,
      isMarketAlternative: true,
      primaryMarket,
      marketCandidate: {
        market: fallback.best?.market || fallback.marketKey,
        key: fallback.best?.key || fallback.marketKey,
        source: fallback.best?.source || fallback.pickSource,
        ev: Number(fallback.edge) || null,
        score: Number(fallback.confidenceTrust?.score) || null
      }
    };
  }

  function expandAnalyzedRow(row) {
    const alternatives = Array.isArray(row?.marketAlternatives) ? row.marketAlternatives : [];
    const primary = { ...row, marketAlternatives: [] };
    if (!alternatives.length) return [primary];
    const rows = [primary];
    for (const alternative of alternatives) {
      rows.push(contextUtils.applyContextGate({
        ...primary,
        ...alternative,
        marketAlternatives: []
      }));
    }
    return rows;
  }

  function jsonClone(value, fallback = null) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return fallback;
    }
  }

  function leanPrediction(pred) {
    if (!pred) return null;
    return {
      skip: Boolean(pred.skip),
      pick: jsonClone(pred.pick, null),
      reliability: Number(pred.reliability ?? pred.prob) || 0,
      prob: Number(pred.prob ?? pred.reliability) || 0,
      odds: jsonClone(pred.odds, null),
      markets: jsonClone(pred.markets, null),
      contributions: jsonClone(pred.contributions, null),
      scores: jsonClone(pred.scores, null),
      poisson: jsonClone(pred.poisson, null),
      explain: jsonClone(pred.explain ?? pred.explanation ?? pred.reason, null),
      isLock: Boolean(pred.isLock)
    };
  }

  function analyzeMatch(win, match, bankroll) {
    const teams = getTeamNames(match);
    let pred = null;
    let best = null;
    let stake = 0;
    let status = 'skip';
    let statusLabel = 'Aucune mise';
    let marketLabel = 'Analyse';
    let pickLabel = 'Aucune mise';
    let modelError = null;
    let marketAlternatives = [];
    let fallbackDetails = null;

    try {
      pred = win.predictMatch(match);
      if (pred) {
        best = bestFromPrediction(win, match, pred);
        if (best) {
          marketLabel = best.market;
          pickLabel = best.label;
          stake = stakeFor(win, best.prob, best.odd, bankroll);
        } else {
          marketLabel = formatMarketName(pred.market || '1n2');
          pickLabel = normalizePickLabel(match, marketLabel, pred.pick, 'À surveiller');
        }
        const fallback = oddsBasedFallback(win, match, bankroll);
        let fallbackApplied = false;
        if (fallback) {
          // Sprint 42 : si predictMatch produit un best mais que ce best
          // est sur un marché expert (Jeux tennis, Score exact, Total
          // basket, etc.) — donc invisible en mode standard — bascule
          // vers le fallback cote-based Vainqueur (marché simple). Cela
          // débloque les sports tennis/baseball/basket qui n'avaient
          // jusqu'ici aucun pick standard alors que la cote 1n2 Winamax
          // est exploitable.
          const bestIsSimple = best && isSimpleMarketCandidate(best);
          const shouldReplacePrimary = !best || !(best.edge > 0) || (best && !bestIsSimple);
          if (shouldReplacePrimary) {
            best = fallback.best;
            marketLabel = fallback.market;
            pickLabel = fallback.label;
            stake = fallback.stake;
            status = fallback.status;
            statusLabel = fallback.statusLabel;
            fallbackDetails = fallback;
            fallbackApplied = true;
          }
        }
        if (best && best.edge > 0 && stake > 0) {
          status = best.edge >= 0.05 ? 'bet' : 'watch';
          statusLabel = best.edge >= 0.08
            ? 'Priorité'
            : best.edge >= 0.05
              ? (best.derivedFromSkip ? 'Jouable manuel' : 'Jouable')
              : 'À surveiller';
        } else if (!fallbackApplied) {
          statusLabel = 'À surveiller';
        }
        marketAlternatives = alternativeRowsFromCandidates(win, match, pred, best, {
          market: marketLabel,
          label: pickLabel
        }, bankroll);
        if (fallback && !fallbackApplied) {
          const primaryMarket = calibrationUtils.normalizeMarketKey(best?.market || best?.key || pred?.market || marketLabel);
          const primaryLabel = compactKey(pickLabel || best?.label || '');
          const fallbackMarket = calibrationUtils.normalizeMarketKey(fallback.marketKey || fallback.best?.market || fallback.market);
          const fallbackLabel = compactKey(fallback.label || '');
          const primaryIsReady = stake > 0 && status === 'bet';
          const fallbackIsDistinct = fallbackMarket !== primaryMarket || fallbackLabel !== primaryLabel;
          const fallbackHasTwoGoalSafety = /filet 2-0/i.test(String(fallback.contextGate?.label || fallback.statusLabel || ''));
          if (fallbackIsDistinct && (fallbackHasTwoGoalSafety || !primaryIsReady || Number(fallback.edge || 0) > Number(best?.edge || 0) + 0.005)) {
            marketAlternatives.unshift(fallbackAlternativeRow(fallback, marketLabel));
          }
        }
      }
    } catch (error) {
      modelError = error && error.message ? error.message : String(error);
      status = 'skip';
      statusLabel = 'Erreur modèle';
      marketLabel = 'Analyse';
      pickLabel = 'Erreur modèle';
    }

    const row = {
      id: String(match.winamax?.match_id || match.id || match.uid || `${match.date}-${teams.home}-${teams.away}`),
      match: jsonClone(match, {}),
      pred: leanPrediction(pred),
      title: `${teams.home} - ${teams.away}`,
      sport: match.sport || 'sport',
      league: match.league_name || match.league_code || '',
      start: match.date || '',
      market: marketLabel,
      marketKey: calibrationUtils.normalizeMarketKey(best?.best?.market || best?.best?.key || best?.market || best?.key || pred?.market || marketLabel),
      label: pickLabel,
      odd: best ? best.odd : 0,
      probability: best ? best.prob : Number(pred && (pred.reliability ?? pred.prob)) || 0,
      edge: best ? best.edge : 0,
      stake,
      pickSource: best?.source || (best ? 'runtime_best_pick' : null),
      modelSkipOverridden: Boolean(best?.derivedFromSkip || best?.source === 'winamax_odds_fallback'),
      status,
      statusLabel,
      marketProfile: marketProfile(match),
      marketAlternatives,
      winamaxUrl: match.winamax && match.winamax.url,
      modelError
    };
    return contextUtils.applyContextGate({
      ...row,
      ...(fallbackDetails ? {
        limitedConfidence: true,
        pickSource: fallbackDetails.pickSource,
        side: fallbackDetails.side,
        selection: fallbackDetails.selection || fallbackDetails.side,
        confidenceTrust: fallbackDetails.confidenceTrust,
        contextQuality: fallbackDetails.contextQuality,
        contextGate: fallbackDetails.contextGate
      } : {})
    });
  }

  function marketProfile(match) {
    const wx = match?.winamax || {};
    const markets = wx.markets || {};
    const families = {
      n12: Boolean(markets['1n2'] || markets.match_winner),
      ou: Boolean((Array.isArray(markets.ou) && markets.ou.length) || markets.ou25 || markets.ou15 || markets.ou35),
      btts: Boolean(markets.btts || (Array.isArray(markets.btts_rows) && markets.btts_rows.length)),
      teamTotal: Boolean(Array.isArray(markets.team_total) && markets.team_total.length),
      dnb: Boolean(markets.dnb || (Array.isArray(markets.dnb_rows) && markets.dnb_rows.length)),
      exactScore: Boolean(Array.isArray(markets.exact_score_rows) && markets.exact_score_rows.length),
      doubleChance: Boolean(markets.double_chance || markets.doublechance || (Array.isArray(markets.double_chance_rows) && markets.double_chance_rows.length)),
      halfTime: Boolean(markets.ht1n2 || markets.ht_total || markets.halftime || (Array.isArray(markets.ht_rows) && markets.ht_rows.length)),
      handicap: Boolean(markets.handicap || markets.ah || markets.asian_handicap || (Array.isArray(markets.handicap_rows) && markets.handicap_rows.length)),
      corners: Boolean(markets.corners || markets.corners_ou || (Array.isArray(markets.corners_rows) && markets.corners_rows.length)),
      cards: Boolean(markets.cards || markets.cards_ou || (Array.isArray(markets.cards_rows) && markets.cards_rows.length)),
      basketTotal: Boolean(markets.basket_total || markets.basketball_total || markets.basket_team_total),
      tennis: Boolean(markets.tennis_games || markets.tennis_sets || markets.total_games || markets.sets),
      players: Array.isArray(wx.full_market_keys) && wx.full_market_keys.some((key) => /buteur|passeur|joueur|player|marque|tir|shot/i.test(String(key)))
    };
    const detailedCount = Number(wx.full_markets_count || 0);
    const availableFamilies = Object.entries(families).filter(([, value]) => value).map(([key]) => key);
    return {
      detailed: wx.full_markets_available === true || detailedCount > 0,
      detailedCount,
      keys: Array.isArray(wx.full_market_keys) ? wx.full_market_keys.slice(0, 16) : [],
      families,
      familyCount: availableFamilies.length,
      availableFamilies,
      missingCore: ['n12', 'ou', 'btts', 'teamTotal'].filter((key) => !families[key])
    };
  }

  function winamaxMarketFamily(value) {
    const key = compactKey(value);
    if (!key) return 'unknown';
    if (/1n2|vainqueur|matchwinner|resultatfinal/.test(key)) return '1n2';
    if (/doublechance|dc/.test(key)) return 'doublechance';
    if (/btts|les2equipes|bothteamstoscore/.test(key)) return 'btts';
    if (/corner/.test(key)) return 'corners';
    if (/carton|card/.test(key)) return 'cards';
    if (/mitemps|halftime|1ereperiode|ht/.test(key)) return 'halftime';
    if (/dnb|remboursesinul|drawnobet/.test(key)) return 'dnb';
    if (/handicap|asian|spread/.test(key)) return 'handicap';
    if (/exact|scorecorrect|scoreexact/.test(key)) return 'exactscore';
    if (/buteur|passeur|joueur|player|marqueur|tir|shot/.test(key)) return 'players';
    if (/teamtotal|totalequipe|totalquipe/.test(key)) return 'teamtotal';
    if (/basket|baskettotal|points/.test(key)) return 'basket';
    if (/tennis|jeu|set/.test(key)) return 'tennis';
    if (/hockey|runs|baseball/.test(key)) return 'sporttotal';
    if (/over|under|plus|moins|total|ou[0-9]/.test(key)) return 'ou';
    return 'other';
  }

  function winamaxMarketFamilyLabel(family) {
    const labels = {
      '1n2': '1N2',
      doublechance: 'Double chance',
      btts: 'BTTS',
      corners: 'Corners',
      cards: 'Cartons',
      halftime: 'Mi-temps',
      handicap: 'Handicap',
      exactscore: 'Score exact',
      players: 'Joueurs',
      teamtotal: 'Total équipe',
      dnb: 'Remboursé si nul',
      basket: 'Basket totals',
      tennis: 'Tennis',
      sporttotal: 'Totals sport',
      ou: 'Over/Under',
      other: 'Autres marchés'
    };
    return labels[family] || String(family || 'Marché');
  }

  function normalizeProfileFamilyKey(key) {
    const normalized = String(key || '').trim();
    const map = {
      n12: '1n2',
      teamTotal: 'teamtotal',
      doubleChance: 'doublechance',
      halfTime: 'halftime',
      exactScore: 'exactscore',
      basketTotal: 'basket'
    };
    return map[normalized] || winamaxMarketFamily(normalized);
  }

  function collectWinamaxMarketFamilies(match) {
    const wx = match?.winamax || {};
    const profile = marketProfile(match);
    const families = new Set((profile.availableFamilies || []).map(normalizeProfileFamilyKey));
    for (const key of Array.isArray(wx.full_market_keys) ? wx.full_market_keys : []) {
      families.add(winamaxMarketFamily(key));
    }
    for (const key of Object.keys(wx.markets || {})) {
      families.add(winamaxMarketFamily(key));
    }
    return Array.from(families).filter((item) => item && item !== 'unknown').sort();
  }

  function findBoostLikeValues(value, pathName = '', out = []) {
    if (!value || typeof value !== 'object') return out;
    if (Array.isArray(value)) {
      value.slice(0, 80).forEach((item, index) => findBoostLikeValues(item, `${pathName}[${index}]`, out));
      return out;
    }
    for (const [key, item] of Object.entries(value)) {
      const nextPath = pathName ? `${pathName}.${key}` : key;
      if (/boost|promo|freebet|multibet|betplus|bet\+/i.test(key)) {
        out.push({
          path: nextPath,
          key,
          value: typeof item === 'object' ? null : item,
          sample: typeof item === 'object' ? JSON.stringify(item).slice(0, 240) : String(item).slice(0, 240)
        });
      }
      if (item && typeof item === 'object') findBoostLikeValues(item, nextPath, out);
    }
    return out;
  }

  function parseBoostOdd(record) {
    const text = `${record?.sample || ''} ${record?.value || ''}`;
    const numbers = text.match(/\b\d+(?:[.,]\d{1,2})\b/g)
      ?.map((item) => Number(String(item).replace(',', '.')))
      .filter((item) => item > 1 && item < 100) || [];
    if (numbers.length >= 2) return { from: Math.min(...numbers), to: Math.max(...numbers) };
    if (numbers.length === 1) return { from: null, to: numbers[0] };
    return { from: null, to: null };
  }

  function detectWinamaxBoostsForMatch(match) {
    const wx = match?.winamax || {};
    const raw = findBoostLikeValues(wx).slice(0, 20);
    return raw.map((item) => ({
      ...item,
      ...parseBoostOdd(item),
      title: cleanTitle(match) || match?.name || ''
    }));
  }

  function recommendedWinamaxBetType(row) {
    const odd = Number(row?.odd || 0);
    const edge = Number(row?.edge || 0);
    const probability = Number(row?.probability || 0);
    const marketKey = calibrationUtils.normalizeMarketKey(row?.marketKey || row?.market || '');
    if (odd > 3.8 || /exactscore|score/.test(marketKey)) {
      return {
        type: 'Système',
        label: 'Système',
        reason: 'Cote haute : mieux vaut lisser le risque plutôt que charger le single.'
      };
    }
    if ((odd <= 1.45 && probability >= 0.70) || edge < 0.04) {
      return {
        type: 'Combiné prudent',
        label: 'Combiné prudent',
        reason: 'Cote courte : utile seulement comme jambe solide, pas comme gros single.'
      };
    }
    if (/btts|ou|teamtotal|tennisgames|tennissets|basket|hockey|baseball/.test(marketKey) && edge >= 0.05) {
      return {
        type: 'Single',
        label: 'Single Winamax',
        reason: 'Marché lisible avec edge positif : le single garde la variance sous contrôle.'
      };
    }
    if (row?.isMarketAlternative) {
      return {
        type: 'Single léger',
        label: 'Single léger',
        reason: 'Marché alternatif détecté : mise légère tant que le signal reste secondaire.'
      };
    }
    return {
      type: 'Single',
      label: 'Single Winamax',
      reason: 'Le pick principal se joue seul pour garder la décision claire.'
    };
  }

  function applyWinamaxProductLayer(row) {
    const boosts = detectWinamaxBoostsForMatch(row?.match);
    const betType = recommendedWinamaxBetType(row);
    const qualityFlags = [];
    if (Number(row?.edge || 0) > 0.20) qualityFlags.push('edge_high_review');
    if (row?.marketProfile?.familyCount >= 6) qualityFlags.push('rich_winamax_market');
    return {
      ...row,
      winamaxBetType: betType,
      winamaxBoost: boosts[0] || null,
      qualityFlags
    };
  }

  function calibratedProbabilityFromReport(probability, report) {
    const raw = Math.max(0.01, Math.min(0.99, Number(probability || 0) || 0));
    const buckets = Array.isArray(report?.buckets) ? report.buckets : [];
    if (!buckets.length) return raw;
    const bucket = buckets.find((item) => {
      const [from, to] = String(item.bucket || '').split('-').map(Number);
      return Number.isFinite(from) && Number.isFinite(to) && raw >= from && raw < to;
    }) || buckets[buckets.length - 1];
    const actual = Number(bucket?.actual);
    const expected = Number(bucket?.expected);
    const count = Number(bucket?.count || 0) || 0;
    if (!Number.isFinite(actual) || !Number.isFinite(expected)) return raw;
    const error = expected - actual;
    if (error <= 0.015) return raw;
    const shrinkRatio = count >= 30 ? 0.92 : count >= 12 ? 0.68 : 0.45;
    const empiricalAnchor = count >= 30 ? actual + 0.035 : actual + 0.06;
    const bucketFloor = raw >= 0.90 ? 0.40 : raw >= 0.80 ? 0.48 : raw >= 0.70 ? 0.52 : raw >= 0.60 ? 0.45 : 0.28;
    const calibrated = Math.max(empiricalAnchor, raw - (error * shrinkRatio));
    return Math.max(bucketFloor, Math.min(raw, calibrated));
  }

  function applyProbabilityRealityCalibration(row, report, win, bankroll) {
    if (!report?.schema || !(Number(row?.probability || 0) > 0) || !(Number(row?.odd || 0) > 1)) return row;
    const before = Number(row.probability || 0);
    const after = calibratedProbabilityFromReport(before, report);
    const changed = Math.abs(after - before) >= 0.005;
    if (!changed) return row;
    const odd = Number(row.odd || 0);
    const beforeEdge = Number(row.edge || 0);
    const edge = after - (1 / odd);
    const stake = edge > 0 ? stakeFor(win, after, odd, bankroll) : 0;
    return {
      ...row,
      rawProbability: before,
      rawEdge: beforeEdge,
      probability: after,
      edge,
      stake,
      modelStake: stake,
      probabilityRealityCalibration: {
        applied: true,
        before,
        after,
        delta: after - before,
        source: 'probability_calibration_report',
        brier: report.summary?.brier ?? null
      }
    };
  }

  function effectiveConfidence(row) {
    const raw = Math.max(0, Math.min(0.99, Number(row?.probability || 0) || 0));
    const trustScore = Number(row?.confidenceTrust?.score);
    const modelTrustRaw = Number.isFinite(trustScore) && trustScore > 0 ? Math.max(0, Math.min(0.99, trustScore / 100)) : 0;
    const modelTrust = row?.probabilityRealityCalibration?.applied
      ? Math.min(modelTrustRaw, Math.min(0.99, raw + 0.08))
      : modelTrustRaw;
    const adjusted = Number(row?.adjustedConfidence);
    const segmentSample = Number(row?.segmentValidation?.sample ?? row?.calibration?.sample ?? 0) || 0;
    const segmentRoi = Number(row?.segmentValidation?.roi ?? row?.calibration?.roi ?? 0);
    const calibrationSample = Number(row?.calibration?.sample || 0) || 0;
    const calibrationRoi = Number(row?.calibration?.roi || 0);
    if (Number.isFinite(adjusted) && adjusted > 0) {
      const cleaned = Math.max(0, Math.min(0.99, adjusted));
      const effectiveAdjusted = row?.probabilityRealityCalibration?.applied
        ? Math.min(cleaned, Math.min(0.99, raw + 0.08))
        : cleaned;
      if (segmentSample < 30 ||
        (segmentSample >= 15 && Number.isFinite(segmentRoi) && segmentRoi >= 0) ||
        (calibrationSample >= 15 && Number.isFinite(calibrationRoi) && calibrationRoi >= 0 && row?.calibration?.blocked !== true)) {
        return Math.max(effectiveAdjusted, raw, modelTrust);
      }
      return Math.max(effectiveAdjusted, modelTrust);
    }
    const adjustedScore = Number(row?.confidenceTrust?.adjustedScore);
    if (Number.isFinite(adjustedScore) && adjustedScore > 0) return Math.max(modelTrust, Math.max(0, Math.min(0.99, adjustedScore / 100)));
    return Math.max(raw, modelTrust);
  }

  function conservativeEdge(row) {
    const raw = Number(row?.edge || 0);
    if (!Number.isFinite(raw) || raw <= 0) return { value: 0, capped: false };
    if (raw <= 0.20) return { value: raw, capped: false };
    const confidence = effectiveConfidence(row);
    const adjusted = Math.max(0.08, Math.min(0.195, 0.12 + Math.max(0, confidence - 0.55) * 0.18));
    return { value: adjusted, capped: true };
  }

  function safeAssessmentForRow(row) {
    const rawEdge = Number(row?.edge || 0);
    const edgeInfo = conservativeEdge(row);
    const edge = edgeInfo.value;
    const odd = Number(row?.odd || 0);
    const confidence = effectiveConfidence(row);
    const sample = Number(row?.segmentValidation?.sample ?? row?.calibration?.sample ?? 0) || 0;
    const roi = Number(row?.segmentValidation?.roi ?? row?.calibration?.roi ?? 0);
    const policy = row?.segmentPolicy || null;
    const edgeMin = Number.isFinite(Number(policy?.newEdgeMin)) ? Number(policy.newEdgeMin) : 0.03;
    const oddMax = Number.isFinite(Number(policy?.newOddMax)) ? Number(policy.newOddMax) : 6.00;
    const confidenceMin = Number.isFinite(Number(policy?.newConfidenceMin)) ? Number(policy.newConfidenceMin) : 0.55;
    const quality = row?.contextQuality || row?.match?.context?.quality || {};
    const criticalMissing = Array.isArray(quality.critical_missing) ? quality.critical_missing : [];
    const hardCriticalMissing = criticalMissing.filter((item) => !/^availability_missing/i.test(String(item || '')));
    const softAvailabilityMissing = criticalMissing.length > 0 && hardCriticalMissing.length === 0;
    const reasons = [];
    const warnings = [];

    const segmentNegative = sample >= 15 && Number.isFinite(roi) && roi < 0;
    const baseZone = rawEdge >= 0.01 && odd >= 1.30 && odd <= 6.00 && !row?.signalConflict?.active && !row?.oddsGuardrail?.applied && !hardCriticalMissing.length;
    const ruleA = baseZone && edge >= edgeMin && odd <= oddMax && confidence >= confidenceMin && !segmentNegative;
    const ruleB = baseZone && sample < 5 && edge >= 0.05 && odd <= 5.00 && confidence >= 0.65;
    const ruleC = baseZone && sample >= 5 && sample < 15 && edge >= 0.04 && odd <= 5.00 && confidence >= 0.60;
    const reliableRule = ruleA ? 'A' : ruleB ? 'B' : ruleC ? 'C' : null;

    if (!(rawEdge >= 0.01)) reasons.push('edge < +1pt');
    if (!reliableRule && edge < Math.min(edgeMin, sample < 5 ? 0.05 : sample < 15 ? 0.04 : edgeMin)) reasons.push('edge prudent insuffisant');
    if (odd < 1.30 || odd > (sample < 15 ? Math.min(5.00, oddMax) : oddMax)) reasons.push(`cote hors zone solo 1.30-${(sample < 15 ? Math.min(5.00, oddMax) : oddMax).toFixed(2)}`);
    if (!reliableRule && confidence < (sample < 5 ? 0.65 : sample < 15 ? 0.60 : confidenceMin)) reasons.push('confiance insuffisante');
    if (segmentNegative) reasons.push('segment historique négatif');
    if (row?.signalConflict?.active) reasons.push('conflit signaux');
    if (row?.oddsGuardrail?.applied) reasons.push(row.oddsGuardrail.label || 'cote à vérifier');
    if (hardCriticalMissing.length) reasons.push(`signal critique manquant: ${hardCriticalMissing.slice(0, 2).join(', ')}`);
    if (softAvailabilityMissing) warnings.push('disponibilités joueurs incomplètes');
    if (edgeInfo.capped) warnings.push(`edge brut ${Math.round(rawEdge * 100)}% plafonné par prudence`);
    if (sample > 0 && sample < 15) warnings.push(`sample court ${sample}/15`);
    if (!sample) warnings.push('historique segment absent');
    if (policy?.direction === 'boost') warnings.push(`segment gagnant : filtre assoupli (${policy.reason})`);
    if (policy?.direction === 'harden') warnings.push(`segment froid : filtre durci (${policy.reason})`);

    if (row?.limitedConfidence) {
      const limitedHasTwoGoalSafety = Boolean(row?.winamaxTwoGoalRule?.eligible);
      // Sprint 42 : pour les sports hors foot (tennis/baseball/basket/
      // hockey), les fallbacks cote-based peuvent avoir un edge brut
      // légèrement négatif (jusqu'à -4pt) à cause des cotes serrées.
      // On accepte ces picks en "À surveiller" sans bouton Je mise pour
      // débloquer la couverture sport. Pour le foot, on garde le seuil
      // strict +1pt.
      const sportKey = String(row?.sport || '').toLowerCase();
      const isMultiSportFallback = /tennis|baseball|basket|hockey|football américain|mma|rugby|boxe/.test(sportKey);
      const minRawEdge = isMultiSportFallback ? -0.04 : 0.01;
      const limitedDisplayable = rawEdge >= minRawEdge &&
        odd >= (limitedHasTwoGoalSafety ? 1.08 : 1.30) &&
        odd <= 6.00 &&
        confidence >= 0.30 &&
        !row?.signalConflict?.active &&
        !row?.oddsGuardrail?.applied;
      return {
        status: limitedDisplayable ? 'watch' : 'reject',
        label: limitedDisplayable ? 'À surveiller' : 'Écarté',
        reliable: false,
        displayable: limitedDisplayable,
        conservativeEdge: edge,
        rawEdge,
        edgeCapped: edgeInfo.capped,
        confidence,
        sample,
        roi: Number.isFinite(roi) ? roi : null,
        policy: policy ? {
          key: policy.key,
          direction: policy.direction,
          edgeMin,
          oddMax,
          confidenceMin,
          reason: policy.reason
        } : null,
        reliableRule: null,
        reasons: [limitedHasTwoGoalSafety ? 'confiance limitée : cote Winamax + filet 2-0 à vérifier' : 'confiance limitée : cote Winamax + contexte léger'],
        warnings: ['À surveiller avant mise', ...warnings].slice(0, 4)
      };
    }

    const reliable = Boolean(reliableRule) && edge <= 0.20;
    const displayable = rawEdge >= 0.01 && odd > 1.10 && odd <= 18 && confidence >= 0.30 && row?.decisionCenter?.status !== 'skip';
    return {
      status: reliable ? 'reliable' : displayable ? 'watch' : 'reject',
      label: reliable ? 'Fiable' : displayable ? 'À surveiller' : 'Écarté',
      reliable,
      displayable,
      conservativeEdge: edge,
      rawEdge,
      edgeCapped: edgeInfo.capped,
      confidence,
      sample,
      roi: Number.isFinite(roi) ? roi : null,
      policy: policy ? {
        key: policy.key,
        direction: policy.direction,
        edgeMin,
        oddMax,
        confidenceMin,
        reason: policy.reason
      } : null,
      reliableRule,
      reasons: reasons.slice(0, 5),
      warnings: warnings.slice(0, 4)
    };
  }

  function applySafeReliabilityLayer(row) {
    const assessment = safeAssessmentForRow(row);
    let nextDecision = row.decisionCenter || {};
    let nextStake = row.stake;
    let status = row.status;
    let statusLabel = row.statusLabel;
    if (assessment.status === 'reliable' && nextDecision.canBet) {
      nextStake = Math.max(0, Number(nextDecision.stake ?? nextStake ?? 0) || 0);
      status = 'bet';
      statusLabel = `✓ Fiable · règle ${assessment.reliableRule || 'safe'}`;
    }
    if (assessment.status !== 'reliable' && nextDecision.canBet) {
      nextDecision = {
        ...nextDecision,
        status: assessment.status === 'watch' ? 'watch' : 'skip',
        canBet: false,
        stake: 0,
        stakeDisplay: '0 €',
        mainReason: assessment.reasons[0] || (assessment.status === 'watch' ? 'À surveiller par prudence' : 'Pick écarté par filtre safe'),
        nextAction: assessment.status === 'watch' ? 'Surveiller' : 'Écarter',
        blockingGates: [
          ...(nextDecision.blockingGates || []),
          { key: 'safe_filter', label: assessment.reasons[0] || 'Filtre safe', tone: assessment.status === 'watch' ? 'warn' : 'danger' }
        ],
        riskTone: assessment.status === 'watch' ? 'watch' : 'warn'
      };
      nextStake = 0;
      status = assessment.status === 'watch' ? 'watch' : 'skip';
      statusLabel = assessment.status === 'watch' ? 'À surveiller · filtre safe' : 'Écarté par filtre safe';
    }
    return {
      ...row,
      stake: nextStake,
      status,
      statusLabel,
      decisionCenter: nextDecision,
      safeAssessment: assessment,
      safeEdge: assessment.conservativeEdge,
      safeConfidence: assessment.confidence
    };
  }

  function clamp01(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
  }

  function urgencyScoreForRow(row) {
    const ts = Date.parse(row?.start || '');
    if (!Number.isFinite(ts)) return 0.15;
    const minutes = (ts - Date.now()) / 60000;
    if (minutes < -30) return 0.05;
    if (minutes <= 15) return 1;
    if (minutes <= 60) return 0.95;
    if (minutes <= 180) return 0.82;
    if (minutes <= 360) return 0.66;
    if (minutes <= 720) return 0.45;
    if (minutes <= 1440) return 0.25;
    return 0.10;
  }

  function reliabilityScoreForRow(row) {
    const edge = Number(row?.safeEdge ?? row?.edge ?? 0) || 0;
    const confidence = effectiveConfidence(row);
    const sample = Number(row?.safeAssessment?.sample ?? row?.segmentValidation?.sample ?? row?.calibration?.sample ?? 0) || 0;
    const roi = Number(row?.safeAssessment?.roi ?? row?.segmentValidation?.roi ?? row?.calibration?.roi ?? 0);
    const quality = row?.contextQuality || row?.match?.context?.quality || {};
    const staleCount = Array.isArray(quality.stale) ? quality.stale.length : 0;
    const contextScore = Number(quality.score);
    const edgeScore = clamp01((edge - 0.03) / 0.17);
    const confidenceScore = clamp01((confidence - 0.55) / 0.40);
    const segmentScore = sample >= 15
      ? Number.isFinite(roi) && roi >= 0 ? 1 : 0.20
      : confidence >= 0.70 ? 0.78 : 0.62;
    const freshnessScore = staleCount ? 0.70 : Number.isFinite(contextScore) ? clamp01(contextScore / 100) : 0.80;
    const twoGoalBonus = clamp01(Number(row?.winamaxTwoGoalRule?.leadTwoProbability || 0) / 0.60) * 0.08;
    return clamp01(edgeScore * 0.30 + confidenceScore * 0.28 + segmentScore * 0.22 + freshnessScore * 0.12 + twoGoalBonus);
  }

  function historicalVolumeScoreForRow(row) {
    const sample = Number(row?.safeAssessment?.sample ?? row?.segmentValidation?.sample ?? row?.calibration?.sample ?? 0) || 0;
    if (sample >= 100) return 1;
    if (sample >= 50) return 0.85;
    if (sample >= 15) return 0.55 + (sample - 15) / 35 * 0.25;
    return 0.35;
  }

  function priorityReasonForRow(row, parts) {
    const bits = [];
    bits.push(`edge ${Math.round(Number(row?.safeEdge ?? row?.edge ?? 0) * 100)}pt`);
    bits.push(`confiance ${Math.round(effectiveConfidence(row) * 100)}%`);
    const sample = Number(row?.safeAssessment?.sample ?? row?.segmentValidation?.sample ?? row?.calibration?.sample ?? 0) || 0;
    const roi = Number(row?.safeAssessment?.roi ?? row?.segmentValidation?.roi ?? row?.calibration?.roi ?? 0);
    if (sample >= 15) bits.push(`segment ${sample} paris · ROI ${Number.isFinite(roi) ? Math.round(roi * 100) : 0}%`);
    else bits.push('sample court mais signal fort');
    bits.push(`départ ${Math.max(0, Math.round(((Date.parse(row?.start || '') || Date.now()) - Date.now()) / 60000))} min`);
    if (row?.winamaxBoost) bits.push('boost Winamax');
    if (row?.winamaxTwoGoalRule?.eligible) bits.push(`filet 2-0 ${Math.round(Number(row.winamaxTwoGoalRule.leadTwoProbability || 0) * 100)}%`);
    if (parts?.diversity >= 0.75) bits.push('diversification sport/ligue');
    return bits.slice(0, 5).join(' · ');
  }

  function applyPriorityScores(rows) {
    const all = Array.isArray(rows) ? rows : [];
    const sportCounts = new Map();
    const leagueCounts = new Map();
    rollingWindowRows(all, 24).forEach((row) => {
      const sport = String(row?.sport || 'sport').toLowerCase();
      const league = String(row?.league || 'ligue').toLowerCase();
      sportCounts.set(sport, (sportCounts.get(sport) || 0) + 1);
      leagueCounts.set(league, (leagueCounts.get(league) || 0) + 1);
    });
    return all.map((row) => {
      const sport = String(row?.sport || 'sport').toLowerCase();
      const league = String(row?.league || 'ligue').toLowerCase();
      const reliability = reliabilityScoreForRow(row);
      const urgency = urgencyScoreForRow(row);
      const volume = historicalVolumeScoreForRow(row);
      const boost = row?.winamaxBoost ? 1 : 0;
      const diversity = clamp01(1 - Math.min(0.75, ((sportCounts.get(sport) || 1) - 1) * 0.08 + ((leagueCounts.get(league) || 1) - 1) * 0.04));
      const score = Math.round((reliability * 40 + urgency * 30 + volume * 15 + boost * 10 + diversity * 5) * 10) / 10;
      const priority = {
        score,
        label: score >= 82 ? 'Top priorité' : score >= 70 ? 'Très prioritaire' : score >= 58 ? 'Prioritaire' : score >= 45 ? 'À garder' : 'Secondaire',
        components: {
          reliability: Math.round(reliability * 100),
          urgency: Math.round(urgency * 100),
          history: Math.round(volume * 100),
          boost: boost ? 100 : 0,
          diversity: Math.round(diversity * 100)
        }
      };
      priority.reason = priorityReasonForRow(row, priority.components);
      return {
        ...row,
        priorityScore: score,
        priority
      };
    });
  }

  function buildWinamaxMarketAudit(events, rows) {
    const familyCounts = new Map();
    const sportCounts = new Map();
    const keyCounts = new Map();
    const boostRows = [];
    for (const event of Array.isArray(events) ? events : []) {
      if (!event?.winamax?.available) continue;
      const sport = String(event.sport || event.sport_name || 'sport').toLowerCase();
      sportCounts.set(sport, (sportCounts.get(sport) || 0) + 1);
      collectWinamaxMarketFamilies(event).forEach((family) => {
        familyCounts.set(family, (familyCounts.get(family) || 0) + 1);
      });
      (Array.isArray(event?.winamax?.full_market_keys) ? event.winamax.full_market_keys : []).forEach((key) => {
        const normalized = String(key || '').slice(0, 80);
        keyCounts.set(normalized, (keyCounts.get(normalized) || 0) + 1);
      });
      detectWinamaxBoostsForMatch(event).forEach((boost) => boostRows.push({
        matchId: event?.winamax?.match_id || event?.id || null,
        title: cleanTitle(event) || event?.name || '',
        path: boost.path,
        from: boost.from,
        to: boost.to,
        sample: boost.sample
      }));
    }
    const exploited = new Map();
    for (const row of Array.isArray(rows) ? rows : []) {
      if (!row || !(row.edge > 0) || !(row.odd > 1)) continue;
      const family = winamaxMarketFamily(row.marketKey || row.market);
      exploited.set(family, (exploited.get(family) || 0) + 1);
    }
    const availableFamilies = Array.from(familyCounts.entries())
      .map(([family, count]) => ({ family, label: winamaxMarketFamilyLabel(family), count, exploited: exploited.get(family) || 0 }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    const sports = Array.from(sportCounts.entries())
      .map(([sport, count]) => ({ sport, count }))
      .sort((a, b) => b.count - a.count || a.sport.localeCompare(b.sport));
    const unexploited = availableFamilies.filter((row) => row.exploited === 0).slice(0, 12);
    const exploitedFamilies = availableFamilies.filter((row) => row.exploited > 0);
    return {
      schema: 'paris-sportif.winamax_market_audit.v1',
      generatedAt: new Date().toISOString(),
      summary: {
        bookableEvents: Array.isArray(events) ? events.filter((event) => event?.winamax?.available).length : 0,
        availableFamilies: availableFamilies.length,
        exploitedFamilies: exploitedFamilies.length,
        positiveRows: Array.isArray(rows) ? rows.filter((row) => row && row.edge > 0 && row.odd > 1).length : 0,
        boostsDetected: boostRows.length,
        sportsDetected: sports.length,
        targetDailyPicks: 15
      },
      families: availableFamilies,
      sports,
      topRawKeys: Array.from(keyCounts.entries()).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count).slice(0, 25),
      unexploited,
      boosts: boostRows.slice(0, 30)
    };
  }

  function compactKey(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  function canonicalMarketKey(value) {
    const compact = compactKey(value);
    const aliases = {
      n12: '1n2',
      vainqueur: '1n2',
      matchwinner: '1n2',
      totalquipe: 'teamtotal',
      totalequipe: 'teamtotal',
      totalbuts: 'ou',
      overunder: 'ou',
      rembourseysinul: 'dnb',
      rembourseesinul: 'dnb',
      doublechance: 'doublechance'
    };
    return aliases[compact] || compact || 'unknown';
  }

  function findReportBucket(rows, key) {
    const wanted = canonicalMarketKey(key);
    return (Array.isArray(rows) ? rows : []).find((row) => canonicalMarketKey(row?.key) === wanted) || null;
  }

  function oddBucketKey(odd) {
    const n = Number(odd);
    if (!Number.isFinite(n) || n <= 0) return 'unknown';
    if (n < 1.5) return '1.30-1.50';
    if (n < 2) return '1.50-2.00';
    if (n < 3) return '2.00-3.00';
    if (n < 5) return '3.00-5.00';
    return '5.00+';
  }

  function marketTimingForRow(row, clvReport, tuningReport) {
    const pickLevel = clvReport?.pick_level || {};
    const byMarket = pickLevel.by_market || {};
    const marketKey = canonicalMarketKey(row.marketKey || row.market);
    const marketBucket = findReportBucket(Object.entries(byMarket).map(([key, value]) => ({ key, ...value })), marketKey);
    const oddBucket = (pickLevel.by_odd_bucket || {})[oddBucketKey(row.odd)] || null;
    const policy = tuningReport?.policy || {};
    const degradeMarkets = new Set((policy.degrade_markets || []).map(canonicalMarketKey));
    const watchMarkets = new Set((policy.keep_watch_markets || []).map(canonicalMarketKey));
    const warnings = [];
    const meanClv = Number(marketBucket?.mean_clv_pct);
    const positiveRate = Number(marketBucket?.positive_clv_rate);
    const n = Number(marketBucket?.n || 0);
    let tone = 'learning';
    if (n >= 40 && Number.isFinite(meanClv) && meanClv <= -2) {
      tone = 'cold';
      warnings.push('CLV marché défavorable');
    } else if (n >= 40 && Number.isFinite(positiveRate) && positiveRate < 18) {
      tone = 'cold';
      warnings.push('Peu de CLV positives');
    } else if (n >= 40 && Number.isFinite(meanClv) && meanClv >= 2) {
      tone = 'warm';
    }
    if (degradeMarkets.has(marketKey)) {
      tone = 'cold';
      warnings.push('Backtest décision défavorable');
    }
    if (watchMarkets.has(marketKey)) warnings.push('Watchlist historiquement intéressante');
    const label = n > 0 && Number.isFinite(meanClv)
      ? `CLV ${meanClv >= 0 ? '+' : ''}${meanClv.toFixed(1)}% · ${Math.round(positiveRate || 0)}% positives`
      : 'CLV en apprentissage';
    return {
      marketKey,
      tone,
      label,
      sample: n,
      meanClvPct: Number.isFinite(meanClv) ? meanClv : null,
      positiveRate: Number.isFinite(positiveRate) ? positiveRate : null,
      oddBucket: oddBucketKey(row.odd),
      oddBucketClvPct: Number.isFinite(Number(oddBucket?.mean_clv_pct)) ? Number(oddBucket.mean_clv_pct) : null,
      warnings: [...new Set(warnings)]
    };
  }

  function applyDecisionAndMarketTiming(row, clvReport, tuningReport) {
    const timing = marketTimingForRow(row, clvReport, tuningReport);
    const beforeStatus = row.status;
    const beforeAgentEligible = row.contextGate?.agentEligible !== false;
    let next = { ...row, marketTiming: timing };
    if (timing.tone === 'cold' && timing.warnings.length) {
      if (next.status === 'bet') {
        next.status = 'watch';
        next.statusLabel = 'À surveiller · marché';
      }
      next.contextGate = {
        ...(next.contextGate || {}),
        agentEligible: false,
        warnings: [...new Set([...(next.contextGate?.warnings || []), 'market_timing_guard'])]
      };
      next.confidenceTrust = next.confidenceTrust ? {
        ...next.confidenceTrust,
        score: Math.max(0, Number(next.confidenceTrust.score || 0) - 6),
        level: Number(next.confidenceTrust.score || 0) - 6 >= 50 ? next.confidenceTrust.level : 'fragile',
        drivers: [...(next.confidenceTrust.drivers || []), timing.warnings[0]]
      } : next.confidenceTrust;
    }
    next.marketTiming = {
      ...timing,
      guardApplied: beforeStatus !== next.status || beforeAgentEligible !== (next.contextGate?.agentEligible !== false),
      shadow: {
        beforeStatus,
        afterStatus: next.status,
        beforeAgentEligible,
        afterAgentEligible: next.contextGate?.agentEligible !== false
      }
    };
    return next;
  }

  function flattenSettledHistory(summary) {
    const rows = [];
    for (const day of Array.isArray(summary?.by_day) ? summary.by_day : []) {
      for (const pick of Array.isArray(day?.picks) ? day.picks : []) {
        if (!pick || (pick.result !== 'won' && pick.result !== 'lost')) continue;
        rows.push({ ...pick, day: day.date });
      }
    }
    rows.sort((a, b) => Date.parse(b.kickoff_utc || b.ts_generated || b.day || '') - Date.parse(a.kickoff_utc || a.ts_generated || a.day || ''));
    return rows;
  }

  function historySegmentKeys(row) {
    const sport = calibrationUtils.normalizeBucketKey(row?.sport || 'sport');
    const league = calibrationUtils.normalizeBucketKey(row?.league || row?.match?.league_code || row?.match?.league_name || 'league');
    const market = calibrationUtils.normalizeMarketKey(row?.marketKey || row?.market || row?.market_key || '');
    const tier = calibrationUtils.normalizeBucketKey(row?.tier || row?.calibration?.level || 'tier_unknown');
    const edge = calibrationUtils.edgeBucketKey(row?.edge);
    return [
      { key: `${sport}:${league}:${market}`, label: 'sport+ligue+marché', rank: 5 },
      { key: `${sport}:${market}:${edge}`, label: 'sport+marché+edge', rank: 4 },
      { key: `${sport}:${market}`, label: 'sport+marché', rank: 3 },
      { key: `market:${market}`, label: 'marché', rank: 2 },
      { key: `tier:${tier}`, label: 'tier', rank: 1 }
    ];
  }

  function historySegmentKeysForPick(pick) {
    const sport = calibrationUtils.normalizeBucketKey(pick?.sport || 'sport');
    const league = calibrationUtils.normalizeBucketKey(pick?.league || pick?.league_code || 'league');
    const market = calibrationUtils.normalizeMarketKey(pick?.market_key || pick?.market || '');
    const tier = calibrationUtils.normalizeBucketKey(pick?.tier || 'tier_unknown');
    const edge = calibrationUtils.edgeBucketKey(pick?.edge);
    return [
      `${sport}:${league}:${market}`,
      `${sport}:${market}:${edge}`,
      `${sport}:${market}`,
      `market:${market}`,
      `tier:${tier}`
    ];
  }

  function historySegmentLabel(key) {
    const parts = String(key || '').split(':').filter(Boolean);
    if (!parts.length) return 'Segment';
    if (parts[0] === 'market') return `Marché ${parts[1] || ''}`.trim();
    if (parts[0] === 'tier') return `Niveau ${parts[1] || ''}`.trim();
    if (parts.length >= 3) return `${parts[0]} · ${parts[1]} · ${parts[2]}`;
    if (parts.length === 2) return `${parts[0]} · ${parts[1]}`;
    return parts[0];
  }

  function emptySegmentBucket(key, label = 'segment') {
    return {
      key,
      label: label === 'segment' ? historySegmentLabel(key) : label,
      count: 0,
      won: 0,
      lost: 0,
      profit: 0,
      stake: 0,
      avgOdd: 0,
      avgProb: 0,
      avgEdge: 0,
      avgImplied: 0,
      brierSum: 0,
      last30Count: 0,
      last30Won: 0,
      last30AvgProb: 0,
      last60Count: 0,
      last60Won: 0,
      last60Profit: 0,
      last60Stake: 0
    };
  }

  function updateSegmentBucket(bucket, pick, recency = {}) {
    const odd = Number(pick.odd_book || pick.odd || 0);
    const prob = Number(pick.prob_model || pick.probability || 0);
    if (!(odd > 1)) return;
    const outcome = pick.result === 'won' ? 1 : 0;
    const profit = pick.result === 'won' ? odd - 1 : -1;
    bucket.count += 1;
    bucket.stake += 1;
    bucket.avgOdd += odd;
    bucket.avgProb += prob > 0 ? prob : 0;
    bucket.avgEdge += Number(pick.edge || 0);
    bucket.avgImplied += 1 / odd;
    if (prob > 0 && prob <= 1) bucket.brierSum += Math.pow(prob - outcome, 2);
    if (pick.result === 'won') {
      bucket.won += 1;
      bucket.profit += odd - 1;
      if (recency.isRecent30) bucket.last30Won += 1;
      if (recency.isRecent60) bucket.last60Won += 1;
    } else {
      bucket.lost += 1;
      bucket.profit -= 1;
    }
    if (recency.isRecent30) {
      bucket.last30Count += 1;
      bucket.last30AvgProb += prob > 0 ? prob : 0;
    }
    if (recency.isRecent60) {
      bucket.last60Count += 1;
      bucket.last60Stake += 1;
      bucket.last60Profit += profit;
    }
  }

  function finalizeSegmentBucket(bucket) {
    if (!bucket.count) return bucket;
    bucket.winRate = bucket.won / bucket.count;
    bucket.roi = bucket.profit / Math.max(1, bucket.stake);
    bucket.avgOdd /= bucket.count;
    bucket.avgProb /= bucket.count;
    bucket.avgEdge /= bucket.count;
    bucket.avgImplied /= bucket.count;
    bucket.brier = bucket.brierSum / bucket.count;
    bucket.realizedEdge = bucket.winRate - bucket.avgImplied;
    bucket.edgeGap = bucket.avgEdge - bucket.realizedEdge;
    bucket.sample = bucket.count >= 30 ? 'robuste' : bucket.count >= 10 ? 'moyen' : 'insuffisant';
    bucket.tone = bucket.count < 30 ? 'sample' : bucket.roi > 0.08 ? 'warm' : bucket.roi < -0.08 ? 'cold' : 'tracked';
    if (bucket.last30Count) {
      bucket.last30WinRate = bucket.last30Won / bucket.last30Count;
      bucket.last30AvgProb /= bucket.last30Count;
      bucket.drift30d = Math.max(0, Math.min(0.50, bucket.last30AvgProb - bucket.last30WinRate));
    } else {
      bucket.last30WinRate = null;
      bucket.drift30d = Math.max(0, Math.min(0.50, bucket.avgProb - bucket.winRate));
    }
    if (bucket.last60Count) {
      bucket.last60WinRate = bucket.last60Won / bucket.last60Count;
      bucket.last60Roi = bucket.last60Profit / Math.max(1, bucket.last60Stake);
    } else {
      bucket.last60WinRate = null;
      bucket.last60Roi = null;
    }
    return bucket;
  }

  function segmentAdjustmentForBucket(bucket) {
    if (!bucket || bucket.count < 50) return null;
    const roi = Number(bucket.roi || 0);
    if (roi > 0.20) {
      return {
        key: bucket.key,
        label: bucket.label || bucket.key,
        direction: 'boost',
        tone: 'warm',
        sample: bucket.count,
        roi,
        brier: bucket.brier,
        oldEdgeMin: 0.03,
        newEdgeMin: 0.02,
        oldOddMax: 6,
        newOddMax: 8,
        oldConfidenceMin: 0.55,
        newConfidenceMin: 0.55,
        reason: `ROI ${Math.round(roi * 100)}% sur ${bucket.count} paris réglés`
      };
    }
    if (roi < -0.10) {
      return {
        key: bucket.key,
        label: bucket.label || bucket.key,
        direction: 'harden',
        tone: 'cold',
        sample: bucket.count,
        roi,
        brier: bucket.brier,
        oldEdgeMin: 0.03,
        newEdgeMin: 0.05,
        oldOddMax: 6,
        newOddMax: 6,
        oldConfidenceMin: 0.55,
        newConfidenceMin: 0.60,
        reason: `ROI ${Math.round(roi * 100)}% sur ${bucket.count} paris réglés`
      };
    }
    return null;
  }

  function buildModelRealityAudit(summary) {
    const settled = flattenSettledHistory(summary);
    const byKey = new Map();
    const recentCutoff30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentCutoff60 = Date.now() - 60 * 24 * 60 * 60 * 1000;
    const scoped = settled.filter((pick) => {
      const ts = Date.parse(pick.kickoff_utc || pick.settled_at || pick.day || '');
      return Number.isFinite(ts) && ts >= recentCutoff60;
    });
    const auditRows = (scoped.length ? scoped : settled).slice(0, 1200);
    for (const pick of auditRows) {
      const ts = Date.parse(pick.kickoff_utc || pick.settled_at || pick.day || '');
      const recency = {
        isRecent30: Number.isFinite(ts) && ts >= recentCutoff30,
        isRecent60: Number.isFinite(ts) && ts >= recentCutoff60
      };
      for (const key of historySegmentKeysForPick(pick)) {
        const bucket = byKey.get(key) || emptySegmentBucket(key, historySegmentLabel(key));
        updateSegmentBucket(bucket, pick, recency);
        byKey.set(key, bucket);
      }
    }
    const buckets = Array.from(byKey.values()).map(finalizeSegmentBucket);
    const robust = buckets.filter((bucket) => bucket.count >= 30);
    const adjustments = buckets
      .map(segmentAdjustmentForBucket)
      .filter(Boolean)
      .sort((a, b) => {
        if (a.direction !== b.direction) return a.direction === 'boost' ? -1 : 1;
        return Math.abs(b.roi) - Math.abs(a.roi) || b.sample - a.sample;
      });
    const brierBySportMarket = robust
      .filter((bucket) => bucket.key.split(':').length === 2 && !bucket.key.startsWith('market:') && !bucket.key.startsWith('tier:'))
      .sort((a, b) => a.brier - b.brier)
      .slice(0, 12)
      .map((bucket) => ({
        key: bucket.key,
        count: bucket.count,
        roi: bucket.roi,
        brier: bucket.brier,
        winRate: bucket.winRate
      }));
    const tierCalibration = buckets
      .filter((bucket) => bucket.key.startsWith('tier:') && bucket.count >= 20)
      .map((bucket) => ({
        key: bucket.key,
        label: historySegmentLabel(bucket.key),
        count: bucket.count,
        roi: bucket.roi,
        brier: bucket.brier,
        winRate: bucket.winRate,
        action: bucket.brier > 0.25 ? 'durcir_selection' : bucket.roi > 0.12 && bucket.brier <= 0.22 ? 'capturer_plus' : 'surveiller',
        reason: bucket.brier > 0.25
          ? `Brier ${bucket.brier.toFixed(3)} trop élevé pour ce tier`
          : bucket.roi > 0.12 && bucket.brier <= 0.22
            ? `ROI ${Math.round(bucket.roi * 100)}% avec calibration correcte`
            : 'Calibration correcte, pas de changement fort'
      }));
    const seasonalSports = [
      { sport: 'basketball', months: [8, 9, 10], label: 'Basket nouvelle saison' },
      { sport: 'hockey', months: [8, 9, 10], label: 'Hockey nouvelle saison' },
      { sport: 'baseball', months: [1, 2, 3], label: 'Baseball reprise saison' },
      { sport: 'football américain', months: [7, 8, 9], label: 'NFL reprise saison' },
      { sport: 'football', months: [6, 7, 8], label: 'Football reprise championnat' }
    ];
    const month = new Date().getMonth();
    const seasonalDrift = seasonalSports
      .filter((item) => item.months.includes(month))
      .map((item) => ({
        sport: item.sport,
        label: item.label,
        tone: 'watch',
        recommendation: 'Historique pré-saison moins fiable pendant 30 jours'
      }));
    return {
      schema: 'paris-sportif.model_reality_audit.v2',
      generatedAt: new Date().toISOString(),
      windowDays: 60,
      sampleSize: auditRows.length,
      totalSettledAvailable: settled.length,
      robustSegments: robust.length,
      topSegments: robust.slice().sort((a, b) => b.roi - a.roi || b.count - a.count).slice(0, 10),
      bottomSegments: robust.slice().sort((a, b) => a.roi - b.roi || b.count - a.count).slice(0, 10),
      persistentWinningSegments: robust.filter((bucket) => bucket.count >= 50 && bucket.roi > 0.20).sort((a, b) => b.roi - a.roi).slice(0, 10),
      persistentLosingSegments: robust.filter((bucket) => bucket.count >= 50 && bucket.roi < -0.10).sort((a, b) => a.roi - b.roi).slice(0, 10),
      segmentAdjustments: adjustments,
      brierBySportMarket,
      tierCalibration,
      seasonalDrift,
      byKey: Object.fromEntries(buckets.map((bucket) => [bucket.key, bucket]))
    };
  }

  function segmentPolicyForRow(row, audit) {
    const adjustments = Array.isArray(audit?.segmentAdjustments) ? audit.segmentAdjustments : [];
    if (!adjustments.length) return null;
    const byKey = new Map(adjustments.map((item) => [item.key, item]));
    return historySegmentKeys(row)
      .map((meta) => ({ ...meta, adjustment: byKey.get(meta.key) || null }))
      .filter((item) => item.adjustment)
      .sort((a, b) => b.rank - a.rank || Number(b.adjustment.sample || 0) - Number(a.adjustment.sample || 0))[0]?.adjustment || null;
  }

  function segmentValidationForRow(row, audit) {
    const buckets = historySegmentKeys(row)
      .map((meta) => ({ ...meta, bucket: audit.byKey?.[meta.key] || null }))
      .filter((item) => item.bucket && item.bucket.count > 0)
      .sort((a, b) => {
        const robustDelta = Number(b.bucket.count >= 30) - Number(a.bucket.count >= 30);
        if (robustDelta) return robustDelta;
        return b.rank - a.rank || b.bucket.count - a.bucket.count;
      });
    const best = buckets[0];
    if (!best || best.bucket.count < 10) {
      return {
        status: 'insufficient_sample',
        label: 'Sample insuffisant pour validation rétrospective',
        sample: best?.bucket?.count || 0,
        realConfidence: Math.max(0, Math.min(0.99, Number(row.probability || 0))),
        factor: 1
      };
    }
    const bucket = best.bucket;
    const drift = Number(bucket.drift30d || 0);
    const roi = Number(bucket.roi || 0);
    const bonus = bucket.count >= 30 && roi > 0.15 ? 1.06 : bucket.count >= 30 && roi > 0.08 ? 1.03 : 1;
    const penalty = Math.max(0.55, 1 - Math.max(0, drift));
    const factor = Math.max(0.45, Math.min(1.12, penalty * bonus));
    const realConfidence = Math.max(0.01, Math.min(0.99, Number(row.probability || 0) * factor));
    return {
      status: bucket.count >= 30 ? 'validated' : 'learning_sample',
      label: bucket.count >= 30
        ? `Sur ${bucket.count} picks similaires : ${Math.round(bucket.winRate * 100)}% WR, ${Math.round(bucket.roi * 100)}% ROI`
        : `Sample moyen : ${bucket.count} picks similaires`,
      segmentKey: bucket.key,
      segmentLabel: best.label,
      sample: bucket.count,
      winRate: bucket.winRate,
      roi: bucket.roi,
      avgEdge: bucket.avgEdge,
      realizedEdge: bucket.realizedEdge,
      edgeGap: bucket.edgeGap,
      drift30d: drift,
      tone: bucket.tone,
      factor,
      realConfidence
    };
  }

  function applyModelReality(row, audit) {
    const segmentValidation = segmentValidationForRow(row, audit);
    const segmentPolicy = segmentPolicyForRow(row, audit);
    const trust = row.confidenceTrust || {};
    return {
      ...row,
      segmentValidation,
      segmentPolicy,
      adjustedConfidence: segmentValidation.realConfidence,
      confidenceTrust: {
        ...trust,
        adjustedScore: Math.round(segmentValidation.realConfidence * 100),
        adjustedLabel: segmentValidation.status === 'insufficient_sample' ? 'Confiance ajustée en apprentissage' : 'Confiance ajustée par historique réel'
      }
    };
  }

  function oddsGuardrailForRow(row, guardReport) {
    const policy = guardReport?.policy || {};
    const odd = Number(row?.odd || 0);
    const trust = Number(row?.confidenceTrust?.score || 0);
    const contextScore = Number(row?.contextQuality?.score ?? row?.match?.context?.quality?.score ?? 0);
    const highWatchOdd = Number(policy.high_watch_odd || 7.5);
    const maxAgentOdd = Number(policy.max_agent_odd || 10);
    const maxActionableOdd = Number(policy.max_actionable_odd || 18);
    const minTrust = Number(policy.min_trust_for_high_odd || 72);
    const minContext = Number(policy.min_context_for_high_odd || 68);
    const warnings = [];
    let tone = 'ok';
    let applied = false;
    let label = 'Cote dans la zone standard';
    if (odd >= maxActionableOdd) {
      tone = 'blocked';
      applied = true;
      label = `Cote extrême @${odd.toFixed(2)}`;
      warnings.push('cote_extreme_action_bloquee');
    } else if (odd >= maxAgentOdd && (trust < minTrust || contextScore < minContext)) {
      tone = 'blocked';
      applied = true;
      label = `Cote haute @${odd.toFixed(2)} avec contexte insuffisant`;
      warnings.push('cote_haute_contexte_insuffisant');
    } else if (odd >= highWatchOdd) {
      tone = 'watch';
      label = `Cote haute @${odd.toFixed(2)} : mise prudente`;
      warnings.push('cote_haute_a_verifier');
    }
    return {
      tone,
      label,
      odd,
      highWatchOdd,
      maxAgentOdd,
      maxActionableOdd,
      minTrustForHighOdd: minTrust,
      minContextForHighOdd: minContext,
      trustScore: Number.isFinite(trust) ? trust : null,
      contextScore: Number.isFinite(contextScore) ? contextScore : null,
      applied,
      warnings
    };
  }

  function applyOddsGuardrails(row, guardReport) {
    const guard = oddsGuardrailForRow(row, guardReport);
    let next = { ...row, oddsGuardrail: guard };
    if (guard.applied) {
      if (next.status === 'bet') {
        next.status = 'watch';
        next.statusLabel = 'À surveiller · cote haute';
      }
      next.contextGate = {
        ...(next.contextGate || {}),
        agentEligible: false,
        warnings: [...new Set([...(next.contextGate?.warnings || []), 'odds_guardrail'])]
      };
      next.confidenceTrust = next.confidenceTrust ? {
        ...next.confidenceTrust,
        score: Math.max(0, Number(next.confidenceTrust.score || 0) - 5),
        level: Number(next.confidenceTrust.score || 0) - 5 >= 50 ? next.confidenceTrust.level : 'fragile',
        drivers: [...(next.confidenceTrust.drivers || []), guard.label]
      } : next.confidenceTrust;
    }
    return next;
  }

  function riskyMarketsFromRecommendations(report) {
    const rows = Array.isArray(report?.recommendations) ? report.recommendations : [];
    const keys = [];
    rows.forEach((row) => {
      if (row?.policy_key !== 'market_specific_stake') return;
      const markets = Array.isArray(row?.metric?.markets) ? row.metric.markets : [];
      markets.forEach((item) => {
        const key = item && (item.market || item.key);
        if (key) keys.push(canonicalMarketKey(key));
      });
    });
    return new Set(keys);
  }

  function stakeReductionRecommendation(row, stakeReport) {
    const marketKey = canonicalMarketKey(row?.marketKey || row?.market);
    const leagueKey = compactKey(row?.match?.league_code || row?.league);
    const decision = row?.status === 'bet' || row?.status === 'watch' ? row.status : row?.contextGate?.agentEligible === false ? 'watchlist' : 'bet';
    const leagueRows = Array.isArray(stakeReport?.league_market_recommendations) ? stakeReport.league_market_recommendations : [];
    const leagueMatch = leagueRows.find((item) => {
      const recMarket = canonicalMarketKey(item?.market);
      const recLeague = compactKey(item?.league);
      return recMarket === marketKey && recLeague === leagueKey;
    });
    if (leagueMatch) return leagueMatch;
    const rows = Array.isArray(stakeReport?.recommendations) ? stakeReport.recommendations : [];
    if (!rows.length) return null;
    return rows.find((item) => {
      const recMarket = canonicalMarketKey(item?.market);
      const recDecision = String(item?.decision || '').toLowerCase();
      const decisionMatches = recDecision === decision || (decision === 'watch' && recDecision === 'watchlist') || (decision === 'bet' && recDecision === 'bet');
      return recMarket === marketKey && decisionMatches;
    }) || null;
  }

  function applyStakePrudence(row, recommendationReport, stakeReport) {
    const reasons = [];
    let factor = 1;
    if (row?.marketTiming?.tone === 'cold' && Array.isArray(row.marketTiming.warnings) && row.marketTiming.warnings.length) {
      factor = Math.min(factor, 0.50);
      reasons.push(row.marketTiming.warnings[0] || 'Marché froid');
    }
    if (row?.oddsGuardrail?.tone === 'watch') {
      factor = Math.min(factor, 0.50);
      reasons.push(row.oddsGuardrail.label || 'Cote haute à vérifier');
    }
    const riskyMarkets = riskyMarketsFromRecommendations(recommendationReport);
    const marketKey = canonicalMarketKey(row?.marketKey || row?.market);
    const contextScore = Number(row?.contextQuality?.score ?? row?.match?.context?.quality?.score ?? 0);
    if (riskyMarkets.has(marketKey) && contextScore < 72) {
      factor = Math.min(factor, 0.60);
      reasons.push('Marché actif froid au backtest agent');
    }
    const stakeRecommendation = stakeReductionRecommendation(row, stakeReport);
    const suggestedFactor = Number(stakeRecommendation?.recommended_factor);
    if (stakeRecommendation && Number.isFinite(suggestedFactor) && suggestedFactor > 0 && suggestedFactor < 1) {
      factor = Math.min(factor, suggestedFactor);
      reasons.push(stakeRecommendation.detail || `Backtest mise recommande x${suggestedFactor.toFixed(2)}`);
    }
    if (!(factor < 1) || !(Number(row?.stake || 0) > 0)) {
      return {
        ...row,
        stakeAdjustment: {
          applied: false,
          factor: 1,
          reasons: []
        }
      };
    }
    const beforeStake = Number(row.stake || 0);
    const afterStake = Math.max(0, beforeStake * factor);
    const next = {
      ...row,
      stake: afterStake,
      stakeAdjustment: {
        applied: true,
        factor,
        beforeStake,
        afterStake,
        reasons: [...new Set(reasons)],
        source: stakeRecommendation ? 'stake_reduction_backtest' : 'market_guardrails'
      }
    };
    if (next.status === 'bet') {
      next.statusLabel = 'Mise réduite · prudence';
    }
    next.confidenceTrust = next.confidenceTrust ? {
      ...next.confidenceTrust,
      score: Math.max(0, Number(next.confidenceTrust.score || 0) - 2),
      drivers: [...(next.confidenceTrust.drivers || []), 'Mise réduite par garde-fou marché']
    } : next.confidenceTrust;
    return next;
  }

  function signalConflictForRow(row) {
    const timing = row?.marketTiming || {};
    const warnings = Array.isArray(timing.warnings) ? timing.warnings : [];
    const contextScore = Number(row?.contextQuality?.score ?? row?.match?.context?.quality?.score ?? 0);
    const trustScore = Number(row?.confidenceTrust?.score || 0);
    const coldMarket = timing.tone === 'cold' && (warnings.length > 0 || timing.guardApplied);
    if (Number.isFinite(contextScore) && contextScore >= 72 && coldMarket) {
      const high = contextScore >= 82 || trustScore >= 76;
      return {
        active: true,
        type: 'strong_context_cold_market',
        severity: high ? 'high' : 'medium',
        label: 'Contexte fort mais marché froid',
        detail: warnings[0] || timing.label || 'Signal marché défavorable malgré un dossier contexte solide',
        contextScore,
        trustScore: Number.isFinite(trustScore) ? trustScore : null,
        marketTone: timing.tone || 'unknown',
        factor: high ? 0.50 : 0.65
      };
    }
    return {
      active: false,
      type: 'none',
      severity: 'none',
      label: 'Pas de conflit majeur',
      contextScore: Number.isFinite(contextScore) ? contextScore : null,
      trustScore: Number.isFinite(trustScore) ? trustScore : null,
      marketTone: timing.tone || 'unknown'
    };
  }

  function conflictPolicy(conflictReport) {
    const policy = conflictReport?.policy || {};
    const action = policy.action === 'stake_reduce_only' ? 'stake_reduce_only' : 'watch_and_block_agent';
    const factor = Number(policy.recommended_factor);
    return {
      action,
      factor: Number.isFinite(factor) && factor > 0 && factor < 1 ? factor : action === 'stake_reduce_only' ? 0.65 : 0.50,
      agentEligible: action === 'stake_reduce_only',
      detail: policy.detail || ''
    };
  }

  function applySignalConflict(row, conflictReport) {
    const conflict = signalConflictForRow(row);
    if (!conflict.active) return { ...row, signalConflict: conflict };
    const policy = conflictPolicy(conflictReport);
    const beforeStatus = row.status;
    const beforeAgentEligible = row.contextGate?.agentEligible !== false;
    const next = {
      ...row,
      signalConflict: { ...conflict, policyAction: policy.action, policyDetail: policy.detail }
    };
    if (!policy.agentEligible) {
      next.contextGate = {
        ...(row.contextGate || {}),
        agentEligible: false,
        warnings: [...new Set([...(row.contextGate?.warnings || []), 'signal_conflict_market_context'])]
      };
    }
    if (!policy.agentEligible && next.status === 'bet') {
      next.status = 'watch';
      next.statusLabel = 'À surveiller · conflit signaux';
    }
    if (Number(next.stake || 0) > 0) {
      const before = Number(next.stake || 0);
      next.stakeAdjustment = mergeStakeAdjustment({
        ...(next.stakeAdjustment || {}),
        beforeStake: next.stakeAdjustment?.beforeStake ?? before,
        afterStake: next.stakeAdjustment?.afterStake ?? before
      }, policy.factor || Number(conflict.factor || 0.65), conflict.label);
      if (Number.isFinite(Number(next.stakeAdjustment.afterStake))) {
        next.stake = Number(next.stakeAdjustment.afterStake);
      }
    }
    next.confidenceTrust = next.confidenceTrust ? {
      ...next.confidenceTrust,
      score: Math.max(0, Number(next.confidenceTrust.score || 0) - (conflict.severity === 'high' ? 5 : 3)),
      level: Number(next.confidenceTrust.score || 0) - (conflict.severity === 'high' ? 5 : 3) >= 50 ? next.confidenceTrust.level : 'fragile',
      drivers: [...(next.confidenceTrust.drivers || []), conflict.label]
    } : next.confidenceTrust;
    next.signalConflict = {
      ...conflict,
      policyAction: policy.action,
      policyDetail: policy.detail,
      factor: policy.factor,
      guardApplied: beforeStatus !== next.status || beforeAgentEligible !== (next.contextGate?.agentEligible !== false),
      shadow: {
        beforeStatus,
        afterStatus: next.status,
        beforeAgentEligible,
        afterAgentEligible: next.contextGate?.agentEligible !== false
      }
    };
    return next;
  }

  function prebetGateForReport(report) {
    const summary = report && report.schema ? report.summary || {} : {};
    const blockers = Number(summary.blockers || 0);
    const ready = summary.ready_to_bet === true;
    if (!blockers || ready) {
      return {
        blocked: false,
        status: summary.status || 'ready',
        blockers: 0,
        label: 'Checklist avant mise verte'
      };
    }
    const first = summary.first || 'checklist critique';
    return {
      blocked: true,
      status: summary.status || 'blocked',
      blockers,
      first,
      label: `Checklist rouge · ${blockers} blocage(s)`,
      warnings: Array.isArray(report.items)
        ? report.items.filter((item) => item && item.blocks_bet).map((item) => item.title || item.area).filter(Boolean).slice(0, 4)
        : []
    };
  }

  function mergeStakeAdjustment(existing, factor, reason) {
    const current = existing && (existing.applied || existing.beforeStake != null || existing.afterStake != null) ? existing : null;
    const beforeStake = Number(current?.beforeStake);
    const afterStake = Number(current?.afterStake);
    const baseStake = Number.isFinite(beforeStake) ? beforeStake : null;
    const currentFactor = Number(current?.factor || 1);
    const nextFactor = Math.min(currentFactor, factor);
    return {
      applied: true,
      factor: nextFactor,
      beforeStake: baseStake,
      afterStake: Number.isFinite(afterStake) ? afterStake * (nextFactor / Math.max(currentFactor, 0.0001)) : null,
      reasons: [...new Set([...(current?.reasons || []), reason].filter(Boolean))]
    };
  }

  function applyPrebetGate(row, checklistReport) {
    const gate = prebetGateForReport(checklistReport);
    if (!gate.blocked) return { ...row, prebetGate: gate };
    const modelStake = Number(row.modelStake ?? row.stake ?? 0);
    return {
      ...row,
      modelStake,
      prebetGate: gate,
      confidenceTrust: row.confidenceTrust ? {
        ...row.confidenceTrust,
        score: Math.max(0, Number(row.confidenceTrust.score || 0) - 4),
        level: Number(row.confidenceTrust.score || 0) - 4 >= 50 ? row.confidenceTrust.level : 'fragile',
        drivers: [...(row.confidenceTrust.drivers || []), gate.label]
      } : row.confidenceTrust
    };
  }

  function criticalGateForReport(report) {
    const summary = report && report.schema ? report.summary || {} : {};
    const blocked = Boolean(summary.blocks_bet || Number(summary.critical || 0) > 0);
    return {
      blocked,
      issues: Number(summary.issues || 0),
      critical: Number(summary.critical || 0),
      label: blocked ? (summary.first || 'État critique à corriger') : 'Aucun état critique bloquant'
    };
  }

  function decisionCenterForRow(row, gates) {
    const modelStake = Math.max(0, Number(row.modelStake ?? row.stake ?? 0) || 0);
    const currentStake = Math.max(0, Number(row.stake || 0) || 0);
    const effectiveStake = currentStake > 0 ? currentStake : modelStake;
    const blockingGates = [];
    const sportKey = String(row.sport || row.match?.sport || '').toLowerCase();
    const quality = row.contextQuality || row.match?.context?.quality || {};
    const criticalSignals = Array.isArray(quality.critical_missing) ? quality.critical_missing : [];
    const hardCriticalSignals = criticalSignals.filter((item) => !/^availability_missing/i.test(String(item || '')));
    const hasCriticalSignals = criticalSignals.length > 0;
    const qualityScore = Number(quality.score);
    const proxyContextSport = /tennis|baseball|basket|hockey|mma|rugby|nfl|football américain|american football/.test(sportKey);
    const proxyContextRelease = proxyContextSport &&
      !hasCriticalSignals &&
      row.contextGate?.gate !== 'skip' &&
      Number.isFinite(qualityScore) &&
      qualityScore >= 50 &&
      Number(row.edge || 0) >= 0.08 &&
      modelStake > 0;
    const softAvailabilityRelease = hardCriticalSignals.length === 0 &&
      hasCriticalSignals &&
      row.contextGate?.gate !== 'skip' &&
      Number(row.edge || 0) >= 0.08 &&
      Number(row.probability || 0) >= 0.60 &&
      modelStake > 0;
    const contextRelease = proxyContextRelease || softAvailabilityRelease;
    const sourceRepairNeeded = (hasCriticalSignals && !contextRelease) || (Number.isFinite(qualityScore) && qualityScore < 45);
    if (!(Number(row.odd || 0) > 1)) blockingGates.push({ key: 'odds', label: 'Cote Winamax invalide', tone: 'danger' });
    if (!(Number(row.edge || 0) > 0)) blockingGates.push({ key: 'edge', label: 'Edge non positif', tone: 'danger' });
    if (!(modelStake > 0 || currentStake > 0)) blockingGates.push({ key: 'kelly', label: 'Kelly nul', tone: 'warn' });
    if (row.status === 'skip') blockingGates.push({ key: 'model', label: row.statusLabel || 'Skip modèle', tone: 'danger' });
    if ((row.contextGate?.agentEligible === false || hasCriticalSignals) && !contextRelease) {
      blockingGates.push({
        key: 'context',
        label: row.contextGate?.label || (hardCriticalSignals.length ? 'Signal critique manquant' : 'Contexte insuffisant'),
        tone: hardCriticalSignals.length ? 'danger' : 'warn'
      });
    }
    const uniqueBlocking = [];
    const seen = new Set();
    for (const gate of blockingGates) {
      if (seen.has(gate.key)) continue;
      seen.add(gate.key);
      uniqueBlocking.push(gate);
    }
    const globalGates = [
      gates.prebet?.blocked ? { key: 'agent_checklist', label: gates.prebet.label, tone: 'danger' } : null,
      gates.critical?.blocked ? { key: 'agent_critical', label: gates.critical.label, tone: 'danger' } : null
    ].filter(Boolean);
    const modelAllowsBet = row.status === 'bet' || contextRelease;
    const canBet = !uniqueBlocking.length && modelAllowsBet && effectiveStake > 0;
    const status = canBet
      ? 'ready'
      : sourceRepairNeeded
        ? 'repair'
        : row.status === 'skip' || !(Number(row.edge || 0) > 0)
          ? 'skip'
          : 'watch';
    const nextAction = canBet
      ? 'Jouer maintenant'
      : status === 'repair'
        ? (gates.critical?.blocked ? 'Lancer file critique' : gates.prebet?.blocked ? 'Réparer contexte' : 'Compléter contexte')
        : status === 'watch'
          ? 'Surveiller'
          : 'Écarter';
    const mainReason = uniqueBlocking[0]?.label || (canBet
      ? (softAvailabilityRelease ? 'Signal fort malgré disponibilités incomplètes' : proxyContextRelease ? 'Winamax OK · contexte proxy suffisant' : 'Tous les garde-fous sont verts')
      : row.statusLabel || 'Observation prudente');
    return {
      status,
      canBet,
      stake: canBet ? effectiveStake : 0,
      stakeDisplay: canBet ? null : '0 €',
      modelStake,
      mainReason,
      nextAction,
      blockingGates: uniqueBlocking,
      globalGates,
      riskTone: canBet ? 'ok' : status === 'repair' ? 'danger' : status === 'watch' ? 'watch' : 'warn'
    };
  }

  function applyDecisionCenter(row, gates) {
    const decisionCenter = decisionCenterForRow(row, gates);
    return {
      ...row,
      modelStake: decisionCenter.modelStake,
      stake: decisionCenter.canBet ? decisionCenter.stake : 0,
      decisionCenter
    };
  }

  function buildDecisionCenterReport(rows, gates) {
    const all = Array.isArray(rows) ? rows : [];
    const byStatus = { ready: 0, watch: 0, repair: 0, skip: 0 };
    for (const row of all) {
      const status = row?.decisionCenter?.status || 'skip';
      byStatus[status] = (byStatus[status] || 0) + 1;
    }
    return {
      schema: 'paris-sportif.decision_center.v17',
      generatedAt: new Date().toISOString(),
      summary: {
        total: all.length,
        ready: byStatus.ready || 0,
        watch: byStatus.watch || 0,
        repair: byStatus.repair || 0,
        skip: byStatus.skip || 0,
        can_bet: byStatus.ready || 0,
        blocked: false,
        agent_blocked: Boolean(gates.prebet?.blocked || gates.critical?.blocked),
        first: byStatus.ready ? 'Paris prêts' : 'Aucun pari à jouer maintenant',
        agent_first: gates.prebet?.blocked ? gates.prebet.label : gates.critical?.blocked ? gates.critical.label : 'Agent disponible'
      },
      rows: all
        .filter((row) => row && row.edge > 0 && row.odd > 1)
        .slice(0, 80)
        .map((row) => ({
          id: row.id,
          title: row.title,
          sport: row.sport,
          league: row.league,
          start: row.start,
          market: row.market,
          label: row.label,
          odd: row.odd,
          probability: row.probability,
          edge: row.edge,
          priorityScore: row.priorityScore || 0,
          priorityRank: row.priorityRank || null,
          status: row.decisionCenter?.status || 'skip',
          canBet: Boolean(row.decisionCenter?.canBet),
          stake: Number(row.decisionCenter?.stake || 0),
          mainReason: row.decisionCenter?.mainReason || '',
          nextAction: row.decisionCenter?.nextAction || '',
          blockingGates: row.decisionCenter?.blockingGates || []
        }))
    };
  }

  function minutesToKickoff(row) {
    const ts = Date.parse(row?.start || '');
    if (!Number.isFinite(ts)) return null;
    return Math.round((ts - Date.now()) / 60000);
  }

  function watchReasons(row) {
    const reasons = [];
    const quality = row.contextQuality || row.match?.context?.quality || {};
    const missing = Array.isArray(quality.missing) ? quality.missing : [];
    const critical = Array.isArray(quality.critical_missing) ? quality.critical_missing : [];
    const stale = Array.isArray(quality.stale) ? quality.stale : [];
    const timing = Array.isArray(row.match?.context?.matchup?.timing) ? row.match.context.matchup.timing : [];
    if (row.calibration?.blocked) reasons.push(row.calibration.blockReason || 'Historique défavorable');
    if (row.contextGate?.agentEligible === false) reasons.push(row.contextGate.label || 'Contexte à surveiller');
    if (Number(row.confidenceTrust?.score || 100) < 65) reasons.push(`Confiance ${Math.round(Number(row.confidenceTrust.score || 0))}/100`);
    if (critical.length) reasons.push(`Signal critique manquant: ${critical.slice(0, 2).join(', ')}`);
    if (missing.includes('lineups')) reasons.push('Compositions non confirmées');
    if (missing.includes('injuries')) reasons.push('Disponibilités joueurs incomplètes');
    if (missing.includes('xg') || missing.includes('team_history')) reasons.push('Force équipe incomplète');
    if (stale.length) reasons.push(`Donnée périmée: ${stale.slice(0, 2).join(', ')}`);
    if (row.marketTiming?.warnings?.length) reasons.push(row.marketTiming.warnings.slice(0, 2).join(', '));
    if (row.signalConflict?.active) reasons.push(row.signalConflict.label || 'Conflit signaux marché/contexte');
    if (row.oddsGuardrail?.warnings?.length) reasons.push(row.oddsGuardrail.label || 'Cote haute à vérifier');
    for (const item of timing.slice(0, 2)) {
      const recommendation = item?.recommendation || item?.advice;
      if (recommendation) reasons.push(String(recommendation).replace(/_/g, ' '));
    }
    if (row.marketProfile && row.marketProfile.missingCore && row.marketProfile.missingCore.length) {
      reasons.push(`Marchés à compléter: ${row.marketProfile.missingCore.join(', ')}`);
    }
    return [...new Set(reasons)].slice(0, 5);
  }

  function watchAction(row, minutes, reasons) {
    const text = reasons.join(' ').toLowerCase();
    if (minutes != null && minutes >= -15 && minutes <= 75 && /compo|lineup|disponibil|critique/.test(text)) {
      return 'Pré-match final maintenant';
    }
    if (/cote|price|march[eé]/.test(text)) return 'Surveiller mouvement de cote';
    if (/force|xg|historique/.test(text)) return 'Compléter contexte équipe';
    if (/confiance|historique d[eé]favorable|froid/.test(text)) return 'Garder en observation';
    return 'Recalculer après refresh';
  }

  function buildWatchlist(matches) {
    return (Array.isArray(matches) ? matches : [])
      .filter((row) => row && row.edge > 0 && row.odd > 1)
      .map((row) => {
        const minutes = minutesToKickoff(row);
        const reasons = watchReasons(row);
        const trust = Number(row.confidenceTrust?.score || 0);
        const needsWatch = row.status === 'watch' ||
          row.calibration?.blocked ||
          row.contextGate?.agentEligible === false ||
          trust < 65 ||
          reasons.length > 0;
        if (!needsWatch) return null;
        const autoRefreshDue = minutes != null && minutes >= -10 && minutes <= 60 &&
          reasons.some((reason) => /compo|lineup|disponibil|critique|p[eé]rim/.test(reason.toLowerCase()));
        return {
          id: row.id,
          title: row.title,
          sport: row.sport,
          league: row.league,
          start: row.start,
          minutesToKickoff: minutes,
          market: row.market,
          label: row.label,
          odd: row.odd,
          probability: row.probability,
          edge: row.edge,
          stake: row.stake,
          status: row.status,
          statusLabel: row.statusLabel,
          contextScore: Number(row.contextQuality?.score ?? row.match?.context?.quality?.score),
          contextTier: row.contextQuality?.tier || row.match?.context?.quality?.tier || '',
          trustScore: trust,
          trustLevel: row.confidenceTrust?.level || '',
          reasons,
          action: watchAction(row, minutes, reasons),
          nextRefreshMode: autoRefreshDue ? 'prematch' : 'signals',
          autoRefreshDue,
          marketProfile: row.marketProfile || null,
          marketTiming: row.marketTiming || null,
          signalConflict: row.signalConflict || null,
          oddsGuardrail: row.oddsGuardrail || null,
          winamaxUrl: row.winamaxUrl || null
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.autoRefreshDue !== b.autoRefreshDue) return a.autoRefreshDue ? -1 : 1;
        const aMin = Number.isFinite(a.minutesToKickoff) ? Math.abs(a.minutesToKickoff) : 99999;
        const bMin = Number.isFinite(b.minutesToKickoff) ? Math.abs(b.minutesToKickoff) : 99999;
        return aMin - bMin || (b.edge - a.edge) || (a.trustScore - b.trustScore);
      })
      .slice(0, 30);
  }

  function dayKeyParis(value) {
    return bettingUtils.dayKeyParis(value);
  }

  function parisDateParts(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (!date || Number.isNaN(date.getTime())) return null;
    const parts = {};
    for (const item of new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(date)) {
      if (item.type !== 'literal') parts[item.type] = item.value;
    }
    const hour = Number(String(parts.hour || '0').replace('24', '0'));
    return {
      day: `${parts.year}-${parts.month}-${parts.day}`,
      hour: Number.isFinite(hour) ? hour : 0,
      minute: Number(parts.minute || 0) || 0
    };
  }

  function parisHour(value) {
    return parisDateParts(value)?.hour ?? null;
  }

  function hourBucketKey(hour) {
    const h = Number(hour);
    if (!Number.isFinite(h)) return 'unknown';
    if (h < 6) return '00-06';
    if (h < 12) return '06-12';
    if (h < 18) return '12-18';
    return '18-24';
  }

  function rollingWindowRows(rows, hours = 24) {
    const now = Date.now();
    const end = now + hours * 60 * 60 * 1000;
    return (Array.isArray(rows) ? rows : []).filter((row) => {
      const ts = startTimestamp(row);
      return Number.isFinite(ts) && ts > now && ts <= end;
    });
  }

  function buildDashboardPicks(picks) {
    const now = Date.now();
    const horizonMs = 30 * 60 * 60000;
    const todayKey = dayKeyParis(new Date());
    const maxPerMatch = 2;
    const maxPerHourSlot = 4;
    const maxDashboardRows = 25;
    const maxPerSport = Math.max(3, Math.ceil(maxDashboardRows * 0.30));
    const maxPerMarket = Math.max(5, Math.ceil(maxDashboardRows * 0.35));
    const maxPerLeague = Math.max(2, Math.ceil(maxDashboardRows * 0.20));
    const simplePicks = (Array.isArray(picks) ? picks : [])
      .filter(isSimpleUserMarket)
      .filter((row) => row?.contextGate?.gate !== 'skip');
    const sourcePicks = simplePicks.length ? simplePicks : [];
    const rolling24 = rollingWindowRows(sourcePicks, 24);
    const target24 = rolling24.length >= 25 ? 25 : rolling24.length >= 18 ? 18 : rolling24.length >= 12 ? 12 : Math.min(8, rolling24.length);
    const rank = (pick) => [
      pick?.decisionCenter?.canBet ? 1 : 0,
      pick?.safeAssessment?.reliable ? 1 : 0,
      pick?.decisionCenter?.status === 'ready' ? 1 : 0,
      Number(pick?.priorityScore || 0),
      Number(pick?.safeEdge ?? pick?.edge ?? 0),
      Number(pick?.safeConfidence ?? pick?.probability ?? 0)
    ];
    const sortRows = (rows) => [...rows].sort((a, b) => {
      const ar = rank(a);
      const br = rank(b);
      for (let i = 0; i < ar.length; i += 1) {
        if (br[i] !== ar[i]) return br[i] - ar[i];
      }
      return Date.parse(a.start || '') - Date.parse(b.start || '');
    });
    const sortByKickoffThenRank = (rows) => [...rows].sort((a, b) => {
      const timeDelta = Date.parse(a.start || '') - Date.parse(b.start || '');
      if (timeDelta) return timeDelta;
      return sortRows([a, b])[0] === b ? 1 : -1;
    });
    const nearTerm = sourcePicks.filter((pick) => {
      const ts = startTimestamp(pick);
      return Number.isFinite(ts) && ts > now && ts <= now + horizonMs;
    });
    const todayRows = sourcePicks.filter((pick) => dayKeyParis(pick.start) === todayKey);
    const nightRows = sourcePicks.filter(isNightCoverageCandidate).map((row) => {
      if (row?.decisionCenter?.status !== 'skip' && row?.status !== 'skip') return row;
      return {
        ...row,
        status: row?.status === 'skip' ? 'watch' : row.status,
        statusLabel: 'À surveiller · nuit',
        safeAssessment: {
          ...(row.safeAssessment || {}),
          reliable: false,
          displayable: true,
          status: 'watch',
          tone: 'watch',
          label: 'À surveiller · couverture nuit'
        },
        decisionCenter: {
          ...(row.decisionCenter || {}),
          status: 'watch',
          canBet: false,
          stake: 0,
          stakeDisplay: '0 €',
          nextAction: 'Surveiller',
          mainReason: 'Couverture nuit : ligne visible mais pas assez robuste pour miser',
          riskTone: 'watch'
        }
      };
    });
    const ordered = [];
    const seen = new Set();
    const matchCounts = new Map();
    const slotCounts = new Map();
    const skippedByCap = { match: 0, slot: 0 };
    const matchKey = (row) => String(row?.id || row?.match?.winamax?.match_id || row?.title || '').replace(/^wnx:/, '');
    const slotKey = (row) => {
      const ts = Date.parse(row?.start || '');
      if (!Number.isFinite(ts)) return 'unknown';
      const parts = parisDateParts(ts);
      return `${parts?.day || dayKeyParis(ts)}:${String(parts?.hour ?? 0).padStart(2, '0')}`;
    };
    const canAddByCaps = (row, strict, options = {}) => {
      if (!strict) return true;
      const mk = matchKey(row);
      const sk = slotKey(row);
      if ((matchCounts.get(mk) || 0) >= maxPerMatch) {
        skippedByCap.match += 1;
        return false;
      }
      const slotCap = options.relaxSlot ? maxPerHourSlot + 2 : maxPerHourSlot;
      if ((slotCounts.get(sk) || 0) >= slotCap) {
        skippedByCap.slot += 1;
        return false;
      }
      return true;
    };
    const markCaps = (row) => {
      const mk = matchKey(row);
      const sk = slotKey(row);
      matchCounts.set(mk, (matchCounts.get(mk) || 0) + 1);
      slotCounts.set(sk, (slotCounts.get(sk) || 0) + 1);
    };
    const addRows = (rows, { strict = true, relaxSlot = false } = {}) => {
      for (const row of rows) {
        const key = `${row.id}:${row.market}:${row.label}`;
        if (seen.has(key)) continue;
        if (!canAddByCaps(row, strict, { relaxSlot })) continue;
        seen.add(key);
        markCaps(row);
        ordered.push(row);
      }
    };
    addRows(sortByKickoffThenRank(rolling24), { strict: true });
    addRows(sortByKickoffThenRank(todayRows), { strict: true });
    addRows(sortByKickoffThenRank(nearTerm), { strict: true });
    if (rollingWindowRows(ordered, 24).length < target24) addRows(sortRows(rolling24), { strict: true, relaxSlot: true });
    if (rollingWindowRows(ordered, 24).length < target24) addRows(sortRows(rolling24), { strict: false });
    addRows(sortRows(sourcePicks), { strict: true });
    if (ordered.length < 5) addRows(sortRows(sourcePicks), { strict: false });
    const finalRows = [];
    const finalSeen = new Set();
    const finalOutcomeSeen = new Set();
    const finalMatchCounts = new Map();
    const finalSportCounts = new Map();
    const finalMarketCounts = new Map();
    const finalLeagueCounts = new Map();
    let todayCapRelaxed = false;
    let diversityCapRelaxed = false;
    const sportKey = (row) => String(row?.sport || 'sport').toLowerCase();
    const marketKey = (row) => simpleMarketGroup(row?.marketKey || row?.market) || canonicalMarketKey(row?.marketKey || row?.market || 'market');
    const leagueKey = (row) => compactKey(row?.match?.league_code || row?.league || row?.match?.league_name || 'league');
    const teamTokens = (value) => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 4 && !['gagne', 'gagnent', 'vainqueur', 'match'].includes(token));
    const sideOutcome = (row) => {
      const label = String(row?.label || row?.pickLabel || row?.selection || row?.side || '');
      const compactLabel = compactKey(label);
      const titleParts = String(row?.title || '').split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean);
      const home = row?.match?.home || row?.home || titleParts[0] || '';
      const away = row?.match?.away || row?.away || titleParts[1] || '';
      const homeTokens = teamTokens(home);
      const awayTokens = teamTokens(away);
      const tokenScore = (tokens) => tokens.filter((token) => compactLabel.includes(token)).length;
      const homeScore = tokenScore(homeTokens);
      const awayScore = tokenScore(awayTokens);
      if (homeScore > awayScore) return 'home';
      if (awayScore > homeScore) return 'away';
      const homeSpecific = homeTokens[homeTokens.length - 1] || '';
      const awaySpecific = awayTokens[awayTokens.length - 1] || '';
      if (awaySpecific && compactLabel.includes(awaySpecific)) return 'away';
      if (homeSpecific && compactLabel.includes(homeSpecific)) return 'home';
      return compactLabel;
    };
    const outcomeKey = (row) => `${matchKey(row)}:${simpleMarketGroup(row?.marketKey || row?.market)}:${sideOutcome(row)}`;
    const addFinalRows = (rowsToAdd, limit = maxDashboardRows, options = {}) => {
      for (const row of rowsToAdd) {
        if (finalRows.length >= limit) break;
        const key = `${row.id}:${row.market}:${row.label}`;
        if (finalSeen.has(key)) continue;
        const ok = outcomeKey(row);
        if (finalOutcomeSeen.has(ok)) continue;
        const mk = matchKey(row);
        const cap = Number(options.matchCap || 0) || (options.enforceMatchCap ? maxPerMatch : 0);
        if (cap && (finalMatchCounts.get(mk) || 0) >= cap) continue;
        if (options.enforceDiversity !== false) {
          const sk = sportKey(row);
          const mk2 = marketKey(row);
          const lk = leagueKey(row);
          if (!options.relaxSport && (finalSportCounts.get(sk) || 0) >= maxPerSport) continue;
          if (!options.relaxMarket && (finalMarketCounts.get(mk2) || 0) >= maxPerMarket) continue;
          if (!options.relaxLeague && (finalLeagueCounts.get(lk) || 0) >= maxPerLeague) continue;
        }
        finalSeen.add(key);
        finalOutcomeSeen.add(ok);
        finalMatchCounts.set(mk, (finalMatchCounts.get(mk) || 0) + 1);
        finalSportCounts.set(sportKey(row), (finalSportCounts.get(sportKey(row)) || 0) + 1);
        finalMarketCounts.set(marketKey(row), (finalMarketCounts.get(marketKey(row)) || 0) + 1);
        finalLeagueCounts.set(leagueKey(row), (finalLeagueCounts.get(leagueKey(row)) || 0) + 1);
        finalRows.push(row);
      }
    };
    const sortedOrdered = sortRows(ordered);
    const sortedTodayReady = sortRows(todayRows.filter((row) => row?.decisionCenter?.canBet === true));
    const sortedTodayDisplayable = sortRows(todayRows.filter(isDashboardDisplayCandidate));
    const twoGoalWinnerRows = sortRows(sourcePicks.filter((row) => row?.winamaxTwoGoalRule?.eligible && isDashboardDisplayCandidate(row)));
    const winnerRows = sortRows(sourcePicks.filter((row) => simpleMarketGroup(row?.marketKey || row?.market) === 'winner' && isDashboardDisplayCandidate(row)));
    // Sprint 43 (P2 audit) : buteurs explicitement injectés dans le dashboard.
    // Sans cette injection, les buteurs avec cote Winamax confirmée mais
    // confiance < 55% restent invisibles à cause du quota market.
    const scorerRows = sortRows(sourcePicks.filter((row) => simpleMarketGroup(row?.marketKey || row?.market) === 'scorer' && isDashboardDisplayCandidate(row)));
    const rollingReadyPool = sortRows(rolling24.filter((row) => row?.decisionCenter?.canBet));
    const sortedRollingReady = sortRows(ordered.filter((row) => {
      const ts = startTimestamp(row);
      return Number.isFinite(ts) && ts > now && ts <= now + 24 * 60 * 60 * 1000 && row?.decisionCenter?.canBet;
    }));
    const rollingReadyTarget = Math.min(maxDashboardRows, rollingReadyPool.length, Math.max(target24, 10));
    const todayReadyTarget = Math.min(8, sortedTodayReady.length);
    const todayVisibleTarget = Math.min(20, sortedTodayDisplayable.length);
    if (todayReadyTarget > 0) {
      addFinalRows(sortedTodayReady, todayReadyTarget, { enforceMatchCap: true });
      if (finalRows.length < todayReadyTarget) {
        todayCapRelaxed = true;
        addFinalRows(sortedTodayReady, todayReadyTarget, { enforceMatchCap: false, relaxSport: true, relaxLeague: true });
      }
    }
    if (todayVisibleTarget > 0 && finalRows.filter((row) => dayKeyParis(row.start) === todayKey).length < todayVisibleTarget) {
      addFinalRows(sortedTodayDisplayable, todayVisibleTarget, { enforceMatchCap: true });
      if (finalRows.filter((row) => dayKeyParis(row.start) === todayKey).length < todayVisibleTarget) {
        todayCapRelaxed = true;
        addFinalRows(sortedTodayDisplayable, todayVisibleTarget, { matchCap: maxPerMatch + 1, relaxSport: true, relaxLeague: true });
      }
    }
    if (nightRows.length) {
      const nightTarget = Math.min(8, nightRows.length);
      addFinalRows(sortRows(nightRows), Math.min(maxDashboardRows, finalRows.length + nightTarget), {
        matchCap: maxPerMatch,
        relaxSport: true,
        relaxLeague: true,
        relaxMarket: true
      });
    }
    if (twoGoalWinnerRows.length) {
      const twoGoalTarget = Math.min(4, twoGoalWinnerRows.length);
      const currentTwoGoal = () => finalRows.filter((row) => row?.winamaxTwoGoalRule?.eligible).length;
      if (currentTwoGoal() < twoGoalTarget) {
        addFinalRows(twoGoalWinnerRows, Math.min(maxDashboardRows, finalRows.length + twoGoalTarget - currentTwoGoal()), {
          matchCap: maxPerMatch,
          relaxSport: true,
          relaxLeague: true,
          relaxMarket: true
        });
      }
    }
    if (winnerRows.length) {
      // Quota Vainqueurs renforcé : cible 50% du cockpit standard pour
      // ne plus avoir l'impression de "ne miser que sur des nombres de buts".
      // L'utilisateur a explicitement demandé plus de Vainqueurs.
      const winnerTarget = Math.min(winnerRows.length, Math.max(8, Math.ceil(maxDashboardRows * 0.50)));
      const currentWinners = () => finalRows.filter((row) => simpleMarketGroup(row?.marketKey || row?.market) === 'winner').length;
      if (currentWinners() < Math.min(winnerTarget, maxDashboardRows)) {
        addFinalRows(winnerRows, Math.min(maxDashboardRows, finalRows.length + Math.max(0, winnerTarget - currentWinners())), {
          matchCap: maxPerMatch,
          relaxSport: true,
          relaxLeague: true,
          relaxMarket: true
        });
      }
    }
    if (scorerRows.length) {
      // Sprint 43 (P2 audit) : injection explicite des picks buteur.
      // Cible 3-5 buteurs par jour quand la famille `players` produit des
      // candidats avec cote Winamax validée et qualité ≥ 35.
      const scorerTarget = Math.min(scorerRows.length, 5);
      const currentScorers = () => finalRows.filter((row) => simpleMarketGroup(row?.marketKey || row?.market) === 'scorer').length;
      if (currentScorers() < scorerTarget) {
        addFinalRows(scorerRows, Math.min(maxDashboardRows, finalRows.length + Math.max(0, scorerTarget - currentScorers())), {
          matchCap: maxPerMatch + 1,
          relaxSport: true,
          relaxLeague: true,
          relaxMarket: true
        });
      }
    }
    addFinalRows(sortedRollingReady, Math.max(rollingReadyTarget, Math.min(target24, sortedRollingReady.length)));
    if (rollingWindowRows(finalRows, 24).length < rollingReadyTarget) {
      addFinalRows(rollingReadyPool, rollingReadyTarget, { enforceMatchCap: true });
    }
    addFinalRows(sortedOrdered, maxDashboardRows, { matchCap: todayCapRelaxed ? maxPerMatch + 1 : maxPerMatch });
    if (finalRows.length < Math.min(maxDashboardRows, sourcePicks.length)) {
      diversityCapRelaxed = true;
      addFinalRows(sortedOrdered, maxDashboardRows, { matchCap: maxPerMatch + 1, relaxSport: true, relaxLeague: true });
      addFinalRows(sortRows(sourcePicks), maxDashboardRows, { matchCap: maxPerMatch + 1, relaxSport: true, relaxLeague: true });
    }
    const rows = finalRows.slice(0, maxDashboardRows)
      .map((row, index) => ({
        ...row,
        priorityRank: index + 1,
        priorityLabel: index === 0 ? 'TOP PICK' : index < 5 ? `#${index + 1}` : row.priority?.label || 'Priorité'
      }));
    const mode = rolling24.length ? 'rolling24h' : todayRows.length ? 'todayFirst' : nearTerm.length ? 'next30h' : 'bestAvailable';
    return {
      rows,
      mode,
      horizonHours: mode === 'rolling24h' ? 24 : mode === 'next30h' || mode === 'todayFirst' ? 30 : null,
      todayPicks: todayRows.length,
      todayReady: todayRows.filter((pick) => pick?.decisionCenter?.canBet).length,
      simplePicks: sourcePicks.length,
      rolling24Picks: rolling24.length,
      rolling24Displayed: rollingWindowRows(rows, 24).length,
      rolling24Target: target24,
      qualityPolicy: {
        maxPerMatch,
        maxPerHourSlot,
        maxPerSport,
        maxPerMarket,
        maxPerLeague,
        maxDashboardRows,
        skippedByMatchCap: skippedByCap.match,
        skippedBySlotCap: skippedByCap.slot,
        todayCapRelaxed,
        diversityCapRelaxed,
        displayedToday: rows.filter((row) => dayKeyParis(row.start) === todayKey).length,
        displayed24h: rollingWindowRows(rows, 24).length,
        target24h: target24,
        sportCounts: Object.fromEntries(finalSportCounts),
        marketCounts: Object.fromEntries(finalMarketCounts),
        leagueCounts: Object.fromEntries(finalLeagueCounts)
      }
    };
  }

  function rowDayKey(row) {
    return dayKeyParis(row?.start || row?.date || row?.kickoff || row?.kickoff_utc || row?.ts || row?.__dayKey || '');
  }

  function buildTodayFunnel(data, matches, picks, dashboardRows) {
    const today = dayKeyParis(new Date());
    const tomorrow = dayKeyParis(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const events = eventListFromDays(data?.days || {});
    const summarize = (day) => {
      const eventsForDay = events.filter((event) => rowDayKey(event) === day);
      const bookableEvents = eventsForDay.filter((event) => event?.winamax?.available === true);
      const predictableMatches = (matches || []).filter((row) => rowDayKey(row) === day);
      const passingFilters = (picks || []).filter((row) => rowDayKey(row) === day);
      const displayed = (dashboardRows || []).filter((row) => rowDayKey(row) === day);
      const simplePassingFilters = passingFilters.filter(isSimpleUserMarket);
      const simpleDisplayed = displayed.filter(isSimpleUserMarket);
      const readyRows = passingFilters.filter((row) => row?.decisionCenter?.canBet);
      const simpleReady = readyRows.filter(isSimpleUserMarket);
      const advancedReady = readyRows.filter((row) => !isSimpleUserMarket(row));
      return {
        day,
        totalEvents: eventsForDay.length,
        bookableEvents: bookableEvents.length,
        predictableMatches: predictableMatches.length,
        passingFilters: passingFilters.length,
        simplePassingFilters: simplePassingFilters.length,
        displayed: displayed.length,
        simpleDisplayed: simpleDisplayed.length,
        ready: readyRows.length,
        simpleReady: simpleReady.length,
        advancedReady: advancedReady.length,
        firstDisplayed: displayed.slice(0, 6).map((row) => ({
          id: row.id,
          title: row.title,
          market: row.market,
          label: row.label,
          start: row.start,
          odd: row.odd,
          edge: row.edge,
          canBet: Boolean(row?.decisionCenter?.canBet)
        }))
      };
    };
    const todaySummary = summarize(today);
    const sprint27TooStrict = todaySummary.bookableEvents >= 30 && todaySummary.displayed < 10;
    const noReadyToday = todaySummary.bookableEvents >= 10 && todaySummary.ready < 1;
    const lowReadyToday = todaySummary.bookableEvents >= 10 && todaySummary.ready > 0 && todaySummary.ready < 8;
    return {
      schema: 'paris-sportif.today_funnel.v1',
      generatedAt: new Date().toISOString(),
      status: noReadyToday || lowReadyToday || sprint27TooStrict ? 'warn' : todaySummary.displayed >= 5 ? 'ok' : todaySummary.displayed > 0 ? 'warn' : 'danger',
      message: noReadyToday
        ? `${todaySummary.displayed} opportunités visibles mais aucun pari prêt aujourd'hui`
        : lowReadyToday
        ? `${todaySummary.ready} pari prêt aujourd'hui : volume limité pour ${todaySummary.bookableEvents} events Winamax`
        : sprint27TooStrict
        ? `${todaySummary.displayed} picks visibles : modèle trop strict pour ${todaySummary.bookableEvents} events Winamax`
        : todaySummary.displayed >= 5
        ? `${todaySummary.displayed} picks Winamax visibles aujourd'hui`
        : todaySummary.displayed > 0
          ? `${todaySummary.displayed} pick(s) aujourd'hui seulement`
          : 'Aucun pick affiché aujourd’hui',
      today: todaySummary,
      tomorrow: summarize(tomorrow)
    };
  }

  function buildRolling24hCoverage(data, matches, picks, dashboardRows) {
    const events = eventListFromDays(data?.days || {});
    const windowEvents = rollingWindowRows(events, 24);
    const windowMatches = rollingWindowRows(matches, 24);
    const windowPicks = rollingWindowRows(picks, 24);
    const windowDashboard = rollingWindowRows(dashboardRows, 24);
    const buckets = ['00-06', '06-12', '12-18', '18-24'].map((key) => ({
      key,
      label: key === '00-06' ? 'Cette nuit' : key === '06-12' ? 'Matin' : key === '12-18' ? 'Après-midi' : 'Soir',
      events: 0,
      bookable: 0,
      predictable: 0,
      positive: 0,
      displayed: 0,
      reliable: 0,
      ready: 0,
      sports: {}
    }));
    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    const add = (collection, field, predicate = () => true) => {
      for (const row of collection) {
        if (!predicate(row)) continue;
        const hour = parisHour(row?.start || row?.date || row?.kickoff || '');
        const bucket = bucketMap.get(hourBucketKey(hour));
        if (!bucket) continue;
        bucket[field] += 1;
        const sport = String(row?.sport || row?.sport_name || 'sport').toLowerCase();
        bucket.sports[sport] = (bucket.sports[sport] || 0) + 1;
      }
    };
    add(windowEvents, 'events');
    add(windowEvents, 'bookable', (event) => event?.winamax?.available === true);
    add(windowMatches, 'predictable');
    add(windowPicks, 'positive');
    add(windowPicks, 'reliable', (row) => row?.safeAssessment?.reliable === true);
    add(windowDashboard, 'displayed');
    add(windowDashboard, 'ready', (row) => row?.decisionCenter?.canBet === true);
    const total = (field) => buckets.reduce((sum, bucket) => sum + Number(bucket[field] || 0), 0);
    return {
      schema: 'paris-sportif.coverage_24h.v1',
      generatedAt: new Date().toISOString(),
      summary: {
        events: windowEvents.length,
        bookable: windowEvents.filter((event) => event?.winamax?.available === true).length,
        predictable: windowMatches.length,
        positive: windowPicks.length,
        displayed: windowDashboard.length,
        reliable: total('reliable'),
        ready: total('ready'),
        nightDisplayed: bucketMap.get('00-06')?.displayed || 0,
        status: total('displayed') >= 15 ? 'ok' : total('displayed') >= 8 ? 'warn' : 'danger'
      },
      buckets: buckets.map((bucket) => ({
        ...bucket,
        sports: Object.entries(bucket.sports)
          .map(([sport, count]) => ({ sport, count }))
          .sort((a, b) => b.count - a.count || a.sport.localeCompare(b.sport))
      }))
    };
  }

  function buildAgentPositions(win, matches) {
    return bettingUtils.buildAgentPositions(matches, {
      kellyFn: typeof win.kellyFraction === 'function' ? win.kellyFraction.bind(win) : null
    });
  }

  function agentCandidateKey(row) {
    return `${row?.id || ''}:${row?.market || ''}:${row?.label || ''}`;
  }

  function agentBlockReason(row, kelly) {
    if (row.prebetGate?.blocked) {
      return { key: 'prebet_checklist', label: row.prebetGate.label || 'Checklist avant mise rouge' };
    }
    if (row.oddsGuardrail?.applied) {
      return { key: 'odds_guardrail', label: row.oddsGuardrail.label || 'Cote haute bloquée' };
    }
    if (row.signalConflict?.active) {
      return { key: 'signal_conflict', label: row.signalConflict.label || 'Conflit signaux marché/contexte' };
    }
    if (row.marketTiming?.guardApplied) {
      return { key: 'market_guard', label: (row.marketTiming.warnings || [])[0] || 'Marché freiné' };
    }
    if (row.contextGate?.agentEligible === false) {
      return { key: 'context_guard', label: row.contextGate.label || 'Contexte insuffisant' };
    }
    if (row.status === 'skip') {
      return { key: 'status_skip', label: row.statusLabel || 'Skip modèle' };
    }
    if (row.status === 'watch') {
      const label = /surveill|watch|attendre|pause|bloqu/i.test(String(row.statusLabel || ''))
        ? row.statusLabel
        : 'À surveiller';
      return { key: 'status_watch', label };
    }
    if (!(kelly > 0)) {
      return { key: 'kelly_zero', label: 'Kelly nul ou edge insuffisant' };
    }
    if (Number(row.confidenceTrust?.score || 100) < 45) {
      return { key: 'trust_low', label: 'Confiance trop fragile' };
    }
    return { key: 'capacity_or_limit', label: 'Cap journalier ou limite agent' };
  }

  function buildAgentBlockers(matches, positions, win) {
    const active = new Set((Array.isArray(positions) ? positions : []).map(agentCandidateKey));
    const rows = [];
    const byReason = new Map();
    let candidates = 0;
    for (const row of Array.isArray(matches) ? matches : []) {
      if (!row || !(row.edge > 0) || !(row.odd > 1) || !(row.probability > 0)) continue;
      candidates += 1;
      if (active.has(agentCandidateKey(row))) continue;
      let kelly = 0;
      try {
        const fn = typeof win.kellyFraction === 'function' ? win.kellyFraction.bind(win) : bettingUtils.kellyFraction;
        kelly = Number(fn(row.probability, row.odd, 0.25, 0.10)) || 0;
      } catch {
        kelly = 0;
      }
      const reason = agentBlockReason(row, kelly);
      byReason.set(reason.key, {
        key: reason.key,
        label: reason.label,
        count: (byReason.get(reason.key)?.count || 0) + 1
      });
      rows.push({
        id: row.id,
        title: row.title,
        sport: row.sport,
        league: row.league,
        start: row.start,
        market: row.market,
        label: row.label,
        odd: row.odd,
        probability: row.probability,
        edge: row.edge,
        kelly,
        status: row.status,
        reasonKey: reason.key,
        reason: reason.label,
        contextScore: Number(row.contextQuality?.score ?? row.match?.context?.quality?.score),
        trustScore: Number(row.confidenceTrust?.score || 0),
        marketTiming: row.marketTiming || null,
        signalConflict: row.signalConflict || null,
        oddsGuardrail: row.oddsGuardrail || null,
        prebetGate: row.prebetGate || null,
        winamaxUrl: row.winamaxUrl || null
      });
    }
    rows.sort((a, b) => (b.edge - a.edge) || (b.probability - a.probability));
    return {
      schema: 'paris-sportif.agent_blockers.v1',
      generatedAt: new Date().toISOString(),
      summary: {
        candidates,
        active: Array.isArray(positions) ? positions.length : 0,
        blocked: rows.length,
        reasons: byReason.size
      },
      byReason: Array.from(byReason.values()).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)),
      rows: rows.slice(0, 60)
    };
  }

  function agentGuard(agent) {
    return modelUtils.agentGuard(agent);
  }

  function agentSnapshot(win, positions, prebetReport, blockedPositions = [], criticalReport = null) {
    const api = win.__testAPI;
    if (!api || typeof api._agentReplay !== 'function') return null;
    try {
      const agent = api._agentReplay();
      const snapshot = bettingUtils.agentSnapshotFromReplay(agent, positions, agentGuard);
      const gate = prebetGateForReport(prebetReport);
      if (gate.blocked) {
        const blocked = Array.isArray(blockedPositions) ? blockedPositions.map((pos) => ({ ...pos, modelStake: pos.modelStake ?? pos.stake, stake: 0 })) : [];
        const bank = Number(snapshot.nav || 0) > 0 ? Number(snapshot.nav) : 10;
        snapshot.guard = { status: 'paused', label: gate.label, reason: 'prebet_checklist' };
        snapshot.prebetGate = gate;
        snapshot.blockedPositions = blocked;
        snapshot.blockedExposure = bettingUtils.summarizeExposure(blocked, bank);
        snapshot.positions = [];
        snapshot.exposure = bettingUtils.summarizeExposure([], bank);
      }
      const criticalSummary = criticalReport && criticalReport.summary ? criticalReport.summary : {};
      if (!gate.blocked && criticalSummary.blocks_bet) {
        const blocked = Array.isArray(blockedPositions) ? blockedPositions.map((pos) => ({ ...pos, modelStake: pos.modelStake ?? pos.stake, stake: 0 })) : [];
        const bank = Number(snapshot.nav || 0) > 0 ? Number(snapshot.nav) : 10;
        snapshot.guard = { status: 'paused', label: criticalSummary.first || 'État critique à corriger', reason: 'critical_issue_report' };
        snapshot.criticalGate = {
          blocked: true,
          label: criticalSummary.first || 'État critique à corriger',
          issues: Number(criticalSummary.issues || 0),
          critical: Number(criticalSummary.critical || 0)
        };
        snapshot.blockedPositions = blocked;
        snapshot.blockedExposure = bettingUtils.summarizeExposure(blocked, bank);
        snapshot.positions = [];
        snapshot.exposure = bettingUtils.summarizeExposure([], bank);
      }
      return snapshot;
    } catch {
      return null;
    }
  }

  function buildNativeCombines(win, matches) {
    return contentUtils.buildNativeCombines(win, matches, {
      cleanTitle,
      cleanLabel,
      getTeamNames,
      formatMarketName,
      normalizePickLabel
    });
  }

  function buildNativeScorers(win, matches, providedLineupsIndex = null, providedStarPlayersIndex = null, providedPlayerOddsIndex = null) {
    const lineupsIndex = providedLineupsIndex || readLineupsIndex();
    const starPlayersIndex = providedStarPlayersIndex || readStarPlayersIndex();
    const playerOddsIndex = providedPlayerOddsIndex || readWinamaxMarketsIndex();
    return contentUtils.buildNativeScorers(win, matches, {
      lineupsIndex,
      starPlayersIndex,
      playerOddsIndex,
      findLineupForMatch,
      matchWithLineups,
      fallbackScorersFromStars,
      getTeamNames,
      cleanLabel
    });
  }

  function scorerPickRowsFromScorers(win, scorers, matchById, bankroll) {
    const rows = [];
    for (const scorer of Array.isArray(scorers) ? scorers : []) {
      const odd = Number(scorer?.odd || 0);
      const probability = Math.max(0, Math.min(0.75, Number(scorer?.probability || 0) || 0));
      const qualityScore = Number(scorer?.playerQuality?.score || 0);
      const edge = odd > 1 && probability > 0 ? probability - (1 / odd) : 0;
      // Sprint 43 (P2 audit) : exploiter la famille `players` (19 419 marchés
      // Winamax dont seulement 1 pick avant). Filtres assouplis :
      // - cote max 5.00 (vs 4.00) pour intégrer les buteurs réguliers
      //   value à cote 4-5
      // - qualité joueur ≥ 35 (vs 50) pour les jeunes / remplaçants
      //   probables qui n'ont pas un score 50+ encore
      // - edge ≥ 0.005 (vs 0.01) — pratiquement zéro mais positif
      if (!(odd >= 1.30 && odd <= 5.00) || !(qualityScore >= 35) || !(edge >= 0.005)) continue;
      const match = matchById.get(String(scorer.matchId || '')) || {};
      const market = 'Buteur';
      const label = scorer.name || scorer.winamaxPlayerMarket?.label || 'Joueur';
      const stake = edge >= 0.03 ? stakeFor(win, probability, odd, bankroll) : 0;
      const status = edge >= 0.03 && stake > 0 ? 'bet' : 'watch';
      rows.push({
        id: `${scorer.matchId}:scorer:${compactKey(label)}`,
        match: jsonClone(match, {}),
        pred: null,
        title: scorer.title || cleanTitle(match) || 'Match joueur',
        sport: match.sport || 'football',
        league: scorer.league || match.league_name || match.league_code || '',
        start: scorer.start || match.date || '',
        market,
        marketKey: 'scorer',
        label,
        player: label,
        odd,
        probability,
        edge,
        stake,
        pickSource: 'winamax_player_scorer',
        status,
        statusLabel: status === 'bet' ? 'Buteur Winamax' : 'Buteur à surveiller',
        marketProfile: {
          detailed: true,
          detailedCount: Number(match?.winamax?.full_markets_count || 0),
          keys: ['buteur'],
          families: { players: true },
          familyCount: 1,
          availableFamilies: ['players'],
          missingCore: []
        },
        scorer,
        contextQuality: {
          score: qualityScore,
          tier: qualityScore >= 70 ? 'fort' : 'correct',
          missing: scorer.playerQuality?.reasons || [],
          critical_missing: []
        },
        contextGate: {
          gate: 'player_market',
          agentEligible: true,
          label: 'Marché buteur Winamax validé',
          warnings: []
        },
        confidenceTrust: {
          score: Math.max(50, Math.min(100, qualityScore)),
          level: qualityScore >= 70 ? 'fort' : 'correct',
          drivers: scorer.playerQuality?.reasons || ['Marché buteur Winamax']
        },
        winamaxUrl: scorer.winamaxUrl || match?.winamax?.url || null,
        winamaxPlayerMarket: scorer.winamaxPlayerMarket || null
      });
    }
    return rows
      .sort((a, b) => Number(b.edge || 0) - Number(a.edge || 0) || Date.parse(a.start || '') - Date.parse(b.start || ''))
      .slice(0, 24);
  }

  function readHistorySummary() {
    return historyUtils.readHistorySummary(root);
  }

  function getAnalysis({ bankroll = 50, force = false } = {}) {
    const safeBankroll = Number.isFinite(Number(bankroll)) && Number(bankroll) > 0 ? Number(bankroll) : 50;
    const analysisKey = `${fileKey()}:bankroll:${safeBankroll.toFixed(2)}`;
    if (!force && analysisCache && analysisCacheKey === analysisKey) return analysisCache;
    const engine = ensureEngine({ force });
    const win = engine.win;
    const data = win.PRONOSTICS_DATA || {};
    const lineupsIndex = readLineupsIndex();
    const starPlayersIndex = readStarPlayersIndex();
    const playerOddsIndex = readWinamaxMarketsIndex();
    const h2hIndex = readH2hIndex();
    const matchContextIndex = readMatchContextIndex();
    const signalGapReport = readSignalGapReport();
    const contextBacktestReport = readContextBacktestReport();
    const decisionBacktestReport = readDecisionBacktestReport();
    const decisionTuningReport = readDecisionTuningReport();
    const decisionShadowReport = readDecisionShadowReport();
    const oddsGuardrailsReport = readOddsGuardrailsReport();
    const agentBlockerBacktestReport = readAgentBlockerBacktestReport();
    const agentGuardrailRecommendationsReport = readAgentGuardrailRecommendationsReport();
    const stakeReductionBacktestReport = readStakeReductionBacktestReport();
    const signalConflictBacktestReport = readSignalConflictBacktestReport();
    const scorerQualityReport = readScorerQualityReport();
    const scorerCandidatesSummary = readScorerCandidatesSummary();
    const scorerSettlementReport = readScorerSettlementReport();
    const scorerPendingAuditReport = readScorerPendingAuditReport();
    const prematchFocusReport = readPrematchFocusReport();
    const prematchExecutionReport = readPrematchExecutionReport();
    const signalCoverageTrendReport = readSignalCoverageTrendReport();
    const nextActionsReport = readNextActionsReport();
    const sourceFreshnessPlanReport = readSourceFreshnessPlanReport();
    const contextRepairPlanReport = readContextRepairPlanReport();
    const refreshPriorityPlanReport = readRefreshPriorityPlanReport();
    const prebetChecklistReport = readPrebetChecklistReport();
    const prebetChecklistBacktestReport = readPrebetChecklistBacktestReport();
    const teamIdentityGraphReport = readTeamIdentityGraphReport();
    const matchDecisionTimelineReport = readMatchDecisionTimelineReport();
    const agentBankrollSimulationReport = readAgentBankrollSimulationReport();
    const smartPreparePlanReport = readSmartPreparePlanReport();
    const sourceRegistryReport = readSourceRegistryReport();
    const sourceQuarantineReport = readSourceQuarantineReport();
    const optionalSourcesPlanReport = readOptionalSourcesPlanReport();
    const criticalIssueReport = readCriticalIssueReport();
    const dataConsistencyReport = readDataConsistencyReport();
    const uiIntegrityReport = readUiIntegrityReport();
    const pickIntegrityReport = readPickIntegrityReport();
    const coverageRepairEngineReport = readCoverageRepairEngineReport();
    const sourceCoverageTargetsReport = readSourceCoverageTargetsReport();
    const leagueSignalQualityReport = readLeagueSignalQualityReport();
    const modelLabReport = readModelLabReport();
    const probabilityCalibrationReport = readProbabilityCalibrationReport();
    const policyCandidateRegistryReport = readPolicyCandidateRegistryReport();
    const sourceHealthReport = readSourceHealthReport();
    const clvSummaryReport = readClvSummaryReport();
    const picksHistorySummary = readPicksHistorySummary();
    const modelRealityAudit = buildModelRealityAudit(picksHistorySummary);
    const events = dedupeUpcomingBookable(
      eventListFromDays(data.days).map((match) => attachWinamaxMarkets(match, playerOddsIndex))
    ).slice(0, 1200);
    const enrichedEvents = events.map((match) => enrichMatchForModel(match, lineupsIndex, h2hIndex, matchContextIndex));
    const scorers = buildNativeScorers(win, enrichedEvents, lineupsIndex, starPlayersIndex, playerOddsIndex);
    const matchById = new Map(enrichedEvents.map((match) => [String(match?.winamax?.match_id || match?.id || match?.uid || ''), match]));
    const coverage = buildSignalCoverage(enrichedEvents);
    const history = readHistorySummary();
    const calibration = history?.calibration || calibrationUtils.buildCalibration([]);
    const analyzedRows = [
      ...enrichedEvents.flatMap((match) => expandAnalyzedRow(analyzeMatch(win, match, safeBankroll))),
      ...scorerPickRowsFromScorers(win, scorers, matchById, safeBankroll)
    ];
    const baseRows = calibrationUtils.annotateMatches(
      analyzedRows,
      calibration
    )
      .map((row) => contextUtils.annotateConfidence(row, contextBacktestReport))
      .map((row) => applyModelReality(row, modelRealityAudit))
      .map((row) => applyProbabilityRealityCalibration(row, probabilityCalibrationReport, win, safeBankroll))
      .map((row) => applyWinamaxTwoGoalRule(row, win, safeBankroll))
      .map((row) => applyDecisionAndMarketTiming(row, clvSummaryReport, decisionTuningReport))
      .map((row) => applyOddsGuardrails(row, oddsGuardrailsReport))
      .map((row) => applyStakePrudence(row, agentGuardrailRecommendationsReport, stakeReductionBacktestReport))
      .map((row) => applySignalConflict(row, signalConflictBacktestReport));
    const primaryBaseRows = baseRows.filter((row) => !row.isMarketAlternative);
    const candidateAgentPositions = buildAgentPositions(win, primaryBaseRows);
    const prebetGate = prebetGateForReport(prebetChecklistReport);
    const criticalGate = criticalGateForReport(criticalIssueReport);
    const decisionGates = { prebet: prebetGate, critical: criticalGate };
    const allDecisionRows = baseRows
      .map((row) => applyPrebetGate(row, prebetChecklistReport))
      .map((row) => applyDecisionCenter(row, decisionGates))
      .map((row) => applyWinamaxProductLayer(row))
      .map((row) => applySafeReliabilityLayer(row));
    const prioritizedDecisionRows = applyPriorityScores(allDecisionRows);
    const matches = prioritizedDecisionRows.filter((row) => !row.isMarketAlternative);
    const seen = new Set();
    const picks = prioritizedDecisionRows
      .filter((row) => {
        if (!row || row.status === 'skip') return false;
        if (!(Number(row.safeEdge ?? row.edge ?? 0) >= 0.01)) return false;
        if (!(Number(row.odd || 0) > 1)) return false;
        if (row.safeAssessment?.displayable === false) return false;
        return Number(row.decisionCenter?.modelStake || row.modelStake || row.stake || 0) > 0 || row.decisionCenter?.canBet === true;
      })
      .sort((a, b) => {
        const aWindow = rollingWindowRows([a], 24).length ? 1 : 0;
        const bWindow = rollingWindowRows([b], 24).length ? 1 : 0;
        if (bWindow !== aWindow) return bWindow - aWindow;
        const reliableDelta = Number(Boolean(b.safeAssessment?.reliable)) - Number(Boolean(a.safeAssessment?.reliable));
        if (reliableDelta) return reliableDelta;
        const readyDelta = Number(Boolean(b.decisionCenter?.canBet)) - Number(Boolean(a.decisionCenter?.canBet));
        if (readyDelta) return readyDelta;
        return (Number(b.priorityScore || 0) - Number(a.priorityScore || 0)) ||
          (Number(b.safeEdge ?? b.edge ?? 0) - Number(a.safeEdge ?? a.edge ?? 0)) ||
          (Number(b.safeConfidence ?? b.probability ?? 0) - Number(a.safeConfidence ?? a.probability ?? 0)) ||
          (Date.parse(a.start || '') - Date.parse(b.start || ''));
      })
      .filter((pick) => {
        const key = `${pick.id}:${pick.market}:${pick.label}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 180);
    const dashboardCandidates = prioritizedDecisionRows
      .filter(isDashboardDisplayCandidate)
      .sort((a, b) => {
        const aWindow = rollingWindowRows([a], 24).length ? 1 : 0;
        const bWindow = rollingWindowRows([b], 24).length ? 1 : 0;
        if (bWindow !== aWindow) return bWindow - aWindow;
        const readyDelta = Number(Boolean(b.decisionCenter?.canBet)) - Number(Boolean(a.decisionCenter?.canBet));
        if (readyDelta) return readyDelta;
        return (Number(b.priorityScore || 0) - Number(a.priorityScore || 0)) ||
          (Number(b.safeEdge ?? b.edge ?? 0) - Number(a.safeEdge ?? a.edge ?? 0)) ||
          (Number(b.safeConfidence ?? b.probability ?? 0) - Number(a.safeConfidence ?? a.probability ?? 0)) ||
          (Date.parse(a.start || '') - Date.parse(b.start || ''));
      });
    const dashboard = buildDashboardPicks(dashboardCandidates);
    const todayFunnel = buildTodayFunnel(data, matches, dashboardCandidates, dashboard.rows);
    const coverage24h = buildRolling24hCoverage(data, matches, dashboardCandidates, dashboard.rows);
    const winamaxMarketAudit = buildWinamaxMarketAudit(enrichedEvents, prioritizedDecisionRows);
    const combines = buildNativeCombines(win, enrichedEvents);
    const watchlist = buildWatchlist(matches);
    const decisionCenter = buildDecisionCenterReport(prioritizedDecisionRows, decisionGates);
    const agentPositions = prebetGate.blocked || criticalGate.blocked ? [] : buildAgentPositions(win, matches);
    const agentBlockers = buildAgentBlockers(matches, agentPositions, win);

    const analysis = {
      ok: true,
      generatedAt: data.generated_at || null,
      loadedAt: engine.loadedAt,
      loadMs: engine.loadMs,
      engine: {
        source: 'legacy-app.js',
        mode: 'desktop-jsdom',
        logs: engine.logs.slice(-20)
      },
      counts: {
        matches: matches.length,
        picks: picks.length,
        dashboardPicks: dashboard.rows.length,
        combines: combines.length,
        scorers: scorers.length
      },
      coverage,
      matches,
      picks,
      dashboardPicks: dashboard.rows,
      dashboardMeta: {
        mode: dashboard.mode,
        horizonHours: dashboard.horizonHours,
        todayPicks: dashboard.todayPicks || 0,
        todayReady: dashboard.todayReady || 0,
        totalPicks: picks.length,
        readyPicks: dashboard.rows.filter((row) => row?.decisionCenter?.canBet).length,
        rolling24Picks: dashboard.rolling24Picks || 0,
        rolling24Displayed: dashboard.rolling24Displayed || 0,
        rolling24Target: dashboard.rolling24Target || 0,
        blocked: decisionCenter.summary.blocked,
        qualityPolicy: dashboard.qualityPolicy || null
      },
      winamaxMarketAudit,
      todayFunnel,
      coverage24h,
      decisionCenter,
      combines,
      scorers,
      watchlist,
      prematchPlan: {
        autoDue: watchlist.filter((item) => item.autoRefreshDue).length,
        next: watchlist[0] || null,
        focus: prematchFocusReport && prematchFocusReport.schema ? prematchFocusReport.summary || null : null,
        focusMatches: prematchFocusReport && Array.isArray(prematchFocusReport.matches) ? prematchFocusReport.matches.slice(0, 12) : [],
        execution: prematchExecutionReport && prematchExecutionReport.schema ? prematchExecutionReport.summary || null : null,
        enabledByDefault: true
      },
      history,
      calibration,
      context: contextUtils.contextSummary(matchContextIndex),
      signalGaps: contextUtils.signalGaps(signalGapReport),
      contextBacktest: contextUtils.contextBacktestSummary(contextBacktestReport),
      decisionBacktest: contextUtils.decisionBacktestSummary(decisionBacktestReport),
      decisionTuning: decisionTuningReport && decisionTuningReport.schema ? decisionTuningReport : null,
      decisionShadow: decisionShadowReport && decisionShadowReport.schema ? decisionShadowReport : null,
      oddsGuardrails: oddsGuardrailsReport && oddsGuardrailsReport.schema ? oddsGuardrailsReport : null,
      agentBlockerBacktest: agentBlockerBacktestReport && agentBlockerBacktestReport.schema ? agentBlockerBacktestReport : null,
      agentGuardrailRecommendations: agentGuardrailRecommendationsReport && agentGuardrailRecommendationsReport.schema ? agentGuardrailRecommendationsReport : null,
      stakeReductionBacktest: stakeReductionBacktestReport && stakeReductionBacktestReport.schema ? stakeReductionBacktestReport : null,
      signalConflictBacktest: signalConflictBacktestReport && signalConflictBacktestReport.schema ? signalConflictBacktestReport : null,
      scorerQuality: scorerQualityReport && scorerQualityReport.schema ? scorerQualityReport : null,
      scorerCandidates: scorerCandidatesSummary && scorerCandidatesSummary.schema ? scorerCandidatesSummary : null,
      scorerSettlement: scorerSettlementReport && scorerSettlementReport.schema ? scorerSettlementReport : null,
      scorerPendingAudit: scorerPendingAuditReport && scorerPendingAuditReport.schema ? scorerPendingAuditReport : null,
      prematchFocus: prematchFocusReport && prematchFocusReport.schema ? prematchFocusReport : null,
      prematchExecution: prematchExecutionReport && prematchExecutionReport.schema ? prematchExecutionReport : null,
      signalCoverageTrend: signalCoverageTrendReport && signalCoverageTrendReport.schema ? signalCoverageTrendReport : null,
      nextActions: nextActionsReport && nextActionsReport.schema ? nextActionsReport : null,
      sourceFreshnessPlan: sourceFreshnessPlanReport && sourceFreshnessPlanReport.schema ? sourceFreshnessPlanReport : null,
      contextRepairPlan: contextRepairPlanReport && contextRepairPlanReport.schema ? contextRepairPlanReport : null,
      refreshPriorityPlan: refreshPriorityPlanReport && refreshPriorityPlanReport.schema ? refreshPriorityPlanReport : null,
      prebetChecklist: prebetChecklistReport && prebetChecklistReport.schema ? prebetChecklistReport : null,
      prebetChecklistBacktest: prebetChecklistBacktestReport && prebetChecklistBacktestReport.schema ? prebetChecklistBacktestReport : null,
      teamIdentityGraph: teamIdentityGraphReport && teamIdentityGraphReport.schema ? teamIdentityGraphReport : null,
      matchDecisionTimeline: matchDecisionTimelineReport && matchDecisionTimelineReport.schema ? matchDecisionTimelineReport : null,
      agentBankrollSimulation: agentBankrollSimulationReport && agentBankrollSimulationReport.schema ? agentBankrollSimulationReport : null,
      smartPreparePlan: smartPreparePlanReport && smartPreparePlanReport.schema ? smartPreparePlanReport : null,
      sourceRegistry: sourceRegistryReport && sourceRegistryReport.schema ? sourceRegistryReport : null,
      sourceQuarantine: sourceQuarantineReport && sourceQuarantineReport.schema ? sourceQuarantineReport : null,
      optionalSourcesPlan: optionalSourcesPlanReport && optionalSourcesPlanReport.schema ? optionalSourcesPlanReport : null,
      criticalIssueReport: criticalIssueReport && criticalIssueReport.schema ? criticalIssueReport : null,
      dataConsistencyReport: dataConsistencyReport && dataConsistencyReport.schema ? dataConsistencyReport : null,
      uiIntegrityReport: uiIntegrityReport && uiIntegrityReport.schema ? uiIntegrityReport : null,
      pickIntegrityReport: pickIntegrityReport && pickIntegrityReport.schema ? pickIntegrityReport : null,
      coverageRepairEngine: coverageRepairEngineReport && coverageRepairEngineReport.schema ? coverageRepairEngineReport : null,
      sourceCoverageTargets: sourceCoverageTargetsReport && sourceCoverageTargetsReport.schema ? sourceCoverageTargetsReport : null,
      leagueSignalQuality: leagueSignalQualityReport && leagueSignalQualityReport.schema ? leagueSignalQualityReport : null,
      modelLab: modelLabReport && modelLabReport.schema ? modelLabReport : null,
      modelRealityAudit,
      probabilityCalibration: probabilityCalibrationReport && probabilityCalibrationReport.schema ? probabilityCalibrationReport : null,
      policyCandidates: policyCandidateRegistryReport && policyCandidateRegistryReport.schema ? policyCandidateRegistryReport : null,
      sourceHealth: sourceHealthReport && sourceHealthReport.schema ? sourceHealthReport : null,
      clvSummary: clvSummaryReport && clvSummaryReport.summary ? clvSummaryReport : null,
      agentBlockers,
      agent: agentSnapshot(win, agentPositions, prebetChecklistReport, candidateAgentPositions, criticalIssueReport)
    };
    analysisCache = analysis;
    analysisCacheKey = analysisKey;
    return analysis;
  }

  return {
    getAnalysis,
    reload() {
      closeCurrent();
      return ensureEngine({ force: true });
    },
    close: closeCurrent
  };
}

module.exports = {
  createLegacyEngineService
};

