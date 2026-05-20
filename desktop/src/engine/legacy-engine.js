const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const modelUtils = require('./model-utils');
const bettingUtils = require('./betting-utils');
const contentUtils = require('./content-utils');
const historyUtils = require('./history-utils');
const calibrationUtils = require('./calibration-utils');
const contextUtils = require('./context-utils');
const dataSource = require('./data-source');

function createLegacyEngineService({ projectRoot }) {
  const root = path.resolve(projectRoot);
  const desktopRoot = path.join(root, 'desktop');
  const stateRoot = path.join(desktopRoot, 'state');
  const analysisSnapshotPath = path.join(stateRoot, 'engine-analysis-cache.json');
  const homeAnalysisSnapshotPath = path.join(stateRoot, 'engine-analysis-home-cache.json');
  const dataPath = path.join(root, 'data.js');
  const dataLitePath = path.join(root, 'data_lite.js');
  const dataTodayPath = path.join(root, 'data_today.json');
  const dataManifestPath = path.join(root, 'data_manifest.json');
  const healthPath = path.join(root, 'health.json');
  const engineSourcePath = __filename;
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
    return `${dataStat.mtimeMs}:${dataStat.size}:${optionalFileKey(engineSourcePath)}:${optionalFileKey(dataLitePath)}:${optionalFileKey(dataTodayPath)}:${optionalFileKey(dataManifestPath)}:${optionalFileKey(healthPath)}:${legacyStat.mtimeMs}:${legacyStat.size}:${optionalFileKey(lineupsPath)}:${optionalFileKey(sofaEventsPath)}:${optionalFileKey(starPlayersPath)}:${optionalFileKey(winamaxMarketsPath)}:${optionalFileKey(h2hPath)}:${optionalFileKey(matchContextPath)}:${optionalFileKey(signalGapPath)}:${optionalFileKey(contextBacktestPath)}:${optionalFileKey(decisionBacktestPath)}:${optionalFileKey(decisionTuningPath)}:${optionalFileKey(decisionShadowPath)}:${optionalFileKey(oddsGuardrailsPath)}:${optionalFileKey(agentBlockerBacktestPath)}:${optionalFileKey(agentGuardrailRecommendationsPath)}:${optionalFileKey(stakeReductionBacktestPath)}:${optionalFileKey(signalConflictBacktestPath)}:${optionalFileKey(scorerQualityPath)}:${optionalFileKey(scorerCandidatesSummaryPath)}:${optionalFileKey(scorerSettlementPath)}:${optionalFileKey(scorerPendingAuditPath)}:${optionalFileKey(prematchFocusPath)}:${optionalFileKey(prematchExecutionPath)}:${optionalFileKey(signalCoverageTrendPath)}:${optionalFileKey(nextActionsPath)}:${optionalFileKey(sourceFreshnessPlanPath)}:${optionalFileKey(contextRepairPlanPath)}:${optionalFileKey(refreshPriorityPlanPath)}:${optionalFileKey(prebetChecklistPath)}:${optionalFileKey(prebetChecklistBacktestPath)}:${optionalFileKey(teamIdentityGraphPath)}:${optionalFileKey(matchDecisionTimelinePath)}:${optionalFileKey(agentBankrollSimulationPath)}:${optionalFileKey(smartPreparePlanPath)}:${optionalFileKey(sourceRegistryPath)}:${optionalFileKey(sourceQuarantinePath)}:${optionalFileKey(optionalSourcesPlanPath)}:${optionalFileKey(criticalIssueReportPath)}:${optionalFileKey(dataConsistencyReportPath)}:${optionalFileKey(uiIntegrityReportPath)}:${optionalFileKey(pickIntegrityReportPath)}:${optionalFileKey(coverageRepairEnginePath)}:${optionalFileKey(sourceCoverageTargetsPath)}:${optionalFileKey(leagueSignalQualityPath)}:${optionalFileKey(modelLabReportPath)}:${optionalFileKey(probabilityCalibrationPath)}:${optionalFileKey(policyCandidateRegistryPath)}:${optionalFileKey(sourceHealthReportPath)}:${optionalFileKey(clvSummaryPath)}:${optionalFileKey(picksHistorySummaryPath)}`;
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

  function readAnalysisSnapshot(analysisKey, snapshotPath = analysisSnapshotPath) {
    try {
      if (!fs.existsSync(snapshotPath)) return null;
      const payload = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
      if (!payload || payload.analysisKey !== analysisKey || !payload.analysis || payload.analysis.ok !== true) return null;
      return {
        ...payload.analysis,
        cache: {
          ...(payload.analysis.cache || {}),
          source: 'disk',
          cachedAt: payload.cachedAt || null
        }
      };
    } catch {
      return null;
    }
  }

  function writeAnalysisSnapshot(analysisKey, analysis, snapshotPath = analysisSnapshotPath) {
    try {
      fs.mkdirSync(stateRoot, { recursive: true });
      const payload = {
        schema: 'engine-analysis-cache-v1',
        analysisKey,
        cachedAt: new Date().toISOString(),
        analysis: {
          ...analysis,
          cache: { source: 'fresh', cachedAt: new Date().toISOString() }
        }
      };
      const tmpPath = `${snapshotPath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(payload));
      fs.renameSync(tmpPath, snapshotPath);
    } catch {
      // Cache opportuniste seulement : le calcul moteur reste la source de vérité.
    }
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
    const runtimeData = dataSource.loadRuntimeData(root);
    if (runtimeData.truth.repaired) {
      logs.push(`warn: runtime data repaired ${JSON.stringify(runtimeData.truth.repairDays).slice(0, 400)}`);
    }
    win.eval(`window.PRONOSTICS_DATA = ${JSON.stringify(runtimeData.data)};`);
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

  // Sprint 67 — Memoization sidecars JSON. Avant : chaque getAnalysis
  // reparsait winamax_markets.json (~90 MB) + 5 autres > 10 MB.
  // Maintenant : cache par mtime, ne reparse que si fichier modifie.
  // Aussi : logger les JSON corrompus au lieu de catch {} silencieux (Patch F).
  const _sidecarCache = new Map();
  function readJsonSidecarMemo(filePath, transform, fallback) {
    const fb = fallback === undefined ? {} : fallback;
    if (!fs.existsSync(filePath)) return fb;
    let stat;
    try { stat = fs.statSync(filePath); }
    catch (statErr) {
      try { console.warn(`[engine] stat failed ${filePath}: ${statErr.message}`); } catch { /* noop */ }
      return fb;
    }
    const cached = _sidecarCache.get(filePath);
    if (cached && cached.mtime === stat.mtimeMs) return cached.value;
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const transformed = typeof transform === 'function' ? transform(parsed) : parsed;
      const value = transformed === undefined || transformed === null ? fb : transformed;
      _sidecarCache.set(filePath, { mtime: stat.mtimeMs, value });
      return value;
    } catch (parseErr) {
      try { console.warn(`[engine] Sidecar JSON corrompu ${filePath}: ${parseErr.message}`); } catch { /* noop */ }
      _sidecarCache.set(filePath, { mtime: stat.mtimeMs, value: fb });
      return fb;
    }
  }

  function readLineupsIndex() {
    return readJsonSidecarMemo(lineupsPath, (parsed) => {
      const events = parsed && parsed.events && typeof parsed.events === 'object' ? parsed.events : {};
      return enrichLineupsWithSofaTimes(events);
    }, {});
  }

  function readSofascoreEventTimes() {
    return readJsonSidecarMemo(sofaEventsPath, (parsed) => {
      const groups = parsed && parsed.events && typeof parsed.events === 'object'
        ? Object.values(parsed.events)
        : [];
      const rows = groups.flatMap((group) => Array.isArray(group) ? group : []);
      return new Map(rows.map((event) => [
        String(event?.id || '').replace(/^sofa_/, ''),
        { date: event?.date || null, name: event?.name || null }
      ]));
    }, new Map());
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
    return readJsonSidecarMemo(starPlayersPath, (parsed) =>
      parsed && parsed.teams && typeof parsed.teams === 'object' ? parsed.teams : {}, {});
  }

  function readWinamaxMarketsIndex() {
    return readJsonSidecarMemo(winamaxMarketsPath, (parsed) =>
      parsed && parsed.matches && typeof parsed.matches === 'object' ? parsed.matches : {}, {});
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
    return readJsonSidecarMemo(h2hPath, (parsed) =>
      parsed && parsed.events && typeof parsed.events === 'object' ? parsed.events : {}, {});
  }

  function readJsonSidecar(filePath, fallback = {}) {
    // Sprint 67 — utilise memoization + log corrompus
    return readJsonSidecarMemo(filePath, (parsed) =>
      parsed && typeof parsed === 'object' ? parsed : fallback, fallback);
  }

  function readHealthReport() {
    return readJsonSidecar(healthPath, {});
  }

  // Legacy path kept for safety (currently unreachable):
  function _readJsonSidecarLegacy(filePath, fallback = {}) {
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
      '1n2': 'Vainqueur du match',
      matchwinner: 'Vainqueur',
      teamtotal: 'Total équipe',
      basketballtotal: 'Total basket',
      baskettotal: 'Total basket',
      hockeytotal: 'Total buts',
      baseballtotal: 'Total runs',
      httotal: 'Total mi-temps',
      htou: 'Total mi-temps',
      halftimetotal: 'Total mi-temps',
      ht1n2: 'Vainqueur mi-temps',
      btts: 'Les deux équipes marquent',
      resultbtts: 'Résultat + les deux marquent',
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
    if (/^(ou|ou15|ou25|ou35|overunder|totalgoals)$/.test(compact)) return 'goals';
    if (/^(btts|les2equipes|lesdeuxequipes|lesdeuxquipes|bothteamstoscore)$/.test(compact)) return 'btts';
    if (/les.*quipe.*marque|both.*team.*score/.test(compact)) return 'btts';
    if (/^(scorer|buteur|playergoal|goalscorer)$/.test(compact)) return 'scorer';
    if (/^(ht1n2|ht_1n2|halftime1n2|mitempsvainqueur)$/.test(compact)) return 'halftime';
    return '';
  }

  function isSimpleUserMarket(row) {
    const group = simpleMarketGroup(row?.marketKey || row?.market);
    return Boolean(group && group !== 'halftime') && !isDrawSelection(row);
  }

  function isSimpleMarketCandidate(candidate) {
    const group = simpleMarketGroup(candidate?.market || candidate?.key || '');
    if (!group || group === 'halftime') return false;
    return !isDrawSelection({
      marketKey: candidate?.market || candidate?.key || '',
      market: candidate?.market || candidate?.key || '',
      label: candidate?.label || candidate?.pickLabel || candidate?.pickKey || candidate?.key || candidate?.side || '',
      selection: candidate?.selection || candidate?.side || candidate?.value || ''
    });
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

  function rankingEdgeValue(row) {
    const safe = Number(row?.safeEdge);
    const raw = Number(row?.edge);
    if (Number.isFinite(safe) && safe > 0) return safe;
    if (Number.isFinite(raw)) return raw;
    return Number.isFinite(safe) ? safe : 0;
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
      const edge = rankingEdgeValue(row);
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
    // Le cockpit standard reste volontairement simple : mi-temps reste expert.
    if (!market || market === 'halftime') return false;
    const edge = rankingEdgeValue(row);
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
    const orderedCandidates = candidates.filter(isSimpleMarketCandidate);
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
      const modelStake = stakeFor(win, probability, odd, bankroll);
      if (!(edge > 0) || !(modelStake > 0)) continue;
      rows.push({
        market,
        marketKey,
        label,
        odd,
        probability,
        edge,
        stake: 0,
        modelStake,
        status: 'watch',
        statusLabel: 'Alternative simple · lecture seulement',
        pickSource: 'runtime_market_candidate',
        isMarketAlternative: true,
        userActionBlocked: true,
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
    // Sprint 60 (fix cotes critique) : on utilise EN PRIORITÉ le bloc 1n2
    // résolu (canonique) qui correspond à la cote affichée sur la page
    // match Winamax. Le tableau `match_winner` brut peut contenir des
    // snapshots obsolètes ou des marchés "Vainqueur" alternatifs (Vainqueur
    // tournoi, Vainqueur Bo3, etc.) avec une cote complètement différente.
    const n12 = markets['1n2'] || {};
    const hasResolved1n2 = Number(n12.home) > 1 && Number(n12.away) > 1;
    push('home', n12.home, n12.home_name || teams.home);
    push('away', n12.away, n12.away_name || teams.away);
    if (!hasResolved1n2) {
      // Fallback seulement si 1n2 résolu indisponible : on accepte match_winner.
      const marketRows = Array.isArray(markets.match_winner) ? markets.match_winner : [];
      for (const row of marketRows) push(row?.side, row?.odd, row?.label, row?.source || 'winamax_detail');
    }
    const seen = new Map();
    for (const row of rows) {
      const key = row.side;
      // Sprint 60 (fix cotes critique) : on PRÉFÈRE la cote la plus HAUTE
      // (meilleure pour le parieur) en cas de doublon. Avant on prenait la
      // plus basse, ce qui causait l'affichage de cotes obsolètes plus
      // courtes que la vraie cote Winamax actuelle.
      if (!seen.has(key) || Number(row.odd) > Number(seen.get(key).odd)) seen.set(key, row);
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
    // La garantie Winamax "2 buts d'écart" transforme le marché Vainqueur :
    // une avance de deux buts peut payer le pari avant le score final. Le
    // boost doit donc peser plus qu'un simple bonus cosmétique, tout en
    // restant plafonné pour éviter de rendre tous les favoris jouables.
    const boost = Math.min(
      side === 'home' ? 0.125 : 0.100,
      leadTwoProbability * (side === 'home' ? 0.240 : 0.190)
    );
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

  function rivalryContextForRow(row) {
    const rivalry = row?.match?.rivalry
      || row?.match?.context?.rivalry
      || row?.match?.public_signals?.rivalry
      || row?.match?.context?.public_signals?.rivalry
      || null;
    if (!rivalry || rivalry.status !== 'confirmed') return null;
    const intensity = Math.max(0, Math.min(100, Number(rivalry.intensity || 0) || 0));
    return {
      ...rivalry,
      intensity,
      label: rivalry.label || 'Rivalité détectée',
      caution: intensity >= 65,
      severe: intensity >= 80
    };
  }

  function applyRivalryContext(row) {
    const rivalry = rivalryContextForRow(row);
    if (!rivalry) return row;
    const marketGroup = simpleMarketGroup(row?.marketKey || row?.market);
    const isWinner = marketGroup === 'winner';
    const odd = Number(row?.odd || 0);
    const beforeProbability = Number(row?.probability || 0) || 0;
    const pressurePenalty = isWinner
      ? (rivalry.severe ? 0.030 : rivalry.caution ? 0.018 : 0.010)
      : (rivalry.severe ? 0.008 : 0.004);
    const probability = beforeProbability > 0
      ? Math.max(0.05, Math.min(0.95, beforeProbability - pressurePenalty))
      : beforeProbability;
    const edge = odd > 1 && probability > 0 ? probability - (1 / odd) : Number(row?.edge || 0);
    const stakeFactor = isWinner ? (rivalry.severe ? 0.82 : 0.90) : (rivalry.severe ? 0.92 : 0.96);
    const driver = `rivalité ${Math.round(rivalry.intensity)}/100`;
    return {
      ...row,
      rivalryContext: {
        ...rivalry,
        modelImpact: isWinner
          ? 'prudence vainqueur : probabilité et mise réduites'
          : 'pression match : signal affiché, impact léger'
      },
      probability,
      edge,
      stake: Math.max(0, Number(row?.stake || 0) * stakeFactor),
      modelStake: Math.max(0, Number(row?.modelStake || 0) * stakeFactor),
      confidenceTrust: row?.confidenceTrust ? {
        ...row.confidenceTrust,
        score: Math.max(0, Number(row.confidenceTrust.score || 0) - (isWinner ? (rivalry.severe ? 5 : 3) : 1)),
        drivers: [...(row.confidenceTrust.drivers || []), driver]
      } : row?.confidenceTrust,
      contextGate: row?.contextGate ? {
        ...row.contextGate,
        warnings: [...new Set([...(row.contextGate.warnings || []), 'rivalry_pressure'])]
      } : row?.contextGate,
      reason: [
        row?.reason,
        `Rivalité détectée (${Math.round(rivalry.intensity)}/100) : pression plus forte, mise ${isWinner ? 'réduite' : 'surveillée'}.`
      ].filter(Boolean).join(' ')
    };
  }

  function sideCompetitor(match, side) {
    const competitors = Array.isArray(match?.competitors) ? match.competitors : [];
    if (side === 'home') return competitors.find((c) => c?.home_away === 'home') || competitors[0] || {};
    if (side === 'away') return competitors.find((c) => c?.home_away === 'away') || competitors[1] || {};
    return {};
  }

  function publicHistoryForSide(row, side) {
    const match = row?.match || {};
    const publicTeam = match?.public_signals?.teams?.[side]
      || match?.context?.public_signals?.teams?.[side]
      || {};
    const competitor = sideCompetitor(match, side);
    const contextTeam = match?.context?.teams?.[side] || {};
    const history = publicTeam?.history || competitor?.history_public || contextTeam?.history_public || {};
    if (!history || !['ok', 'partial'].includes(String(history.status || ''))) return null;
    return {
      ...history,
      side,
      score: Math.max(0, Math.min(100, Number(history.statureScore || 0) || 0))
    };
  }

  function historyContextForRow(row) {
    const home = publicHistoryForSide(row, 'home');
    const away = publicHistoryForSide(row, 'away');
    if (!home && !away) return null;
    const winnerSide = selectedWinnerSide(row);
    const selected = winnerSide === 'home' ? home : winnerSide === 'away' ? away : null;
    const opponent = winnerSide === 'home' ? away : winnerSide === 'away' ? home : null;
    const strongest = [home, away].filter(Boolean).sort((a, b) => b.score - a.score)[0] || null;
    const selectedGap = selected && opponent ? selected.score - opponent.score : 0;
    return {
      home,
      away,
      winnerSide,
      selected,
      opponent,
      strongest,
      selectedGap,
      hasStrongHistory: Boolean((selected || strongest)?.score >= 70),
      label: (selected || strongest)?.summary || ''
    };
  }

  function applyHistoricalContext(row) {
    const history = historyContextForRow(row);
    if (!history) return row;
    const marketGroup = simpleMarketGroup(row?.marketKey || row?.market);
    const isWinner = marketGroup === 'winner';
    const selected = history.selected;
    const strongest = history.strongest;
    const selectedScore = Number(selected?.score || 0);
    const strongestScore = Number(strongest?.score || 0);
    const scoreDelta = isWinner && selected ? (selectedScore >= 70 ? 2 : selectedScore >= 50 ? 1 : 0) : (strongestScore >= 70 ? 1 : 0);
    const weakAgainstHistory = isWinner && selected && history.opponent && history.selectedGap <= -25;
    const probabilityPenalty = weakAgainstHistory ? 0.008 : 0;
    const probability = probabilityPenalty && Number(row?.probability || 0) > 0
      ? Math.max(0.05, Number(row.probability) - probabilityPenalty)
      : row?.probability;
    const odd = Number(row?.odd || 0);
    const edge = probabilityPenalty && odd > 1 && Number(probability) > 0
      ? Number(probability) - (1 / odd)
      : row?.edge;
    const historyLabel = selected?.summary || strongest?.summary || 'historique public pris en compte';
    const warningCode = weakAgainstHistory ? 'historical_gap_against_pick' : null;
    return {
      ...row,
      probability,
      edge,
      stake: weakAgainstHistory ? Math.max(0, Number(row?.stake || 0) * 0.94) : row?.stake,
      modelStake: weakAgainstHistory ? Math.max(0, Number(row?.modelStake || 0) * 0.94) : row?.modelStake,
      historicalContext: {
        ...history,
        modelImpact: weakAgainstHistory
          ? 'prudence : l’adversaire a une stature historique nettement supérieure'
          : scoreDelta > 0
            ? 'confiance légère : expérience/palmarès public confirmé'
            : 'signal affiché sans bonus modèle'
      },
      confidenceTrust: row?.confidenceTrust ? {
        ...row.confidenceTrust,
        score: Math.max(0, Math.min(100, Number(row.confidenceTrust.score || 0) + scoreDelta - (weakAgainstHistory ? 2 : 0))),
        drivers: [...(row.confidenceTrust.drivers || []), scoreDelta ? 'historique/palmarès public' : 'historique public']
      } : row?.confidenceTrust,
      contextGate: row?.contextGate ? {
        ...row.contextGate,
        warnings: warningCode ? [...new Set([...(row.contextGate.warnings || []), warningCode])] : row.contextGate.warnings
      } : row?.contextGate,
      reason: [
        row?.reason,
        weakAgainstHistory
          ? `Historique public: prudence, l’adversaire a plus de stature (${historyLabel}).`
          : `Historique public pris en compte: ${historyLabel}.`
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
    // Sprint 49 — Tennis : aucun match nul possible donc on accepte des
    // favoris plus serrés (la cote 1.30-2.00 reste exploitable sans
    // partage de probabilité avec un draw).
    const tennisFavorite = /tennis/.test(sportKey) && favorite.odd >= 1.20 && favorite.odd <= 2.00 && (!challenger || gap >= 1.05);
    // Sprint 49 — Baseball : favoris MLB raisonnables (cotes typiquement
    // 1.40-2.20). Accepter ces fenêtres améliore la couverture nuit US.
    const baseballFavorite = /baseball/.test(sportKey) && favorite.odd >= 1.35 && favorite.odd <= 2.20 && (!challenger || gap >= 1.06);
    if (!(strongFavorite || clearMarketFavorite || widerMarketFavorite || footballTwoGoalCandidate || tennisFavorite || baseballFavorite)) return null;
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

  // Sprint 67 — Utilise structuredClone natif (Node 17+) qui est ~2-3x plus
  // rapide que JSON.parse(JSON.stringify(...)) et preserve les Date/Map/Set
  // sans crash. Fallback sur l'ancien comportement si structuredClone absent.
  function jsonClone(value, fallback = null) {
    if (value === undefined || value === null) return fallback;
    try {
      if (typeof structuredClone === 'function') return structuredClone(value);
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
      '1n2': 'Vainqueur du match',
      doublechance: 'Double chance',
      btts: 'Les deux équipes marquent',
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
      ou: 'Plus / Moins',
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
        reason: 'Marché lisible avec avantage positif : le single garde la variance sous contrôle.'
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

  function precisePositiveSegmentOverride(row) {
    const segment = row?.segmentValidation || {};
    const marketGroup = simpleMarketGroup(row?.marketKey || row?.market);
    const sample = Number(segment.sample || 0) || 0;
    const roi = Number(segment.roi);
    const rawEdge = Number(row?.edge || 0);
    const odd = Number(row?.odd || 0);
    const confidence = effectiveConfidence(row);
    const contextScore = Number(row?.contextQuality?.score ?? row?.match?.context?.quality?.score ?? 0);
    const sportKey = String(row?.sport || row?.match?.sport || '').toLowerCase();
    const positiveSegment = sample >= 50 &&
      Number.isFinite(roi) &&
      roi >= 0.05 &&
      (segment.status === 'validated' || segment.tone === 'warm');
    const simpleFootballGoals = /football|soccer/.test(sportKey) &&
      (marketGroup === 'goals' || marketGroup === 'btts');
    const applies = Boolean(positiveSegment &&
      simpleFootballGoals &&
      rawEdge >= 0.06 &&
      confidence >= 0.70 &&
      contextScore >= 65 &&
      odd >= 1.35 &&
      odd <= 2.20);
    return {
      applies,
      sample,
      roi: Number.isFinite(roi) ? roi : null,
      marketGroup,
      label: applies
        ? `segment précis positif (${Math.round(roi * 100)}% ROI sur ${sample} paris)`
      : ''
    };
  }

  function actionableSimpleMarketAlternative(row, assessment = null) {
    if (!row?.isMarketAlternative) return false;
    const group = simpleMarketGroup(row?.marketKey || row?.market);
    if (!['winner', 'goals', 'btts'].includes(group)) return false;
    const primaryGroup = simpleMarketGroup(row?.primaryMarket || '');
    if (primaryGroup && primaryGroup === group) return false;
    const source = String(row?.marketCandidate?.source || row?.pickSource || '').toLowerCase();
    if (!/winamax_exact|winamax_detail|winamax_market/.test(source)) return false;
    if (row?.limitedConfidence) return false;
    const safe = assessment || row?.safeAssessment || {};
    if (safe.status !== 'reliable' && safe.reliable !== true) return false;
    const odd = Number(row?.odd || 0);
    const edge = Number(safe.conservativeEdge ?? row?.safeEdge ?? row?.edge ?? 0);
    const confidence = Number(safe.confidence ?? effectiveConfidence(row));
    const contextScore = Number(row?.contextQuality?.score ?? row?.match?.context?.quality?.score ?? 0);
    const sample = Number(safe.sample ?? row?.segmentValidation?.sample ?? 0) || 0;
    const roi = Number(safe.roi ?? row?.segmentValidation?.roi);
    const precise = precisePositiveSegmentOverride(row);
    return odd >= 1.35 &&
      odd <= 2.20 &&
      edge >= 0.05 &&
      confidence >= 0.70 &&
      contextScore >= 65 &&
      !row?.signalConflict?.active &&
      !row?.oddsGuardrail?.applied &&
      (precise.applies || (sample >= 50 && Number.isFinite(roi) && roi >= 0.05));
  }

  function safeAssessmentForRow(row) {
    const rawEdge = Number(row?.edge || 0);
    const edgeInfo = conservativeEdge(row);
    const edge = edgeInfo.value;
    const odd = Number(row?.odd || 0);
    const confidence = effectiveConfidence(row);
    const segmentSampleRaw = Number(row?.segmentValidation?.sample);
    const calibrationSample = Number(row?.calibration?.sample ?? 0) || 0;
    const sample = Number.isFinite(segmentSampleRaw) ? segmentSampleRaw : calibrationSample;
    const segmentRoiRaw = Number(row?.segmentValidation?.roi);
    const calibrationRoi = Number(row?.calibration?.roi ?? 0);
    const roi = Number.isFinite(segmentRoiRaw) ? segmentRoiRaw : calibrationRoi;
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
    if (row?.contextGate?.gate === 'skip') {
      return {
        status: 'reject',
        label: 'Écarté',
        reliable: false,
        displayable: false,
        conservativeEdge: 0,
        rawEdge,
        edgeCapped: edgeInfo.capped,
        confidence,
        sample,
        roi: Number.isFinite(roi) ? roi : null,
        policy: null,
        reliableRule: null,
        reasons: [row.contextGate.label || 'Contexte insuffisant'],
        warnings
      };
    }

    const calibrationContextSample = Number(row?.calibration?.context?.sample ?? 0) || 0;
    const calibrationContextRoi = Number(row?.calibration?.context?.roi ?? 0);
    const calibrationEdgeSample = Number(row?.calibration?.edgeBucket?.sample ?? 0) || 0;
    const calibrationEdgeRoi = Number(row?.calibration?.edgeBucket?.roi ?? 0);
    const marketGroup = simpleMarketGroup(row?.marketKey || row?.market);
    const robustMarketCold = marketGroup !== 'winner' && calibrationSample >= 40 && Number.isFinite(calibrationRoi) && calibrationRoi < -0.08;
    const edgeBucketCold = calibrationEdgeSample >= 80 && Number.isFinite(calibrationEdgeRoi) && calibrationEdgeRoi < -0.12;
    const contextBucketPositive = calibrationContextSample >= 40 && Number.isFinite(calibrationContextRoi) && calibrationContextRoi > 0.02;
    const contextScore = Number(quality?.score ?? row?.contextQuality?.score ?? 0);
    const strongContextDerivedOverride = ['goals', 'btts'].includes(marketGroup)
      && contextScore >= 90
      && rawEdge >= 0.08
      && confidence >= 0.70
      && odd >= 1.30
      && odd <= 2.10
      && (!Number.isFinite(calibrationEdgeRoi) || calibrationEdgeRoi > -0.16);
    const preciseSegmentOverride = precisePositiveSegmentOverride(row);
    const coldMarketOverride = preciseSegmentOverride.applies || (contextBucketPositive && contextScore >= 90 && (
      (rawEdge >= 0.06 && confidence >= 0.65) ||
      (rawEdge >= 0.03 && confidence >= 0.72 && odd <= 1.75)
    )) || strongContextDerivedOverride;
    const robustMarketBlock = robustMarketCold && !coldMarketOverride;
    const edgeProfileBlock = edgeBucketCold && !coldMarketOverride;
    const segmentNegative = sample >= 15 && Number.isFinite(roi) && roi < 0;
    const baseZone = rawEdge >= 0.01 && odd >= 1.30 && odd <= 6.00 && !row?.signalConflict?.active && !row?.oddsGuardrail?.applied && !hardCriticalMissing.length && !robustMarketBlock && !edgeProfileBlock;
    const ruleA = baseZone && edge >= edgeMin && odd <= oddMax && confidence >= confidenceMin && !segmentNegative;
    const ruleB = baseZone && sample < 5 && edge >= 0.05 && odd <= 5.00 && confidence >= 0.65;
    const ruleC = baseZone && sample >= 5 && sample < 15 && edge >= 0.04 && odd <= 5.00 && confidence >= 0.60;
    const reliableRule = ruleA ? 'A' : ruleB ? 'B' : ruleC ? 'C' : null;

    // Sprint 66 — Discipline modele sur marches derives.
    // Le Platt boost + offsets ligues + bins isotonic de prob_calibration
    // sont calibres sur 1n2 uniquement (n=1037 bins foot only). Les marches
    // OU/BTTS/scorer sortent du Poisson xG ou heuristiques sport-specific
    // sans calibration propre. Backtest_strategies montre safe_blend
    // (qui inclut OU 2.5) a -19% ROI sur n=487.
    //
    // Regles :
    //   1n2 : aberrantEdge a 22pt (zone Platt OK)
    //   marche derive : aberrantEdge a 15pt (Poisson xG souvent surconfiant)
    //   marche derive sample>=5 et roi<0 : refuser Fiable (segment court mais perdant)
    //   sample=0 (data absente) : accepter Fiable avec warning (pas une preuve negative)
    // Sprint 82 C2+C3 — Discipline modele renforcee :
    //   OU foot : seuil aberrant 13pt (bin 0.50-0.60 surestime de 18pt)
    //   Hors-foot sans backtest sport-marche (n<30) : reliable=false (watch only)
    const marketKey = String(row?.marketKey || row?.market || '').toLowerCase();
    const isOneN2 = marketKey === '1n2' || marketKey === 'matchwinner' || marketKey === 'winner' || marketKey === 'moneyline';
    const isOuMarket = marketKey === 'ou' || marketKey === 'ou15' || marketKey === 'ou25' || marketKey === 'ou35' || marketKey === 'httotal' || marketKey === 'htou' || marketKey === 'hockeytotal' || marketKey === 'basketballtotal' || marketKey === 'baseballtotal' || marketKey === 'baskettotal';
    const aberrantThreshold = isOneN2 ? 0.22 : isOuMarket ? 0.13 : 0.15;
    const aberrantEdge = rawEdge >= aberrantThreshold;
    const derivedShortNegative = !isOneN2 && sample >= 5 && sample < 15 && Number.isFinite(roi) && roi < 0;
    // Sprint 82 C3 — Sport non-foot calibration aveugle ?
    // Seul les marches DERIVES (OU/BTTS/scorer) sont bloques hors-foot.
    // 1n2 reste autorise hors-foot car le modele 1n2 generaliste est universel.
    const sportKey = String(row?.sport || row?.match?.sport || '').toLowerCase();
    const isFootball = /football|soccer/.test(sportKey);
    const sportMarketSample = Number(row?.calibration?.sportMarketSample ?? row?.segmentValidation?.sportMarketSample ?? 0);
    const nonFootCalibrationBlind = !isFootball && !isOneN2 && sportMarketSample < 30;
    const rivalry = rivalryContextForRow(row);
    const rivalryMarginalWinnerBlock = Boolean(rivalry?.caution)
      && isOneN2
      && isFootball
      && !(Number(row?.winamaxTwoGoalRule?.leadTwoProbability || 0) >= 0.42)
      && confidence < (rivalry.severe ? 0.72 : 0.68)
      && edge < (rivalry.severe ? 0.055 : 0.045);
    if (!(rawEdge >= 0.01)) reasons.push('edge < +1pt');
    if (aberrantEdge) reasons.push(`edge brut +${Math.round(rawEdge * 100)}pt aberrant (modele surconfiant)`);
    if (robustMarketBlock) reasons.push(`marché froid robuste (ROI ${Math.round(calibrationRoi * 100)}% sur ${calibrationSample} paris)`);
    if (edgeProfileBlock) reasons.push(`profil d'avantage froid (ROI ${Math.round(calibrationEdgeRoi * 100)}% sur ${calibrationEdgeSample} paris)`);
    if (derivedShortNegative) reasons.push(`marche ${marketKey} segment court perdant (n=${sample}, ROI ${Math.round(roi * 100)}%)`);
    if (nonFootCalibrationBlind) reasons.push(`calibration ${sportKey || 'sport'} limitee (${sportMarketSample}/30 paris settled)`);
    if (rivalryMarginalWinnerBlock) reasons.push(`rivalité/derby : Vainqueur trop marginal (${Math.round(rivalry.intensity)}% tension)`);
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
    if (preciseSegmentOverride.applies) warnings.push(preciseSegmentOverride.label);
    else if (coldMarketOverride) warnings.push('marché froid compensé par contexte fort');
    if (rivalry?.caution) warnings.push(`rivalité/derby ${Math.round(rivalry.intensity)}% : variance plus élevée`);
    if (policy?.direction === 'boost') warnings.push(`segment gagnant : filtre assoupli (${policy.reason})`);
    if (policy?.direction === 'harden') warnings.push(`segment froid : filtre durci (${policy.reason})`);

    const hasTwoGoalSafety = Boolean(row?.winamaxTwoGoalRule?.eligible);
    const twoGoalPct = Number(row?.winamaxTwoGoalRule?.leadTwoProbability || 0);
    const severeTwoGoalSegmentLoss = sample >= 80 && Number.isFinite(roi) && roi < -0.16;
    const twoGoalContextOverride = hasTwoGoalSafety
      && isOneN2
      && isFootball
      && rawEdge >= 0.015
      && edge >= 0.015
      && odd >= 1.25
      && odd <= 3.00
      && confidence >= 0.55
      && contextScore >= 75
      && !severeTwoGoalSegmentLoss
      && !row?.signalConflict?.active
      && !row?.oddsGuardrail?.applied
      && !hardCriticalMissing.length
      && (
        twoGoalPct >= 0.42 ||
        (twoGoalPct >= 0.35 && odd <= 1.90 && confidence >= 0.64 && contextScore >= 80)
      )
      && (
        !segmentNegative ||
        (twoGoalPct >= 0.45 && rawEdge >= 0.02 && contextScore >= 85) ||
        (twoGoalPct >= 0.35 && odd <= 1.90 && confidence >= 0.64 && contextScore >= 80)
      );
    if (twoGoalContextOverride) {
      return {
        status: 'reliable',
        label: 'Fiable',
        reliable: true,
        displayable: true,
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
        reliableRule: '2-0-context',
        reasons: [],
        warnings: [`Filet 2-0 Winamax ${Math.round(twoGoalPct * 100)}%`, 'Vainqueur promu prudemment par contexte fort', ...warnings].slice(0, 4)
      };
    }

    if (row?.limitedConfidence) {
      const limitedHasTwoGoalSafety = hasTwoGoalSafety;
      const severeLimitedTwoGoalSegmentLoss = sample >= 30 && Number.isFinite(roi) && roi < -0.08;
      const twoGoalWinnerReliable = limitedHasTwoGoalSafety
        && rawEdge >= 0.003
        && edge >= 0.003
        && odd >= 1.25
        && odd <= 4.00
        && confidence >= 0.66
        && twoGoalPct >= 0.55
        && !severeLimitedTwoGoalSegmentLoss
        && !row?.signalConflict?.active
        && !row?.oddsGuardrail?.applied
        && !hardCriticalMissing.length;
      if (twoGoalWinnerReliable) {
        return {
          status: 'reliable',
          label: 'Fiable',
          reliable: true,
          displayable: true,
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
          reliableRule: '2-0',
          reasons: [],
          warnings: [`Filet 2-0 Winamax ${Math.round(twoGoalPct * 100)}%`, ...warnings].slice(0, 4)
        };
      }
      const twoGoalWinnerSoftReliable = limitedHasTwoGoalSafety
        && isOneN2
        && isFootball
        && rawEdge >= 0.012
        && edge >= 0.012
        && odd >= 1.25
        && odd <= 1.70
        && confidence >= 0.70
        && twoGoalPct >= 0.42
        && contextScore >= 60
        && !severeLimitedTwoGoalSegmentLoss
        && (!Number.isFinite(roi) || sample < 15 || roi >= -0.03)
        && !row?.signalConflict?.active
        && !row?.oddsGuardrail?.applied
        && !hardCriticalMissing.length;
      if (twoGoalWinnerSoftReliable) {
        return {
          status: 'reliable',
          label: 'Fiable',
          reliable: true,
          displayable: true,
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
          reliableRule: '2-0-prudent',
          reasons: [],
          warnings: [`Filet 2-0 Winamax ${Math.round(twoGoalPct * 100)}%`, 'Mise prudente : avantage court mais contexte fort', ...warnings].slice(0, 4)
        };
      }
      // Une ligne cote-based reste une ligne "à surveiller" hors filet
      // 2-0 Winamax. Même si le segment historique est bon, on ne la rend
      // pas actionnable tant que le dossier match reste en confiance limitée.
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

    // Sprint 66+82 : Fiable durci.
    // Refuse si edge aberrant (>22pt 1n2, >13pt OU, >15pt autre derive),
    // ou marche derive avec segment court perdant (sample 5-14, roi<0),
    // ou sport non-foot sans backtest sport-marche (n<30).
    const reliable = Boolean(reliableRule)
      && edge <= 0.20
      && !aberrantEdge
      && !derivedShortNegative
      && !nonFootCalibrationBlind
      && !rivalryMarginalWinnerBlock;
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
    const actionableAlternative = actionableSimpleMarketAlternative(row, assessment);
    let nextDecision = row.decisionCenter || {};
    let nextStake = row.stake;
    let status = row.status;
    let statusLabel = row.statusLabel;
    const profitGuardReasons = [
      row?.isMarketAlternative && !actionableAlternative ? 'Alternative marché : lecture seulement' : null,
      row?.marketTiming?.guardApplied ? (row.marketTiming.warnings || [])[0] || 'Marché froid au backtest' : null,
      row?.signalConflict?.guardApplied ? row.signalConflict.label || 'Conflit signaux marché/contexte' : null,
      row?.oddsGuardrail?.applied ? row.oddsGuardrail.label || 'Cote haute non confirmée' : null,
      row?.contextGate?.agentEligible === false ? row.contextGate.label || 'Contexte non éligible agent' : null
    ].filter(Boolean);
    const profitGuardBlocked = profitGuardReasons.length > 0;
    if (assessment.status === 'reliable' && !profitGuardBlocked && !nextDecision.canBet && Number(row?.modelStake ?? row?.stake ?? 0) > 0 && row?.status !== 'skip') {
      const promotedStake = Number(row?.modelStake ?? row?.stake ?? 0) || 0;
      nextDecision = {
        ...nextDecision,
        status: 'ready',
        canBet: true,
        stake: promotedStake,
        stakeDisplay: null,
        mainReason: Array.isArray(nextDecision.globalGates) && nextDecision.globalGates.length
          ? 'Pari validé, contrôle global à suivre'
          : 'Tous les garde-fous sont verts',
        nextAction: 'Miser',
        blockingGates: [],
        riskTone: Array.isArray(nextDecision.globalGates) && nextDecision.globalGates.length ? 'watch' : 'ok'
      };
      nextStake = promotedStake;
    }
    if (assessment.status === 'reliable' && profitGuardBlocked) {
      nextDecision = {
        ...nextDecision,
        status: 'watch',
        canBet: false,
        stake: 0,
        stakeDisplay: '0 €',
        mainReason: profitGuardReasons[0] || nextDecision.mainReason || 'Garde-fou profit réel',
        nextAction: 'Surveiller',
        blockingGates: [
          ...(nextDecision.blockingGates || []),
          { key: 'profit_guard_v5', label: profitGuardReasons[0] || 'Garde-fou profit réel', tone: 'warn' }
        ],
        riskTone: 'watch'
      };
      nextStake = 0;
      if (status !== 'skip') {
        status = 'watch';
        statusLabel = 'À surveiller · profit réel';
      }
    }
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
    if (assessment.status !== 'reliable' && !nextDecision.canBet && (status === 'bet' || Number(nextStake || 0) > 0 || Number(row?.modelStake || 0) > 0)) {
      nextDecision = {
        ...nextDecision,
        status: assessment.status === 'watch' ? 'watch' : 'skip',
        canBet: false,
        stake: 0,
        stakeDisplay: '0 €',
        mainReason: nextDecision.mainReason || assessment.reasons[0] || (assessment.status === 'watch' ? 'À surveiller par prudence' : 'Pick écarté par filtre safe'),
        nextAction: assessment.status === 'watch' ? 'Surveiller' : 'Écarter',
        riskTone: assessment.status === 'watch' ? 'watch' : 'warn'
      };
      nextStake = 0;
      status = assessment.status === 'watch' ? 'watch' : 'skip';
      statusLabel = assessment.status === 'watch' ? 'À surveiller · filtre safe' : 'Écarté par filtre safe';
    }
    return {
      ...row,
      stake: nextStake,
      modelStake: assessment.status === 'reliable' ? row.modelStake : 0,
      status,
      statusLabel,
      decisionCenter: nextDecision,
      safeAssessment: assessment,
      profitGuardV5: {
        blocked: profitGuardBlocked,
        reasons: profitGuardReasons,
        policy: 'Ne jamais transformer un segment froid ou un contexte bloqué en bouton Je mise, même si le filtre safe voit un signal.'
      },
      safeEdge: assessment.conservativeEdge,
      safeConfidence: assessment.confidence
    };
  }

  function capitalProtectionCheck(row, bankroll) {
    const odd = Number(row?.odd || 0);
    const edge = Number(row?.safeEdge ?? row?.edge ?? 0) || 0;
    const confidence = Number(row?.safeConfidence ?? row?.probability ?? 0) || 0;
    const contextScore = Number(row?.contextQuality?.score ?? row?.match?.context?.quality?.score ?? NaN);
    const sample = Number(row?.safeAssessment?.sample ?? row?.segmentValidation?.sample ?? row?.calibration?.sample ?? 0) || 0;
    const roi = Number(row?.safeAssessment?.roi ?? row?.segmentValidation?.roi ?? row?.calibration?.roi);
    const group = simpleMarketGroup(row?.marketKey || row?.market || '');
    const marketKey = canonicalMarketKey(row?.marketKey || row?.market || '');
    const reasons = [];
    const isWinner = group === 'winner';
    const isScorer = group === 'scorer';
    const isGoals = group === 'goals' || group === 'btts';
    const twoGoalStrong = Boolean(String(row?.safeAssessment?.reliableRule || '').startsWith('2-0') &&
      row?.winamaxTwoGoalRule?.eligible &&
      Number(row?.winamaxTwoGoalRule?.leadTwoProbability || 0) >= 0.40);
    if (!group) reasons.push('marché non standard');
    if (/dnb|drawnobet|teamtotal|httotal|htou|halftime|mitemps|exact|score|card|corner|handicap|asian/i.test(marketKey)) {
      reasons.push('marché trop risqué après pertes');
    }
    if (!(odd >= 1.25 && odd <= (isScorer ? 3.80 : 3.40))) {
      reasons.push(`cote hors zone récupération @${odd ? odd.toFixed(2) : '?'}`);
    }
    if (edge < 0.03) reasons.push(`edge prudent trop faible (+${Math.round(edge * 100)}pt)`);
    if (confidence < 0.64) reasons.push(`confiance trop courte (${Math.round(confidence * 100)}%)`);
    if (Number.isFinite(contextScore) && contextScore < (isWinner || isGoals ? 62 : 55)) {
      reasons.push(`contexte trop faible (${Math.round(contextScore)}/100)`);
    }
    if (sample >= 8 && Number.isFinite(roi) && roi < 0) {
      reasons.push(`segment historique perdant (${Math.round(roi * 100)}% ROI)`);
    }
    if (isWinner && odd >= 2.55 && !twoGoalStrong) {
      reasons.push('vainqueur cote haute sans filet 2-0 solide');
    }
    if (isGoals && odd >= 2.20 && confidence < 0.70) {
      reasons.push('marché buts trop serré pour récupération');
    }
    if (row?.limitedConfidence && !twoGoalStrong) {
      reasons.push('confiance limitée : lecture seulement');
    }
    const bank = Math.max(1, Number(bankroll || 50) || 50);
    return {
      schema: 'paris-sportif.capital_protection.v1',
      blocked: reasons.length > 0,
      reasons: [...new Set(reasons)].slice(0, 5),
      maxStakePct: 0.01,
      maxStake: Number(Math.max(0.10, Math.min(1.00, bank * 0.01)).toFixed(2)),
      policy: 'Après perte réelle, seul un pari court, sourcé et très robuste peut afficher Je mise.'
    };
  }

  function applyCapitalProtectionLayer(row, bankroll) {
    const protection = capitalProtectionCheck(row, bankroll);
    const decision = row?.decisionCenter || {};
    const currentlyActionable = Boolean(decision.canBet || row?.status === 'bet' || Number(row?.stake || 0) > 0);
    if (!currentlyActionable) {
      return { ...row, capitalProtectionV1: protection };
    }
    if (protection.blocked) {
      const mainReason = `Protection bankroll : ${protection.reasons[0] || 'pari trop risqué'}`;
      return {
        ...row,
        stake: 0,
        modelStake: 0,
        status: row.status === 'skip' ? 'skip' : 'watch',
        statusLabel: 'À surveiller · protection bankroll',
        capitalProtectionV1: protection,
        decisionCenter: {
          ...decision,
          status: 'watch',
          canBet: false,
          stake: 0,
          stakeDisplay: '0 €',
          mainReason,
          nextAction: 'Pause',
          blockingGates: [
            ...(Array.isArray(decision.blockingGates) ? decision.blockingGates : []),
            { key: 'capital_protection', label: mainReason, tone: 'danger' }
          ],
          riskTone: 'warn'
        },
        safeAssessment: row.safeAssessment ? {
          ...row.safeAssessment,
          warnings: [...new Set([...(row.safeAssessment.warnings || []), mainReason])].slice(0, 5)
        } : row.safeAssessment
      };
    }
    const currentStake = Number(decision.stake ?? row?.stake ?? 0) || 0;
    const protectedStake = currentStake > 0 ? Number(Math.min(currentStake, protection.maxStake).toFixed(2)) : 0;
    if (!(protectedStake > 0) || protectedStake === currentStake) {
      return { ...row, capitalProtectionV1: protection };
    }
    return {
      ...row,
      stake: protectedStake,
      modelStake: Math.min(Number(row?.modelStake || protectedStake) || protectedStake, protectedStake),
      statusLabel: '✓ Fiable · mise protection',
      capitalProtectionV1: {
        ...protection,
        stakeCapped: true,
        beforeStake: currentStake,
        afterStake: protectedStake
      },
      decisionCenter: {
        ...decision,
        stake: protectedStake,
        mainReason: 'Pari validé en mode récupération : mise plafonnée',
        blockingGates: Array.isArray(decision.blockingGates) ? decision.blockingGates : []
      }
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
      if (!row || row.status === 'skip' || !(row.odd > 1)) continue;
      const group = simpleMarketGroup(row.marketKey || row.market);
      const family = group === 'winner'
        ? '1n2'
        : group === 'goals'
          ? 'ou'
          : group === 'scorer'
            ? 'players'
            : group || winamaxMarketFamily(row.marketKey || row.market);
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
    const preciseSegmentOverride = precisePositiveSegmentOverride(row);
    if (tone === 'cold' && preciseSegmentOverride.applies) {
      tone = 'tracked';
      warnings.push(preciseSegmentOverride.label);
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

  function criticalGateForReport(report, data = null) {
    const summary = report && report.schema ? report.summary || {} : {};
    const reportTs = Date.parse(report?.generated_at || report?.generatedAt || '');
    const dataTs = Date.parse(data?.generated_at || data?.generatedAt || '');
    const stale = Number.isFinite(reportTs) && Number.isFinite(dataTs) && reportTs < dataTs - 5 * 60 * 1000;
    const blocked = !stale && Boolean(summary.blocks_bet || Number(summary.critical || 0) > 0);
    return {
      blocked,
      stale,
      issues: Number(summary.issues || 0),
      critical: stale ? 0 : Number(summary.critical || 0),
      label: stale
        ? 'Ancien diagnostic critique ignoré'
        : blocked ? (summary.first || 'État critique à corriger') : 'Aucun état critique bloquant'
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
    if (!(Number(row.edge || 0) > 0)) blockingGates.push({ key: 'edge', label: 'Avantage insuffisant', tone: 'danger' });
    if (!(modelStake > 0 || currentStake > 0)) blockingGates.push({ key: 'kelly', label: 'Mise non recommandée', tone: 'warn' });
    if (row.status === 'skip') blockingGates.push({ key: 'model', label: row.statusLabel || 'Skip modèle', tone: 'danger' });
    if ((row.contextGate?.agentEligible === false || hasCriticalSignals) && !contextRelease) {
      const rawContextLabel = row.contextGate?.label || (hardCriticalSignals.length ? 'Signal critique manquant' : 'Contexte insuffisant');
      const contextLabel = /contexte exploitable/i.test(String(rawContextLabel))
        ? 'Contexte à rechecker'
        : rawContextLabel;
      blockingGates.push({
        key: 'context',
        label: contextLabel,
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
    const hasGlobalCaution = globalGates.length > 0;
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
      ? (hasGlobalCaution
        ? 'Pari validé, contrôle global à suivre'
        : softAvailabilityRelease
          ? 'Signal fort malgré disponibilités incomplètes'
          : proxyContextRelease
            ? 'Winamax OK · contexte proxy suffisant'
            : 'Tous les garde-fous sont verts')
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
      riskTone: canBet ? (hasGlobalCaution ? 'watch' : 'ok') : status === 'repair' ? 'danger' : status === 'watch' ? 'watch' : 'warn'
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
    const capitalBlocked = all.filter((row) => row?.capitalProtectionV1?.blocked).length;
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
        capital_protection: capitalBlocked,
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
    const maxDashboardRows = 30;
    const maxPerSport = Math.max(3, Math.ceil(maxDashboardRows * 0.30));
    const maxPerMarket = Math.max(5, Math.ceil(maxDashboardRows * 0.35));
    const maxPerLeague = Math.max(2, Math.ceil(maxDashboardRows * 0.20));
    const simplePicks = (Array.isArray(picks) ? picks : [])
      .filter(isSimpleUserMarket)
      .filter((row) => row?.contextGate?.gate !== 'skip');
    const sourcePicks = simplePicks.length ? simplePicks : [];
    const rolling24 = rollingWindowRows(sourcePicks, 24);
    const target24 = rolling24.length >= 30 ? 30 : rolling24.length >= 25 ? 25 : rolling24.length >= 18 ? 18 : rolling24.length >= 12 ? 12 : Math.min(8, rolling24.length);
    const rank = (pick) => [
      pick?.decisionCenter?.canBet ? 1 : 0,
      pick?.safeAssessment?.reliable ? 1 : 0,
      pick?.decisionCenter?.status === 'ready' ? 1 : 0,
      rankingEdgeValue(pick),
      Number(pick?.priorityScore || 0),
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
    const sportDiversityRows = [];
    const sportsAlreadySeen = new Set();
    for (const row of sortRows(sourcePicks.filter(isDashboardDisplayCandidate))) {
      const key = sportKey(row);
      if (!key || key === 'sport' || sportsAlreadySeen.has(key)) continue;
      sportsAlreadySeen.add(key);
      sportDiversityRows.push(row);
    }
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
    const todayVisibleTarget = Math.min(24, sortedTodayDisplayable.length);
    if (todayReadyTarget > 0) {
      addFinalRows(sortedTodayReady, todayReadyTarget, { enforceMatchCap: true });
      if (finalRows.length < todayReadyTarget) {
        todayCapRelaxed = true;
        addFinalRows(sortedTodayReady, todayReadyTarget, { enforceMatchCap: false, relaxSport: true, relaxLeague: true });
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
    if (sportDiversityRows.length) {
      addFinalRows(sportDiversityRows, Math.min(maxDashboardRows, finalRows.length + sportDiversityRows.length), {
        matchCap: maxPerMatch,
        relaxSport: true,
        relaxLeague: true,
        relaxMarket: true
      });
    }
    if (winnerRows.length) {
      // Quota Vainqueurs renforcé : cible 50% du cockpit standard pour
      // ne plus avoir l'impression de "ne miser que sur des nombres de buts".
      // L'utilisateur a explicitement demandé plus de Vainqueurs.
      const winnerTarget = Math.min(winnerRows.length, Math.max(10, Math.ceil(maxDashboardRows * 0.50)));
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
          matchCap: maxPerMatch,
          relaxSport: true,
          relaxLeague: true,
          relaxMarket: true
        });
      }
    }
    if (todayVisibleTarget > 0 && finalRows.filter((row) => dayKeyParis(row.start) === todayKey).length < todayVisibleTarget) {
      // Sprint 86 : les lignes "Vainqueur" et "Buteur" doivent passer
      // avant le remplissage général du jour. Sinon les Plus/Moins occupent
      // les 24 premières places et l'accueil donne une fausse impression de
      // monotonie.
      addFinalRows(sortedTodayDisplayable, todayVisibleTarget, { enforceMatchCap: true });
      if (finalRows.filter((row) => dayKeyParis(row.start) === todayKey).length < todayVisibleTarget) {
        todayCapRelaxed = true;
        addFinalRows(sortedTodayDisplayable, todayVisibleTarget, { matchCap: maxPerMatch, relaxSport: true, relaxLeague: true });
      }
    }
    addFinalRows(sortedRollingReady, Math.max(rollingReadyTarget, Math.min(target24, sortedRollingReady.length)));
    if (rollingWindowRows(finalRows, 24).length < rollingReadyTarget) {
      addFinalRows(rollingReadyPool, rollingReadyTarget, { enforceMatchCap: true });
    }
    addFinalRows(sortedOrdered, maxDashboardRows, { matchCap: maxPerMatch });
    if (finalRows.length < Math.min(maxDashboardRows, sourcePicks.length)) {
      diversityCapRelaxed = true;
      addFinalRows(sortedOrdered, maxDashboardRows, { matchCap: maxPerMatch, relaxSport: true, relaxLeague: true });
      addFinalRows(sortRows(sourcePicks), maxDashboardRows, { matchCap: maxPerMatch, relaxSport: true, relaxLeague: true });
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
      const positiveSimplePassingFilters = passingFilters.filter((row) => isSimpleUserMarket(row) && Number(row?.safeEdge ?? row?.edge ?? 0) >= 0.01);
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
        positiveSimplePassingFilters: positiveSimplePassingFilters.length,
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
    add(windowPicks, 'positive', (row) => Number(row?.safeEdge ?? row?.edge ?? 0) >= 0.01);
    add(windowPicks, 'reliable', (row) => row?.safeAssessment?.reliable === true);
    add(windowDashboard, 'displayed');
    add(windowDashboard, 'ready', (row) => row?.decisionCenter?.canBet === true);
    const total = (field) => buckets.reduce((sum, bucket) => sum + Number(bucket[field] || 0), 0);
    const nightBucket = bucketMap.get('00-06') || {};
    return {
      schema: 'paris-sportif.coverage_24h.v1',
      generatedAt: new Date().toISOString(),
      summary: {
        events: windowEvents.length,
        bookable: windowEvents.filter((event) => event?.winamax?.available === true).length,
        predictable: windowMatches.length,
        positive: windowPicks.filter((row) => Number(row?.safeEdge ?? row?.edge ?? 0) >= 0.01).length,
        displayed: windowDashboard.length,
        reliable: total('reliable'),
        ready: total('ready'),
        nightEvents: Number(nightBucket.events || 0),
        nightBookable: Number(nightBucket.bookable || 0),
        nightPredictable: Number(nightBucket.predictable || 0),
        nightPositive: Number(nightBucket.positive || 0),
        nightReliable: Number(nightBucket.reliable || 0),
        nightReady: Number(nightBucket.ready || 0),
        nightDisplayed: Number(nightBucket.displayed || 0),
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

  function sourceHealthStatus(source) {
    const status = String(source?.status || 'unknown').toLowerCase();
    if (/critical|fail|error|ko/.test(status)) return 'critical';
    if (/warn|stale|old|quarantine/.test(status)) return 'warning';
    if (/ok|ready|present/.test(status)) return 'ok';
    return status || 'unknown';
  }

  function buildSourceHealthV5(report = {}, health = {}) {
    const sourceRows = Array.isArray(report.sources) ? report.sources : [];
    const healthSources = health && typeof health.sources === 'object' ? health.sources : {};
    const bySource = new Map();
    for (const source of sourceRows) {
      const key = String(source?.source || source?.key || '').trim();
      if (!key) continue;
      bySource.set(key, source);
    }
    for (const [key, value] of Object.entries(healthSources)) {
      if (!sourceRows.length || bySource.has(key)) {
        bySource.set(key, { source: key, ...(bySource.get(key) || {}), ...(value || {}) });
      }
    }
    const sources = [...bySource.entries()].map(([key, source]) => {
      const rawStatus = sourceHealthStatus(source);
      const lastError = source?.lastError || source?.last_error || source?.error || null;
      const age = source?.age_min ?? source?.ageMinutes ?? source?.age ?? source?.last_age_min ?? null;
      const coverage = source?.coverage ?? source?.coverage_pct ?? source?.score ?? null;
      const note = cleanLabel(source?.note || source?.action || source?.status_detail || '', '');
      return {
        source: key,
        status: rawStatus,
        age,
        ttl: source?.ttl_min ?? source?.ttl ?? null,
        coverage,
        lastError,
        preservedSnapshot: /retained|preserved|snapshot|cache/i.test(String(note || source?.status || '')),
        blocksPick: rawStatus === 'critical' && /winamax|lineup|injur|context|odds/i.test(key),
        note
      };
    }).sort((a, b) => {
      const order = { critical: 0, warning: 1, unknown: 2, ok: 3 };
      return (order[a.status] ?? 2) - (order[b.status] ?? 2) || a.source.localeCompare(b.source);
    });
    const summary = {
      sources: sources.length,
      ok: sources.filter((s) => s.status === 'ok').length,
      warning: sources.filter((s) => s.status === 'warning').length,
      critical: sources.filter((s) => s.status === 'critical').length,
      preservedSnapshots: sources.filter((s) => s.preservedSnapshot).length,
      blocksPick: sources.filter((s) => s.blocksPick).length,
      generatedAt: report.generated_at || health.generated_at || null
    };
    return {
      schema: 'paris-sportif.source_health.v5',
      generatedAt: new Date().toISOString(),
      summary,
      sources
    };
  }

  function buildSourceHealthV6(sourceHealthV5 = {}, coverageRepair = {}, targets = {}) {
    const repairActions = Array.isArray(coverageRepair?.actions) ? coverageRepair.actions : [];
    const targetRows = Array.isArray(targets?.sources) ? targets.sources : [];
    const repairBySource = new Map();
    for (const action of repairActions) {
      const key = String(action?.source || action?.raw_source || '').trim();
      if (!key) continue;
      const previous = repairBySource.get(key);
      if (!previous || Number(action?.estimated_gain || 0) > Number(previous?.estimated_gain || 0)) {
        repairBySource.set(key, action);
      }
    }
    const targetBySource = new Map(targetRows.map((row) => [String(row?.source || row?.key || '').trim(), row]));
    const sources = (Array.isArray(sourceHealthV5.sources) ? sourceHealthV5.sources : []).map((source) => {
      const key = String(source?.source || '').trim();
      const repair = repairBySource.get(key) || null;
      const target = targetBySource.get(key) || null;
      const coverage = Number(source?.coverage ?? target?.current_rate ?? target?.coverage ?? NaN);
      const targetRate = Number(repair?.target_rate ?? target?.target_rate ?? NaN);
      const preserved = Boolean(source?.preservedSnapshot);
      let status = source?.status || 'unknown';
      if (preserved && status === 'ok') status = 'preserved';
      if (Number.isFinite(coverage) && Number.isFinite(targetRate) && coverage < targetRate) status = status === 'critical' ? 'critical' : 'degraded';
      return {
        source: key,
        status,
        age: source?.age ?? null,
        ttl: source?.ttl ?? null,
        coverage: Number.isFinite(coverage) ? coverage : source?.coverage ?? null,
        targetCoverage: Number.isFinite(targetRate) ? targetRate : null,
        lastError: source?.lastError || null,
        lastHealthySnapshot: preserved ? 'préservé' : null,
        preservedSnapshot: preserved,
        blocksPick: Boolean(source?.blocksPick || (repair && Number(repair.critical || 0) > 0 && /lineup|injur|context|odds/i.test(key))),
        blocksPickCount: Number(repair?.critical || repair?.affected_matches || 0) || 0,
        repairPriority: repair?.priority || (status === 'critical' ? 'critical' : status === 'degraded' ? 'high' : 'low'),
        estimatedPickGain: Number(repair?.estimated_gain || 0) || 0,
        repairCommand: Array.isArray(repair?.command) ? repair.command.join(' ') : null,
        note: source?.note || repair?.detail || ''
      };
    }).sort((a, b) => {
      const order = { critical: 0, degraded: 1, warning: 2, preserved: 3, unknown: 4, ok: 5 };
      return (order[a.status] ?? 4) - (order[b.status] ?? 4) ||
        Number(b.estimatedPickGain || 0) - Number(a.estimatedPickGain || 0) ||
        a.source.localeCompare(b.source);
    });
    return {
      schema: 'paris-sportif.source_health.v6',
      generatedAt: new Date().toISOString(),
      summary: {
        sources: sources.length,
        ok: sources.filter((s) => s.status === 'ok').length,
        preserved: sources.filter((s) => s.status === 'preserved').length,
        degraded: sources.filter((s) => s.status === 'degraded').length,
        warning: sources.filter((s) => s.status === 'warning').length,
        critical: sources.filter((s) => s.status === 'critical').length,
        preservedSnapshots: sources.filter((s) => s.preservedSnapshot).length,
        blocksPick: sources.filter((s) => s.blocksPick).length,
        estimatedPickGain: sources.reduce((sum, source) => sum + Number(source.estimatedPickGain || 0), 0),
        firstRepair: sources.find((s) => s.repairPriority === 'critical' || s.repairPriority === 'high')?.source || null
      },
      sources
    };
  }

  function buildSourceHealthV7(sourceHealthV6 = {}, coverageRepair = {}, targets = {}) {
    const repairActions = Array.isArray(coverageRepair?.actions) ? coverageRepair.actions : [];
    const targetRows = Array.isArray(targets?.sources) ? targets.sources : [];
    const rowsBySource = new Map();
    const normalizeSource = (value) => String(value || '').trim();
    const upsert = (source, patch = {}) => {
      const key = normalizeSource(source);
      if (!key) return;
      rowsBySource.set(key, { ...(rowsBySource.get(key) || { source: key }), ...patch });
    };
    for (const source of Array.isArray(sourceHealthV6?.sources) ? sourceHealthV6.sources : []) {
      upsert(source.source, source);
    }
    for (const target of targetRows) {
      upsert(target.source || target.key, {
        targetCoverage: target.target_rate ?? target.targetCoverage ?? null,
        currentCoverage: target.current_rate ?? target.coverage ?? null
      });
    }
    for (const action of repairActions) {
      upsert(action.source || action.raw_source, {
        repairPriority: action.priority || 'high',
        estimatedPickGain: Math.max(Number(action.estimated_gain || 0), Number(rowsBySource.get(normalizeSource(action.source || action.raw_source))?.estimatedPickGain || 0)),
        repairCommand: Array.isArray(action.command) ? action.command.join(' ') : null,
        affectedMatches: Number(action.affected_matches || 0) || 0,
        currentCoverage: action.current_rate ?? rowsBySource.get(normalizeSource(action.source || action.raw_source))?.currentCoverage ?? null,
        targetCoverage: action.target_rate ?? rowsBySource.get(normalizeSource(action.source || action.raw_source))?.targetCoverage ?? null,
        note: action.detail || rowsBySource.get(normalizeSource(action.source || action.raw_source))?.note || ''
      });
    }
    const sources = Array.from(rowsBySource.values()).map((source) => {
      const currentCoverage = Number(source.currentCoverage ?? source.coverage ?? NaN);
      const targetCoverage = Number(source.targetCoverage ?? NaN);
      const deltaToTarget = Number.isFinite(currentCoverage) && Number.isFinite(targetCoverage)
        ? Math.max(0, targetCoverage - currentCoverage)
        : null;
      const repairPriority = source.repairPriority || (deltaToTarget && deltaToTarget > 0.15 ? 'high' : 'low');
      let status = source.status || 'unknown';
      if (deltaToTarget != null && deltaToTarget > 0.001) {
        status = repairPriority === 'critical' ? 'critical' : 'degraded';
      }
      const autoRepairAllowed = Boolean(source.repairCommand && repairPriority !== 'low');
      return {
        ...source,
        schema: undefined,
        status,
        currentCoverage: Number.isFinite(currentCoverage) ? currentCoverage : null,
        targetCoverage: Number.isFinite(targetCoverage) ? targetCoverage : null,
        deltaToTarget,
        repairPriority,
        autoRepairAllowed,
        retryPolicy: {
          mode: autoRepairAllowed ? 'signals' : 'manual',
          maxAttempts: autoRepairAllowed ? 3 : 1,
          backoffMinutes: autoRepairAllowed ? [5, 15, 45] : [],
          ttlMinutes: source.ttl ?? source.ttl_min ?? null
        },
        lastHealthyAge: source.preservedSnapshot ? source.age ?? null : null,
        blocksPick: Boolean(source.blocksPick || (repairPriority === 'critical' && Number(source.affectedMatches || source.blocksPickCount || 0) > 0)),
        blocksPickCount: Number(source.blocksPickCount || source.affectedMatches || 0) || 0,
        estimatedPickGain: Number(source.estimatedPickGain || 0) || 0
      };
    }).sort((a, b) => {
      const order = { critical: 0, degraded: 1, warning: 2, preserved: 3, unknown: 4, ok: 5 };
      return (order[a.status] ?? 4) - (order[b.status] ?? 4) ||
        Number(b.estimatedPickGain || 0) - Number(a.estimatedPickGain || 0) ||
        String(a.source || '').localeCompare(String(b.source || ''));
    });
    return {
      schema: 'paris-sportif.source_health.v7',
      generatedAt: new Date().toISOString(),
      summary: {
        sources: sources.length,
        ok: sources.filter((s) => s.status === 'ok').length,
        preserved: sources.filter((s) => s.status === 'preserved').length,
        degraded: sources.filter((s) => s.status === 'degraded').length,
        warning: sources.filter((s) => s.status === 'warning').length,
        critical: sources.filter((s) => s.status === 'critical').length,
        autoRepairable: sources.filter((s) => s.autoRepairAllowed).length,
        blocksPick: sources.filter((s) => s.blocksPick).length,
        estimatedPickGain: sources.reduce((sum, source) => sum + Number(source.estimatedPickGain || 0), 0),
        firstRepair: sources.find((s) => s.autoRepairAllowed)?.source || null
      },
      sources
    };
  }

  function buildSourceHealthV8(sourceHealthV7 = {}, sourceHealthReport = {}, healthReport = {}, coverageRepair = {}, targets = {}) {
    const technicalRows = Array.isArray(sourceHealthReport?.sources) ? sourceHealthReport.sources : [];
    const healthSources = Array.isArray(healthReport?.sources) ? healthReport.sources : [];
    const repairActions = Array.isArray(coverageRepair?.actions) ? coverageRepair.actions : [];
    const targetRows = Array.isArray(targets?.sources) ? targets.sources : [];
    const rowsBySource = new Map();
    const normalizeSource = (value) => String(value || '').trim();
    const upsert = (source, patch = {}) => {
      const key = normalizeSource(source);
      if (!key) return;
      rowsBySource.set(key, { ...(rowsBySource.get(key) || { source: key }), ...patch });
    };
    for (const source of Array.isArray(sourceHealthV7?.sources) ? sourceHealthV7.sources : []) upsert(source.source, source);
    for (const source of technicalRows) {
      upsert(source.source || source.key, {
        technicalStatus: source.status || 'unknown',
        technicalScore: Number(source.score ?? NaN),
        age: source.age ?? source.age_min ?? null,
        ttl: source.ttl ?? source.ttl_min ?? null,
        technicalNote: source.note || source.action || null
      });
    }
    for (const source of healthSources) {
      upsert(source.source || source.name || source.key, {
        lastError: source.lastError || source.error || null,
        age: source.age ?? source.age_min ?? rowsBySource.get(normalizeSource(source.source || source.name || source.key))?.age ?? null
      });
    }
    for (const target of targetRows) {
      upsert(target.source || target.key, {
        targetCoverage: target.target_rate ?? target.targetCoverage ?? null,
        currentCoverage: target.current_rate ?? target.coverage ?? null
      });
    }
    for (const action of repairActions) {
      upsert(action.source || action.raw_source, {
        repairPriority: action.priority || 'high',
        blockedReadyCount: Number(action.critical || action.affected_matches || 0) || 0,
        estimatedReadyGain: Number(action.estimated_gain || 0) || 0,
        repairCommand: Array.isArray(action.command) ? action.command.join(' ') : null,
        repairDetail: action.detail || null,
        affectedMatches: Number(action.affected_matches || 0) || 0
      });
    }
    const sources = Array.from(rowsBySource.values()).map((source) => {
      const currentCoverage = Number(source.currentCoverage ?? source.coverage ?? NaN);
      const targetCoverage = Number(source.targetCoverage ?? NaN);
      const deltaToTarget = Number.isFinite(currentCoverage) && Number.isFinite(targetCoverage)
        ? Math.max(0, targetCoverage - currentCoverage)
        : source.deltaToTarget ?? null;
      const technicalScore = Number(source.technicalScore);
      const coverageScore = Number.isFinite(currentCoverage) ? Math.round(Math.max(0, Math.min(100, (currentCoverage > 1 ? currentCoverage : currentCoverage * 100)))) : null;
      const coverageStatus = source.blocksPick || source.repairPriority === 'critical'
        ? 'critical'
        : deltaToTarget != null && deltaToTarget > 0.15
          ? 'degraded'
          : deltaToTarget != null && deltaToTarget > 0.001
            ? 'watch'
            : 'ok';
      const technicalStatus = source.technicalStatus || source.status || 'unknown';
      const unifiedScore = Math.round(Math.max(0, Math.min(100,
        Math.min(
          Number.isFinite(technicalScore) ? technicalScore : technicalStatus === 'ok' ? 100 : technicalStatus === 'preserved' ? 75 : 55,
          coverageScore != null ? coverageScore : coverageStatus === 'critical' ? 35 : coverageStatus === 'degraded' ? 55 : 85
        )
      )));
      const lastError = source.lastError || '';
      const providerErrorCode = /403/.test(lastError) ? '403'
        : /429/.test(lastError) ? '429'
          : /5\d\d/.test(lastError) ? '5xx'
            : lastError ? 'error' : null;
      const ageMinutes = Number(source.age);
      return {
        ...source,
        schema: undefined,
        technicalStatus,
        coverageStatus,
        currentCoverage: Number.isFinite(currentCoverage) ? currentCoverage : null,
        targetCoverage: Number.isFinite(targetCoverage) ? targetCoverage : null,
        deltaToTarget,
        score: unifiedScore,
        blockedReadyCount: Number(source.blockedReadyCount || source.blocksPickCount || source.affectedMatches || 0) || 0,
        estimatedReadyGain: Number(source.estimatedReadyGain || source.estimatedPickGain || 0) || 0,
        lastSuccessfulFetch: Number.isFinite(ageMinutes) ? new Date(Date.now() - ageMinutes * 60000).toISOString() : null,
        fallbackSnapshot: Boolean(source.preservedSnapshot || source.lastHealthySnapshot),
        providerErrorCode,
        quarantineUntil: source.quarantineUntil || null,
        manualFallbackAllowed: technicalStatus !== 'ok' && !/^winamax$/i.test(String(source.source || '')),
        retryPolicy: source.retryPolicy || {
          mode: source.repairCommand ? 'signals' : 'manual',
          maxAttempts: source.repairCommand ? 3 : 1,
          backoffMinutes: source.repairCommand ? [5, 15, 45] : [],
          ttlMinutes: source.ttl ?? source.ttl_min ?? null
        }
      };
    }).sort((a, b) => {
      const order = { critical: 0, degraded: 1, watch: 2, preserved: 3, unknown: 4, ok: 5 };
      return (order[a.coverageStatus] ?? 4) - (order[b.coverageStatus] ?? 4) ||
        Number(b.estimatedReadyGain || 0) - Number(a.estimatedReadyGain || 0) ||
        String(a.source || '').localeCompare(String(b.source || ''));
    });
    return {
      schema: 'paris-sportif.source_health.v8',
      generatedAt: new Date().toISOString(),
      summary: {
        sources: sources.length,
        technicalOk: sources.filter((s) => s.technicalStatus === 'ok').length,
        coverageOk: sources.filter((s) => s.coverageStatus === 'ok').length,
        coverageCritical: sources.filter((s) => s.coverageStatus === 'critical').length,
        coverageDegraded: sources.filter((s) => s.coverageStatus === 'degraded').length,
        fallbackSnapshots: sources.filter((s) => s.fallbackSnapshot).length,
        blockedReadyCount: sources.reduce((sum, source) => sum + Number(source.blockedReadyCount || 0), 0),
        estimatedReadyGain: sources.reduce((sum, source) => sum + Number(source.estimatedReadyGain || 0), 0),
        firstRepair: sources.find((s) => s.repairCommand && (s.coverageStatus === 'critical' || s.coverageStatus === 'degraded'))?.source || null
      },
      sources
    };
  }

  function buildSourceHealthV9(sourceHealthV8 = {}) {
    const sourceRows = Array.isArray(sourceHealthV8?.sources) ? sourceHealthV8.sources : [];
    const sources = sourceRows.map((source) => {
      const technicalStatus = source.technicalStatus || source.status || 'unknown';
      const coverageStatus = source.coverageStatus || 'unknown';
      const blockedReadyCount = Number(source.blockedReadyCount || 0) || 0;
      const estimatedReadyGain = Number(source.estimatedReadyGain || 0) || 0;
      const blocksBet = blockedReadyCount > 0 || ['critical', 'degraded'].includes(coverageStatus);
      const userImpact = blocksBet
        ? `${source.source || 'Source'} bloque potentiellement ${blockedReadyCount} pari(s) prêt(s).`
        : coverageStatus === 'watch'
          ? `${source.source || 'Source'} à surveiller, sans blocage immédiat.`
          : `${source.source || 'Source'} ne bloque pas les mises.`;
      return {
        source: source.source,
        technicalStatus,
        coverageStatus,
        score: Number(source.score || 0) || 0,
        blocksBet,
        blockedReadyCount,
        estimatedReadyGain,
        currentCoverage: source.currentCoverage ?? null,
        targetCoverage: source.targetCoverage ?? null,
        deltaToTarget: source.deltaToTarget ?? null,
        lastSuccessfulFetch: source.lastSuccessfulFetch || null,
        fallbackSnapshot: Boolean(source.fallbackSnapshot),
        lastError: source.lastError || null,
        repairCommand: source.repairCommand || null,
        repairPriority: source.repairPriority || null,
        userImpact
      };
    }).sort((a, b) => {
      return Number(b.blocksBet) - Number(a.blocksBet) ||
        Number(b.estimatedReadyGain || 0) - Number(a.estimatedReadyGain || 0) ||
        Number(b.blockedReadyCount || 0) - Number(a.blockedReadyCount || 0) ||
        String(a.source || '').localeCompare(String(b.source || ''));
    });
    const blockedReadyCount = sources.reduce((sum, source) => sum + Number(source.blockedReadyCount || 0), 0);
    const estimatedReadyGain = sources.reduce((sum, source) => sum + Number(source.estimatedReadyGain || 0), 0);
    const critical = sources.filter((source) => source.coverageStatus === 'critical').length;
    const degraded = sources.filter((source) => source.coverageStatus === 'degraded').length;
    const firstRepair = sources.find((source) => source.blocksBet && source.repairCommand)?.source || sources.find((source) => source.blocksBet)?.source || null;
    return {
      schema: 'paris-sportif.source_health.v9',
      generatedAt: new Date().toISOString(),
      summary: {
        sources: sources.length,
        status: critical > 0 ? 'critical_coverage' : degraded > 0 ? 'degraded_coverage' : 'ok',
        technicalOk: Number(sourceHealthV8?.summary?.technicalOk || 0),
        coverageOk: Number(sourceHealthV8?.summary?.coverageOk || 0),
        coverageCritical: critical,
        coverageDegraded: degraded,
        blockedReadyCount,
        estimatedReadyGain,
        firstRepair,
        userMessage: firstRepair
          ? `Priorité source : réparer ${firstRepair} avant d’augmenter les boutons Je mise.`
          : 'Aucune source critique ne bloque les mises.'
      },
      sources
    };
  }

  function readableMarketFamily(row) {
    const group = simpleMarketGroup(row?.marketKey || row?.market);
    if (group === 'winner') return 'Vainqueur';
    if (group === 'goals') return 'Buts';
    if (group === 'btts') return 'Les deux marquent';
    if (group === 'scorer') return 'Buteur';
    if (group === 'halftime') return 'Mi-temps';
    return formatMarketName(row?.marketKey || row?.market || 'Marché');
  }

  function compactSourceQuality(row) {
    const quality = row?.contextQuality || row?.match?.context?.quality || {};
    const score = Number(quality.score);
    const missing = [
      ...(Array.isArray(quality.missing) ? quality.missing : []),
      ...(Array.isArray(quality.critical_missing) ? quality.critical_missing : [])
    ].filter(Boolean);
    return {
      score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : null,
      tier: quality.tier || (Number.isFinite(score) ? score >= 70 ? 'fort' : score >= 45 ? 'correct' : 'faible' : 'inconnu'),
      gate: quality.gate || row?.contextGate?.gate || null,
      missing: [...new Set(missing)].slice(0, 8)
    };
  }

  function pickWhyV3(row) {
    const bits = [];
    const label = cleanLabel(row?.label || row?.selection || row?.pickLabel || row?.market, 'ce pari');
    const odd = Number(row?.odd || 0);
    const confidence = Number(row?.safeConfidence ?? row?.adjustedConfidence ?? row?.probability ?? 0);
    const edge = Number(row?.safeEdge ?? row?.edge ?? 0);
    if (label) bits.push(`${label} ressort comme la meilleure ligne Winamax.`);
    if (Number.isFinite(confidence) && confidence > 0) bits.push(`Confiance ${Math.round(confidence * 100)}%.`);
    if (Number.isFinite(odd) && odd > 1) bits.push(`Cote ${odd.toFixed(2)}.`);
    if (Number.isFinite(edge) && edge > 0) bits.push(`Avantage estimé +${Math.round(edge * 100)}pt.`);
    if (row?.winamaxTwoGoalRule?.eligible) {
      bits.push(`Filet 2-0 Winamax estimé ${Math.round(Number(row.winamaxTwoGoalRule.leadTwoProbability || 0) * 100)}%.`);
    }
    const reason = cleanLabel(row?.decisionCenter?.mainReason || row?.reason || '', '');
    if (reason && !bits.join(' ').includes(reason)) bits.push(reason);
    return bits.join(' ') || 'Ligne visible car le modèle trouve un signal positif, mais elle reste à vérifier avant mise.';
  }

  function buildPickDecisionV3(row) {
    const canBet = Boolean(row?.decisionCenter?.canBet);
    const sourceQuality = compactSourceQuality(row);
    const reasons = [
      ...(Array.isArray(row?.safeAssessment?.reasons) ? row.safeAssessment.reasons : []),
      ...(Array.isArray(row?.safeAssessment?.warnings) ? row.safeAssessment.warnings : []),
      ...(Array.isArray(row?.contextGate?.warnings) ? row.contextGate.warnings : [])
    ].filter(Boolean);
    const riskLevel = canBet
      ? sourceQuality.score != null && sourceQuality.score < 55 ? 'moderate' : 'low'
      : row?.safeAssessment?.status === 'watch' || row?.decisionCenter?.status === 'watch' ? 'watch' : 'blocked';
    return {
      schema: 'paris-sportif.pick_decision.v3',
      status: canBet ? 'ready' : row?.safeAssessment?.status === 'watch' || row?.decisionCenter?.status === 'watch' ? 'watch' : 'blocked',
      canBet,
      stake: canBet ? Number(row?.decisionCenter?.stake ?? row?.stake ?? 0) || 0 : 0,
      stakeDisplay: canBet ? row?.decisionCenter?.stakeDisplay || null : '0 €',
      why: pickWhyV3(row),
      confidence: {
        value: Number(row?.safeConfidence ?? row?.adjustedConfidence ?? row?.probability ?? 0) || 0,
        label: String(row?.confidenceTrust?.label || row?.safeAssessment?.label || '').replace('Confiance de confiance', 'Confiance'),
        drivers: Array.isArray(row?.confidenceTrust?.drivers) ? row.confidenceTrust.drivers.slice(0, 5) : []
      },
      risk: {
        level: riskLevel,
        reasons: [...new Set(reasons)].slice(0, 6)
      },
      sourceQuality,
      marketFamily: readableMarketFamily(row),
      winamaxRuleFlags: {
        twoGoalEarlyPayout: Boolean(row?.winamaxTwoGoalRule?.eligible),
        twoGoalSafety: row?.winamaxTwoGoalRule?.eligible ? Number(row.winamaxTwoGoalRule.leadTwoProbability || 0) : null,
        boost: Boolean(row?.winamaxBoost?.active || row?.winamaxBoost?.boosted)
      }
    };
  }

  function pickDecisionReasonCodes(row) {
    const codes = [];
    if (row?.decisionCenter?.canBet) codes.push('ready_to_bet');
    if (row?.prebetGate?.blocked) codes.push('prebet_checklist_blocked');
    if (row?.contextGate?.gate === 'skip') codes.push('context_skip');
    if (row?.contextGate?.agentEligible === false) codes.push('context_agent_blocked');
    if (row?.safeAssessment?.status === 'watch') codes.push('safe_watch');
    if (row?.safeAssessment?.status === 'reject') codes.push('safe_reject');
    if (row?.signalConflict?.active) codes.push('signal_conflict');
    if (row?.oddsGuardrail?.applied) codes.push('odds_guardrail');
    if (row?.profitGuardV5?.blocked) codes.push('profit_guard_v5');
    if (row?.capitalProtectionV1?.blocked) codes.push('capital_protection');
    if (row?.winamaxTwoGoalRule?.eligible) codes.push('winamax_2_goal_early_payout');
    if (row?.limitedConfidence) codes.push('limited_confidence');
    if (!isFutureStart(row)) codes.push('started_or_finished');
    return [...new Set(codes)];
  }

  function sourceBlockingReasons(row) {
    const quality = row?.contextQuality || row?.match?.context?.quality || {};
    const critical = Array.isArray(quality.critical_missing) ? quality.critical_missing : [];
    const missing = Array.isArray(quality.missing) ? quality.missing : [];
    const reasons = [
      ...critical.map((item) => ({ source: signalSourceFromMissing(item), reason: String(item), severity: 'critical' })),
      ...missing.slice(0, 6).map((item) => ({ source: signalSourceFromMissing(item), reason: String(item), severity: 'missing' }))
    ];
    return reasons.filter((item) => item.reason).slice(0, 10);
  }

  function signalSourceFromMissing(value) {
    const text = String(value || '').toLowerCase();
    if (/lineup|composition/.test(text)) return 'lineups';
    if (/injur|bless|absence|availability|roster/.test(text)) return 'injuries';
    if (/referee|arbit/.test(text)) return 'referees';
    if (/weather|météo|meteo|wind|rain/.test(text)) return 'weather';
    if (/h2h|face/.test(text)) return 'h2h';
    if (/tennis|surface|elo/.test(text)) return 'tennis';
    if (/baseball|hockey|nba|nfl|pitcher|goalie|starter|sport/.test(text)) return 'team_stats';
    if (/xg|team|strength|force/.test(text)) return 'team_stats';
    if (/odds|cote|winamax/.test(text)) return 'winamax';
    return 'context';
  }

  function buildPickDecisionV4(row) {
    const v3 = row?.pickDecisionV3 || buildPickDecisionV3(row);
    const edge = Number(row?.safeEdge ?? row?.edge ?? 0) || 0;
    const rawEdge = Number(row?.edge || 0) || 0;
    const canBetReason = v3.canBet
      ? (row?.decisionCenter?.mainReason || 'Pari prêt : mise autorisée par les garde-fous')
      : (row?.decisionCenter?.mainReason || row?.safeAssessment?.reasons?.[0] || row?.contextGate?.label || 'Observation : pas de mise recommandée');
    const marketFamily = readableMarketFamily(row);
    const night = isNightCoverageCandidate(row);
    return {
      schema: 'paris-sportif.pick_decision.v4',
      status: v3.status,
      canBet: v3.canBet,
      stake: v3.stake,
      stakeDisplay: v3.stakeDisplay,
      confidence: Number(v3.confidence?.value || row?.safeConfidence || row?.probability || 0) || 0,
      edge,
      rawEdge,
      marketFamily,
      sourceQuality: v3.sourceQuality,
      riskReasons: v3.risk?.reasons || [],
      decisionReasonCodes: pickDecisionReasonCodes(row),
      canBetReason,
      sourceBlockingReasons: sourceBlockingReasons(row),
      marketQuotaReason: row?.quotaReason || row?.dashboardQuotaReason || null,
      nightReason: night ? (v3.canBet ? 'Créneau nuit prêt' : 'Créneau nuit visible en observation') : null,
      whyShort: simplePickWhyShort(row, v3),
      whyLong: pickWhyV3(row),
      winamaxEligibility: {
        available: Boolean(row?.match?.winamax?.available),
        matchId: row?.match?.winamax?.match_id || row?.id || null,
        url: row?.winamaxUrl || row?.match?.winamax?.url || null,
        simpleMarket: isSimpleUserMarket(row),
        drawExcluded: isDrawSelection(row)
      },
      winamaxRuleFlags: {
        ...v3.winamaxRuleFlags,
        twoGoalEarlyPayout: Boolean(row?.winamaxTwoGoalRule?.eligible),
        twoGoalLeadProbability: row?.winamaxTwoGoalRule?.eligible ? Number(row.winamaxTwoGoalRule.leadTwoProbability || 0) : null,
        earlyPayoutAdjustedProbability: row?.winamaxTwoGoalRule?.eligible ? Number(row.winamaxTwoGoalRule.afterProbability || row.probability || 0) : null,
        earlyPayoutAdjustedEdge: row?.winamaxTwoGoalRule?.eligible ? Number(row.winamaxTwoGoalRule.afterEdge || edge || 0) : null,
        boost: Boolean(row?.winamaxBoost?.active || row?.winamaxBoost?.boosted)
      }
    };
  }

  function buildPickDecisionV5(row) {
    const v4 = row?.pickDecisionV4 || buildPickDecisionV4(row);
    const sourceBlocks = Array.isArray(v4.sourceBlockingReasons) ? v4.sourceBlockingReasons : [];
    const criticalBlocks = sourceBlocks.filter((item) => item.severity === 'critical');
    const confidence = Number(v4.confidence || 0) || 0;
    const edge = Number(v4.edge || 0) || 0;
    const priorityScore = Number(row?.priorityScore || 0) || 0;
    const sourceScore = Number(v4.sourceQuality?.score);
    const sourceQualityScore = Number.isFinite(sourceScore) ? sourceScore : 50;
    const modelScore = Math.round(Math.max(0, Math.min(100, confidence * 45 + Math.max(0, edge) * 250 + sourceQualityScore * 0.25 + priorityScore * 0.15)));
    const odd = Number(row?.odd || 0);
    const soon = minutesToKickoff(row);
    const urgency = soon != null && soon >= 0 && soon <= 180 ? 12 : soon != null && soon <= 24 * 60 ? 6 : 0;
    const userFastBetScore = Math.round(Math.max(0, Math.min(100, modelScore * 0.75 + (odd > 1.35 && odd <= 4.5 ? 10 : 0) + urgency + (v4.canBet ? 8 : -8))));
    const repairable = !v4.canBet && (criticalBlocks.length > 0 || row?.decisionCenter?.status === 'repair' || v4.sourceQuality?.tier === 'faible');
    const repairSource = criticalBlocks[0]?.source || sourceBlocks[0]?.source || null;
    const missingForBet = criticalBlocks.map((item) => item.reason).filter(Boolean).slice(0, 6);
    const missingForDisplay = sourceBlocks.filter((item) => item.severity !== 'critical').map((item) => item.reason).filter(Boolean).slice(0, 6);
    const stake = Number(v4.stake || 0) || 0;
    return {
      ...v4,
      schema: 'paris-sportif.pick_decision.v5',
      modelScore,
      userFastBetScore,
      sourceBlocksBet: Boolean(criticalBlocks.length || row?.decisionCenter?.status === 'repair'),
      repairable,
      repairHint: repairable ? `Relancer enrichissement ${repairSource || 'contexte'} avant de miser` : null,
      quotaStatus: {
        applied: Boolean(row?.quotaApplied || row?.quotaReason || row?.dashboardQuotaReason),
        reason: row?.quotaReason || row?.dashboardQuotaReason || null,
        status: row?.decisionCenter?.canBet ? 'ready' : row?.safeAssessment?.status || row?.decisionCenter?.status || 'watch'
      },
      nightStatus: {
        isNight: Boolean(isNightCoverageCandidate(row)),
        ready: Boolean(isNightCoverageCandidate(row) && v4.canBet),
        reason: v4.nightReason || null
      },
      marketConfidence: {
        family: v4.marketFamily,
        sample: Number(row?.segmentValidation?.count || row?.segmentValidation?.sample || 0) || 0,
        roi: Number(row?.segmentValidation?.roi ?? row?.calibration?.roi ?? 0) || 0,
        brier: Number(row?.segmentValidation?.brier ?? row?.calibration?.brier ?? 0) || null,
        level: row?.segmentValidation?.sample || row?.segmentValidation?.level || 'inconnu'
      },
      stakePolicy: {
        allowed: Boolean(v4.canBet && stake > 0),
        stake,
        minPositiveEdge: true,
        noStakeWhenWatch: !v4.canBet,
        reason: v4.canBet ? 'Mise positive uniquement car avantage et garde-fous OK' : 'Pas de mise tant que le pick reste en observation'
      },
      decisionEvidence: {
        positive: [
          edge > 0 ? `Avantage +${Math.round(edge * 100)}pt` : null,
          confidence > 0 ? `Confiance ${Math.round(confidence * 100)}%` : null,
          row?.winamaxTwoGoalRule?.eligible ? `Filet 2-0 ${Math.round(Number(row.winamaxTwoGoalRule.leadTwoProbability || 0) * 100)}%` : null
        ].filter(Boolean).slice(0, 5),
        negative: [...new Set([...(v4.riskReasons || []), ...missingForBet])].slice(0, 5)
      },
      missingForBet,
      missingForDisplay,
      userCopy: {
        short: v4.whyShort || simplePickWhyShort(row, v4),
        long: v4.whyLong || pickWhyV3(row),
        noBetReason: v4.canBet ? null : v4.canBetReason
      }
    };
  }

  function buildPickDecisionV6(row, sourceHealthV8 = null) {
    const v5 = row?.pickDecisionV5 || buildPickDecisionV5(row);
    const sourceRows = Array.isArray(sourceHealthV8?.sources) ? sourceHealthV8.sources : [];
    const sourceMap = new Map(sourceRows.map((source) => [String(source.source || '').toLowerCase(), source]));
    const critical = Array.isArray(v5.missingForBet) ? v5.missingForBet : [];
    const optional = Array.isArray(v5.missingForDisplay) ? v5.missingForDisplay : [];
    const missingCriticalSignals = critical.map((reason) => ({
      source: signalSourceFromMissing(reason),
      reason
    })).slice(0, 8);
    const missingOptionalSignals = optional.map((reason) => ({
      source: signalSourceFromMissing(reason),
      reason
    })).slice(0, 8);
    const repairSources = [...new Set([...missingCriticalSignals, ...missingOptionalSignals].map((item) => item.source))];
    const sourceRepairPlan = repairSources.map((source) => {
      const rowSource = sourceMap.get(String(source).toLowerCase()) || {};
      return {
        source,
        priority: rowSource.coverageStatus === 'critical' ? 'critical' : rowSource.repairPriority || 'medium',
        command: rowSource.repairCommand || `python desktop/bin/refresh_once.py --signals --signal-source ${source}`,
        estimatedReadyGain: Number(rowSource.estimatedReadyGain || rowSource.estimatedPickGain || 0) || 0,
        blocksBet: missingCriticalSignals.some((item) => item.source === source)
      };
    }).slice(0, 6);
    const missingPenalty = missingCriticalSignals.length * 12 + missingOptionalSignals.length * 4;
    const sourcePenalty = v5.sourceBlocksBet ? 18 : 0;
    const stakeAllowed = Boolean(v5.stakePolicy?.allowed && Number(v5.stakePolicy?.stake || 0) > 0);
    const profitGuard = row?.profitGuardV5 || {};
    const profitGuardBlocked = Boolean(profitGuard.blocked);
    const capitalProtection = row?.capitalProtectionV1 || {};
    const capitalProtectionBlocked = Boolean(capitalProtection.blocked);
    const betReadinessScore = Math.round(Math.max(0, Math.min(100,
      Number(v5.userFastBetScore || v5.modelScore || 0) + (stakeAllowed ? 10 : -8) - missingPenalty - sourcePenalty - (profitGuardBlocked ? 18 : 0) - (capitalProtectionBlocked ? 22 : 0)
    )));
    const twoGoalProbability = Number(row?.winamaxTwoGoalRule?.leadTwoProbability ?? v5.winamaxRuleFlags?.twoGoalLeadProbability ?? 0) || 0;
    const isNight = Boolean(v5.nightStatus?.isNight);
    return {
      ...v5,
      schema: 'paris-sportif.pick_decision.v6',
      betReadinessScore,
      missingCriticalSignals,
      missingOptionalSignals,
      sourceRepairPlan,
      marketQuotaTrace: {
        status: v5.quotaStatus?.status || 'unknown',
        applied: Boolean(v5.quotaStatus?.applied),
        reason: v5.quotaStatus?.reason || null
      },
      sportQuotaTrace: {
        sport: row?.sport || row?.match?.sport || null,
        cap: 'max 45% cockpit',
        reason: row?.sportQuotaReason || null
      },
      leagueQuotaTrace: {
        league: row?.match?.league_code || row?.league || row?.match?.league_name || null,
        cap: 'max 30% cockpit',
        reason: row?.leagueQuotaReason || null
      },
      twoGoalRuleTrace: {
        eligible: Boolean(row?.winamaxTwoGoalRule?.eligible || v5.winamaxRuleFlags?.twoGoalEarlyPayout),
        probability: twoGoalProbability,
        adjustedEdge: Number(row?.winamaxTwoGoalRule?.afterEdge ?? v5.winamaxRuleFlags?.earlyPayoutAdjustedEdge ?? 0) || 0,
        label: twoGoalProbability > 0 ? `Filet 2-0 Winamax ${Math.round(twoGoalProbability * 100)}%` : null
      },
      profitGuardTrace: {
        blocked: profitGuardBlocked,
        reasons: Array.isArray(profitGuard.reasons) ? profitGuard.reasons.slice(0, 5) : [],
        policy: profitGuard.policy || null
      },
      capitalProtectionTrace: {
        blocked: capitalProtectionBlocked,
        reasons: Array.isArray(capitalProtection.reasons) ? capitalProtection.reasons.slice(0, 5) : [],
        maxStake: Number(capitalProtection.maxStake || 0) || 0,
        stakeCapped: Boolean(capitalProtection.stakeCapped),
        policy: capitalProtection.policy || null
      },
      nightUnlockReason: isNight
        ? stakeAllowed
          ? 'Nuit prête : edge positif, cote Winamax et sources suffisantes'
          : sourceRepairPlan[0]?.source
            ? `Nuit à débloquer : réparer ${sourceRepairPlan[0].source}`
            : 'Nuit en observation : signal encore insuffisant'
        : null,
      confidenceBreakdown: {
        model: Number(v5.modelScore || 0),
        fastBet: Number(v5.userFastBetScore || 0),
        sourceQuality: Number(v5.sourceQuality?.score || 0),
        readiness: betReadinessScore
      },
      riskBreakdown: {
        missingCritical: missingCriticalSignals.length,
        missingOptional: missingOptionalSignals.length,
        sourceBlocksBet: Boolean(v5.sourceBlocksBet),
        profitGuardBlocked,
        capitalProtectionBlocked,
        riskReasons: Array.isArray(v5.riskReasons) ? v5.riskReasons.slice(0, 6) : []
      },
      userFastCopy: stakeAllowed
        ? `${v5.marketFamily || 'Pari'} prêt · ${v5.stakeDisplay || `${Number(v5.stake || 0).toFixed(2)} €`}`
        : sourceRepairPlan[0]?.source
          ? `À surveiller : ${sourceRepairPlan[0].source} à réparer avant mise`
          : v5.userCopy?.noBetReason || 'Observation sans mise'
    };
  }

  function simplePickWhyShort(row, decision) {
    const parts = [];
    if (row?.winamaxTwoGoalRule?.eligible) {
      parts.push(`filet 2-0 ${Math.round(Number(row.winamaxTwoGoalRule.leadTwoProbability || 0) * 100)}%`);
    }
    const confidence = Number(decision?.confidence?.value || row?.safeConfidence || row?.probability || 0);
    if (confidence > 0) parts.push(`confiance ${Math.round(confidence * 100)}%`);
    const edge = Number(row?.safeEdge ?? row?.edge ?? 0);
    if (edge > 0) parts.push(`avantage +${Math.round(edge * 100)}pt`);
    const reason = row?.decisionCenter?.mainReason || row?.safeAssessment?.warnings?.[0] || row?.contextGate?.label || '';
    if (reason) parts.push(reason);
    return parts.slice(0, 3).join(' · ') || 'Signal positif Winamax à vérifier avant mise';
  }

  function sideLineup(match, side) {
    const competitors = Array.isArray(match?.competitors) ? match.competitors : [];
    const competitor = competitors.find((item) => item?.home_away === side) || (side === 'home' ? competitors[0] : competitors[1]) || {};
    const lineup = match?.lineups?.[side] || competitor?.lineup || {};
    const starters = Array.isArray(lineup.starters) ? lineup.starters : [];
    const injuries = Array.isArray(competitor.injuries)
      ? competitor.injuries
      : Array.isArray(match?.injuries?.[side]) ? match.injuries[side] : [];
    return {
      team: competitor?.name || lineup.team || (side === 'home' ? match?.home : match?.away) || '',
      formation: lineup.formation || null,
      confirmed: lineup.confirmed === true,
      coach: lineup.coach || competitor?.coach || null,
      starters: starters.slice(0, 11).map((player) => ({
        name: cleanLabel(player?.name, ''),
        pid: player?.pid || player?.id || null,
        number: player?.shirt ?? player?.number ?? null,
        position: player?.pos || player?.position || null,
        rating: Number.isFinite(Number(player?.rating)) ? Number(player.rating) : null,
        captain: Boolean(player?.captain),
        public_profile: player?.public_profile || player?.publicProfile || {},
        public_stats: player?.public_stats || player?.publicStats || {},
        public_sources: Array.isArray(player?.public_sources) ? player.public_sources.slice(0, 6) : [],
        public_signals: player?.public_signals || player?.publicSignals || {},
        history_public: player?.history_public || player?.historyPublic || {}
      })).filter((player) => player.name),
      substitutes: Array.isArray(lineup.subs) ? lineup.subs.slice(0, 9).map((player) => cleanLabel(player?.name, '')).filter(Boolean) : [],
      injuries: {
        total: injuries.length,
        names: injuries.map((injury) => cleanLabel(injury?.player || injury?.name, '')).filter(Boolean).slice(0, 8)
      }
    };
  }

  function sideForm(match, side) {
    const competitors = Array.isArray(match?.competitors) ? match.competitors : [];
    const competitor = competitors.find((item) => item?.home_away === side) || (side === 'home' ? competitors[0] : competitors[1]) || {};
    return {
      team: competitor?.name || '',
      rank: competitor?.rank ?? competitor?.standing ?? null,
      form: cleanLabel(competitor?.form || competitor?.last5 || competitor?.team_form_l5 || competitor?.form10, ''),
      xgFor: Number.isFinite(Number(competitor?.xg_for_avg)) ? Number(competitor.xg_for_avg) : null,
      xgAgainst: Number.isFinite(Number(competitor?.xg_against_avg)) ? Number(competitor.xg_against_avg) : null
    };
  }

  function buildMatchSheetV3(row, sourceHealthV5) {
    const match = row?.match || {};
    const quality = compactSourceQuality(row);
    const homeLineup = sideLineup(match, 'home');
    const awayLineup = sideLineup(match, 'away');
    const h2hMeetings = Array.isArray(match?.h2h?.meetings) ? match.h2h.meetings.slice(0, 5) : [];
    const referee = match?.referee || match?.referee_context || null;
    const weather = match?.weather || null;
    const missing = new Set(quality.missing || []);
    if (!homeLineup.starters.length || !awayLineup.starters.length) missing.add('lineups');
    if (!h2hMeetings.length) missing.add('h2h');
    if (!referee) missing.add('referee');
    if (!weather) missing.add('weather');
    if (!homeLineup.injuries.total && !awayLineup.injuries.total) missing.add('injuries');
    const sourceNames = ['winamax', 'sofascore', 'espn', 'open_meteo', 'clubelo', 'jeff_sackmann_tennis'];
    const sourceMap = new Map((sourceHealthV5?.sources || []).map((source) => [source.source, source]));
    return {
      schema: 'paris-sportif.match_sheet.v3',
      summary: {
        title: row?.title || match?.name || '',
        sport: row?.sport || match?.sport || '',
        league: row?.league || match?.league_name || '',
        start: row?.start || match?.date || null,
        venue: match?.venue || null,
        sourceQuality: quality
      },
      lineups: { home: homeLineup, away: awayLineup },
      players: {
        homeKeyPlayers: homeLineup.starters.filter((player) => /F|M|A/i.test(String(player.position || ''))).slice(0, 3),
        awayKeyPlayers: awayLineup.starters.filter((player) => /F|M|A/i.test(String(player.position || ''))).slice(0, 3)
      },
      teamForm: {
        home: sideForm(match, 'home'),
        away: sideForm(match, 'away')
      },
      h2h: {
        count: h2hMeetings.length,
        meetings: h2hMeetings.map((item) => ({
          date: item?.date || null,
          home: item?.home || null,
          away: item?.away || null,
          score: item?.score || (item?.home_score != null && item?.away_score != null ? `${item.home_score}-${item.away_score}` : null)
        }))
      },
      injuries: {
        home: homeLineup.injuries,
        away: awayLineup.injuries
      },
      coach: {
        home: homeLineup.coach,
        away: awayLineup.coach
      },
      referee: referee ? {
        name: referee.name || referee.referee || null,
        cardsPerGame: referee.cardsPerGame ?? referee.yellowPerGame ?? referee.cards_per_match ?? null,
        penaltiesPerGame: referee.penaltiesPerGame ?? referee.pens_per_match ?? null
      } : null,
      weather: weather ? {
        city: weather.city || null,
        tempC: weather.temp_c ?? weather.temperature ?? null,
        windKmh: weather.wind_kmh ?? weather.wind ?? null,
        precipitationMm: weather.precip_mm ?? weather.precip ?? null
      } : null,
      tactical: {
        formation: [homeLineup.formation, awayLineup.formation].filter(Boolean).join(' vs ') || null,
        keySignals: Array.isArray(row?.pred?.contributions) ? row.pred.contributions.slice(0, 5) : []
      },
      sources: sourceNames.map((name) => sourceMap.get(name)).filter(Boolean).map((source) => ({
        source: source.source,
        status: source.status,
        age: source.age,
        blocksPick: source.blocksPick
      })),
      missingData: [...missing].filter(Boolean).slice(0, 12)
    };
  }

  function buildMatchSheetV4(row, sourceHealthV6) {
    const v3 = row?.matchSheetV3 || buildMatchSheetV3(row, sourceHealthV6);
    const visibleSections = [];
    const hiddenSections = [];
    const addSection = (key, visible, reason) => {
      if (visible) visibleSections.push(key);
      else hiddenSections.push({ section: key, reason });
    };
    addSection('lineups', Boolean(v3.lineups?.home?.starters?.length && v3.lineups?.away?.starters?.length), 'Compositions non confirmées ou non récupérées');
    addSection('players', Boolean(v3.players?.homeKeyPlayers?.length || v3.players?.awayKeyPlayers?.length), 'Joueurs clés absents du snapshot fiable');
    addSection('teamForm', Boolean(v3.teamForm?.home?.form || v3.teamForm?.away?.form), 'Forme récente indisponible');
    addSection('h2h', Number(v3.h2h?.count || 0) >= 1, 'Historique face-à-face absent');
    addSection('injuries', Boolean(Number(v3.injuries?.home?.total || 0) || Number(v3.injuries?.away?.total || 0)), 'Absences non confirmées');
    addSection('coach', Boolean(v3.coach?.home || v3.coach?.away), 'Coach/style non enrichi');
    addSection('referee', Boolean(v3.referee), 'Arbitre non publié');
    addSection('weather', Boolean(v3.weather), 'Météo non utile ou non récupérée');
    addSection('tactical', Boolean(v3.tactical?.formation || v3.tactical?.keySignals?.length), 'Tactique non enrichie');
    const missing = Array.isArray(v3.missingData) ? v3.missingData : [];
    const sourceRows = Array.isArray(sourceHealthV6?.sources) ? sourceHealthV6.sources : [];
    const sourceCoverageScore = sourceRows.length
      ? Math.round(sourceRows.reduce((sum, source) => {
        const coverage = Number(source.coverage);
        if (Number.isFinite(coverage)) return sum + Math.max(0, Math.min(100, coverage > 1 ? coverage : coverage * 100));
        return sum + (source.status === 'ok' || source.status === 'preserved' ? 80 : source.status === 'degraded' ? 45 : 30);
      }, 0) / sourceRows.length)
      : null;
    const confidenceFromPresence = (present, expected) => expected > 0 ? Math.round(Math.max(0, Math.min(100, (present / expected) * 100))) : 0;
    return {
      ...v3,
      schema: 'paris-sportif.match_sheet.v4',
      visibleSections,
      hiddenSections,
      missingCriticalData: missing.filter((item) => /lineup|injur|odds|winamax|context|xg|team_strength/i.test(String(item))).slice(0, 10),
      missingOptionalData: missing.filter((item) => !/lineup|injur|odds|winamax|context|xg|team_strength/i.test(String(item))).slice(0, 10),
      sourceCoverageScore,
      lineupConfidence: confidenceFromPresence(
        Number(v3.lineups?.home?.starters?.length || 0) + Number(v3.lineups?.away?.starters?.length || 0),
        22
      ),
      playerStatsConfidence: confidenceFromPresence(
        Number(v3.players?.homeKeyPlayers?.length || 0) + Number(v3.players?.awayKeyPlayers?.length || 0),
        6
      ),
      teamContextConfidence: confidenceFromPresence(visibleSections.filter((key) => ['teamForm', 'h2h', 'injuries', 'coach', 'referee', 'weather', 'tactical'].includes(key)).length, 7),
      sourceCoverage: {
        sources: sourceRows.length,
        ok: Number(sourceHealthV6?.summary?.ok || 0),
        degraded: Number(sourceHealthV6?.summary?.degraded || 0),
        preserved: Number(sourceHealthV6?.summary?.preserved || sourceHealthV6?.summary?.preservedSnapshots || 0),
        blocksPick: Number(sourceHealthV6?.summary?.blocksPick || 0)
      }
    };
  }

  function buildMatchSheetV5(row, sourceHealthV7) {
    const v4 = row?.matchSheetV4 || buildMatchSheetV4(row, sourceHealthV7);
    const sport = String(v4.summary?.sport || row?.sport || row?.match?.sport || '').toLowerCase();
    const requiredBySport = /football|soccer/.test(sport)
      ? ['lineups', 'teamForm', 'injuries', 'h2h']
      : /tennis/.test(sport)
        ? ['teamForm', 'h2h']
        : /basket|baseball|hockey|nfl|football américain|american/.test(sport)
          ? ['teamForm', 'players']
          : ['teamForm'];
    const optionalBySport = /football|soccer/.test(sport)
      ? ['players', 'coach', 'referee', 'weather', 'tactical']
      : ['players', 'weather', 'tactical'];
    const visible = new Set(Array.isArray(v4.visibleSections) ? v4.visibleSections : []);
    const hidden = new Map((Array.isArray(v4.hiddenSections) ? v4.hiddenSections : []).map((item) => [item.section, item.reason]));
    const sectionQuality = {};
    for (const section of [...new Set([...requiredBySport, ...optionalBySport])]) {
      const isVisible = visible.has(section);
      sectionQuality[section] = {
        status: isVisible ? 'ready' : requiredBySport.includes(section) ? 'missing_required' : 'hidden_optional',
        score: isVisible ? 100 : requiredBySport.includes(section) ? 0 : 40,
        reason: isVisible ? 'Donnée affichable' : hidden.get(section) || 'Donnée fiable absente'
      };
    }
    const sourceRows = Array.isArray(sourceHealthV7?.sources) ? sourceHealthV7.sources : [];
    const sourceSnapshot = sourceRows.slice(0, 8).map((source) => ({
      source: source.source,
      status: source.status,
      currentCoverage: source.currentCoverage,
      targetCoverage: source.targetCoverage,
      repairPriority: source.repairPriority
    }));
    return {
      ...v4,
      schema: 'paris-sportif.match_sheet.v5',
      requiredSections: requiredBySport,
      optionalSections: optionalBySport,
      sectionQuality,
      lastEnrichedAt: row?.match?.context?.generated_at || row?.match?.enriched_at || row?.match?.updated_at || null,
      evidence: {
        sources: sourceSnapshot,
        positiveSignals: Array.isArray(row?.pred?.contributions) ? row.pred.contributions.slice(0, 5) : [],
        missingCritical: Array.isArray(v4.missingCriticalData) ? v4.missingCriticalData.slice(0, 8) : []
      },
      manualRefreshState: {
        canRefresh: true,
        recommendedMode: requiredBySport.some((section) => sectionQuality[section]?.status === 'missing_required') ? 'signals' : 'prematch',
        label: requiredBySport.some((section) => sectionQuality[section]?.status === 'missing_required')
          ? 'Relancer enrichissement contexte'
          : 'Rechecker avant match'
      }
    };
  }

  function buildMatchSheetV6(row, sourceHealthV8) {
    const v5 = row?.matchSheetV5 || buildMatchSheetV5(row, sourceHealthV8);
    const sport = String(v5.summary?.sport || row?.sport || row?.match?.sport || '').toLowerCase();
    const sportTemplate = /football|soccer/.test(sport)
      ? 'football'
      : /tennis/.test(sport)
        ? 'tennis'
        : /basket/.test(sport)
          ? 'basketball'
          : /baseball/.test(sport)
            ? 'baseball'
            : /hockey/.test(sport)
              ? 'hockey'
              : 'generic';
    const sectionQuality = v5.sectionQuality || {};
    const sectionCompleteness = Object.entries(sectionQuality).map(([section, info]) => ({
      section,
      status: info.status,
      score: Number(info.score || 0),
      required: Array.isArray(v5.requiredSections) && v5.requiredSections.includes(section),
      reason: info.reason || ''
    }));
    const sourceRows = Array.isArray(sourceHealthV8?.sources) ? sourceHealthV8.sources : [];
    const evidenceLinks = sourceRows.slice(0, 8).map((source) => ({
      source: source.source,
      status: source.coverageStatus || source.status,
      lastSuccessfulFetch: source.lastSuccessfulFetch || null,
      fallbackSnapshot: Boolean(source.fallbackSnapshot)
    }));
    const lastEnrichedAt = v5.lastEnrichedAt || row?.match?.context?.generated_at || row?.match?.updated_at || null;
    const dataFreshness = {
      lastEnrichedAt,
      sourceCount: evidenceLinks.length,
      stale: lastEnrichedAt ? Date.now() - Date.parse(lastEnrichedAt) > 4 * 60 * 60 * 1000 : true
    };
    const lineupHome = v5.lineups?.home || {};
    const lineupAway = v5.lineups?.away || {};
    return {
      ...v5,
      schema: 'paris-sportif.match_sheet.v6',
      sportTemplate,
      sectionCompleteness,
      evidenceLinks,
      dataFreshness,
      playerAvailability: {
        homeConfirmed: Boolean(lineupHome.confirmed),
        awayConfirmed: Boolean(lineupAway.confirmed),
        homeStarters: Number(lineupHome.starters?.length || 0),
        awayStarters: Number(lineupAway.starters?.length || 0),
        homeInjuries: Number(v5.injuries?.home?.total || 0),
        awayInjuries: Number(v5.injuries?.away?.total || 0)
      },
      confidenceBreakdown: {
        lineup: Number(v5.lineupConfidence || 0),
        players: Number(v5.playerStatsConfidence || 0),
        teamContext: Number(v5.teamContextConfidence || 0),
        sourceCoverage: Number(v5.sourceCoverageScore || 0)
      },
      sourceWarnings: sourceRows
        .filter((source) => ['critical', 'degraded', 'watch'].includes(source.coverageStatus || source.status))
        .slice(0, 8)
        .map((source) => ({
          source: source.source,
          status: source.coverageStatus || source.status,
          repair: source.repairCommand || null
        }))
    };
  }

  function attachV3Contracts(row, sourceHealthV5, sourceHealthV6 = null, sourceHealthV7 = null, sourceHealthV8 = null) {
    if (!row || typeof row !== 'object') return row;
    const v3 = {
      ...row,
      pickDecisionV3: buildPickDecisionV3(row),
      matchSheetV3: buildMatchSheetV3(row, sourceHealthV5)
    };
    const pickDecisionV4 = buildPickDecisionV4(v3);
    const matchSheetV4 = buildMatchSheetV4(v3, sourceHealthV6 || sourceHealthV5);
    const pickDecisionV5 = buildPickDecisionV5({ ...v3, pickDecisionV4 });
    const matchSheetV5 = buildMatchSheetV5({ ...v3, matchSheetV4 }, sourceHealthV7 || sourceHealthV6 || sourceHealthV5);
    const v5 = { ...v3, pickDecisionV4, matchSheetV4, pickDecisionV5, matchSheetV5 };
    return {
      ...v5,
      pickDecisionV6: buildPickDecisionV6(v5, sourceHealthV8 || sourceHealthV7 || sourceHealthV6 || sourceHealthV5),
      matchSheetV6: buildMatchSheetV6(v5, sourceHealthV8 || sourceHealthV7 || sourceHealthV6 || sourceHealthV5)
    };
  }

  function buildMarketCoverageV2(audit, rows) {
    const simpleFamilies = new Set(['1n2', 'ou', 'btts', 'players', 'tennis', 'sporttotal']);
    const expertFamilies = new Set(['handicap', 'exactscore', 'cards', 'dnb', 'doublechance']);
    const rowFamilies = new Map();
    for (const row of Array.isArray(rows) ? rows : []) {
      const group = simpleMarketGroup(row?.marketKey || row?.market);
      const family = group === 'winner'
        ? '1n2'
        : group === 'goals'
          ? 'ou'
          : group === 'scorer'
            ? 'players'
            : group || canonicalMarketKey(row?.marketKey || row?.market || 'other');
      rowFamilies.set(family, (rowFamilies.get(family) || 0) + 1);
    }
    const families = (Array.isArray(audit?.families) ? audit.families : []).map((family) => {
      const key = String(family.family || 'other');
      const standard = simpleFamilies.has(key) || ['winner', 'goals', 'btts', 'scorer'].includes(key);
      const expert = expertFamilies.has(key);
      const exploited = Number(family.exploited || 0) > 0 || rowFamilies.has(key);
      let ignoredReason = null;
      if (!exploited && expert) ignoredReason = 'Marché avancé réservé au Mode expert';
      if (!exploited && key === 'other') ignoredReason = 'Famille trop large, à mapper avant affichage';
      if (!exploited && standard) ignoredReason = 'Standard disponible mais pas assez de signaux exploitables';
      return {
        family: key,
        label: family.label || formatMarketName(key),
        available: Number(family.count || 0),
        exploited: Math.max(Number(family.exploited || 0), Number(rowFamilies.get(key) || 0)),
        standard,
        expert,
        ignoredReason
      };
    });
    return {
      schema: 'paris-sportif.market_coverage.v2',
      generatedAt: new Date().toISOString(),
      summary: {
        availableFamilies: Number(audit?.summary?.availableFamilies || families.length || 0),
        exploitedFamilies: families.filter((family) => family.exploited > 0).length,
        dormantStandard: families.filter((family) => family.standard && family.exploited <= 0).length,
        expertOnly: families.filter((family) => family.expert).length,
        boostsDetected: Number(audit?.summary?.boostsDetected || 0)
      },
      families
    };
  }

  function buildTerrainReportV2({ data, dashboardRows, todayFunnel, coverage24h, marketCoverageV2, sourceHealthV5, decisionCenter }) {
    const events = eventListFromDays(data?.days || {});
    const today = dayKeyParis(new Date());
    const todayEvents = events.filter((event) => rowDayKey(event) === today);
    const nightSummary = coverage24h?.summary || {};
    const bottlenecks = [];
    if (Number(todayFunnel?.today?.displayed || 0) < 20 && Number(todayFunnel?.today?.bookableEvents || 0) >= 50) {
      bottlenecks.push('Volume visible sous la cible v3 malgré un catalogue riche');
    }
    if (Number(nightSummary.nightBookable || 0) >= 6 && Number(nightSummary.nightDisplayed || 0) < 6) {
      bottlenecks.push('Couverture nuit sous la cible 6-10');
    }
    if (Number(marketCoverageV2?.summary?.dormantStandard || 0) > 0) {
      bottlenecks.push('Familles simples disponibles mais non exploitées');
    }
    if (Number(sourceHealthV5?.summary?.blocksPick || 0) > 0) {
      bottlenecks.push('Une source critique bloque des picks');
    }
    const ready = (dashboardRows || []).filter((row) => row?.pickDecisionV3?.canBet || row?.decisionCenter?.canBet);
    return {
      schema: 'paris-sportif.terrain_report.v2',
      generatedAt: new Date().toISOString(),
      counts: {
        todayEvents: todayEvents.length,
        todayWinamax: todayEvents.filter((event) => event?.winamax?.available === true).length,
        displayed24h: rollingWindowRows(dashboardRows || [], 24).length,
        dashboardRows: (dashboardRows || []).length,
        ready: ready.length,
        watch: (dashboardRows || []).filter((row) => !ready.includes(row)).length,
        nightDisplayed: Number(nightSummary.nightDisplayed || 0),
        nightBookable: Number(nightSummary.nightBookable || 0)
      },
      health: {
        sourcesCritical: Number(sourceHealthV5?.summary?.critical || 0),
        sourcesWarning: Number(sourceHealthV5?.summary?.warning || 0),
        decisionBlocked: Boolean(decisionCenter?.summary?.blocked)
      },
      bottlenecks,
      userPromise: {
        visible24hTarget: '20-30',
        readyTarget: '10-15 si catalogue exploitable',
        nightTarget: '6-10 si events nuit suffisants',
        homepage: 'Top 3 + tableau triable + catégories'
      }
    };
  }

  function buildTerrainReportV3({ data, dashboardRows, todayFunnel, coverage24h, marketCoverageV2, sourceHealthV6, decisionCenter, criticalIssueReport, coverageRepairEngine }) {
    const events = eventListFromDays(data?.days || {});
    const today = dayKeyParis(new Date());
    const todayEvents = events.filter((event) => rowDayKey(event) === today);
    const readyRows = (dashboardRows || []).filter((row) => row?.pickDecisionV4?.canBet || row?.decisionCenter?.canBet);
    const watchRows = (dashboardRows || []).filter((row) => !readyRows.includes(row));
    const marketCounts = {};
    const sportCounts = {};
    const readyMarketCounts = {};
    for (const row of dashboardRows || []) {
      const market = simpleMarketGroup(row?.marketKey || row?.market) || canonicalMarketKey(row?.marketKey || row?.market || 'other');
      const sport = String(row?.sport || row?.match?.sport || 'sport').toLowerCase();
      marketCounts[market] = (marketCounts[market] || 0) + 1;
      sportCounts[sport] = (sportCounts[sport] || 0) + 1;
      if (row?.decisionCenter?.canBet) readyMarketCounts[market] = (readyMarketCounts[market] || 0) + 1;
    }
    const coverage = coverage24h?.summary || {};
    const funnel = todayFunnel?.today || {};
    const issues = [];
    if (Number(funnel.bookableEvents || 0) >= 50 && Number(funnel.ready || 0) < 10) issues.push('Trop peu de vrais paris prêts pour un catalogue riche');
    if (Number(coverage.nightBookable || 0) >= 6 && Number(coverage.nightReady || 0) < 3) issues.push('Nuit visible mais pas assez actionnable');
    if (Number(criticalIssueReport?.summary?.critical || 0) > 0) issues.push(criticalIssueReport.summary.first || 'Dossiers critiques');
    if (Number(sourceHealthV6?.summary?.degraded || 0) > 0) issues.push('Sources dégradées à réparer');
    const repairActions = Array.isArray(coverageRepairEngine?.actions) ? coverageRepairEngine.actions : [];
    return {
      schema: 'paris-sportif.terrain_report.v3',
      generatedAt: new Date().toISOString(),
      counts: {
        todayEvents: todayEvents.length,
        todayWinamax: todayEvents.filter((event) => event?.winamax?.available === true).length,
        displayed24h: rollingWindowRows(dashboardRows || [], 24).length,
        dashboardRows: (dashboardRows || []).length,
        ready: readyRows.length,
        watch: watchRows.length,
        nightDisplayed: Number(coverage.nightDisplayed || 0),
        nightBookable: Number(coverage.nightBookable || 0),
        nightReady: Number(coverage.nightReady || 0),
        positiveToday: Number(funnel.positiveSimplePassingFilters || 0),
        simpleReadyToday: Number(funnel.simpleReady || 0)
      },
      distribution: {
        marketCounts,
        readyMarketCounts,
        sportCounts,
        winnerShare: (dashboardRows || []).length ? Number(((marketCounts.winner || 0) / dashboardRows.length).toFixed(3)) : 0,
        goalsShare: (dashboardRows || []).length ? Number((((marketCounts.goals || 0) + (marketCounts.btts || 0)) / dashboardRows.length).toFixed(3)) : 0
      },
      uxChecks: {
        homepageTarget: 'Top 3 + tableau triable + catégories',
        diagnosticsShouldStayInExpert: true,
        hideEmptySections: true,
        actionCopyRequired: 'PARI / COTE / MISE',
        noDrawStandard: true
      },
      health: {
        sourceHealth: sourceHealthV6?.summary || null,
        decisionBlocked: Boolean(decisionCenter?.summary?.blocked),
        criticalIssues: Number(criticalIssueReport?.summary?.critical || 0)
      },
      sourceGaps: repairActions.slice(0, 8).map((action) => ({
        source: action.source || action.raw_source,
        priority: action.priority,
        affectedMatches: Number(action.affected_matches || 0),
        currentRate: action.current_rate ?? null,
        targetRate: action.target_rate ?? null,
        estimatedGain: Number(action.estimated_gain || 0),
        command: Array.isArray(action.command) ? action.command.join(' ') : null
      })),
      issues,
      targets: {
        visible24h: '25-35',
        ready: '12-18 si contexte suffisant',
        night: '6-10 si events suffisants',
        winnerShare: '35-50%',
        maxGoalsShare: '35%'
      }
    };
  }

  function buildTerrainReportV4({ data, dashboardRows, todayFunnel, coverage24h, marketCoverageV2, sourceHealthV7, decisionCenter, criticalIssueReport, coverageRepairEngine }) {
    const v3 = buildTerrainReportV3({
      data,
      dashboardRows,
      todayFunnel,
      coverage24h,
      marketCoverageV2,
      sourceHealthV6: sourceHealthV7,
      decisionCenter,
      criticalIssueReport,
      coverageRepairEngine
    });
    const rows = Array.isArray(dashboardRows) ? dashboardRows : [];
    const readyRows = rows.filter((row) => row?.pickDecisionV5?.canBet || row?.decisionCenter?.canBet);
    const watchRows = rows.filter((row) => !readyRows.includes(row));
    const top3 = readyRows.slice(0, 3).map((row) => ({
      id: row.id,
      title: row.title,
      market: row.pickDecisionV5?.marketFamily || row.market,
      label: row.label,
      odd: row.odd,
      confidence: row.pickDecisionV5?.confidence ?? row.probability,
      stake: row.pickDecisionV5?.stake ?? row.decisionCenter?.stake ?? 0,
      why: row.pickDecisionV5?.userCopy?.short || row.pickDecisionV4?.whyShort || ''
    }));
    const hiddenSections = rows.flatMap((row) => Array.isArray(row?.matchSheetV5?.hiddenSections) ? row.matchSheetV5.hiddenSections : []);
    const emptyBySection = {};
    for (const item of hiddenSections) {
      if (!item?.section) continue;
      emptyBySection[item.section] = (emptyBySection[item.section] || 0) + 1;
    }
    const repairActions = Array.isArray(coverageRepairEngine?.actions) ? coverageRepairEngine.actions : [];
    const seenRepair = new Set();
    const actionableNextRepairs = repairActions
      .filter((action) => action && (action.priority === 'critical' || action.priority === 'high'))
      .filter((action) => {
        const key = String(action.source || action.raw_source || '');
        if (!key || seenRepair.has(key)) return false;
        seenRepair.add(key);
        return true;
      })
      .slice(0, 8)
      .map((action) => ({
        source: action.source || action.raw_source,
        priority: action.priority,
        affectedMatches: Number(action.affected_matches || 0),
        estimatedGain: Number(action.estimated_gain || 0),
        command: Array.isArray(action.command) ? action.command.join(' ') : null
      }));
    const coverage = coverage24h?.summary || {};
    const userVisibleBugs = [];
    if (readyRows.length < 10 && Number(todayFunnel?.today?.bookableEvents || 0) >= 30) userVisibleBugs.push('Trop peu de vrais boutons Je mise');
    if (Number(coverage.nightBookable || 0) >= 6 && Number(coverage.nightReady || 0) < 3) userVisibleBugs.push('Nuit visible mais pas assez prête');
    if (Object.keys(emptyBySection).length) userVisibleBugs.push('Certaines fiches masquent encore des sections faute de donnée fiable');
    if (Number(sourceHealthV7?.summary?.autoRepairable || 0) > 0) userVisibleBugs.push('Sources à réparer automatiquement avant de durcir le modèle');
    return {
      ...v3,
      schema: 'paris-sportif.terrain_report.v4',
      quickBetSummary: {
        top3,
        ready: readyRows.length,
        watch: watchRows.length,
        message: readyRows.length >= 10
          ? `${readyRows.length} paris prêts : journée actionnable`
          : `${readyRows.length} paris prêts : réparer le contexte avant d'élargir les mises`
      },
      nightSummary: {
        bookable: Number(coverage.nightBookable || 0),
        predictable: Number(coverage.nightPredictable || 0),
        positive: Number(coverage.nightPositive || 0),
        displayed: Number(coverage.nightDisplayed || 0),
        ready: Number(coverage.nightReady || 0),
        status: Number(coverage.nightReady || 0) >= 3 ? 'actionable' : Number(coverage.nightDisplayed || 0) ? 'watch' : 'empty'
      },
      userVisibleBugs,
      emptySections: Object.entries(emptyBySection).map(([section, count]) => ({ section, count })).sort((a, b) => b.count - a.count),
      screenshots: {
        expectedHome: 'captures/desktop-sprint23-picks.png',
        expectedSheet: 'captures/desktop-sprint34-ultra-fiche.png'
      },
      actionableNextRepairs,
      sourceHealth: sourceHealthV7?.summary || null
    };
  }

  function buildTerrainReportV5({ data, dashboardRows, todayFunnel, coverage24h, marketCoverageV2, sourceHealthV8, decisionCenter, criticalIssueReport, coverageRepairEngine, engineLoadMs }) {
    const v4 = buildTerrainReportV4({
      data,
      dashboardRows,
      todayFunnel,
      coverage24h,
      marketCoverageV2,
      sourceHealthV7: sourceHealthV8,
      decisionCenter,
      criticalIssueReport,
      coverageRepairEngine
    });
    const rows = Array.isArray(dashboardRows) ? dashboardRows : [];
    const readyRows = rows.filter((row) => row?.pickDecisionV6?.canBet || row?.decisionCenter?.canBet);
    const watchRows = rows.filter((row) => !readyRows.includes(row));
    const bySport = {};
    const byMarket = {};
    const byLeague = {};
    const emptySections = {};
    for (const row of rows) {
      const sport = String(row?.sport || row?.match?.sport || 'sport').toLowerCase();
      const market = simpleMarketGroup(row?.marketKey || row?.market) || canonicalMarketKey(row?.marketKey || row?.market || 'market');
      const league = compactKey(row?.match?.league_code || row?.league || row?.match?.league_name || 'league');
      bySport[sport] = (bySport[sport] || 0) + 1;
      byMarket[market] = (byMarket[market] || 0) + 1;
      byLeague[league] = (byLeague[league] || 0) + 1;
      for (const section of Array.isArray(row?.matchSheetV6?.sectionCompleteness) ? row.matchSheetV6.sectionCompleteness : []) {
        if (section.status === 'missing_required' || section.status === 'hidden_optional') {
          emptySections[section.section] = (emptySections[section.section] || 0) + 1;
        }
      }
    }
    const coverage = coverage24h?.summary || {};
    const sourceSummary = sourceHealthV8?.summary || {};
    const userVisibleBugs = [...new Set([
      ...(Array.isArray(v4.userVisibleBugs) ? v4.userVisibleBugs : []),
      readyRows.length < 10 && Number(todayFunnel?.today?.bookableEvents || 0) >= 30 ? 'Trop peu de vrais boutons Je mise' : null,
      Number(coverage.nightBookable || 0) >= 6 && Number(coverage.nightReady || 0) < 3 ? 'Nuit non actionnable malgré stock visible' : null,
      Number(sourceSummary.coverageCritical || 0) > 0 ? 'Sources techniquement OK mais couverture métier critique' : null
    ].filter(Boolean))];
    const repairActions = Array.isArray(coverageRepairEngine?.actions) ? coverageRepairEngine.actions : [];
    return {
      ...v4,
      schema: 'paris-sportif.terrain_report.v5',
      quickBetSummary: {
        ...v4.quickBetSummary,
        top3: readyRows.slice(0, 3).map((row) => ({
          id: row.id,
          title: row.title,
          market: row.pickDecisionV6?.marketFamily || row.market,
          label: row.label,
          odd: row.odd,
          confidence: row.pickDecisionV6?.confidence ?? row.probability,
          readiness: row.pickDecisionV6?.betReadinessScore ?? null,
          stake: row.pickDecisionV6?.stake ?? row.decisionCenter?.stake ?? 0,
          why: row.pickDecisionV6?.userFastCopy || row.pickDecisionV5?.userCopy?.short || ''
        })),
        ready: readyRows.length,
        watch: watchRows.length
      },
      volumeAudit: {
        events24h: Number(coverage.events || 0),
        bookable24h: Number(coverage.bookable || 0),
        positive24h: Number(coverage.positive || 0),
        displayed24h: Number(coverage.displayed || 0),
        ready24h: Number(coverage.ready || 0),
        cockpitRows: rows.length,
        engineLoadMs: Number(engineLoadMs || 0) || null
      },
      nightAudit: {
        bookable: Number(coverage.nightBookable || 0),
        positive: Number(coverage.nightPositive || 0),
        displayed: Number(coverage.nightDisplayed || 0),
        ready: Number(coverage.nightReady || 0),
        unlock: Number(coverage.nightReady || 0) >= 3 ? 'ok' : sourceSummary.firstRepair ? `Réparer ${sourceSummary.firstRepair}` : 'signal insuffisant'
      },
      varietyAudit: {
        bySport,
        byMarket,
        byLeague,
        winnerShare: rows.length ? Number(((byMarket.winner || 0) / rows.length).toFixed(3)) : 0,
        goalsShare: rows.length ? Number((((byMarket.goals || 0) + (byMarket.btts || 0)) / rows.length).toFixed(3)) : 0
      },
      userVisibleBugs,
      emptySections: Object.entries(emptySections).map(([section, count]) => ({ section, count })).sort((a, b) => b.count - a.count),
      screenshotPlan: [
        'accueil_top3_tableau_categories',
        'fiche_football_v6',
        'fiche_tennis_v6',
        'source_health_v8',
        'terrain_report_v5'
      ],
      consoleAudit: {
        expectedBootErrors: 0,
        expectedUsageErrors: 0,
        note: 'Mesuré par qa:terrain/Playwright pendant validation finale'
      },
      actionableNextRepairs: repairActions.slice(0, 10).map((action) => ({
        source: action.source || action.raw_source,
        priority: action.priority,
        affectedMatches: Number(action.affected_matches || 0),
        estimatedGain: Number(action.estimated_gain || 0),
        command: Array.isArray(action.command) ? action.command.join(' ') : null
      })),
      sourceHealth: sourceSummary
    };
  }

  function buildTerrainReportV8({ terrainReportV5, sourceHealthV9, engineLoadMs }) {
    const report = terrainReportV5 || {};
    const quick = report.quickBetSummary || {};
    const volume = report.volumeAudit || {};
    const night = report.nightAudit || {};
    const sources = sourceHealthV9?.summary || {};
    const ready = Number(quick.ready || volume.ready24h || 0);
    const watch = Number(quick.watch || 0);
    const cockpitRows = Number(volume.cockpitRows || report.counts?.dashboardRows || 0);
    const displayed24h = Number(volume.displayed24h || 0);
    const sourceBlocked = Number(sources.blockedReadyCount || 0);
    const whyNotMore = [];
    if (ready < 5) whyNotMore.push('Le logiciel garde peu de boutons car les pertes récentes et les sources faibles imposent un filtre strict.');
    if (sourceBlocked > 0) whyNotMore.push(`${sourceBlocked} ligne(s) sont bloquées ou déclassées par des données contexte à réparer.`);
    if (Number(night.ready || 0) === 0 && Number(night.displayed || 0) > 0) whyNotMore.push('La nuit est visible, mais pas actionnable sans contexte sport spécifique assez solide.');
    if (!whyNotMore.length) whyNotMore.push('Le volume prêt est cohérent avec les garde-fous actuels.');
    const top3 = Array.isArray(quick.top3) ? quick.top3.slice(0, 3) : [];
    return {
      schema: 'paris-sportif.terrain_report.v8',
      generatedAt: new Date().toISOString(),
      quickBetSummary: {
        top3,
        ready,
        watch,
        cockpitRows,
        displayed24h,
        whyNotMore,
        userCopy: ready > 0
          ? `${ready} pari(s) vraiment prêts, ${watch} à surveiller.`
          : `Aucun bouton sûr pour l’instant, ${watch} ligne(s) restent à surveiller.`
      },
      speedSummary: {
        engineLoadMs: Number(engineLoadMs || volume.engineLoadMs || 0) || null,
        targets: {
          cachedAppVisible: '< 2s',
          instantRefresh: '< 30s cache local',
          fastRefresh: '< 45s sources essentielles',
          deepRefresh: 'arrière-plan ou réparation ciblée'
        }
      },
      nightSummary: {
        bookable: Number(night.bookable || 0),
        displayed: Number(night.displayed || 0),
        ready: Number(night.ready || 0),
        unlockReason: night.unlock || 'non mesuré'
      },
      sourceSummary: sources,
      visibleBugs: Array.isArray(report.userVisibleBugs) ? report.userVisibleBugs.slice(0, 12) : [],
      emptySections: Array.isArray(report.emptySections) ? report.emptySections.slice(0, 12) : [],
      actionPlan: [
        sources.firstRepair ? `Réparer ${sources.firstRepair}` : null,
        ready < 5 ? 'Garder le mode prudent après pertes utilisateur' : null,
        Number(night.ready || 0) < 2 && Number(night.displayed || 0) > 0 ? 'Débloquer nuit par pitcher/goalie/stars plutôt que par assouplissement aveugle' : null,
        'Top 3 limité aux vrais paris prêts'
      ].filter(Boolean),
      acceptance: {
        noFakeReady: true,
        noDrawStandard: true,
        winamaxOnlyOdds: true,
        emptySectionsHidden: true,
        quickHomeOnlyTop3TableCategories: true
      }
    };
  }

  function buildModelBacktestV4({ contextBacktestReport, decisionBacktestReport, modelLabReport, probabilityCalibrationReport, dashboardRows }) {
    const markets = Array.isArray(modelLabReport?.by_market) ? modelLabReport.by_market : [];
    const sports = Array.isArray(modelLabReport?.by_sport) ? modelLabReport.by_sport : [];
    const leagues = Array.isArray(modelLabReport?.by_league) ? modelLabReport.by_league : [];
    const timeBuckets = Array.isArray(modelLabReport?.by_time_bucket) ? modelLabReport.by_time_bucket : [];
    const dashboardMarkets = {};
    for (const row of dashboardRows || []) {
      const market = simpleMarketGroup(row?.marketKey || row?.market) || canonicalMarketKey(row?.marketKey || row?.market || 'other');
      dashboardMarkets[market] = (dashboardMarkets[market] || 0) + 1;
    }
    return {
      schema: 'paris-sportif.model_backtest.v4',
      generatedAt: new Date().toISOString(),
      summary: {
        settled: Number(modelLabReport?.summary?.settled_rows || decisionBacktestReport?.summary?.settled || contextBacktestReport?.summary?.settled || 0),
        roi: Number(modelLabReport?.summary?.roi ?? decisionBacktestReport?.summary?.roi ?? 0),
        brier: Number(modelLabReport?.summary?.brier ?? probabilityCalibrationReport?.summary?.brier ?? 0),
        calibrationBuckets: Number(probabilityCalibrationReport?.summary?.usable_buckets || 0),
        currentDashboardMarkets: dashboardMarkets
      },
      dimensions: {
        bySport: sports.slice(0, 20),
        byMarket: markets.slice(0, 20),
        byLeague: leagues.slice(0, 20),
        byTimeBucket: timeBuckets.slice(0, 12),
        bySourceQuality: Array.isArray(contextBacktestReport?.by_tier) ? contextBacktestReport.by_tier : []
      },
      guardrails: {
        noNegativeEdgeReady: true,
        sourceQualityBlocksBet: true,
        drawStandardBlocked: true,
        complexMarketsExpertOnly: true
      }
    };
  }

  function buildModelBacktestV5({ contextBacktestReport, decisionBacktestReport, modelLabReport, probabilityCalibrationReport, dashboardRows }) {
    const v4 = buildModelBacktestV4({ contextBacktestReport, decisionBacktestReport, modelLabReport, probabilityCalibrationReport, dashboardRows });
    const rows = Array.isArray(dashboardRows) ? dashboardRows : [];
    const groupRows = (keyFn) => {
      const map = new Map();
      for (const row of rows) {
        const key = keyFn(row);
        const bucket = map.get(key) || { key, sample: 0, ready: 0, watch: 0, avgConfidence: 0, avgEdge: 0 };
        bucket.sample += 1;
        if (row?.decisionCenter?.canBet) bucket.ready += 1;
        else bucket.watch += 1;
        bucket.avgConfidence += Number(row?.pickDecisionV5?.confidence ?? row?.probability ?? 0) || 0;
        bucket.avgEdge += Number(row?.pickDecisionV5?.edge ?? row?.edge ?? 0) || 0;
        map.set(key, bucket);
      }
      return Array.from(map.values()).map((bucket) => ({
        ...bucket,
        avgConfidence: bucket.sample ? bucket.avgConfidence / bucket.sample : 0,
        avgEdge: bucket.sample ? bucket.avgEdge / bucket.sample : 0,
        roi: null,
        wr: null,
        brier: null
      })).sort((a, b) => b.sample - a.sample || a.key.localeCompare(b.key));
    };
    return {
      ...v4,
      schema: 'paris-sportif.model_backtest.v5',
      dimensions: {
        ...v4.dimensions,
        bySourceQuality: groupRows((row) => row?.pickDecisionV5?.sourceQuality?.tier || 'inconnu'),
        byDecisionStatus: groupRows((row) => row?.pickDecisionV5?.status || row?.decisionCenter?.status || 'unknown'),
        byWinamaxRuleFlags: groupRows((row) => row?.pickDecisionV5?.winamaxRuleFlags?.twoGoalEarlyPayout ? 'two_goal_early_payout' : 'standard'),
        byHourBucket: groupRows((row) => hourBucketKey(parisHour(row?.start || row?.date)))
      },
      acceptance: {
        readyRequiresPositiveEdge: true,
        noInventedData: true,
        winamaxOddsOnly: true,
        complexStandardBlocked: true
      }
    };
  }

  function buildModelBacktestV6({ contextBacktestReport, decisionBacktestReport, modelLabReport, probabilityCalibrationReport, dashboardRows }) {
    const v5 = buildModelBacktestV5({ contextBacktestReport, decisionBacktestReport, modelLabReport, probabilityCalibrationReport, dashboardRows });
    const rows = Array.isArray(dashboardRows) ? dashboardRows : [];
    const groupRows = (keyFn) => {
      const map = new Map();
      for (const row of rows) {
        const key = String(keyFn(row) || 'unknown');
        const bucket = map.get(key) || { key, sample: 0, ready: 0, watch: 0, avgReadiness: 0, avgConfidence: 0, avgEdge: 0 };
        bucket.sample += 1;
        if (row?.pickDecisionV6?.canBet || row?.decisionCenter?.canBet) bucket.ready += 1;
        else bucket.watch += 1;
        bucket.avgReadiness += Number(row?.pickDecisionV6?.betReadinessScore || 0) || 0;
        bucket.avgConfidence += Number(row?.pickDecisionV6?.confidence ?? row?.probability ?? 0) || 0;
        bucket.avgEdge += Number(row?.pickDecisionV6?.edge ?? row?.edge ?? 0) || 0;
        map.set(key, bucket);
      }
      return Array.from(map.values()).map((bucket) => ({
        ...bucket,
        avgReadiness: bucket.sample ? bucket.avgReadiness / bucket.sample : 0,
        avgConfidence: bucket.sample ? bucket.avgConfidence / bucket.sample : 0,
        avgEdge: bucket.sample ? bucket.avgEdge / bucket.sample : 0,
        roi: null,
        wr: null,
        brier: null
      })).sort((a, b) => b.ready - a.ready || b.sample - a.sample || a.key.localeCompare(b.key));
    };
    return {
      ...v5,
      schema: 'paris-sportif.model_backtest.v6',
      dimensions: {
        ...v5.dimensions,
        bySport: groupRows((row) => String(row?.sport || row?.match?.sport || 'sport').toLowerCase()),
        byMarket: groupRows((row) => simpleMarketGroup(row?.marketKey || row?.market) || canonicalMarketKey(row?.marketKey || row?.market || 'market')),
        byLeague: groupRows((row) => compactKey(row?.match?.league_code || row?.league || row?.match?.league_name || 'league')),
        byHour: groupRows((row) => hourBucketKey(parisHour(row?.start || row?.date))),
        bySourceQuality: groupRows((row) => row?.pickDecisionV6?.sourceQuality?.tier || 'inconnu'),
        byDecisionStatus: groupRows((row) => row?.pickDecisionV6?.status || row?.decisionCenter?.status || 'unknown'),
        byWinamax2Goal: groupRows((row) => row?.pickDecisionV6?.twoGoalRuleTrace?.eligible ? 'two_goal_early_payout' : 'standard')
      },
      guardrails: {
        ...v5.guardrails,
        readinessScoreRequired: true,
        sourceRepairTraceRequired: true,
        nightUnlockReasonRequired: true
      },
      acceptance: {
        ...v5.acceptance,
        noForcedVolume: true,
        sourceCoverageMustExplainBlockedReady: true
      }
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
      return { key: 'kelly_zero', label: 'Mise non recommandée' };
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

  function getAnalysis({ bankroll = 50, force = false, homeOnly = false } = {}) {
    const safeBankroll = Number.isFinite(Number(bankroll)) && Number(bankroll) > 0 ? Number(bankroll) : 50;
    const analysisKey = `${fileKey()}:bankroll:${safeBankroll.toFixed(2)}`;
    if (!force && analysisCache && analysisCacheKey === analysisKey && !(analysisCache.homeOnly && !homeOnly)) return analysisCache;
    if (!force) {
      const snapshot = homeOnly
        ? (readAnalysisSnapshot(analysisKey, homeAnalysisSnapshotPath) || readAnalysisSnapshot(analysisKey))
        : readAnalysisSnapshot(analysisKey);
      if (snapshot) {
        analysisCache = snapshot;
        analysisCacheKey = analysisKey;
        return snapshot;
      }
    }
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
    const healthReport = readHealthReport();
    const sourceHealthV5 = buildSourceHealthV5(sourceHealthReport, healthReport);
    const sourceHealthV6 = buildSourceHealthV6(sourceHealthV5, coverageRepairEngineReport, sourceCoverageTargetsReport);
    const sourceHealthV7 = buildSourceHealthV7(sourceHealthV6, coverageRepairEngineReport, sourceCoverageTargetsReport);
    const sourceHealthV8 = buildSourceHealthV8(sourceHealthV7, sourceHealthReport, healthReport, coverageRepairEngineReport, sourceCoverageTargetsReport);
    const sourceHealthV9 = buildSourceHealthV9(sourceHealthV8);
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
      .map((row) => applyRivalryContext(row))
      .map((row) => applyHistoricalContext(row))
      .map((row) => applyDecisionAndMarketTiming(row, clvSummaryReport, decisionTuningReport))
      .map((row) => applyOddsGuardrails(row, oddsGuardrailsReport))
      .map((row) => applyStakePrudence(row, agentGuardrailRecommendationsReport, stakeReductionBacktestReport))
      .map((row) => applySignalConflict(row, signalConflictBacktestReport));
    const primaryBaseRows = baseRows.filter((row) => !row.isMarketAlternative);
    const candidateAgentPositions = buildAgentPositions(win, primaryBaseRows);
    const prebetGate = prebetGateForReport(prebetChecklistReport);
    const criticalGate = criticalGateForReport(criticalIssueReport, data);
    const decisionGates = { prebet: prebetGate, critical: criticalGate };
    const allDecisionRows = baseRows
      .map((row) => applyPrebetGate(row, prebetChecklistReport))
      .map((row) => applyDecisionCenter(row, decisionGates))
      .map((row) => applyWinamaxProductLayer(row))
      .map((row) => applySafeReliabilityLayer(row))
      .map((row) => applyCapitalProtectionLayer(row, safeBankroll));
    const prioritizedDecisionRows = applyPriorityScores(allDecisionRows)
      .map((row) => attachV3Contracts(row, sourceHealthV5, sourceHealthV6, sourceHealthV7, sourceHealthV8));
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
        return (rankingEdgeValue(b) - rankingEdgeValue(a)) ||
          (Number(b.priorityScore || 0) - Number(a.priorityScore || 0)) ||
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
      .filter((row) => isDashboardDisplayCandidate(row) || isNightCoverageCandidate(row))
      .sort((a, b) => {
        const aWindow = rollingWindowRows([a], 24).length ? 1 : 0;
        const bWindow = rollingWindowRows([b], 24).length ? 1 : 0;
        if (bWindow !== aWindow) return bWindow - aWindow;
        const readyDelta = Number(Boolean(b.decisionCenter?.canBet)) - Number(Boolean(a.decisionCenter?.canBet));
        if (readyDelta) return readyDelta;
        return (rankingEdgeValue(b) - rankingEdgeValue(a)) ||
          (Number(b.priorityScore || 0) - Number(a.priorityScore || 0)) ||
          (Number(b.safeConfidence ?? b.probability ?? 0) - Number(a.safeConfidence ?? a.probability ?? 0)) ||
          (Date.parse(a.start || '') - Date.parse(b.start || ''));
      });
    const dashboard = buildDashboardPicks(dashboardCandidates);
    const todayFunnel = buildTodayFunnel(data, matches, dashboardCandidates, dashboard.rows);
    const coverage24h = buildRolling24hCoverage(data, matches, dashboardCandidates, dashboard.rows);
    const winamaxMarketAudit = buildWinamaxMarketAudit(enrichedEvents, prioritizedDecisionRows);
    const marketCoverageV2 = buildMarketCoverageV2(winamaxMarketAudit, prioritizedDecisionRows);
    const decisionCenter = buildDecisionCenterReport(prioritizedDecisionRows, decisionGates);
    if (homeOnly) {
      const analysis = {
        ok: true,
        homeOnly: true,
        generatedAt: data.generated_at || null,
        loadedAt: engine.loadedAt,
        loadMs: engine.loadMs,
        cache: { source: 'fresh-home', cachedAt: new Date().toISOString() },
        counts: {
          matches: matches.length,
          picks: dashboard.rows.length,
          dashboardPicks: dashboard.rows.length,
          combines: 0,
          scorers: scorers.length
        },
        matchesCount: matches.length,
        dashboardPicks: dashboard.rows,
        picks: dashboard.rows,
        dashboardMeta: {
          mode: dashboard.mode,
          horizonHours: dashboard.horizonHours,
          todayPicks: dashboard.todayPicks || 0,
          todayReady: dashboard.todayReady || 0,
          totalPicks: dashboard.rows.length,
          readyPicks: dashboard.rows.filter((row) => row?.decisionCenter?.canBet).length,
          rolling24Picks: dashboard.rolling24Picks || 0,
          rolling24Displayed: dashboard.rolling24Displayed || 0,
          rolling24Target: dashboard.rolling24Target || 0,
          blocked: decisionCenter.summary.blocked,
          qualityPolicy: dashboard.qualityPolicy || null
        },
        sourceHealthV5,
        sourceHealthV6,
        sourceHealthV7,
        sourceHealthV8,
        sourceHealthV9,
        todayFunnel,
        coverage24h,
        decisionCenter,
        winamaxMarketAudit,
        marketCoverageV2,
        prematchPlan: { autoDue: 0, next: null, enabledByDefault: true }
      };
      analysisCache = analysis;
      analysisCacheKey = analysisKey;
      writeAnalysisSnapshot(analysisKey, analysis, homeAnalysisSnapshotPath);
      return analysis;
    }
    const combines = buildNativeCombines(win, enrichedEvents);
    const watchlist = buildWatchlist(matches);
    const agentPositions = prebetGate.blocked || criticalGate.blocked ? [] : buildAgentPositions(win, matches);
    const agentBlockers = buildAgentBlockers(matches, agentPositions, win);
    const terrainReportV2 = buildTerrainReportV2({
      data,
      dashboardRows: dashboard.rows,
      todayFunnel,
      coverage24h,
      marketCoverageV2,
      sourceHealthV5,
      decisionCenter
    });
    const terrainReportV3 = buildTerrainReportV3({
      data,
      dashboardRows: dashboard.rows,
      todayFunnel,
      coverage24h,
      marketCoverageV2,
      sourceHealthV6,
      decisionCenter,
      criticalIssueReport,
      coverageRepairEngine: coverageRepairEngineReport
    });
    const terrainReportV4 = buildTerrainReportV4({
      data,
      dashboardRows: dashboard.rows,
      todayFunnel,
      coverage24h,
      marketCoverageV2,
      sourceHealthV7,
      decisionCenter,
      criticalIssueReport,
      coverageRepairEngine: coverageRepairEngineReport
    });
    const terrainReportV5 = buildTerrainReportV5({
      data,
      dashboardRows: dashboard.rows,
      todayFunnel,
      coverage24h,
      marketCoverageV2,
      sourceHealthV8,
      decisionCenter,
      criticalIssueReport,
      coverageRepairEngine: coverageRepairEngineReport,
      engineLoadMs: engine.loadMs
    });
    const terrainReportV8 = buildTerrainReportV8({
      terrainReportV5,
      sourceHealthV9,
      engineLoadMs: engine.loadMs
    });
    const modelBacktestV4 = buildModelBacktestV4({
      contextBacktestReport,
      decisionBacktestReport,
      modelLabReport,
      probabilityCalibrationReport,
      dashboardRows: dashboard.rows
    });
    const modelBacktestV5 = buildModelBacktestV5({
      contextBacktestReport,
      decisionBacktestReport,
      modelLabReport,
      probabilityCalibrationReport,
      dashboardRows: dashboard.rows
    });
    const modelBacktestV6 = buildModelBacktestV6({
      contextBacktestReport,
      decisionBacktestReport,
      modelLabReport,
      probabilityCalibrationReport,
      dashboardRows: dashboard.rows
    });

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
      marketCoverageV2,
      todayFunnel,
      coverage24h,
      sourceHealthV5,
      sourceHealthV6,
      sourceHealthV7,
      sourceHealthV8,
      sourceHealthV9,
      terrainReportV2,
      terrainReportV3,
      terrainReportV4,
      terrainReportV5,
      terrainReportV8,
      modelBacktestV4,
      modelBacktestV5,
      modelBacktestV6,
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
    writeAnalysisSnapshot(analysisKey, analysis);
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
