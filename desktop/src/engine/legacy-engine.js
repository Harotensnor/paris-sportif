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
    return `${dataStat.mtimeMs}:${dataStat.size}:${legacyStat.mtimeMs}:${legacyStat.size}:${optionalFileKey(lineupsPath)}:${optionalFileKey(sofaEventsPath)}:${optionalFileKey(starPlayersPath)}:${optionalFileKey(h2hPath)}:${optionalFileKey(matchContextPath)}:${optionalFileKey(signalGapPath)}:${optionalFileKey(contextBacktestPath)}:${optionalFileKey(decisionBacktestPath)}:${optionalFileKey(decisionTuningPath)}:${optionalFileKey(decisionShadowPath)}:${optionalFileKey(oddsGuardrailsPath)}:${optionalFileKey(agentBlockerBacktestPath)}:${optionalFileKey(agentGuardrailRecommendationsPath)}:${optionalFileKey(stakeReductionBacktestPath)}:${optionalFileKey(signalConflictBacktestPath)}:${optionalFileKey(scorerQualityPath)}:${optionalFileKey(scorerCandidatesSummaryPath)}:${optionalFileKey(scorerSettlementPath)}:${optionalFileKey(scorerPendingAuditPath)}:${optionalFileKey(prematchFocusPath)}:${optionalFileKey(prematchExecutionPath)}:${optionalFileKey(signalCoverageTrendPath)}:${optionalFileKey(nextActionsPath)}:${optionalFileKey(sourceFreshnessPlanPath)}:${optionalFileKey(contextRepairPlanPath)}:${optionalFileKey(refreshPriorityPlanPath)}:${optionalFileKey(prebetChecklistPath)}:${optionalFileKey(prebetChecklistBacktestPath)}:${optionalFileKey(teamIdentityGraphPath)}:${optionalFileKey(matchDecisionTimelinePath)}:${optionalFileKey(agentBankrollSimulationPath)}:${optionalFileKey(smartPreparePlanPath)}:${optionalFileKey(sourceRegistryPath)}:${optionalFileKey(sourceQuarantinePath)}:${optionalFileKey(optionalSourcesPlanPath)}:${optionalFileKey(criticalIssueReportPath)}:${optionalFileKey(dataConsistencyReportPath)}:${optionalFileKey(uiIntegrityReportPath)}:${optionalFileKey(pickIntegrityReportPath)}:${optionalFileKey(coverageRepairEnginePath)}:${optionalFileKey(sourceCoverageTargetsPath)}:${optionalFileKey(leagueSignalQualityPath)}:${optionalFileKey(modelLabReportPath)}:${optionalFileKey(probabilityCalibrationPath)}:${optionalFileKey(policyCandidateRegistryPath)}:${optionalFileKey(sourceHealthReportPath)}:${optionalFileKey(clvSummaryPath)}:${optionalFileKey(picksHistorySummaryPath)}`;
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
    return Number.isFinite(ts) && ts > Date.now() - 30 * 60000;
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
    for (const candidate of candidates) {
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
      if (rows.length >= 3) break;
    }
    return rows;
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
        if (best && best.edge > 0 && stake > 0) {
          status = best.edge >= 0.05 ? 'bet' : 'watch';
          statusLabel = best.edge >= 0.08
            ? 'Priorité'
            : best.edge >= 0.05
              ? (best.derivedFromSkip ? 'Jouable manuel' : 'Jouable')
              : 'À surveiller';
        } else {
          statusLabel = 'À surveiller';
        }
        marketAlternatives = alternativeRowsFromCandidates(win, match, pred, best, {
          market: marketLabel,
          label: pickLabel
        }, bankroll);
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
      marketKey: calibrationUtils.normalizeMarketKey(best?.best?.market || best?.best?.key || pred?.market || marketLabel),
      label: pickLabel,
      odd: best ? best.odd : 0,
      probability: best ? best.prob : Number(pred && (pred.reliability ?? pred.prob)) || 0,
      edge: best ? best.edge : 0,
      stake,
      pickSource: best?.source || (best ? 'runtime_best_pick' : null),
      modelSkipOverridden: Boolean(best?.derivedFromSkip),
      status,
      statusLabel,
      marketProfile: marketProfile(match),
      marketAlternatives,
      winamaxUrl: match.winamax && match.winamax.url,
      modelError
    };
    return contextUtils.applyContextGate(row);
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
      players: Array.isArray(wx.full_market_keys) && wx.full_market_keys.some((key) => /buteur|joueur|player|marque/i.test(String(key)))
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

  function emptySegmentBucket(key, label = 'segment') {
    return {
      key,
      label,
      count: 0,
      won: 0,
      lost: 0,
      profit: 0,
      stake: 0,
      avgOdd: 0,
      avgProb: 0,
      avgEdge: 0,
      avgImplied: 0,
      last30Count: 0,
      last30Won: 0,
      last30AvgProb: 0
    };
  }

  function updateSegmentBucket(bucket, pick, isRecent30) {
    const odd = Number(pick.odd_book || pick.odd || 0);
    const prob = Number(pick.prob_model || pick.probability || 0);
    if (!(odd > 1)) return;
    bucket.count += 1;
    bucket.stake += 1;
    bucket.avgOdd += odd;
    bucket.avgProb += prob > 0 ? prob : 0;
    bucket.avgEdge += Number(pick.edge || 0);
    bucket.avgImplied += 1 / odd;
    if (pick.result === 'won') {
      bucket.won += 1;
      bucket.profit += odd - 1;
      if (isRecent30) bucket.last30Won += 1;
    } else {
      bucket.lost += 1;
      bucket.profit -= 1;
    }
    if (isRecent30) {
      bucket.last30Count += 1;
      bucket.last30AvgProb += prob > 0 ? prob : 0;
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
    return bucket;
  }

  function buildModelRealityAudit(summary) {
    const settled = flattenSettledHistory(summary);
    const byKey = new Map();
    const recentCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const pick of settled.slice(0, 500)) {
      const ts = Date.parse(pick.kickoff_utc || pick.settled_at || pick.day || '');
      const isRecent30 = Number.isFinite(ts) && ts >= recentCutoff;
      for (const key of historySegmentKeysForPick(pick)) {
        const bucket = byKey.get(key) || emptySegmentBucket(key);
        updateSegmentBucket(bucket, pick, isRecent30);
        byKey.set(key, bucket);
      }
    }
    const buckets = Array.from(byKey.values()).map(finalizeSegmentBucket);
    const robust = buckets.filter((bucket) => bucket.count >= 30);
    return {
      schema: 'paris-sportif.model_reality_audit.v1',
      generatedAt: new Date().toISOString(),
      sampleSize: settled.slice(0, 500).length,
      robustSegments: robust.length,
      topSegments: robust.slice().sort((a, b) => b.roi - a.roi || b.count - a.count).slice(0, 10),
      bottomSegments: robust.slice().sort((a, b) => a.roi - b.roi || b.count - a.count).slice(0, 10),
      byKey: Object.fromEntries(buckets.map((bucket) => [bucket.key, bucket]))
    };
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
    const trust = row.confidenceTrust || {};
    return {
      ...row,
      segmentValidation,
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
    const hasCriticalSignals = Array.isArray(quality.critical_missing) && quality.critical_missing.length > 0;
    const qualityScore = Number(quality.score);
    const proxyContextSport = /tennis|baseball|basket|hockey|mma|rugby|nfl|football américain|american football/.test(sportKey);
    const proxyContextRelease = proxyContextSport &&
      !hasCriticalSignals &&
      row.contextGate?.gate !== 'skip' &&
      Number.isFinite(qualityScore) &&
      qualityScore >= 50 &&
      Number(row.edge || 0) >= 0.08 &&
      modelStake > 0;
    const sourceRepairNeeded = hasCriticalSignals || (Number.isFinite(qualityScore) && qualityScore < 45);
    if (!(Number(row.odd || 0) > 1)) blockingGates.push({ key: 'odds', label: 'Cote Winamax invalide', tone: 'danger' });
    if (!(Number(row.edge || 0) > 0)) blockingGates.push({ key: 'edge', label: 'Edge non positif', tone: 'danger' });
    if (!(modelStake > 0 || currentStake > 0)) blockingGates.push({ key: 'kelly', label: 'Kelly nul', tone: 'warn' });
    if (row.status === 'skip') blockingGates.push({ key: 'model', label: row.statusLabel || 'Skip modèle', tone: 'danger' });
    if ((row.contextGate?.agentEligible === false || hasCriticalSignals) && !proxyContextRelease) {
      blockingGates.push({
        key: 'context',
        label: row.contextGate?.label || (hasCriticalSignals ? 'Signal critique manquant' : 'Contexte insuffisant'),
        tone: hasCriticalSignals ? 'danger' : 'warn'
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
    const modelAllowsBet = row.status === 'bet' || proxyContextRelease;
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
      ? (proxyContextRelease ? 'Winamax OK · contexte proxy suffisant' : 'Tous les garde-fous sont verts')
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

  function buildDashboardPicks(picks) {
    const now = Date.now();
    const horizonMs = 30 * 60 * 60000;
    const todayKey = dayKeyParis(new Date());
    const rank = (pick) => [
      pick?.decisionCenter?.canBet ? 1 : 0,
      pick?.decisionCenter?.status === 'ready' ? 1 : 0,
      Number(pick?.edge || 0),
      Number(pick?.probability || 0)
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
    const nearTerm = picks.filter((pick) => {
      const ts = Date.parse(pick.start || '');
      return Number.isFinite(ts) && ts >= now - 30 * 60000 && ts <= now + horizonMs;
    });
    const todayRows = picks.filter((pick) => dayKeyParis(pick.start) === todayKey);
    const ordered = [];
    const seen = new Set();
    const addRows = (rows) => {
      for (const row of rows) {
        const key = `${row.id}:${row.market}:${row.label}`;
        if (seen.has(key)) continue;
        seen.add(key);
        ordered.push(row);
      }
    };
    addRows(sortByKickoffThenRank(todayRows));
    addRows(sortByKickoffThenRank(nearTerm));
    addRows(sortRows(picks));
    const rows = ordered.slice(0, 24);
    const mode = todayRows.length ? 'todayFirst' : nearTerm.length ? 'next30h' : 'bestAvailable';
    return {
      rows,
      mode,
      horizonHours: mode === 'next30h' || mode === 'todayFirst' ? 30 : null,
      todayPicks: todayRows.length,
      todayReady: todayRows.filter((pick) => pick?.decisionCenter?.canBet).length
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
      return {
        day,
        totalEvents: eventsForDay.length,
        bookableEvents: bookableEvents.length,
        predictableMatches: predictableMatches.length,
        passingFilters: passingFilters.length,
        displayed: displayed.length,
        ready: passingFilters.filter((row) => row?.decisionCenter?.canBet).length,
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
    return {
      schema: 'paris-sportif.today_funnel.v1',
      generatedAt: new Date().toISOString(),
      status: todaySummary.displayed >= 5 ? 'ok' : todaySummary.displayed > 0 ? 'warn' : 'danger',
      message: todaySummary.displayed >= 5
        ? `${todaySummary.displayed} picks Winamax visibles aujourd'hui`
        : todaySummary.displayed > 0
          ? `${todaySummary.displayed} pick(s) aujourd'hui seulement`
          : 'Aucun pick affiché aujourd’hui',
      today: todaySummary,
      tomorrow: summarize(tomorrow)
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

  function buildNativeScorers(win, matches, providedLineupsIndex = null, providedStarPlayersIndex = null) {
    const lineupsIndex = providedLineupsIndex || readLineupsIndex();
    const starPlayersIndex = providedStarPlayersIndex || readStarPlayersIndex();
    return contentUtils.buildNativeScorers(win, matches, {
      lineupsIndex,
      starPlayersIndex,
      findLineupForMatch,
      matchWithLineups,
      fallbackScorersFromStars,
      getTeamNames,
      cleanLabel
    });
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
    const events = dedupeUpcomingBookable(eventListFromDays(data.days)).slice(0, 1200);
    const enrichedEvents = events.map((match) => enrichMatchForModel(match, lineupsIndex, h2hIndex, matchContextIndex));
    const coverage = buildSignalCoverage(enrichedEvents);
    const history = readHistorySummary();
    const calibration = history?.calibration || calibrationUtils.buildCalibration([]);
    const analyzedRows = enrichedEvents.flatMap((match) => expandAnalyzedRow(analyzeMatch(win, match, safeBankroll)));
    const baseRows = calibrationUtils.annotateMatches(
      analyzedRows,
      calibration
    )
      .map((row) => contextUtils.annotateConfidence(row, contextBacktestReport))
      .map((row) => applyModelReality(row, modelRealityAudit))
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
      .map((row) => applyDecisionCenter(row, decisionGates));
    const matches = allDecisionRows.filter((row) => !row.isMarketAlternative);
    const seen = new Set();
    const picks = allDecisionRows
      .filter((row) => row.status !== 'skip' && row.edge > 0 && row.odd > 1 && Number(row.decisionCenter?.modelStake || row.modelStake || row.stake || 0) > 0)
      .sort((a, b) => {
        const readyDelta = Number(Boolean(b.decisionCenter?.canBet)) - Number(Boolean(a.decisionCenter?.canBet));
        if (readyDelta) return readyDelta;
        return (b.edge - a.edge) || (b.probability - a.probability);
      })
      .filter((pick) => {
        const key = `${pick.id}:${pick.market}:${pick.label}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 120);
    const dashboard = buildDashboardPicks(picks);
    const todayFunnel = buildTodayFunnel(data, matches, picks, dashboard.rows);
    const combines = buildNativeCombines(win, enrichedEvents);
    const scorers = buildNativeScorers(win, enrichedEvents, lineupsIndex, starPlayersIndex);
    const watchlist = buildWatchlist(matches);
    const decisionCenter = buildDecisionCenterReport(allDecisionRows, decisionGates);
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
        blocked: decisionCenter.summary.blocked
      },
      todayFunnel,
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

