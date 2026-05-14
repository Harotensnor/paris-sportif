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
  const v5FixCampaignPath = path.join(root, 'v5_fix_campaign_report.json');
  const v5DeadFileManifestPath = path.join(root, 'v5_dead_file_manifest.json');
  const v5PickReconciliationPath = path.join(root, 'v5_pick_reconciliation.json');
  const v5UiBugReportPath = path.join(root, 'v5_ui_bug_report.json');
  const v5RefreshRepairReportPath = path.join(root, 'v5_refresh_repair_report.json');
  const v5BacktestSanityReportPath = path.join(root, 'v5_backtest_sanity_report.json');
  const v6CoverageBoostPath = path.join(root, 'v6_coverage_boost_report.json');
  const v6TeamMatchingFailuresPath = path.join(root, 'v6_team_matching_failures.json');
  const v6SourceGainPath = path.join(root, 'v6_source_gain_report.json');
  const v6ProfitEnginePath = path.join(root, 'v6_profit_engine_report.json');
  const v6BacktestCleanRoomPath = path.join(root, 'v6_backtest_clean_room.json');
  const v6FinalBetTicketPath = path.join(root, 'v6_final_bet_ticket.json');
  const v6ControlRoomPath = path.join(root, 'v6_control_room_report.json');
  const v7RedToGreenPath = path.join(root, 'v7_red_to_green_report.json');
  const v7ActionQueuePath = path.join(root, 'v7_action_queue.json');
  const v7ActualCoveragePath = path.join(root, 'v7_actual_coverage_report.json');
  const v7SourceAbsencePath = path.join(root, 'v7_source_absence_report.json');
  const v7EdgeReleasePath = path.join(root, 'v7_edge_release_report.json');
  const v7StakingPolicyPath = path.join(root, 'v7_staking_policy_report.json');
  const v8DecisionFeedPath = path.join(root, 'v8_decision_feed_report.json');
  const v8NowNextTicketPath = path.join(root, 'v8_now_next_ticket.json');
  const v8CoverageRescuePath = path.join(root, 'v8_coverage_rescue_report.json');
  const v8ProxyStrengthPath = path.join(root, 'v8_proxy_strength_report.json');
  const v8UiConsistencyPath = path.join(root, 'v8_ui_consistency_report.json');
  const v8MatchSheetPath = path.join(root, 'v8_match_sheet_report.json');
  const v8ControlRoomPath = path.join(root, 'v8_control_room_report.json');
  const v9ReadyUnlockPath = path.join(root, 'v9_ready_unlock_report.json');
  const v9BlockerMatrixPath = path.join(root, 'v9_blocker_matrix.json');
  const v9RepairExecutionPath = path.join(root, 'v9_repair_execution_report.json');
  const v9CoverageAfterRepairPath = path.join(root, 'v9_coverage_after_repair.json');
  const v9SourceBlockersPath = path.join(root, 'v9_source_blockers_by_match.json');
  const v9FinalizerPath = path.join(root, 'v9_finalizer_report.json');
  const v9FinalTicketPath = path.join(root, 'v9_final_ticket.json');
  const v9ProfitGatePath = path.join(root, 'v9_profit_gate_report.json');
  const v9ClvMarketPressurePath = path.join(root, 'v9_clv_market_pressure.json');
  const v10DecisionFeedPath = path.join(root, 'v10_decision_feed.json');
  const v10FinalBetTicketPath = path.join(root, 'v10_final_bet_ticket.json');
  const v10T10GatePath = path.join(root, 'v10_t10_gate_report.json');
  const v10BlockerResolutionPath = path.join(root, 'v10_blocker_resolution_report.json');
  const v10SignalRescuePath = path.join(root, 'v10_signal_rescue_report.json');
  const v10ExternalSourceLimitsPath = path.join(root, 'v10_external_source_limits.json');
  const v10RefreshObserverPath = path.join(root, 'v10_refresh_observer.json');
  const v10RefreshStageTimingsPath = path.join(root, 'v10_refresh_stage_timings.json');
  const v10ProfitGuardPath = path.join(root, 'v10_profit_guard_report.json');
  const v10StakePolicyPath = path.join(root, 'v10_stake_policy_report.json');
  const v11ReadyUnlockPath = path.join(root, 'v11_ready_unlock_report.json');
  const v11T10FastPath = path.join(root, 'v11_t10_fast_report.json');
  const v11T10BlockersPath = path.join(root, 'v11_t10_blockers.json');
  const v11NowTicketPath = path.join(root, 'v11_now_ticket.json');
  const v11RepairExecutionPath = path.join(root, 'v11_repair_execution_report.json');
  const v11HealthReconciliationPath = path.join(root, 'v11_health_reconciliation.json');
  const v11ProfitGuardPath = path.join(root, 'v11_profit_guard_report.json');
  const v11ControlRoomPath = path.join(root, 'v11_control_room_report.json');
  const v12PriceTargetsPath = path.join(root, 'v12_price_targets_report.json');
  const v12MarketTimingPath = path.join(root, 'v12_market_timing_report.json');
  const v12ClvWatchPath = path.join(root, 'v12_clv_watch_report.json');
  const v12ValueReleasePath = path.join(root, 'v12_value_release_report.json');
  const v12NowTicketPath = path.join(root, 'v12_now_ticket.json');
  const v12ControlRoomPath = path.join(root, 'v12_control_room_report.json');
  const v13OddsIdentityPath = path.join(root, 'v13_odds_identity_map.json');
  const v13PriceMemoryPath = path.join(root, 'v13_price_memory_report.json');
  const v13LineMovementPath = path.join(root, 'v13_line_movement_report.json');
  const v13PriceAlertsPath = path.join(root, 'v13_price_alerts_report.json');
  const v13AlertQueuePath = path.join(root, 'v13_alert_queue.json');
  const v13T10ResolutionPath = path.join(root, 'v13_t10_resolution_report.json');
  const v13T10GateMatrixPath = path.join(root, 'v13_t10_gate_matrix.json');
  const v13FinalGatePath = path.join(root, 'v13_final_gate_report.json');
  const v13ProfitGuardPath = path.join(root, 'v13_profit_guard_report.json');
  const v13EdgeExplainabilityPath = path.join(root, 'v13_edge_explainability_report.json');
  const v13NowTicketPath = path.join(root, 'v13_now_ticket.json');
  const v13AgentGatePath = path.join(root, 'v13_agent_gate_report.json');
  const v13ControlRoomPath = path.join(root, 'v13_control_room_report.json');
  const v13RefreshPerformancePath = path.join(root, 'v13_refresh_performance_report.json');
  const v14FileAuditPath = path.join(root, 'v14_file_audit_report.json');
  const v14DeadReferencePath = path.join(root, 'v14_dead_reference_report.json');
  const v14ContentInventoryPath = path.join(root, 'v14_content_inventory.json');
  const v14MathIntegrityPath = path.join(root, 'v14_math_integrity_report.json');
  const v14PickStateReconciliationPath = path.join(root, 'v14_pick_state_reconciliation.json');
  const v14CrossViewConsistencyPath = path.join(root, 'v14_cross_view_consistency_report.json');
  const v14CriticalResolutionPath = path.join(root, 'v14_critical_resolution_report.json');
  const v14PrebetGatePath = path.join(root, 'v14_prebet_gate_report.json');
  const v14SourceRepairPath = path.join(root, 'v14_source_repair_report.json');
  const v14SignalTruthPath = path.join(root, 'v14_signal_truth_report.json');
  const v14MatchingQualityPath = path.join(root, 'v14_matching_quality_report.json');
  const v14SourceGapByMatchPath = path.join(root, 'v14_source_gap_by_match.json');
  const v14PriceActionPath = path.join(root, 'v14_price_action_report.json');
  const v14RecheckSchedulePath = path.join(root, 'v14_recheck_schedule.json');
  const v14ControlRoomPath = path.join(root, 'v14_control_room_report.json');
  const v15ActionCockpitPath = path.join(root, 'v15_action_cockpit_report.json');
  const v15BetReadinessPath = path.join(root, 'v15_bet_readiness_report.json');
  const v15HealthNoisePath = path.join(root, 'v15_health_noise_report.json');
  const v15SourceFixPlanPath = path.join(root, 'v15_source_fix_plan.json');
  const v15CleanupSafetyPath = path.join(root, 'v15_cleanup_safety_report.json');
  const v15ControlRoomPath = path.join(root, 'v15_control_room_report.json');
  const v16SourceRefreshPath = path.join(root, 'v16_source_refresh_report.json');
  const v16SourceDeltaPath = path.join(root, 'v16_source_delta_report.json');
  const v16T10DecisionPath = path.join(root, 'v16_t10_decision_report.json');
  const v16CandidateResolutionPath = path.join(root, 'v16_candidate_resolution_report.json');
  const v16FinalTicketPath = path.join(root, 'v16_final_ticket.json');
  const v16AgentGatePath = path.join(root, 'v16_agent_gate_report.json');
  const v16ControlRoomPath = path.join(root, 'v16_control_room_report.json');
  const clvSummaryPath = path.join(root, 'clv_summary.json');
  let current = null;
  let currentKey = null;

  function optionalFileKey(filePath) {
    if (!fs.existsSync(filePath)) return 'missing';
    const stat = fs.statSync(filePath);
    return `${stat.mtimeMs}:${stat.size}`;
  }

  function fileKey() {
    const dataStat = fs.statSync(dataPath);
    const legacyStat = fs.statSync(legacyPath);
    return `${dataStat.mtimeMs}:${dataStat.size}:${legacyStat.mtimeMs}:${legacyStat.size}:${optionalFileKey(lineupsPath)}:${optionalFileKey(sofaEventsPath)}:${optionalFileKey(starPlayersPath)}:${optionalFileKey(h2hPath)}:${optionalFileKey(matchContextPath)}:${optionalFileKey(signalGapPath)}:${optionalFileKey(contextBacktestPath)}:${optionalFileKey(decisionBacktestPath)}:${optionalFileKey(decisionTuningPath)}:${optionalFileKey(decisionShadowPath)}:${optionalFileKey(oddsGuardrailsPath)}:${optionalFileKey(agentBlockerBacktestPath)}:${optionalFileKey(agentGuardrailRecommendationsPath)}:${optionalFileKey(stakeReductionBacktestPath)}:${optionalFileKey(signalConflictBacktestPath)}:${optionalFileKey(scorerQualityPath)}:${optionalFileKey(scorerCandidatesSummaryPath)}:${optionalFileKey(scorerSettlementPath)}:${optionalFileKey(scorerPendingAuditPath)}:${optionalFileKey(prematchFocusPath)}:${optionalFileKey(prematchExecutionPath)}:${optionalFileKey(signalCoverageTrendPath)}:${optionalFileKey(nextActionsPath)}:${optionalFileKey(sourceFreshnessPlanPath)}:${optionalFileKey(contextRepairPlanPath)}:${optionalFileKey(refreshPriorityPlanPath)}:${optionalFileKey(prebetChecklistPath)}:${optionalFileKey(prebetChecklistBacktestPath)}:${optionalFileKey(teamIdentityGraphPath)}:${optionalFileKey(matchDecisionTimelinePath)}:${optionalFileKey(agentBankrollSimulationPath)}:${optionalFileKey(smartPreparePlanPath)}:${optionalFileKey(sourceRegistryPath)}:${optionalFileKey(sourceQuarantinePath)}:${optionalFileKey(optionalSourcesPlanPath)}:${optionalFileKey(criticalIssueReportPath)}:${optionalFileKey(dataConsistencyReportPath)}:${optionalFileKey(uiIntegrityReportPath)}:${optionalFileKey(pickIntegrityReportPath)}:${optionalFileKey(coverageRepairEnginePath)}:${optionalFileKey(sourceCoverageTargetsPath)}:${optionalFileKey(leagueSignalQualityPath)}:${optionalFileKey(modelLabReportPath)}:${optionalFileKey(probabilityCalibrationPath)}:${optionalFileKey(policyCandidateRegistryPath)}:${optionalFileKey(sourceHealthReportPath)}:${optionalFileKey(v5FixCampaignPath)}:${optionalFileKey(v5DeadFileManifestPath)}:${optionalFileKey(v5PickReconciliationPath)}:${optionalFileKey(v5UiBugReportPath)}:${optionalFileKey(v5RefreshRepairReportPath)}:${optionalFileKey(v5BacktestSanityReportPath)}:${optionalFileKey(v6CoverageBoostPath)}:${optionalFileKey(v6TeamMatchingFailuresPath)}:${optionalFileKey(v6SourceGainPath)}:${optionalFileKey(v6ProfitEnginePath)}:${optionalFileKey(v6BacktestCleanRoomPath)}:${optionalFileKey(v6FinalBetTicketPath)}:${optionalFileKey(v6ControlRoomPath)}:${optionalFileKey(v7RedToGreenPath)}:${optionalFileKey(v7ActionQueuePath)}:${optionalFileKey(v7ActualCoveragePath)}:${optionalFileKey(v7SourceAbsencePath)}:${optionalFileKey(v7EdgeReleasePath)}:${optionalFileKey(v7StakingPolicyPath)}:${optionalFileKey(v8DecisionFeedPath)}:${optionalFileKey(v8NowNextTicketPath)}:${optionalFileKey(v8CoverageRescuePath)}:${optionalFileKey(v8ProxyStrengthPath)}:${optionalFileKey(v8UiConsistencyPath)}:${optionalFileKey(v8MatchSheetPath)}:${optionalFileKey(v8ControlRoomPath)}:${optionalFileKey(v9ReadyUnlockPath)}:${optionalFileKey(v9BlockerMatrixPath)}:${optionalFileKey(v9RepairExecutionPath)}:${optionalFileKey(v9CoverageAfterRepairPath)}:${optionalFileKey(v9SourceBlockersPath)}:${optionalFileKey(v9FinalizerPath)}:${optionalFileKey(v9FinalTicketPath)}:${optionalFileKey(v9ProfitGatePath)}:${optionalFileKey(v9ClvMarketPressurePath)}:${optionalFileKey(v10DecisionFeedPath)}:${optionalFileKey(v10FinalBetTicketPath)}:${optionalFileKey(v10T10GatePath)}:${optionalFileKey(v10BlockerResolutionPath)}:${optionalFileKey(v10SignalRescuePath)}:${optionalFileKey(v10ExternalSourceLimitsPath)}:${optionalFileKey(v10RefreshObserverPath)}:${optionalFileKey(v10RefreshStageTimingsPath)}:${optionalFileKey(v10ProfitGuardPath)}:${optionalFileKey(v10StakePolicyPath)}:${optionalFileKey(v11ReadyUnlockPath)}:${optionalFileKey(v11T10FastPath)}:${optionalFileKey(v11T10BlockersPath)}:${optionalFileKey(v11NowTicketPath)}:${optionalFileKey(v11RepairExecutionPath)}:${optionalFileKey(v11HealthReconciliationPath)}:${optionalFileKey(v11ProfitGuardPath)}:${optionalFileKey(v11ControlRoomPath)}:${optionalFileKey(v12PriceTargetsPath)}:${optionalFileKey(v12MarketTimingPath)}:${optionalFileKey(v12ClvWatchPath)}:${optionalFileKey(v12ValueReleasePath)}:${optionalFileKey(v12NowTicketPath)}:${optionalFileKey(v12ControlRoomPath)}:${optionalFileKey(v13OddsIdentityPath)}:${optionalFileKey(v13PriceMemoryPath)}:${optionalFileKey(v13LineMovementPath)}:${optionalFileKey(v13PriceAlertsPath)}:${optionalFileKey(v13AlertQueuePath)}:${optionalFileKey(v13T10ResolutionPath)}:${optionalFileKey(v13T10GateMatrixPath)}:${optionalFileKey(v13FinalGatePath)}:${optionalFileKey(v13ProfitGuardPath)}:${optionalFileKey(v13EdgeExplainabilityPath)}:${optionalFileKey(v13NowTicketPath)}:${optionalFileKey(v13AgentGatePath)}:${optionalFileKey(v13ControlRoomPath)}:${optionalFileKey(v13RefreshPerformancePath)}:${optionalFileKey(v14FileAuditPath)}:${optionalFileKey(v14DeadReferencePath)}:${optionalFileKey(v14ContentInventoryPath)}:${optionalFileKey(v14MathIntegrityPath)}:${optionalFileKey(v14PickStateReconciliationPath)}:${optionalFileKey(v14CrossViewConsistencyPath)}:${optionalFileKey(v14CriticalResolutionPath)}:${optionalFileKey(v14PrebetGatePath)}:${optionalFileKey(v14SourceRepairPath)}:${optionalFileKey(v14SignalTruthPath)}:${optionalFileKey(v14MatchingQualityPath)}:${optionalFileKey(v14SourceGapByMatchPath)}:${optionalFileKey(v14PriceActionPath)}:${optionalFileKey(v14RecheckSchedulePath)}:${optionalFileKey(v14ControlRoomPath)}:${optionalFileKey(v15ActionCockpitPath)}:${optionalFileKey(v15BetReadinessPath)}:${optionalFileKey(v15HealthNoisePath)}:${optionalFileKey(v15SourceFixPlanPath)}:${optionalFileKey(v15CleanupSafetyPath)}:${optionalFileKey(v15ControlRoomPath)}:${optionalFileKey(v16SourceRefreshPath)}:${optionalFileKey(v16SourceDeltaPath)}:${optionalFileKey(v16T10DecisionPath)}:${optionalFileKey(v16CandidateResolutionPath)}:${optionalFileKey(v16FinalTicketPath)}:${optionalFileKey(v16AgentGatePath)}:${optionalFileKey(v16ControlRoomPath)}:${optionalFileKey(clvSummaryPath)}`;
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

  function readPolicyCandidateRegistryReport() {
    return readJsonSidecar(policyCandidateRegistryPath, {});
  }

  function readSourceHealthReport() {
    return readJsonSidecar(sourceHealthReportPath, {});
  }

  function readV5FixCampaignReport() {
    return readJsonSidecar(v5FixCampaignPath, {});
  }

  function readV5DeadFileManifestReport() {
    return readJsonSidecar(v5DeadFileManifestPath, {});
  }

  function readV5PickReconciliationReport() {
    return readJsonSidecar(v5PickReconciliationPath, {});
  }

  function readV5UiBugReport() {
    return readJsonSidecar(v5UiBugReportPath, {});
  }

  function readV5RefreshRepairReport() {
    return readJsonSidecar(v5RefreshRepairReportPath, {});
  }

  function readV5BacktestSanityReport() {
    return readJsonSidecar(v5BacktestSanityReportPath, {});
  }

  function readV6CoverageBoostReport() {
    return readJsonSidecar(v6CoverageBoostPath, {});
  }

  function readV6TeamMatchingFailuresReport() {
    return readJsonSidecar(v6TeamMatchingFailuresPath, {});
  }

  function readV6SourceGainReport() {
    return readJsonSidecar(v6SourceGainPath, {});
  }

  function readV6ProfitEngineReport() {
    return readJsonSidecar(v6ProfitEnginePath, {});
  }

  function readV6BacktestCleanRoomReport() {
    return readJsonSidecar(v6BacktestCleanRoomPath, {});
  }

  function readV6FinalBetTicketReport() {
    return readJsonSidecar(v6FinalBetTicketPath, {});
  }

  function readV6ControlRoomReport() {
    return readJsonSidecar(v6ControlRoomPath, {});
  }

  function readV7RedToGreenReport() {
    return readJsonSidecar(v7RedToGreenPath, {});
  }

  function readV7ActionQueueReport() {
    return readJsonSidecar(v7ActionQueuePath, {});
  }

  function readV7ActualCoverageReport() {
    return readJsonSidecar(v7ActualCoveragePath, {});
  }

  function readV7SourceAbsenceReport() {
    return readJsonSidecar(v7SourceAbsencePath, {});
  }

  function readV7EdgeReleaseReport() {
    return readJsonSidecar(v7EdgeReleasePath, {});
  }

  function readV7StakingPolicyReport() {
    return readJsonSidecar(v7StakingPolicyPath, {});
  }

  function readV8DecisionFeedReport() {
    return readJsonSidecar(v8DecisionFeedPath, {});
  }

  function readV8NowNextTicketReport() {
    return readJsonSidecar(v8NowNextTicketPath, {});
  }

  function readV8CoverageRescueReport() {
    return readJsonSidecar(v8CoverageRescuePath, {});
  }

  function readV8ProxyStrengthReport() {
    return readJsonSidecar(v8ProxyStrengthPath, {});
  }

  function readV8UiConsistencyReport() {
    return readJsonSidecar(v8UiConsistencyPath, {});
  }

  function readV8MatchSheetReport() {
    return readJsonSidecar(v8MatchSheetPath, {});
  }

  function readV8ControlRoomReport() {
    return readJsonSidecar(v8ControlRoomPath, {});
  }

  function readV9ReadyUnlockReport() {
    return readJsonSidecar(v9ReadyUnlockPath, {});
  }

  function readV9BlockerMatrixReport() {
    return readJsonSidecar(v9BlockerMatrixPath, {});
  }

  function readV9RepairExecutionReport() {
    return readJsonSidecar(v9RepairExecutionPath, {});
  }

  function readV9CoverageAfterRepairReport() {
    return readJsonSidecar(v9CoverageAfterRepairPath, {});
  }

  function readV9SourceBlockersReport() {
    return readJsonSidecar(v9SourceBlockersPath, {});
  }

  function readV9FinalizerReport() {
    return readJsonSidecar(v9FinalizerPath, {});
  }

  function readV9FinalTicketReport() {
    return readJsonSidecar(v9FinalTicketPath, {});
  }

  function readV9ProfitGateReport() {
    return readJsonSidecar(v9ProfitGatePath, {});
  }

  function readV9ClvMarketPressureReport() {
    return readJsonSidecar(v9ClvMarketPressurePath, {});
  }

  function readV10DecisionFeedReport() {
    return readJsonSidecar(v10DecisionFeedPath, {});
  }

  function readV10FinalBetTicketReport() {
    return readJsonSidecar(v10FinalBetTicketPath, {});
  }

  function readV10T10GateReport() {
    return readJsonSidecar(v10T10GatePath, {});
  }

  function readV10BlockerResolutionReport() {
    return readJsonSidecar(v10BlockerResolutionPath, {});
  }

  function readV10SignalRescueReport() {
    return readJsonSidecar(v10SignalRescuePath, {});
  }

  function readV10ExternalSourceLimitsReport() {
    return readJsonSidecar(v10ExternalSourceLimitsPath, {});
  }

  function readV10RefreshObserverReport() {
    return readJsonSidecar(v10RefreshObserverPath, {});
  }

  function readV10RefreshStageTimingsReport() {
    return readJsonSidecar(v10RefreshStageTimingsPath, {});
  }

  function readV10ProfitGuardReport() {
    return readJsonSidecar(v10ProfitGuardPath, {});
  }

  function readV10StakePolicyReport() {
    return readJsonSidecar(v10StakePolicyPath, {});
  }

  function readV11ReadyUnlockReport() {
    return readJsonSidecar(v11ReadyUnlockPath, {});
  }

  function readV11T10FastReport() {
    return readJsonSidecar(v11T10FastPath, {});
  }

  function readV11T10BlockersReport() {
    return readJsonSidecar(v11T10BlockersPath, {});
  }

  function readV11NowTicketReport() {
    return readJsonSidecar(v11NowTicketPath, {});
  }

  function readV11RepairExecutionReport() {
    return readJsonSidecar(v11RepairExecutionPath, {});
  }

  function readV11HealthReconciliationReport() {
    return readJsonSidecar(v11HealthReconciliationPath, {});
  }

  function readV11ProfitGuardReport() {
    return readJsonSidecar(v11ProfitGuardPath, {});
  }

  function readV11ControlRoomReport() {
    return readJsonSidecar(v11ControlRoomPath, {});
  }

  function readV12PriceTargetsReport() {
    return readJsonSidecar(v12PriceTargetsPath, {});
  }

  function readV12MarketTimingReport() {
    return readJsonSidecar(v12MarketTimingPath, {});
  }

  function readV12ClvWatchReport() {
    return readJsonSidecar(v12ClvWatchPath, {});
  }

  function readV12ValueReleaseReport() {
    return readJsonSidecar(v12ValueReleasePath, {});
  }

  function readV12NowTicketReport() {
    return readJsonSidecar(v12NowTicketPath, {});
  }

  function readV12ControlRoomReport() {
    return readJsonSidecar(v12ControlRoomPath, {});
  }

  function readV13OddsIdentityReport() {
    return readJsonSidecar(v13OddsIdentityPath, {});
  }

  function readV13PriceMemoryReport() {
    return readJsonSidecar(v13PriceMemoryPath, {});
  }

  function readV13LineMovementReport() {
    return readJsonSidecar(v13LineMovementPath, {});
  }

  function readV13PriceAlertsReport() {
    return readJsonSidecar(v13PriceAlertsPath, {});
  }

  function readV13AlertQueueReport() {
    return readJsonSidecar(v13AlertQueuePath, {});
  }

  function readV13T10ResolutionReport() {
    return readJsonSidecar(v13T10ResolutionPath, {});
  }

  function readV13T10GateMatrixReport() {
    return readJsonSidecar(v13T10GateMatrixPath, {});
  }

  function readV13FinalGateReport() {
    return readJsonSidecar(v13FinalGatePath, {});
  }

  function readV13ProfitGuardReport() {
    return readJsonSidecar(v13ProfitGuardPath, {});
  }

  function readV13EdgeExplainabilityReport() {
    return readJsonSidecar(v13EdgeExplainabilityPath, {});
  }

  function readV13NowTicketReport() {
    return readJsonSidecar(v13NowTicketPath, {});
  }

  function readV13AgentGateReport() {
    return readJsonSidecar(v13AgentGatePath, {});
  }

  function readV13ControlRoomReport() {
    return readJsonSidecar(v13ControlRoomPath, {});
  }

  function readV13RefreshPerformanceReport() {
    return readJsonSidecar(v13RefreshPerformancePath, {});
  }

  function readV14FileAuditReport() {
    return readJsonSidecar(v14FileAuditPath, {});
  }

  function readV14DeadReferenceReport() {
    return readJsonSidecar(v14DeadReferencePath, {});
  }

  function readV14ContentInventoryReport() {
    return readJsonSidecar(v14ContentInventoryPath, {});
  }

  function readV14MathIntegrityReport() {
    return readJsonSidecar(v14MathIntegrityPath, {});
  }

  function readV14PickStateReconciliationReport() {
    return readJsonSidecar(v14PickStateReconciliationPath, {});
  }

  function readV14CrossViewConsistencyReport() {
    return readJsonSidecar(v14CrossViewConsistencyPath, {});
  }

  function readV14CriticalResolutionReport() {
    return readJsonSidecar(v14CriticalResolutionPath, {});
  }

  function readV14PrebetGateReport() {
    return readJsonSidecar(v14PrebetGatePath, {});
  }

  function readV14SourceRepairReport() {
    return readJsonSidecar(v14SourceRepairPath, {});
  }

  function readV14SignalTruthReport() {
    return readJsonSidecar(v14SignalTruthPath, {});
  }

  function readV14MatchingQualityReport() {
    return readJsonSidecar(v14MatchingQualityPath, {});
  }

  function readV14SourceGapByMatchReport() {
    return readJsonSidecar(v14SourceGapByMatchPath, {});
  }

  function readV14PriceActionReport() {
    return readJsonSidecar(v14PriceActionPath, {});
  }

  function readV14RecheckScheduleReport() {
    return readJsonSidecar(v14RecheckSchedulePath, {});
  }

  function readV14ControlRoomReport() {
    return readJsonSidecar(v14ControlRoomPath, {});
  }

  function readV15ActionCockpitReport() {
    return readJsonSidecar(v15ActionCockpitPath, {});
  }

  function readV15BetReadinessReport() {
    return readJsonSidecar(v15BetReadinessPath, {});
  }

  function readV15HealthNoiseReport() {
    return readJsonSidecar(v15HealthNoisePath, {});
  }

  function readV15SourceFixPlanReport() {
    return readJsonSidecar(v15SourceFixPlanPath, {});
  }

  function readV15CleanupSafetyReport() {
    return readJsonSidecar(v15CleanupSafetyPath, {});
  }

  function readV15ControlRoomReport() {
    return readJsonSidecar(v15ControlRoomPath, {});
  }

  function readV16SourceRefreshReport() {
    return readJsonSidecar(v16SourceRefreshPath, {});
  }

  function readV16SourceDeltaReport() {
    return readJsonSidecar(v16SourceDeltaPath, {});
  }

  function readV16T10DecisionReport() {
    return readJsonSidecar(v16T10DecisionPath, {});
  }

  function readV16CandidateResolutionReport() {
    return readJsonSidecar(v16CandidateResolutionPath, {});
  }

  function readV16FinalTicketReport() {
    return readJsonSidecar(v16FinalTicketPath, {});
  }

  function readV16AgentGateReport() {
    return readJsonSidecar(v16AgentGatePath, {});
  }

  function readV16ControlRoomReport() {
    return readJsonSidecar(v16ControlRoomPath, {});
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
      hockeytotal: 'Total buts',
      baseballtotal: 'Total runs',
      httotal: 'Total mi-temps',
      htou: 'Total mi-temps',
      btts: 'BTTS',
      doublechance: 'Double chance',
      handicap: 'Handicap',
      dnb: 'Remboursé si nul',
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

    try {
      pred = win.predictMatch(match);
      if (pred && !pred.skip) {
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
          status = best.edge >= 0.08 ? 'bet' : 'watch';
          statusLabel = best.edge >= 0.08 ? 'Priorité' : 'Jouable';
        } else {
          statusLabel = 'À surveiller';
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
      marketKey: calibrationUtils.normalizeMarketKey(best?.best?.market || best?.best?.key || pred?.market || marketLabel),
      label: pickLabel,
      odd: best ? best.odd : 0,
      probability: best ? best.prob : Number(pred && (pred.reliability ?? pred.prob)) || 0,
      edge: best ? best.edge : 0,
      stake,
      status,
      statusLabel,
      marketProfile: marketProfile(match),
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
    const next = {
      ...row,
      prebetGate: gate,
      status: row.status === 'skip' ? row.status : 'watch',
      statusLabel: row.status === 'skip' ? row.statusLabel : 'À surveiller · checklist',
      contextGate: {
        ...(row.contextGate || {}),
        agentEligible: false,
        warnings: [...new Set([...(row.contextGate?.warnings || []), 'prebet_checklist_block'])]
      },
      confidenceTrust: row.confidenceTrust ? {
        ...row.confidenceTrust,
        score: Math.max(0, Number(row.confidenceTrust.score || 0) - 4),
        level: Number(row.confidenceTrust.score || 0) - 4 >= 50 ? row.confidenceTrust.level : 'fragile',
        drivers: [...(row.confidenceTrust.drivers || []), gate.label]
      } : row.confidenceTrust
    };
    if (Number(next.stake || 0) > 0) {
      const before = Number(next.stake || 0);
      next.stake = before * 0.5;
      next.stakeAdjustment = mergeStakeAdjustment({
        ...(next.stakeAdjustment || {}),
        beforeStake: next.stakeAdjustment?.beforeStake ?? before,
        afterStake: next.stakeAdjustment?.afterStake ?? before
      }, 0.5, 'Checklist avant mise rouge');
      next.stakeAdjustment.afterStake = next.stake;
    }
    return next;
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
    const nearTerm = picks.filter((pick) => {
      const ts = Date.parse(pick.start || '');
      return Number.isFinite(ts) && ts >= now - 30 * 60000 && ts <= now + horizonMs;
    });
    const rows = (nearTerm.length ? nearTerm : picks).slice(0, 12);
    return {
      rows,
      mode: nearTerm.length ? 'next30h' : 'bestAvailable',
      horizonHours: nearTerm.length ? 30 : null
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

  function agentSnapshot(win, positions, prebetReport, blockedPositions = [], criticalReport = null, v5Report = null, v6ProfitReport = null, v6TicketReport = null, v7EdgeReport = null, v7RedReport = null, v8DecisionReport = null, v9FinalTicketReport = null, v10FinalTicketReport = null, v11NowTicketReport = null, v12NowTicketReport = null, v13NowTicketReport = null) {
    const api = win.__testAPI;
    if (!api || typeof api._agentReplay !== 'function') return null;
    try {
      const agent = api._agentReplay();
      const snapshot = bettingUtils.agentSnapshotFromReplay(agent, positions, agentGuard);
      const gate = prebetGateForReport(prebetReport);
      if (gate.blocked) {
        const blocked = Array.isArray(blockedPositions) ? blockedPositions : [];
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
        const blocked = Array.isArray(blockedPositions) ? blockedPositions : [];
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
      const v5Summary = v5Report && v5Report.summary ? v5Report.summary : {};
      if (!gate.blocked && !criticalSummary.blocks_bet && v5Summary.blocks_bet) {
        const blocked = Array.isArray(blockedPositions) ? blockedPositions : [];
        const bank = Number(snapshot.nav || 0) > 0 ? Number(snapshot.nav) : 10;
        snapshot.guard = { status: 'paused', label: v5Summary.first || 'Campagne V5 rouge', reason: 'v5_fix_campaign' };
        snapshot.v5Gate = {
          blocked: true,
          label: v5Summary.first || 'Campagne V5 rouge',
          findings: Number(v5Summary.findings || 0),
          critical: Number(v5Summary.critical || 0)
        };
        snapshot.blockedPositions = blocked;
        snapshot.blockedExposure = bettingUtils.summarizeExposure(blocked, bank);
        snapshot.positions = [];
        snapshot.exposure = bettingUtils.summarizeExposure([], bank);
      }
      const v6ProfitSummary = v6ProfitReport && v6ProfitReport.summary ? v6ProfitReport.summary : {};
      const v6TicketSummary = v6TicketReport && v6TicketReport.summary ? v6TicketReport.summary : {};
      const v6Blocked = v6ProfitSummary.blocks_agent || (v6TicketSummary.final_gate && v6TicketSummary.final_gate !== 'ready');
      if (!gate.blocked && !criticalSummary.blocks_bet && !v5Summary.blocks_bet && v6Blocked) {
        const blocked = Array.isArray(blockedPositions) ? blockedPositions : [];
        const bank = Number(snapshot.nav || 0) > 0 ? Number(snapshot.nav) : 10;
        snapshot.guard = { status: 'paused', label: v6TicketSummary.first_blocker || 'Gate V6 pré-bet rouge', reason: 'v6_final_gate' };
        snapshot.v6Gate = {
          blocked: true,
          label: v6TicketSummary.first_blocker || 'Gate V6 pré-bet rouge',
          profitCandidates: Number(v6ProfitSummary.candidates || 0),
          finalGate: v6TicketSummary.final_gate || 'blocked'
        };
        snapshot.blockedPositions = blocked;
        snapshot.blockedExposure = bettingUtils.summarizeExposure(blocked, bank);
        snapshot.positions = [];
        snapshot.exposure = bettingUtils.summarizeExposure([], bank);
      }
      const v13Summary = v13NowTicketReport && v13NowTicketReport.summary ? v13NowTicketReport.summary : {};
      const hasV13Ticket = Boolean(v13NowTicketReport && v13NowTicketReport.summary);
      const v13Blocked = v13Summary.final_gate && v13Summary.final_gate !== 'ready';
      if (!gate.blocked && !criticalSummary.blocks_bet && !v5Summary.blocks_bet && !v6Blocked && v13Blocked) {
        const blocked = Array.isArray(blockedPositions) ? blockedPositions : [];
        const bank = Number(snapshot.nav || 0) > 0 ? Number(snapshot.nav) : 10;
        snapshot.guard = { status: 'paused', label: v13Summary.message || 'Aucun pari à jouer maintenant', reason: 'v13_now_ticket' };
        snapshot.v13Gate = {
          blocked: true,
          label: v13Summary.message || 'Aucun pari à jouer maintenant',
          bettableNow: Number(v13Summary.bettable_now || 0),
          oneTickAway: Number(v13Summary.one_tick_away || 0),
          waitBetterPrice: Number(v13Summary.wait_better_price || 0),
          marketHostile: Number(v13Summary.market_hostile || 0),
          expired: Number(v13Summary.expired_or_kickoff_too_close || 0)
        };
        snapshot.blockedPositions = blocked;
        snapshot.blockedExposure = bettingUtils.summarizeExposure(blocked, bank);
        snapshot.positions = [];
        snapshot.exposure = bettingUtils.summarizeExposure([], bank);
      }
      const v12Summary = v12NowTicketReport && v12NowTicketReport.summary ? v12NowTicketReport.summary : {};
      const hasV12Ticket = Boolean(v12NowTicketReport && v12NowTicketReport.summary);
      const v12Blocked = v12Summary.final_gate && v12Summary.final_gate !== 'ready';
      if (!gate.blocked && !criticalSummary.blocks_bet && !v5Summary.blocks_bet && !v6Blocked && !hasV13Ticket && v12Blocked) {
        const blocked = Array.isArray(blockedPositions) ? blockedPositions : [];
        const bank = Number(snapshot.nav || 0) > 0 ? Number(snapshot.nav) : 10;
        snapshot.guard = { status: 'paused', label: v12Summary.message || 'Ticket V12 non prêt', reason: 'v12_now_ticket' };
        snapshot.v12Gate = {
          blocked: true,
          label: v12Summary.message || 'Ticket V12 non prêt',
          priceReady: Number(v12Summary.price_ready || 0),
          nearTarget: Number(v12Summary.near_target || 0),
          waitPrice: Number(v12Summary.wait_price || 0),
          marketHostile: Number(v12Summary.market_hostile || 0)
        };
        snapshot.blockedPositions = blocked;
        snapshot.blockedExposure = bettingUtils.summarizeExposure(blocked, bank);
        snapshot.positions = [];
        snapshot.exposure = bettingUtils.summarizeExposure([], bank);
      }
      const v7EdgeSummary = v7EdgeReport && v7EdgeReport.summary ? v7EdgeReport.summary : {};
      const v7RedSummary = v7RedReport && v7RedReport.summary ? v7RedReport.summary : {};
      const v7Blocked = v7EdgeSummary.blocks_agent || v7RedSummary.blocks_agent;
      if (!gate.blocked && !criticalSummary.blocks_bet && !v5Summary.blocks_bet && !v6Blocked && !hasV13Ticket && !v12Blocked && v7Blocked) {
        const blocked = Array.isArray(blockedPositions) ? blockedPositions : [];
        const bank = Number(snapshot.nav || 0) > 0 ? Number(snapshot.nav) : 10;
        snapshot.guard = { status: 'paused', label: v7RedSummary.first || 'Gate V7 actionnable rouge', reason: 'v7_edge_release' };
        snapshot.v7Gate = {
          blocked: true,
          label: v7RedSummary.first || 'Gate V7 actionnable rouge',
          ready: Number(v7EdgeSummary.ready || 0),
          watch: Number(v7EdgeSummary.watch || 0),
          softwareCritical: Number(v7RedSummary.software_critical || 0)
        };
        snapshot.blockedPositions = blocked;
        snapshot.blockedExposure = bettingUtils.summarizeExposure(blocked, bank);
        snapshot.positions = [];
        snapshot.exposure = bettingUtils.summarizeExposure([], bank);
      }
      const v8Summary = v8DecisionReport && v8DecisionReport.summary ? v8DecisionReport.summary : {};
      const v8Blocked = v8Summary.ready != null && Number(v8Summary.ready || 0) <= 0;
      if (!gate.blocked && !criticalSummary.blocks_bet && !v5Summary.blocks_bet && !v6Blocked && !v7Blocked && !hasV13Ticket && !hasV12Ticket && v8Blocked) {
        const blocked = Array.isArray(blockedPositions) ? blockedPositions : [];
        const bank = Number(snapshot.nav || 0) > 0 ? Number(snapshot.nav) : 10;
        snapshot.guard = { status: 'paused', label: v8Summary.message || 'Aucun pari à jouer maintenant', reason: 'v8_decision_feed' };
        snapshot.v8Gate = {
          blocked: true,
          label: v8Summary.message || 'Aucun pari à jouer maintenant',
          ready: Number(v8Summary.ready || 0),
          wait: Number(v8Summary.wait || 0),
          repair: Number(v8Summary.repair || 0)
        };
        snapshot.blockedPositions = blocked;
        snapshot.blockedExposure = bettingUtils.summarizeExposure(blocked, bank);
        snapshot.positions = [];
        snapshot.exposure = bettingUtils.summarizeExposure([], bank);
      }
      const v9Summary = v9FinalTicketReport && v9FinalTicketReport.summary ? v9FinalTicketReport.summary : {};
      const v9Blocked = v9Summary.final_gate && v9Summary.final_gate !== 'ready';
      if (!gate.blocked && !criticalSummary.blocks_bet && !v5Summary.blocks_bet && !v6Blocked && !v7Blocked && !v8Blocked && !hasV13Ticket && !hasV12Ticket && v9Blocked) {
        const blocked = Array.isArray(blockedPositions) ? blockedPositions : [];
        const bank = Number(snapshot.nav || 0) > 0 ? Number(snapshot.nav) : 10;
        snapshot.guard = { status: 'paused', label: v9Summary.message || 'Ticket V9 non prêt', reason: 'v9_final_ticket' };
        snapshot.v9Gate = {
          blocked: true,
          label: v9Summary.message || 'Ticket V9 non prêt',
          ready: Number(v9Summary.ready || 0),
          watch: Number(v9Summary.watch || 0),
          repair: Number(v9Summary.repair || 0)
        };
        snapshot.blockedPositions = blocked;
        snapshot.blockedExposure = bettingUtils.summarizeExposure(blocked, bank);
        snapshot.positions = [];
        snapshot.exposure = bettingUtils.summarizeExposure([], bank);
      }
      const v10Summary = v10FinalTicketReport && v10FinalTicketReport.summary ? v10FinalTicketReport.summary : {};
      const v10Blocked = v10Summary.final_gate && v10Summary.final_gate !== 'ready';
      if (!gate.blocked && !criticalSummary.blocks_bet && !v5Summary.blocks_bet && !v6Blocked && !v7Blocked && !v8Blocked && !v9Blocked && !hasV13Ticket && !hasV12Ticket && v10Blocked && !(v11NowTicketReport && v11NowTicketReport.summary)) {
        const blocked = Array.isArray(blockedPositions) ? blockedPositions : [];
        const bank = Number(snapshot.nav || 0) > 0 ? Number(snapshot.nav) : 10;
        snapshot.guard = { status: 'paused', label: v10Summary.message || 'Ticket V10 non prêt', reason: 'v10_final_ticket' };
        snapshot.v10Gate = {
          blocked: true,
          label: v10Summary.message || 'Ticket V10 non prêt',
          readyNow: Number(v10Summary.ready_now || 0),
          waitT10: Number(v10Summary.wait_t10 || 0),
          repairSource: Number(v10Summary.repair_source || 0)
        };
        snapshot.blockedPositions = blocked;
        snapshot.blockedExposure = bettingUtils.summarizeExposure(blocked, bank);
        snapshot.positions = [];
        snapshot.exposure = bettingUtils.summarizeExposure([], bank);
      }
      const v11Summary = v11NowTicketReport && v11NowTicketReport.summary ? v11NowTicketReport.summary : {};
      const v11Blocked = v11Summary.final_gate && v11Summary.final_gate !== 'ready';
      if (!gate.blocked && !criticalSummary.blocks_bet && !v5Summary.blocks_bet && !v6Blocked && !v7Blocked && !v8Blocked && !v9Blocked && !hasV13Ticket && !hasV12Ticket && v11Blocked) {
        const blocked = Array.isArray(blockedPositions) ? blockedPositions : [];
        const bank = Number(snapshot.nav || 0) > 0 ? Number(snapshot.nav) : 10;
        snapshot.guard = { status: 'paused', label: v11Summary.message || 'Ticket V11 non prêt', reason: 'v11_now_ticket' };
        snapshot.v11Gate = {
          blocked: true,
          label: v11Summary.message || 'Ticket V11 non prêt',
          readyNow: Number(v11Summary.ready_now || 0),
          readyIfT10: Number(v11Summary.ready_if_t10 || 0),
          readyIfPrice: Number(v11Summary.ready_if_price || 0),
          blockedExternal: Number(v11Summary.blocked_external || 0)
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
    const engine = ensureEngine({ force });
    const win = engine.win;
    const data = win.PRONOSTICS_DATA || {};
    const safeBankroll = Number.isFinite(Number(bankroll)) && Number(bankroll) > 0 ? Number(bankroll) : 50;
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
    const v5FixCampaignReport = readV5FixCampaignReport();
    const v5DeadFileManifestReport = readV5DeadFileManifestReport();
    const v5PickReconciliationReport = readV5PickReconciliationReport();
    const v5UiBugReport = readV5UiBugReport();
    const v5RefreshRepairReport = readV5RefreshRepairReport();
    const v5BacktestSanityReport = readV5BacktestSanityReport();
    const v6CoverageBoostReport = readV6CoverageBoostReport();
    const v6TeamMatchingFailuresReport = readV6TeamMatchingFailuresReport();
    const v6SourceGainReport = readV6SourceGainReport();
    const v6ProfitEngineReport = readV6ProfitEngineReport();
    const v6BacktestCleanRoomReport = readV6BacktestCleanRoomReport();
    const v6FinalBetTicketReport = readV6FinalBetTicketReport();
    const v6ControlRoomReport = readV6ControlRoomReport();
    const v7RedToGreenReport = readV7RedToGreenReport();
    const v7ActionQueueReport = readV7ActionQueueReport();
    const v7ActualCoverageReport = readV7ActualCoverageReport();
    const v7SourceAbsenceReport = readV7SourceAbsenceReport();
    const v7EdgeReleaseReport = readV7EdgeReleaseReport();
    const v7StakingPolicyReport = readV7StakingPolicyReport();
    const v8DecisionFeedReport = readV8DecisionFeedReport();
    const v8NowNextTicketReport = readV8NowNextTicketReport();
    const v8CoverageRescueReport = readV8CoverageRescueReport();
    const v8ProxyStrengthReport = readV8ProxyStrengthReport();
    const v8UiConsistencyReport = readV8UiConsistencyReport();
    const v8MatchSheetReport = readV8MatchSheetReport();
    const v8ControlRoomReport = readV8ControlRoomReport();
    const v9ReadyUnlockReport = readV9ReadyUnlockReport();
    const v9BlockerMatrixReport = readV9BlockerMatrixReport();
    const v9RepairExecutionReport = readV9RepairExecutionReport();
    const v9CoverageAfterRepairReport = readV9CoverageAfterRepairReport();
    const v9SourceBlockersReport = readV9SourceBlockersReport();
    const v9FinalizerReport = readV9FinalizerReport();
    const v9FinalTicketReport = readV9FinalTicketReport();
    const v9ProfitGateReport = readV9ProfitGateReport();
    const v9ClvMarketPressureReport = readV9ClvMarketPressureReport();
    const v10DecisionFeedReport = readV10DecisionFeedReport();
    const v10FinalBetTicketReport = readV10FinalBetTicketReport();
    const v10T10GateReport = readV10T10GateReport();
    const v10BlockerResolutionReport = readV10BlockerResolutionReport();
    const v10SignalRescueReport = readV10SignalRescueReport();
    const v10ExternalSourceLimitsReport = readV10ExternalSourceLimitsReport();
    const v10RefreshObserverReport = readV10RefreshObserverReport();
    const v10RefreshStageTimingsReport = readV10RefreshStageTimingsReport();
    const v10ProfitGuardReport = readV10ProfitGuardReport();
    const v10StakePolicyReport = readV10StakePolicyReport();
    const v11ReadyUnlockReport = readV11ReadyUnlockReport();
    const v11T10FastReport = readV11T10FastReport();
    const v11T10BlockersReport = readV11T10BlockersReport();
    const v11NowTicketReport = readV11NowTicketReport();
    const v11RepairExecutionReport = readV11RepairExecutionReport();
    const v11HealthReconciliationReport = readV11HealthReconciliationReport();
    const v11ProfitGuardReport = readV11ProfitGuardReport();
    const v11ControlRoomReport = readV11ControlRoomReport();
    const v12PriceTargetsReport = readV12PriceTargetsReport();
    const v12MarketTimingReport = readV12MarketTimingReport();
    const v12ClvWatchReport = readV12ClvWatchReport();
    const v12ValueReleaseReport = readV12ValueReleaseReport();
    const v12NowTicketReport = readV12NowTicketReport();
    const v12ControlRoomReport = readV12ControlRoomReport();
    const v13OddsIdentityReport = readV13OddsIdentityReport();
    const v13PriceMemoryReport = readV13PriceMemoryReport();
    const v13LineMovementReport = readV13LineMovementReport();
    const v13PriceAlertsReport = readV13PriceAlertsReport();
    const v13AlertQueueReport = readV13AlertQueueReport();
    const v13T10ResolutionReport = readV13T10ResolutionReport();
    const v13T10GateMatrixReport = readV13T10GateMatrixReport();
    const v13FinalGateReport = readV13FinalGateReport();
    const v13ProfitGuardReport = readV13ProfitGuardReport();
    const v13EdgeExplainabilityReport = readV13EdgeExplainabilityReport();
    const v13NowTicketReport = readV13NowTicketReport();
    const v13AgentGateReport = readV13AgentGateReport();
    const v13ControlRoomReport = readV13ControlRoomReport();
    const v13RefreshPerformanceReport = readV13RefreshPerformanceReport();
    const v14FileAuditReport = readV14FileAuditReport();
    const v14DeadReferenceReport = readV14DeadReferenceReport();
    const v14ContentInventoryReport = readV14ContentInventoryReport();
    const v14MathIntegrityReport = readV14MathIntegrityReport();
    const v14PickStateReconciliationReport = readV14PickStateReconciliationReport();
    const v14CrossViewConsistencyReport = readV14CrossViewConsistencyReport();
    const v14CriticalResolutionReport = readV14CriticalResolutionReport();
    const v14PrebetGateReport = readV14PrebetGateReport();
    const v14SourceRepairReport = readV14SourceRepairReport();
    const v14SignalTruthReport = readV14SignalTruthReport();
    const v14MatchingQualityReport = readV14MatchingQualityReport();
    const v14SourceGapByMatchReport = readV14SourceGapByMatchReport();
    const v14PriceActionReport = readV14PriceActionReport();
    const v14RecheckScheduleReport = readV14RecheckScheduleReport();
    const v14ControlRoomReport = readV14ControlRoomReport();
    const v15ActionCockpitReport = readV15ActionCockpitReport();
    const v15BetReadinessReport = readV15BetReadinessReport();
    const v15HealthNoiseReport = readV15HealthNoiseReport();
    const v15SourceFixPlanReport = readV15SourceFixPlanReport();
    const v15CleanupSafetyReport = readV15CleanupSafetyReport();
    const v15ControlRoomReport = readV15ControlRoomReport();
    const v16SourceRefreshReport = readV16SourceRefreshReport();
    const v16SourceDeltaReport = readV16SourceDeltaReport();
    const v16T10DecisionReport = readV16T10DecisionReport();
    const v16CandidateResolutionReport = readV16CandidateResolutionReport();
    const v16FinalTicketReport = readV16FinalTicketReport();
    const v16AgentGateReport = readV16AgentGateReport();
    const v16ControlRoomReport = readV16ControlRoomReport();
    const clvSummaryReport = readClvSummaryReport();
    const events = dedupeUpcomingBookable(eventListFromDays(data.days)).slice(0, 1200);
    const enrichedEvents = events.map((match) => enrichMatchForModel(match, lineupsIndex, h2hIndex, matchContextIndex));
    const coverage = buildSignalCoverage(enrichedEvents);
    const history = readHistorySummary();
    const calibration = history?.calibration || calibrationUtils.buildCalibration([]);
    const baseMatches = calibrationUtils.annotateMatches(
      enrichedEvents.map((match) => analyzeMatch(win, match, safeBankroll)),
      calibration
    )
      .map((row) => contextUtils.annotateConfidence(row, contextBacktestReport))
      .map((row) => applyDecisionAndMarketTiming(row, clvSummaryReport, decisionTuningReport))
      .map((row) => applyOddsGuardrails(row, oddsGuardrailsReport))
      .map((row) => applyStakePrudence(row, agentGuardrailRecommendationsReport, stakeReductionBacktestReport))
      .map((row) => applySignalConflict(row, signalConflictBacktestReport));
    const candidateAgentPositions = buildAgentPositions(win, baseMatches);
    const prebetGate = prebetGateForReport(prebetChecklistReport);
    const matches = baseMatches.map((row) => applyPrebetGate(row, prebetChecklistReport));
    const seen = new Set();
    const picks = matches
      .filter((row) => row.status !== 'skip' && row.edge > 0 && row.stake > 0)
      .sort((a, b) => (b.edge - a.edge) || (b.probability - a.probability))
      .filter((pick) => {
        const key = `${pick.id}:${pick.market}:${pick.label}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 30);
    const dashboard = buildDashboardPicks(picks);
    const combines = buildNativeCombines(win, enrichedEvents);
    const scorers = buildNativeScorers(win, enrichedEvents, lineupsIndex, starPlayersIndex);
    const watchlist = buildWatchlist(matches);
    const criticalGate = criticalIssueReport?.summary?.blocks_bet;
    const v5Gate = v5FixCampaignReport?.summary?.blocks_bet || v5PickReconciliationReport?.summary?.blocks_current_bet || v5RefreshRepairReport?.summary?.blocks_bet;
    const v6Gate = v6ProfitEngineReport?.summary?.blocks_agent || (v6FinalBetTicketReport?.summary?.final_gate && v6FinalBetTicketReport.summary.final_gate !== 'ready');
    const v7Gate = v7EdgeReleaseReport?.summary?.blocks_agent || v7RedToGreenReport?.summary?.blocks_agent;
    const v8Gate = v8DecisionFeedReport?.summary && Number(v8DecisionFeedReport.summary.ready || 0) <= 0;
    const v9Gate = v9FinalTicketReport?.summary && v9FinalTicketReport.summary.final_gate && v9FinalTicketReport.summary.final_gate !== 'ready';
    const v10Gate = v10FinalBetTicketReport?.summary && v10FinalBetTicketReport.summary.final_gate && v10FinalBetTicketReport.summary.final_gate !== 'ready';
    const v11Gate = v11NowTicketReport?.summary && v11NowTicketReport.summary.final_gate && v11NowTicketReport.summary.final_gate !== 'ready';
    const v12Gate = v12NowTicketReport?.summary && v12NowTicketReport.summary.final_gate && v12NowTicketReport.summary.final_gate !== 'ready';
    const v13Gate = v13NowTicketReport?.summary && v13NowTicketReport.summary.final_gate && v13NowTicketReport.summary.final_gate !== 'ready';
    const agentPositions = prebetGate.blocked || criticalGate || v5Gate || v6Gate || v7Gate || v8Gate || v9Gate || v10Gate || v11Gate || v12Gate || v13Gate ? [] : buildAgentPositions(win, matches);
    const agentBlockers = buildAgentBlockers(matches, agentPositions, win);

    return {
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
        totalPicks: picks.length
      },
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
      probabilityCalibration: probabilityCalibrationReport && probabilityCalibrationReport.schema ? probabilityCalibrationReport : null,
      policyCandidates: policyCandidateRegistryReport && policyCandidateRegistryReport.schema ? policyCandidateRegistryReport : null,
      sourceHealth: sourceHealthReport && sourceHealthReport.schema ? sourceHealthReport : null,
      v5FixCampaign: v5FixCampaignReport && v5FixCampaignReport.schema ? v5FixCampaignReport : null,
      v5DeadFileManifest: v5DeadFileManifestReport && v5DeadFileManifestReport.schema ? v5DeadFileManifestReport : null,
      v5PickReconciliation: v5PickReconciliationReport && v5PickReconciliationReport.schema ? v5PickReconciliationReport : null,
      v5UiBugReport: v5UiBugReport && v5UiBugReport.schema ? v5UiBugReport : null,
      v5RefreshRepairReport: v5RefreshRepairReport && v5RefreshRepairReport.schema ? v5RefreshRepairReport : null,
      v5BacktestSanity: v5BacktestSanityReport && v5BacktestSanityReport.schema ? v5BacktestSanityReport : null,
      v6CoverageBoost: v6CoverageBoostReport && v6CoverageBoostReport.schema ? v6CoverageBoostReport : null,
      v6TeamMatchingFailures: v6TeamMatchingFailuresReport && v6TeamMatchingFailuresReport.schema ? v6TeamMatchingFailuresReport : null,
      v6SourceGain: v6SourceGainReport && v6SourceGainReport.schema ? v6SourceGainReport : null,
      v6ProfitEngine: v6ProfitEngineReport && v6ProfitEngineReport.schema ? v6ProfitEngineReport : null,
      v6BacktestCleanRoom: v6BacktestCleanRoomReport && v6BacktestCleanRoomReport.schema ? v6BacktestCleanRoomReport : null,
      v6FinalBetTicket: v6FinalBetTicketReport && v6FinalBetTicketReport.schema ? v6FinalBetTicketReport : null,
      v6ControlRoom: v6ControlRoomReport && v6ControlRoomReport.schema ? v6ControlRoomReport : null,
      v7RedToGreen: v7RedToGreenReport && v7RedToGreenReport.schema ? v7RedToGreenReport : null,
      v7ActionQueue: v7ActionQueueReport && v7ActionQueueReport.schema ? v7ActionQueueReport : null,
      v7ActualCoverage: v7ActualCoverageReport && v7ActualCoverageReport.schema ? v7ActualCoverageReport : null,
      v7SourceAbsence: v7SourceAbsenceReport && v7SourceAbsenceReport.schema ? v7SourceAbsenceReport : null,
      v7EdgeRelease: v7EdgeReleaseReport && v7EdgeReleaseReport.schema ? v7EdgeReleaseReport : null,
      v7StakingPolicy: v7StakingPolicyReport && v7StakingPolicyReport.schema ? v7StakingPolicyReport : null,
      v8DecisionFeed: v8DecisionFeedReport && v8DecisionFeedReport.schema ? v8DecisionFeedReport : null,
      v8NowNextTicket: v8NowNextTicketReport && v8NowNextTicketReport.schema ? v8NowNextTicketReport : null,
      v8CoverageRescue: v8CoverageRescueReport && v8CoverageRescueReport.schema ? v8CoverageRescueReport : null,
      v8ProxyStrength: v8ProxyStrengthReport && v8ProxyStrengthReport.schema ? v8ProxyStrengthReport : null,
      v8UiConsistency: v8UiConsistencyReport && v8UiConsistencyReport.schema ? v8UiConsistencyReport : null,
      v8MatchSheet: v8MatchSheetReport && v8MatchSheetReport.schema ? v8MatchSheetReport : null,
      v8ControlRoom: v8ControlRoomReport && v8ControlRoomReport.schema ? v8ControlRoomReport : null,
      v9ReadyUnlock: v9ReadyUnlockReport && v9ReadyUnlockReport.schema ? v9ReadyUnlockReport : null,
      v9BlockerMatrix: v9BlockerMatrixReport && v9BlockerMatrixReport.schema ? v9BlockerMatrixReport : null,
      v9RepairExecution: v9RepairExecutionReport && v9RepairExecutionReport.schema ? v9RepairExecutionReport : null,
      v9CoverageAfterRepair: v9CoverageAfterRepairReport && v9CoverageAfterRepairReport.schema ? v9CoverageAfterRepairReport : null,
      v9SourceBlockers: v9SourceBlockersReport && v9SourceBlockersReport.schema ? v9SourceBlockersReport : null,
      v9Finalizer: v9FinalizerReport && v9FinalizerReport.schema ? v9FinalizerReport : null,
      v9FinalTicket: v9FinalTicketReport && v9FinalTicketReport.schema ? v9FinalTicketReport : null,
      v9ProfitGate: v9ProfitGateReport && v9ProfitGateReport.schema ? v9ProfitGateReport : null,
      v9ClvMarketPressure: v9ClvMarketPressureReport && v9ClvMarketPressureReport.schema ? v9ClvMarketPressureReport : null,
      v10DecisionFeed: v10DecisionFeedReport && v10DecisionFeedReport.schema ? v10DecisionFeedReport : null,
      v10FinalBetTicket: v10FinalBetTicketReport && v10FinalBetTicketReport.schema ? v10FinalBetTicketReport : null,
      v10T10Gate: v10T10GateReport && v10T10GateReport.schema ? v10T10GateReport : null,
      v10BlockerResolution: v10BlockerResolutionReport && v10BlockerResolutionReport.schema ? v10BlockerResolutionReport : null,
      v10SignalRescue: v10SignalRescueReport && v10SignalRescueReport.schema ? v10SignalRescueReport : null,
      v10ExternalSourceLimits: v10ExternalSourceLimitsReport && v10ExternalSourceLimitsReport.schema ? v10ExternalSourceLimitsReport : null,
      v10RefreshObserver: v10RefreshObserverReport && v10RefreshObserverReport.schema ? v10RefreshObserverReport : null,
      v10RefreshStageTimings: v10RefreshStageTimingsReport && v10RefreshStageTimingsReport.schema ? v10RefreshStageTimingsReport : null,
      v10ProfitGuard: v10ProfitGuardReport && v10ProfitGuardReport.schema ? v10ProfitGuardReport : null,
      v10StakePolicy: v10StakePolicyReport && v10StakePolicyReport.schema ? v10StakePolicyReport : null,
      v11ReadyUnlock: v11ReadyUnlockReport && v11ReadyUnlockReport.schema ? v11ReadyUnlockReport : null,
      v11T10Fast: v11T10FastReport && v11T10FastReport.schema ? v11T10FastReport : null,
      v11T10Blockers: v11T10BlockersReport && v11T10BlockersReport.schema ? v11T10BlockersReport : null,
      v11NowTicket: v11NowTicketReport && v11NowTicketReport.schema ? v11NowTicketReport : null,
      v11RepairExecution: v11RepairExecutionReport && v11RepairExecutionReport.schema ? v11RepairExecutionReport : null,
      v11HealthReconciliation: v11HealthReconciliationReport && v11HealthReconciliationReport.schema ? v11HealthReconciliationReport : null,
      v11ProfitGuard: v11ProfitGuardReport && v11ProfitGuardReport.schema ? v11ProfitGuardReport : null,
      v11ControlRoom: v11ControlRoomReport && v11ControlRoomReport.schema ? v11ControlRoomReport : null,
      v12PriceTargets: v12PriceTargetsReport && v12PriceTargetsReport.schema ? v12PriceTargetsReport : null,
      v12MarketTiming: v12MarketTimingReport && v12MarketTimingReport.schema ? v12MarketTimingReport : null,
      v12ClvWatch: v12ClvWatchReport && v12ClvWatchReport.schema ? v12ClvWatchReport : null,
      v12ValueRelease: v12ValueReleaseReport && v12ValueReleaseReport.schema ? v12ValueReleaseReport : null,
      v12NowTicket: v12NowTicketReport && v12NowTicketReport.schema ? v12NowTicketReport : null,
      v12ControlRoom: v12ControlRoomReport && v12ControlRoomReport.schema ? v12ControlRoomReport : null,
      v13OddsIdentity: v13OddsIdentityReport && v13OddsIdentityReport.schema ? v13OddsIdentityReport : null,
      v13PriceMemory: v13PriceMemoryReport && v13PriceMemoryReport.schema ? v13PriceMemoryReport : null,
      v13LineMovement: v13LineMovementReport && v13LineMovementReport.schema ? v13LineMovementReport : null,
      v13PriceAlerts: v13PriceAlertsReport && v13PriceAlertsReport.schema ? v13PriceAlertsReport : null,
      v13AlertQueue: v13AlertQueueReport && v13AlertQueueReport.schema ? v13AlertQueueReport : null,
      v13T10Resolution: v13T10ResolutionReport && v13T10ResolutionReport.schema ? v13T10ResolutionReport : null,
      v13T10GateMatrix: v13T10GateMatrixReport && v13T10GateMatrixReport.schema ? v13T10GateMatrixReport : null,
      v13FinalGate: v13FinalGateReport && v13FinalGateReport.schema ? v13FinalGateReport : null,
      v13ProfitGuard: v13ProfitGuardReport && v13ProfitGuardReport.schema ? v13ProfitGuardReport : null,
      v13EdgeExplainability: v13EdgeExplainabilityReport && v13EdgeExplainabilityReport.schema ? v13EdgeExplainabilityReport : null,
      v13NowTicket: v13NowTicketReport && v13NowTicketReport.schema ? v13NowTicketReport : null,
      v13AgentGate: v13AgentGateReport && v13AgentGateReport.schema ? v13AgentGateReport : null,
      v13ControlRoom: v13ControlRoomReport && v13ControlRoomReport.schema ? v13ControlRoomReport : null,
      v13RefreshPerformance: v13RefreshPerformanceReport && v13RefreshPerformanceReport.schema ? v13RefreshPerformanceReport : null,
      v14FileAudit: v14FileAuditReport && v14FileAuditReport.schema ? v14FileAuditReport : null,
      v14DeadReferences: v14DeadReferenceReport && v14DeadReferenceReport.schema ? v14DeadReferenceReport : null,
      v14ContentInventory: v14ContentInventoryReport && v14ContentInventoryReport.schema ? v14ContentInventoryReport : null,
      v14MathIntegrity: v14MathIntegrityReport && v14MathIntegrityReport.schema ? v14MathIntegrityReport : null,
      v14PickStateReconciliation: v14PickStateReconciliationReport && v14PickStateReconciliationReport.schema ? v14PickStateReconciliationReport : null,
      v14CrossViewConsistency: v14CrossViewConsistencyReport && v14CrossViewConsistencyReport.schema ? v14CrossViewConsistencyReport : null,
      v14CriticalResolution: v14CriticalResolutionReport && v14CriticalResolutionReport.schema ? v14CriticalResolutionReport : null,
      v14PrebetGate: v14PrebetGateReport && v14PrebetGateReport.schema ? v14PrebetGateReport : null,
      v14SourceRepair: v14SourceRepairReport && v14SourceRepairReport.schema ? v14SourceRepairReport : null,
      v14SignalTruth: v14SignalTruthReport && v14SignalTruthReport.schema ? v14SignalTruthReport : null,
      v14MatchingQuality: v14MatchingQualityReport && v14MatchingQualityReport.schema ? v14MatchingQualityReport : null,
      v14SourceGapByMatch: v14SourceGapByMatchReport && v14SourceGapByMatchReport.schema ? v14SourceGapByMatchReport : null,
      v14PriceAction: v14PriceActionReport && v14PriceActionReport.schema ? v14PriceActionReport : null,
      v14RecheckSchedule: v14RecheckScheduleReport && v14RecheckScheduleReport.schema ? v14RecheckScheduleReport : null,
      v14ControlRoom: v14ControlRoomReport && v14ControlRoomReport.schema ? v14ControlRoomReport : null,
      v15ActionCockpit: v15ActionCockpitReport && v15ActionCockpitReport.schema ? v15ActionCockpitReport : null,
      v15BetReadiness: v15BetReadinessReport && v15BetReadinessReport.schema ? v15BetReadinessReport : null,
      v15HealthNoise: v15HealthNoiseReport && v15HealthNoiseReport.schema ? v15HealthNoiseReport : null,
      v15SourceFixPlan: v15SourceFixPlanReport && v15SourceFixPlanReport.schema ? v15SourceFixPlanReport : null,
      v15CleanupSafety: v15CleanupSafetyReport && v15CleanupSafetyReport.schema ? v15CleanupSafetyReport : null,
      v15ControlRoom: v15ControlRoomReport && v15ControlRoomReport.schema ? v15ControlRoomReport : null,
      v16SourceRefresh: v16SourceRefreshReport && v16SourceRefreshReport.schema ? v16SourceRefreshReport : null,
      v16SourceDelta: v16SourceDeltaReport && v16SourceDeltaReport.schema ? v16SourceDeltaReport : null,
      v16T10Decision: v16T10DecisionReport && v16T10DecisionReport.schema ? v16T10DecisionReport : null,
      v16CandidateResolution: v16CandidateResolutionReport && v16CandidateResolutionReport.schema ? v16CandidateResolutionReport : null,
      v16FinalTicket: v16FinalTicketReport && v16FinalTicketReport.schema ? v16FinalTicketReport : null,
      v16AgentGate: v16AgentGateReport && v16AgentGateReport.schema ? v16AgentGateReport : null,
      v16ControlRoom: v16ControlRoomReport && v16ControlRoomReport.schema ? v16ControlRoomReport : null,
      clvSummary: clvSummaryReport && clvSummaryReport.summary ? clvSummaryReport : null,
      agentBlockers,
      agent: agentSnapshot(win, agentPositions, prebetChecklistReport, candidateAgentPositions, criticalIssueReport, v5FixCampaignReport, v6ProfitEngineReport, v6FinalBetTicketReport, v7EdgeReleaseReport, v7RedToGreenReport, v8DecisionFeedReport, v9FinalTicketReport, v10FinalBetTicketReport, v11NowTicketReport, v12NowTicketReport, v13NowTicketReport)
    };
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

