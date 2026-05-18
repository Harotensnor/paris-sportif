#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const script = path.join(root, 'desktop', 'bin', 'refresh_once.py');
const python = process.env.PYTHON || 'python';

function fail(message, details) {
  const suffix = details ? ` ${JSON.stringify(details)}` : '';
  throw new Error(`${message}${suffix}`);
}

function assert(condition, message, details) {
  if (!condition) fail(message, details);
}

function runDry(args) {
  const result = spawnSync(python, [script, ...args, '--dry-run'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024
  });
  if (result.error) throw result.error;
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  assert(result.status === 0, 'dry-run refresh en erreur', { args, status: result.status, output });
  const stages = output
    .split(/\r?\n/)
    .map((line) => line.match(/^\[dry-run\]\s+\d+\.\s+([^\s]+)/))
    .filter(Boolean)
    .map((match) => match[1]);
  assert(stages.length > 0, 'aucune étape dry-run détectée', { args, output });
  return { output, stages };
}

function includes(stages, name, label) {
  assert(stages.includes(name), `${label} absent`, { stages });
}

function excludes(stages, name, label) {
  assert(!stages.includes(name), `${label} ne doit pas être lancé`, { stages });
}

function before(stages, first, second, label) {
  const a = stages.indexOf(first);
  const b = stages.indexOf(second);
  assert(a >= 0 && b >= 0 && a < b, `${label} ordre invalide`, { first, second, stages });
}

function count(stages, name) {
  return stages.filter((stage) => stage === name).length;
}

function commonDecisionOutputs(stages, label, options = {}) {
  const requiredStages = [
    'build_team_identity_graph.py',
    'build_match_context.py',
    'build_prebet_checklist.py',
    'build_prebet_checklist_backtest.py',
    'build_agent_bankroll_simulation.py',
    'build_match_decision_timeline.py',
    'build_smart_prepare_plan.py',
    'build_source_registry.py',
    'build_optional_sources_plan.py',
    'build_v6_decision_terminal.py',
    'build_v7_actionability.py',
    'build_v8_decision_cockpit.py',
    'build_v9_operational_readiness.py',
    'build_v10_finalizer.py',
    'build_v11_finalizer.py',
    'build_v12_price_watch.py',
    'build_v13_price_alerts.py',
    ...(options.skipQualityAudit ? [] : ['build_v14_quality_audit.py']),
    'build_v15_operational_cleanup.py',
    'build_v16_final_decision.py',
    'build_v4_audit_reports.py',
    'build_decision_exports.py',
    'build_health.py',
    'finalize_inline.py'
  ];
  for (const stage of requiredStages) {
    includes(stages, stage, `${label} ${stage}`);
  }
  before(stages, 'build_match_context.py', 'build_prebet_checklist.py', `${label} contexte avant checklist`);
  before(stages, 'build_prebet_checklist.py', 'build_prebet_checklist_backtest.py', `${label} checklist avant backtest`);
  before(stages, 'build_optional_sources_plan.py', 'build_v6_decision_terminal.py', `${label} plan sources avant pile décision`);
  before(stages, 'build_v6_decision_terminal.py', 'build_v16_final_decision.py', `${label} pile décision ordonnée`);
  before(stages, 'build_v16_final_decision.py', 'build_v4_audit_reports.py', `${label} décision finale avant audit v4`);
  before(stages, 'build_v4_audit_reports.py', 'build_decision_exports.py', `${label} audit avant exports`);
  before(stages, 'build_decision_exports.py', 'build_health.py', `${label} exports avant santé`);
  before(stages, 'build_health.py', 'finalize_inline.py', `${label} santé avant inline`);
}

function lightDecisionOutputs(stages, label) {
  const requiredStages = [
    'build_team_identity_graph.py',
    'build_match_context.py',
    'build_prebet_checklist.py',
    'build_v7_actionability.py',
    'build_v8_decision_cockpit.py',
    'build_v16_final_decision.py',
    'build_v4_audit_reports.py',
    'build_decision_exports.py',
    'build_health.py',
    'finalize_inline.py'
  ];
  for (const stage of requiredStages) {
    includes(stages, stage, `${label} ${stage}`);
  }
  before(stages, 'build_match_context.py', 'build_prebet_checklist.py', `${label} contexte avant checklist`);
  before(stages, 'build_prebet_checklist.py', 'build_v7_actionability.py', `${label} checklist avant décision`);
  before(stages, 'build_v8_decision_cockpit.py', 'build_v16_final_decision.py', `${label} cockpit avant final`);
  before(stages, 'build_v16_final_decision.py', 'build_v4_audit_reports.py', `${label} décision finale avant audit`);
  before(stages, 'build_health.py', 'finalize_inline.py', `${label} santé avant inline`);
}

function testInstant() {
  const { stages, output } = runDry(['--instant']);
  assert(output.includes('dry-run:'), 'résumé dry-run instant absent', { output });
  for (const stage of [
    'patch_winamax_markets.py',
    'patch_all_quick.py',
    'patch_tennis_features.py',
    'build_match_context.py',
    'build_refresh_priority_plan.py',
    'build_prebet_checklist.py'
  ]) {
    includes(stages, stage, `instant ${stage}`);
  }
  lightDecisionOutputs(stages, 'instant');
  excludes(stages, 'fetch_live.py', 'instant cache local');
  excludes(stages, 'fetch_winamax_catalog.py', 'instant cache local');
  excludes(stages, 'fetch_winamax_match_details.py', 'instant cache local');
  excludes(stages, 'fetch_weather.py', 'instant cache local');
}

function testQuick() {
  const { stages, output } = runDry(['--quick']);
  assert(output.includes('dry-run:'), 'résumé dry-run quick absent', { output });
  for (const stage of [
    'fetch_live.py',
    'fetch_sofascore_events.py',
    'fetch_winamax_catalog.py',
    'patch_odds.py',
    'snapshot_odds.py',
    'patch_winamax.py',
    'fetch_winamax_match_details.py',
    'patch_all_quick.py',
    'patch_tennis_features.py',
    'compute_clv.py',
    'build_decision_tuning.py',
    'build_signal_conflict_backtest.py',
    'build_odds_guardrails.py',
    'build_agent_blocker_backtest.py',
    'build_agent_guardrail_recommendations.py',
    'build_stake_reduction_backtest.py',
    'build_scorer_quality.py',
    'build_prematch_execution_plan.py',
    'build_refresh_priority_plan.py'
  ]) {
    includes(stages, stage, `quick ${stage}`);
  }
  commonDecisionOutputs(stages, 'quick');
  before(stages, 'fetch_live.py', 'patch_all_quick.py', 'quick fetch avant patch');
  before(stages, 'fetch_winamax_catalog.py', 'patch_winamax.py', 'quick catalog avant patch Winamax');
  before(stages, 'patch_all_quick.py', 'build_match_context.py', 'quick patch avant contexte');
  excludes(stages, 'fetch_v3.py', 'quick');
}

function testFast() {
  const { stages, output } = runDry(['--fast']);
  assert(output.includes('dry-run:'), 'résumé dry-run fast absent', { output });
  for (const stage of [
    'fetch_live.py',
    'fetch_winamax_catalog.py',
    'patch_winamax.py',
    'patch_all_quick.py',
    'patch_tennis_features.py',
    'build_match_context.py',
    'build_refresh_priority_plan.py',
    'build_prebet_checklist.py'
  ]) {
    includes(stages, stage, `fast ${stage}`);
  }
  lightDecisionOutputs(stages, 'fast');
  excludes(stages, 'build_v14_quality_audit.py', 'fast audit qualité long');
  excludes(stages, 'patch_odds.py', 'fast cotes historiques longues');
  excludes(stages, 'snapshot_odds.py', 'fast snapshot long');
  excludes(stages, 'fetch_winamax_match_details.py', 'fast détails match long');
  before(stages, 'fetch_live.py', 'patch_all_quick.py', 'fast fetch avant patch');
  before(stages, 'fetch_winamax_catalog.py', 'patch_winamax.py', 'fast catalog avant patch Winamax');
  before(stages, 'patch_all_quick.py', 'build_match_context.py', 'fast patch avant contexte');
  excludes(stages, 'fetch_v3.py', 'fast');
  excludes(stages, 'fetch_weather.py', 'fast');
  excludes(stages, 'fetch_h2h.py', 'fast');
  assert(stages.length < runDry(['--quick']).stages.length, 'fast doit rester plus court que quick enrichi', { fastCount: stages.length });
}

function testFull() {
  const { stages } = runDry(['--full']);
  for (const stage of ['fetch_v3.py', 'fetch_clubelo.py', 'fetch_weather.py', 'fetch_team_stats.py', 'fetch_tennis_sackmann.py', 'fetch_h2h.py']) {
    includes(stages, stage, `full ${stage}`);
  }
  commonDecisionOutputs(stages, 'full');
  assert(count(stages, 'finalize_inline.py') >= 2, 'full doit produire un snapshot actionnable avant les sources lentes puis après enrichissement', { stages });
  before(stages, 'fetch_v3.py', 'fetch_live.py', 'full fetch_v3 avant bootstrap Winamax');
  before(stages, 'fetch_live.py', 'fetch_clubelo.py', 'full bootstrap Winamax avant sources lentes');
  before(stages, 'finalize_inline.py', 'fetch_clubelo.py', 'full inline actionnable avant sources lentes');
  before(stages, 'fetch_understat_xg.py', 'fetch_team_stats.py', 'full xG avant team stats');
}

function testPrematch() {
  const { stages } = runDry(['--prematch']);
  for (const stage of [
    'fetch_live.py',
    'fetch_winamax_match_details.py',
    'fetch_weather.py',
    'fetch_injuries_soccer.py',
    'fetch_lineups_soccer.py',
    'fetch_h2h.py',
    'patch_all_quick.py',
    'patch_tennis_features.py',
    'build_match_context.py',
    'compute_clv.py',
    'build_prematch_execution_plan.py'
  ]) {
    includes(stages, stage, `prematch ${stage}`);
  }
  commonDecisionOutputs(stages, 'prematch');
  before(stages, 'fetch_winamax_match_details.py', 'patch_all_quick.py', 'prematch détails avant patch');
  before(stages, 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'prematch lineups avant patch');
  excludes(stages, 'fetch_v3.py', 'prematch');
}

function testPrematchT60() {
  const { stages } = runDry(['--prematch-t60']);
  for (const stage of ['fetch_weather.py', 'fetch_injuries_soccer.py', 'fetch_lineups_soccer.py', 'fetch_h2h.py', 'patch_all_quick.py', 'patch_tennis_features.py', 'build_match_context.py', 'build_prematch_execution_plan.py']) {
    includes(stages, stage, `prematch T-60 ${stage}`);
  }
  commonDecisionOutputs(stages, 'prematch T-60');
  excludes(stages, 'fetch_v3.py', 'prematch T-60');
  excludes(stages, 'fetch_winamax_match_details.py', 'prematch T-60');
}

function testPrematchT30() {
  const { stages } = runDry(['--prematch-t30']);
  for (const stage of ['fetch_live.py', 'fetch_winamax_catalog.py', 'fetch_winamax_match_details.py', 'snapshot_odds.py', 'fetch_injuries_soccer.py', 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'patch_tennis_features.py', 'build_match_context.py', 'compute_clv.py']) {
    includes(stages, stage, `prematch T-30 ${stage}`);
  }
  commonDecisionOutputs(stages, 'prematch T-30');
  excludes(stages, 'fetch_v3.py', 'prematch T-30');
}

function testPrematchT10() {
  const { stages } = runDry(['--prematch-t10']);
  for (const stage of ['fetch_live.py', 'fetch_winamax_catalog.py', 'fetch_winamax_match_details.py', 'snapshot_odds.py', 'fetch_injuries_soccer.py', 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'patch_tennis_features.py', 'build_match_context.py', 'compute_clv.py']) {
    includes(stages, stage, `prematch T-10 ${stage}`);
  }
  commonDecisionOutputs(stages, 'prematch T-10');
  excludes(stages, 'fetch_v3.py', 'prematch T-10');
}

function testCritical() {
  const { stages } = runDry(['--critical']);
  for (const stage of ['fetch_live.py', 'fetch_winamax_match_details.py', 'fetch_injuries_soccer.py', 'fetch_lineups_soccer.py', 'patch_all_quick.py', 'patch_tennis_features.py', 'build_match_context.py', 'build_refresh_priority_plan.py', 'build_prebet_checklist.py']) {
    includes(stages, stage, `critical ${stage}`);
  }
  commonDecisionOutputs(stages, 'critical');
  excludes(stages, 'fetch_v3.py', 'critical');
}

function testRepairContext() {
  const { stages } = runDry(['--repair-context']);
  includes(stages, 'patch_all_quick.py', 'repair-context patch');
  includes(stages, 'patch_tennis_features.py', 'repair-context tennis patch');
  includes(stages, 'build_match_context.py', 'repair-context contexte');
  includes(stages, 'build_context_repair_plan.py', 'repair-context plan');
  includes(stages, 'build_refresh_priority_plan.py', 'repair-context file');
  includes(stages, 'build_prebet_checklist.py', 'repair-context checklist');
  commonDecisionOutputs(stages, 'repair-context');
  excludes(stages, 'fetch_v3.py', 'repair-context');
}

function testSignals() {
  const weather = runDry(['--signals', '--signal-source', 'weather']).stages;
  includes(weather, 'fetch_weather.py', 'signals weather');
  excludes(weather, 'fetch_team_stats.py', 'signals weather ciblé');
  commonDecisionOutputs(weather, 'signals weather');

  const teamStats = runDry(['--signals', '--signal-source', 'team_stats']).stages;
  includes(teamStats, 'fetch_understat_xg.py', 'signals team_stats xG');
  includes(teamStats, 'fetch_team_stats.py', 'signals team_stats');
  commonDecisionOutputs(teamStats, 'signals team_stats');

  const tennis = runDry(['--signals', '--signal-source', 'tennis']).stages;
  includes(tennis, 'fetch_tennis_sackmann.py', 'signals tennis ratings');
  includes(tennis, 'patch_tennis_features.py', 'signals tennis patch');
  commonDecisionOutputs(tennis, 'signals tennis');
}

testInstant();
testFast();
testQuick();
testFull();
testPrematch();
testPrematchT60();
testPrematchT30();
testPrematchT10();
testCritical();
testRepairContext();
testSignals();

console.log('Refresh contract OK: modes instant/fast/quick/full/signals/prematch/T-60/T-30/T-10/critical/repair validés.');
